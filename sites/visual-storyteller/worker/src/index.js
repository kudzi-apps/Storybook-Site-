const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
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
  if (!authorised(request, env)) return json({ error: "Unauthorised" }, 401);
  return null;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/api/health" && request.method === "GET") {
      return response({ ok: true, service: "visual-storyteller-media-api", storage: Boolean(env.MEDIA), database: Boolean(env.DB) }, request, env);
    }
    if (url.pathname === "/api/public/projects" && request.method === "GET") {
      if (!env.DB) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const rows = await env.DB.prepare("SELECT id,title,category,description,location,project_date,cover_key,sort_order FROM projects WHERE status='published' ORDER BY sort_order ASC, updated_at DESC").all();
      return response({ projects: rows.results || [] }, request, env);
    }

    const denied = await requireAdmin(request, env);
    if (denied) return response({ error: "Unauthorised" }, request, env, 401);

    if (url.pathname === "/api/projects" && request.method === "GET") {
      if (!env.DB) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const rows = await env.DB.prepare("SELECT * FROM projects ORDER BY sort_order ASC, updated_at DESC").all();
      return response({ projects: rows.results || [] }, request, env);
    }
    if (url.pathname === "/api/projects" && request.method === "POST") {
      if (!env.DB) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const body = await request.json().catch(() => null);
      const category = body?.category;
      const title = String(body?.title || "").trim().slice(0, 160);
      if (!title || !["Photography","Videography","Storybook"].includes(category)) return response({ error: "A title and valid category are required" }, request, env, 400);
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO projects (id,title,category,description,location,project_date,cover_key,status,sort_order) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(id,title,String(body.description || "").slice(0,4000),String(body.location || "").slice(0,200),body.project_date || null,body.cover_key || null,body.status === "published" ? "published" : "draft",Number.isInteger(body.sort_order) ? body.sort_order : 0).run();
      return response({ id, created: true }, request, env, 201);
    }
    if (url.pathname.startsWith("/api/projects/")) {
      if (!env.DB) return response({ error: "D1 binding DB is not configured" }, request, env, 503);
      const id = url.pathname.slice("/api/projects/".length);
      if (!id || id.includes("/")) return response({ error: "Invalid project ID" }, request, env, 400);
      if (request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body) return response({ error: "Invalid project data" }, request, env, 400);
        const category = body.category;
        if (category && !["Photography","Videography","Storybook"].includes(category)) return response({ error: "Invalid category" }, request, env, 400);
        const current = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
        if (!current) return response({ error: "Project not found" }, request, env, 404);
        const next = { ...current, ...body };
        if (!String(next.title || "").trim()) return response({ error: "Title is required" }, request, env, 400);
        if (!["draft","published"].includes(next.status)) return response({ error: "Invalid status" }, request, env, 400);
        await env.DB.prepare("UPDATE projects SET title=?,category=?,description=?,location=?,project_date=?,cover_key=?,status=?,sort_order=?,updated_at=datetime('now') WHERE id=?")
          .bind(String(next.title).trim().slice(0,160),next.category,String(next.description || "").slice(0,4000),String(next.location || "").slice(0,200),next.project_date || null,next.cover_key || null,next.status,Number.isInteger(next.sort_order) ? next.sort_order : 0,id).run();
        return response({ updated: true, id }, request, env);
      }
      if (request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM projects WHERE id=?").bind(id).run();
        return response({ deleted: true, id }, request, env);
      }
    }

    if (url.pathname === "/api/media" && request.method === "GET") {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const prefix = url.searchParams.get("prefix") || "";
      const listed = await env.MEDIA.list({ prefix: safeKey(prefix) || undefined, limit: 1000 });
      return response({ objects: listed.objects.map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded, etag: o.etag, contentType: o.httpMetadata?.contentType || null })), truncated: listed.truncated, cursor: listed.cursor || null }, request, env);
    }

    if (url.pathname === "/api/media" && request.method === "POST") {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const body = await request.json().catch(() => null);
      const filename = safeFilename(body?.filename);
      const folder = safeKey(body?.folder || "uploads");
      if (!body || !folder) return response({ error: "Invalid upload details" }, request, env, 400);
      const key = folder + "/" + crypto.randomUUID() + "-" + filename;
      return response({ key, uploadUrl: "/api/media/" + encodeURIComponent(key), method: "PUT", maxBytes: 100 * 1024 * 1024 }, request, env, 201);
    }

    if (url.pathname.startsWith("/api/media/")) {
      if (!env.MEDIA) return response({ error: "R2 binding MEDIA is not configured" }, request, env, 503);
      const key = safeKey(decodeURIComponent(url.pathname.slice("/api/media/".length)));
      if (!key) return response({ error: "Invalid object key" }, request, env, 400);
      if (request.method === "PUT") {
        const length = Number(request.headers.get("content-length") || 0);
        if (length > 100 * 1024 * 1024) return response({ error: "Upload exceeds the 100 MB request limit. Use a multipart upload workflow for larger files." }, request, env, 413);
        const contentType = request.headers.get("content-type") || "application/octet-stream";
        const object = await env.MEDIA.put(key, request.body, { httpMetadata: { contentType }, customMetadata: { visibility: "private" } });
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
