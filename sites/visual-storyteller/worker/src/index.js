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
    crypto.subtle.digest && timingSafeEqual(supplied, expected));
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
    const denied = await requireAdmin(request, env);
    if (denied) return response({ error: "Unauthorised" }, request, env, 401);

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
