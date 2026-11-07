const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    ...JSON_HEADERS, "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer", "x-frame-options": "DENY", ...extra
  } });
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}
function response(data, request, env, status = 200, headers = {}) {
  return json(data, status, { ...corsHeaders(request, env), ...headers });
}
function authorised(request, env) {
  const expected = env.ADMIN_TOKEN;
  const supplied = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(expected && supplied && supplied.length === expected.length &&
    timingSafeEqual(supplied, expected));
}
function timingSafeEqual(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function safeKey(value) {
  const key = String(value || "").replace(/^\/+|\/+$/g, "");
  if (!key || key.length > 500 || key.split("/").some(part => !part || part === "." || part === "..") || /[\\\\\u0000-\u001f]/.test(key)) return null;
  return key;
}
function safeFilename(value) {
  return String(value || "upload").normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "upload";
}
async function requireAdmin(request, env) {
  if (authorised(request, env)) return null;
  if (!env.db) return json({ error: "Authentication protection is temporarily unavailable" }, 503);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const ipHash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = 15 * 60;
  const cutoff = now - windowSeconds;

  try {
    await env.db.prepare("DELETE FROM admin_auth_attempts WHERE window_started < ?").bind(now - 86400).run();
    const attempt = await env.db.prepare(
      "INSERT INTO admin_auth_attempts (ip_hash,window_started,attempts) VALUES (?,?,1) " +
      "ON CONFLICT(ip_hash) DO UPDATE SET " +
      "attempts=CASE WHEN admin_auth_attempts.window_started <= ? THEN 1 ELSE admin_auth_attempts.attempts+1 END, " +
      "window_started=CASE WHEN admin_auth_attempts.window_started <= ? THEN excluded.window_started ELSE admin_auth_attempts.window_started END " +
      "RETURNING attempts,window_started"
    ).bind(ipHash, now, cutoff, cutoff).first();

    if (attempt && attempt.attempts > 10) {
      const retryAfter = Math.max(1, attempt.window_started + windowSeconds - now);
      return json({ error: "Too many failed sign-in attempts. Try again later." }, 429, { "retry-after": String(retryAfter) });
    }
  } catch {
    return json({ error: "Authentication protection is temporarily unavailable" }, 503);
  }
  return json({ error: "Unauthorised" }, 401);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/api/health" && request.method === "GET") {
      let storageReady = false;
      let databaseReady = false;
      let schemaReady = false;
      try {
        if (env.MEDIA) {
          await env.MEDIA.list({ limit: 1 });
          storageReady = true;
        }
      } catch {}
      try {
        if (env.db) {
          await env.db.prepare("SELECT 1").first();
          databaseReady = true;
          const table = await env.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").first();
          schemaReady = Boolean(table);
        }
      } catch {}
      const ok = storageReady && databaseReady && schemaReady;
      return response({
        ok,
        service: "visual-storyteller-media-api",
        storage: storageReady,
        database: databaseReady,
        schema: schemaReady
      }, request, env, ok ? 200 : 503);
    }
    if (url.pathname === "/api/public/gallery" && request.method === "GET") {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const listed = await env.MEDIA.list({ prefix: "gallery/", limit: 1000 });
      const objects = listed.objects || [];
      const images = objects.filter(object => {
        const key = object.key.toLowerCase();
        return !key.startsWith("thumbs/") && /\.(jpe?g|png|webp|gif|avif)$/i.test(key);
      }).sort((a,b) => new Date(b.uploaded) - new Date(a.uploaded))
        .map(object => {
          const encoded = object.key.split("/").map(encodeURIComponent).join("/");
          return {
            key: object.key,
            url: "/api/public/media/" + encoded,
            thumbUrl: "/api/public/media/" + encoded,
            uploaded: object.uploaded,
            size: object.size
          };
        });
      return response({ images }, request, env, 200, { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" });
    }

    if (url.pathname.startsWith("/api/public/media/") && request.method === "GET") {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const key = safeKey(decodeURIComponent(url.pathname.slice("/api/public/media/".length)));
      if (!key) return response({ error: "Invalid object key" }, request, env, 400);
      const object = await env.MEDIA.get(key);
      if (!object) return response({ error: "Not found" }, request, env, 404);
      let isPublished = key.startsWith("gallery/") || object.customMetadata?.visibility === "public";
      if (!isPublished && env.db) {
        const published = await env.db.prepare(
          "SELECT 1 AS ok FROM project_media pm JOIN projects p ON p.id=pm.project_id WHERE pm.object_key=? AND p.status='published' UNION SELECT 1 AS ok FROM projects WHERE cover_key=? AND status='published' LIMIT 1"
        ).bind(key, key).first();
        isPublished = Boolean(published);
      }
      if (!isPublished) return response({ error: "Not found" }, request, env, 404);
      const headers = new Headers(corsHeaders(request, env));
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
      return new Response(object.body, { headers });
    }

    if (url.pathname === "/api/public/settings" && request.method === "GET") {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      // Only the appearance configuration is consumed by the public website.
      // Keep all other settings private by default.
      const row = await env.db.prepare("SELECT value FROM site_settings WHERE key='appearance'").first();
      let appearance = null;
      if (row) {
        try { appearance = JSON.parse(row.value); }
        catch { return response({ error: "Public appearance settings are invalid" }, request, env, 500); }
      }
      return response({ settings: appearance ? { appearance } : {} }, request, env, 200, { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" });
    }

    if (url.pathname === "/api/public/projects" && request.method === "GET") {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const rows = await env.db.prepare("SELECT id,title,category,description,location,project_date,cover_key,sort_order FROM projects WHERE status='published' ORDER BY sort_order ASC, updated_at DESC").all();
      const projects = [];
      for (const project of rows.results || []) {
        const assets = await env.db.prepare("SELECT object_key,media_type,alt_text,sort_order FROM project_media WHERE project_id=? ORDER BY sort_order ASC,created_at ASC").bind(project.id).all();
        projects.push({ ...project, media: (assets.results || []).map(item => ({ ...item, url: "/api/public/media/" + item.object_key.split("/").map(encodeURIComponent).join("/") })) });
      }
      return response({ projects }, request, env, 200, { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" });
    }

    const denied = await requireAdmin(request, env);
    if (denied) return response({ error: "Unauthorised" }, request, env, 401);

    if (url.pathname === "/api/projects" && request.method === "GET") {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const rows = await env.db.prepare("SELECT * FROM projects ORDER BY sort_order ASC, updated_at DESC").all();
      return response({ projects: rows.results || [] }, request, env);
    }
    if (url.pathname === "/api/projects" && request.method === "POST") {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const body = await request.json().catch(() => null);
      const category = body?.category;
      const title = String(body?.title || "").trim().slice(0, 160);
      if (!title || !["Photography","Videography","Storybook"].includes(category)) return response({ error: "A title and valid category are required" }, request, env, 400);
      const id = crypto.randomUUID();
      await env.db.prepare("INSERT INTO projects (id,title,category,description,location,project_date,cover_key,status,sort_order) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(id,title,category,String(body.description || "").slice(0,4000),String(body.location || "").slice(0,200),body.project_date || null,body.cover_key || null,body.status === "published" ? "published" : "draft",Number.isInteger(body.sort_order) ? body.sort_order : 0).run();
      return response({ id, created: true }, request, env, 201);
    }
    if (url.pathname.startsWith("/api/projects/") && url.pathname.endsWith("/media")) {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const id = url.pathname.slice("/api/projects/".length, -"/media".length);
      const project = await env.db.prepare("SELECT id FROM projects WHERE id=?").bind(id).first();
      if (!project) return response({ error: "Project not found" }, request, env, 404);
      if (request.method === "GET") {
        const rows = await env.db.prepare("SELECT id,object_key,media_type,alt_text,sort_order FROM project_media WHERE project_id=? ORDER BY sort_order ASC,created_at ASC").bind(id).all();
        return response({ media: rows.results || [] }, request, env);
      }
      if (request.method === "POST") {
        const body = await request.json().catch(() => null);
        const keys = Array.isArray(body?.media) ? body.media : [];
        if (keys.length > 100) return response({ error: "A project can contain at most 100 media items" }, request, env, 400);
        await env.db.prepare("DELETE FROM project_media WHERE project_id=?").bind(id).run();
        for (let i=0;i<keys.length;i++) {
          const item=keys[i], key=safeKey(item?.key);
          if (!key) continue;
          const object=await env.MEDIA.head(key);
          if (!object) continue;
          const type=String(item.type||object.httpMetadata?.contentType||"").startsWith("video/")?"video":"image";
          await env.db.prepare("INSERT INTO project_media (id,project_id,object_key,media_type,alt_text,sort_order) VALUES (?,?,?,?,?,?)")
            .bind(crypto.randomUUID(),id,key,type,String(item.alt_text||"").slice(0,300),i).run();
        }
        return response({ saved: true, count: keys.length }, request, env);
      }
    }

    if (url.pathname.startsWith("/api/projects/")) {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const id = url.pathname.slice("/api/projects/".length);
      if (!id || id.includes("/")) return response({ error: "Invalid project ID" }, request, env, 400);
      if (request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body) return response({ error: "Invalid project data" }, request, env, 400);
        const category = body.category;
        if (category && !["Photography","Videography","Storybook"].includes(category)) return response({ error: "Invalid category" }, request, env, 400);
        const current = await env.db.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
        if (!current) return response({ error: "Project not found" }, request, env, 404);
        const next = { ...current, ...body };
        if (!String(next.title || "").trim()) return response({ error: "Title is required" }, request, env, 400);
        if (!["draft","published"].includes(next.status)) return response({ error: "Invalid status" }, request, env, 400);
        await env.db.prepare("UPDATE projects SET title=?,category=?,description=?,location=?,project_date=?,cover_key=?,status=?,sort_order=?,updated_at=datetime('now') WHERE id=?")
          .bind(String(next.title).trim().slice(0,160),next.category,String(next.description || "").slice(0,4000),String(next.location || "").slice(0,200),next.project_date || null,next.cover_key || null,next.status,Number.isInteger(next.sort_order) ? next.sort_order : 0,id).run();
        return response({ updated: true, id }, request, env);
      }
      if (request.method === "DELETE") {
        await env.db.prepare("DELETE FROM projects WHERE id=?").bind(id).run();
        return response({ deleted: true, id }, request, env);
      }
    }

    if (url.pathname === "/api/settings" && request.method === "GET") {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const rows = await env.db.prepare("SELECT key,value FROM site_settings").all();
      return response({ settings: Object.fromEntries((rows.results || []).map(row => [row.key, JSON.parse(row.value)])) }, request, env);
    }
    if (url.pathname === "/api/settings" && request.method === "PUT") {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const body = await request.json().catch(() => null);
      if (!body || !body.settings || typeof body.settings !== "object") return response({ error: "Settings object is required" }, request, env, 400);
      for (const [key,value] of Object.entries(body.settings)) {
        if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key)) continue;
        await env.db.prepare("INSERT INTO site_settings (key,value,updated_at) VALUES (?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')").bind(key,JSON.stringify(value)).run();
      }
      return response({ saved: true }, request, env);
    }
    if (url.pathname === "/api/publish" && request.method === "POST") {
      if (!env.db) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const projects = await env.db.prepare("SELECT * FROM projects ORDER BY sort_order ASC,updated_at DESC").all();
      const settings = await env.db.prepare("SELECT key,value FROM site_settings").all();
      const snapshot = JSON.stringify({ projects: projects.results || [], settings: settings.results || [] });
      const id = crypto.randomUUID();
      await env.db.prepare("INSERT INTO publish_revisions (id,snapshot_json) VALUES (?,?)").bind(id,snapshot).run();
      const count = (projects.results || []).filter(p => p.status === "published").length;
      return response({ published: true, revision: id, projectCount: count }, request, env);
    }

    if (url.pathname === "/api/media/gallery-clear" && request.method === "POST") {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const body = await request.json().catch(() => null);
      if (body?.confirm !== "CLEAR MAIN GALLERY") return response({ error: "Explicit gallery confirmation is required" }, request, env, 400);
      const keys = [];
      let cursor;
      do {
        const listed = await env.MEDIA.list({ prefix: "gallery/", limit: 1000, ...(cursor ? { cursor } : {}) });
        keys.push(...(listed.objects || []).map(object => object.key));
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
      if (env.db && keys.length) {
        const referenced = [];
        for (const key of keys) {
          const row = await env.db.prepare(
            "SELECT 1 AS ok FROM project_media WHERE object_key=? UNION SELECT 1 AS ok FROM projects WHERE cover_key=? LIMIT 1"
          ).bind(key, key).first();
          if (row) referenced.push(key);
        }
        if (referenced.length) return response({
          error: "Some main-gallery files are also used by portfolio projects. Nothing was deleted. Remove those files from their project references first.",
          referencedCount: referenced.length
        }, request, env, 409);
      }
      for (const key of keys) await env.MEDIA.delete(key);
      return response({ deleted: keys.length, folder: "gallery/" }, request, env);
    }

    if (url.pathname === "/api/media/bulk-delete" && request.method === "POST") {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const body = await request.json().catch(() => null);
      if (!body || (body.all !== true && !Array.isArray(body.keys))) return response({ error: "Provide keys or set all=true" }, request, env, 400);
      let keys = [];
      if (body.all === true) {
        if (body.confirm !== "DELETE ALL MEDIA") return response({ error: "Explicit confirmation is required" }, request, env, 400);
        let cursor;
        do {
          const listed = await env.MEDIA.list({ limit: 1000, ...(cursor ? { cursor } : {}) });
          keys.push(...(listed.objects || []).filter(object => !object.key.startsWith("thumbs/")).map(object => object.key));
          cursor = listed.truncated ? listed.cursor : undefined;
        } while (cursor);
      } else {
        if (body.keys.length > 1000) return response({ error: "Delete at most 1000 marked files at a time" }, request, env, 400);
        keys = [...new Set(body.keys.map(safeKey).filter(Boolean))];
      }
      let deleted = 0;
      for (const key of keys) {
        await env.MEDIA.delete(key);
        if (env.db) {
          await env.db.prepare("DELETE FROM project_media WHERE object_key=?").bind(key).run();
          await env.db.prepare("UPDATE projects SET cover_key=NULL,updated_at=datetime('now') WHERE cover_key=?").bind(key).run();
        }
        deleted++;
      }
      return response({ deleted }, request, env);
    }

    if (url.pathname === "/api/media" && request.method === "GET") {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const prefix = url.searchParams.get("prefix") || "";
      const listed = await env.MEDIA.list({ prefix: safeKey(prefix) || undefined, limit: 1000 });
      const visible = listed.objects.filter(o => !o.key.startsWith("thumbs/"));
      return response({ objects: visible.map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded, etag: o.etag, contentType: o.httpMetadata?.contentType || null })), truncated: listed.truncated, cursor: listed.cursor || null }, request, env);
    }

    if (url.pathname === "/api/media" && request.method === "POST") {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const body = await request.json().catch(() => null);
      const filename = safeFilename(body?.filename);
      const folder = safeKey(body?.folder || "uploads");
      if (!body || !["uploads","gallery","backgrounds","thumbs"].includes(folder)) return response({ error: "Invalid upload folder" }, request, env, 400);
      const requestedKey = body?.key ? safeKey(body.key) : null;
      if (body?.key && (!requestedKey || !requestedKey.startsWith("thumbs/"))) return response({ error: "Invalid derivative key" }, request, env, 400);
      const key = requestedKey || folder + "/" + crypto.randomUUID() + "-" + filename;
      return response({ key, uploadUrl: "/api/media/" + key.split("/").map(encodeURIComponent).join("/"), method: "PUT", maxBytes: 100 * 1024 * 1024 }, request, env, 201);
    }

    if (url.pathname.startsWith("/api/media/")) {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const key = safeKey(decodeURIComponent(url.pathname.slice("/api/media/".length)));
      if (!key) return response({ error: "Invalid object key" }, request, env, 400);
      if (request.method === "PUT") {
        const length = Number(request.headers.get("content-length") || 0);
        if (length > 100 * 1024 * 1024) return response({ error: "Upload exceeds the 100 MB request limit. Use a multipart upload workflow for larger files." }, request, env, 413);
        const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        const allowedTypes = new Set(["image/jpeg","image/png","image/webp","image/gif","image/avif","image/heic","image/heif","video/mp4","video/quicktime","video/webm"]);
        if (!allowedTypes.has(contentType)) return response({ error: "Unsupported media type" }, request, env, 415);
        if (!request.body) return response({ error: "Upload body is required" }, request, env, 400);
        const visibility = key.startsWith("gallery/") ? "public" : "private";
        const maxBytes = 100 * 1024 * 1024;
        let receivedBytes = 0;
        const limitedBody = request.body.pipeThrough(new TransformStream({
          transform(chunk, controller) {
            receivedBytes += chunk.byteLength;
            if (receivedBytes > maxBytes) throw new Error("UPLOAD_TOO_LARGE");
            controller.enqueue(chunk);
          }
        }));
        let object;
        try {
          object = await env.MEDIA.put(key, limitedBody, { httpMetadata: { contentType }, customMetadata: { visibility } });
        } catch (error) {
          if (error?.message === "UPLOAD_TOO_LARGE") {
            return response({ error: "Upload exceeds the 100 MB request limit. Use a multipart upload workflow for larger files." }, request, env, 413);
          }
          throw error;
        }
        return response({ key, size: object.size, etag: object.etag, uploaded: true }, request, env, 201);
      }
      if (request.method === "GET") {
        const object = await env.MEDIA.get(key);
        if (!object) return response({ error: "Not found" }, request, env, 404);
        const headers = new Headers(corsHeaders(request, env));
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("cache-control", "private, no-store");
        return new Response(object.body, { headers });
      }
      if (request.method === "DELETE") {
        await env.MEDIA.delete(key);
        return response({ deleted: true, key }, request, env);
      }
    }
    return response({ error: "Not found" }, request, env, 404);
  }
};
