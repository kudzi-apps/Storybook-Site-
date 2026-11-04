const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const cors = { "access-control-allow-origin": "https://visual-story-teller.pages.dev", "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-allow-headers": "content-type,authorization", "vary": "Origin" };
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{...JSON_HEADERS,...cors}});
const fail = (message,status=400) => json({error:message},status);
const enc = value => new TextEncoder().encode(value);
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64 = value => Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function sign(value, secret) {
  const key=await crypto.subtle.importKey("raw",enc(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return b64(await crypto.subtle.sign("HMAC",key,enc(value)));
}
async function tokenFor(secret) {
  const payload=b64(enc(JSON.stringify({exp:Date.now()+8*60*60*1000,scope:"admin"})));
  return payload+"."+await sign(payload,secret);
}
async function validToken(request,secret) {
  const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  const [payload,signature]=token.split(".");
  if(!payload||!signature||signature!==await sign(payload,secret))return false;
  try { const data=JSON.parse(new TextDecoder().decode(unb64(payload))); return data.scope==="admin"&&data.exp>Date.now(); } catch { return false; }
}
async function schema(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, description TEXT DEFAULT '', location TEXT DEFAULT '', project_date TEXT DEFAULT '', cover_key TEXT DEFAULT '', featured INTEGER DEFAULT 0, published INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, project_id TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS revisions (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
  ]);
}
function safeName(name){return String(name||"upload").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(-100)||"upload";}
export default {
 async fetch(request,env) {
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url), path=url.pathname;
  if(!env.db||!env.MEDIA) return fail("Database or media storage binding is missing",503);
  await schema(env.db);
  if(path==="/api/health") return json({ok:true,service:"visual-storyteller-media-api"});
  if(path==="/api/auth/login"&&request.method==="POST") {
    const body=await request.json().catch(()=>({}));
    if(!env.ADMIN_PASSWORD||body.password!==env.ADMIN_PASSWORD)return fail("Invalid login details",401);
    return json({token:await tokenFor(env.ADMIN_PASSWORD),expiresIn:28800});
  }
  if(path.startsWith("/api/admin/")) {
    if(!await validToken(request,env.ADMIN_PASSWORD||""))return fail("Unauthorised",401);
    if(path==="/api/admin/projects"&&request.method==="GET") {
      const {results}=await env.db.prepare("SELECT * FROM projects ORDER BY featured DESC, sort_order ASC, created_at DESC").all();
      return json({projects:results});
    }
    if(path==="/api/admin/projects"&&request.method==="POST") {
      const b=await request.json(); if(!b.title||!b.category)return fail("Title and category are required");
      const id=crypto.randomUUID();
      await env.db.prepare("INSERT INTO projects (id,title,category,description,location,project_date,cover_key,featured,published,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id,b.title,b.category,b.description||"",b.location||"",b.project_date||"",b.cover_key||"",b.featured?1:0,b.published?1:0,Number(b.sort_order)||0).run();
      return json({project:await env.db.prepare("SELECT * FROM projects WHERE id=?").bind(id).first()},201);
    }
    const pm=path.match(/^\/api\/admin\/projects\/([\w-]+)$/);
    if(pm&&request.method==="PUT") {
      const b=await request.json();
      await env.db.prepare("UPDATE projects SET title=?,category=?,description=?,location=?,project_date=?,cover_key=?,featured=?,published=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(b.title,b.category,b.description||"",b.location||"",b.project_date||"",b.cover_key||"",b.featured?1:0,b.published?1:0,Number(b.sort_order)||0,pm[1]).run();
      return json({project:await env.db.prepare("SELECT * FROM projects WHERE id=?").bind(pm[1]).first()});
    }
    if(pm&&request.method==="DELETE") { await env.db.prepare("DELETE FROM projects WHERE id=?").bind(pm[1]).run(); return json({deleted:true}); }
    if(path==="/api/admin/media"&&request.method==="GET") {
      const {results}=await env.db.prepare("SELECT * FROM media ORDER BY created_at DESC").all();
      return json({media:results.map(x=>({...x,url:"/api/media/"+encodeURIComponent(x.id)}))});
    }
    if(path==="/api/admin/upload"&&request.method==="POST") {
      const form=await request.formData(), file=form.get("file");
      if(!file||typeof file.arrayBuffer!=="function")return fail("Choose a file to upload");
      if(file.size>100*1024*1024)return fail("Maximum upload size is 100 MB",413);
      const id=crypto.randomUUID(), key="uploads/"+id+"/"+safeName(file.name);
      await env.MEDIA.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type||"application/octet-stream"}});
      await env.db.prepare("INSERT INTO media (id,object_key,filename,content_type,size,project_id) VALUES (?,?,?,?,?,?)").bind(id,key,file.name,file.type||"application/octet-stream",file.size,String(form.get("project_id")||"")).run();
      return json({id,key,filename:file.name,size:file.size},201);
    }
    if(path==="/api/admin/settings"&&request.method==="GET") {
      const {results}=await env.db.prepare("SELECT key,value FROM settings").all();
      return json({settings:Object.fromEntries(results.map(x=>[x.key,JSON.parse(x.value)]))});
    }
    if(path==="/api/admin/settings"&&request.method==="PUT") {
      const body=await request.json(), value=JSON.stringify(body.settings||{});
      await env.db.prepare("INSERT INTO settings (key,value) VALUES ('site',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(value).run();
      return json({saved:true});
    }
    if(path==="/api/admin/publish"&&request.method==="POST") {
      const {results}=await env.db.prepare("SELECT * FROM projects WHERE published=1 ORDER BY featured DESC,sort_order ASC,created_at DESC").all();
      const {results:settings}=await env.db.prepare("SELECT value FROM settings WHERE key='site'").all();
      const snapshot=JSON.stringify({projects:results,settings:settings[0]?JSON.parse(settings[0].value):{}});
      await env.db.prepare("INSERT INTO revisions (id,snapshot) VALUES (?,?)").bind(crypto.randomUUID(),snapshot).run();
      return json({published:true,projectCount:results.length});
    }
    return fail("Admin endpoint not found",404);
  }
  if(path.startsWith("/api/media/")&&request.method==="GET") {
    const id=decodeURIComponent(path.slice("/api/media/".length));
    const row=await env.db.prepare("SELECT * FROM media WHERE id=?").bind(id).first();
    if(!row)return fail("Media not found",404);
    const obj=await env.MEDIA.get(row.object_key); if(!obj)return fail("Media object missing",404);
    const headers=new Headers(cors); obj.writeHttpMetadata(headers); headers.set("etag",obj.httpEtag); headers.set("cache-control","public, max-age=3600");
    return new Response(obj.body,{headers});
  }
  if(path==="/api/public/projects"&&request.method==="GET") {
    const {results}=await env.db.prepare("SELECT id,title,category,description,location,project_date,cover_key,featured,sort_order FROM projects WHERE published=1 ORDER BY featured DESC,sort_order ASC,created_at DESC").all();
    return json({projects:results});
  }
  return fail("Not found",404);
 }
};