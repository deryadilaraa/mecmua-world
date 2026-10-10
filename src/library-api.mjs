const reply = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const trim = (v, max) => typeof v === 'string' ? v.trim().slice(0,max) : '';
export function validateEntry(body) {
  const title=trim(body.title,300), section_id=trim(body.section_id,100), creator=trim(body.creator,300), source_url=trim(body.source_url,2000), notes=trim(body.notes,20000);
  if(!title || !section_id) return {error:'Choose a section and enter a title.'};
  if(source_url) { try { if(!['https:','http:'].includes(new URL(source_url).protocol)) throw Error(); } catch { return {error:'Enter a complete http or https link.'}; } }
  return {data:{title,section_id,creator,source_url,notes}};
}
async function initialise(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS library_sections (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, position INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS library_entries (id TEXT PRIMARY KEY, section_id TEXT NOT NULL REFERENCES library_sections(id), title TEXT NOT NULL, creator TEXT NOT NULL DEFAULT \'\', source_url TEXT NOT NULL DEFAULT \'\', notes TEXT NOT NULL DEFAULT \'\', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)'),
    ...['Moving Images','Music','Literature','Art'].map((name,i)=>db.prepare('INSERT OR IGNORE INTO library_sections (id,name,position) VALUES (?,?,?)').bind('section-'+i,name,i)),
    ...[
      ['samadhi','Samadhi','https://awakentheworld.com/series/samadhi-film-series/'],
      ['inner-worlds','Inner Worlds, Outer Worlds','https://awakentheworld.com/series/inner-worlds-outer-worlds-series/']
    ].map(([id,title,url],i)=>db.prepare('INSERT OR IGNORE INTO library_entries (id,section_id,title,creator,source_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(id,'section-0',title,'Director: Daniel Schmidt (Dan Schmidt)',url,i,i))
  ]);
}
export async function handleLibrary(path, method, env, body) {
  if(!['/api/library','/api/library/sections','/api/library/entries'].includes(path) && !/^\/api\/library\/entries\/[A-Za-z0-9-]+$/.test(path)) return reply({error:'Not found.'},404);
  await initialise(env.DB);
  if(path==='/api/library' && method==='GET') {
    const [{results:sections},{results:entries}] = await env.DB.batch([
      env.DB.prepare('SELECT * FROM library_sections ORDER BY position, name'),
      env.DB.prepare('SELECT * FROM library_entries ORDER BY created_at, id')
    ]);
    return reply({sections,entries});
  }
  if(path==='/api/library/sections' && method==='POST') {
    const name=trim(body.name,100);
    if(!name) return reply({error:'Enter a section name.'},400);
    const existing=await env.DB.prepare('SELECT * FROM library_sections WHERE name = ? COLLATE NOCASE').bind(name).first();
    if(existing) return reply(existing);
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT OR IGNORE INTO library_sections (id,name,position) SELECT ?,?,COALESCE(MAX(position),-1)+1 FROM library_sections').bind(id,name).run();
    return reply(await env.DB.prepare('SELECT * FROM library_sections WHERE name = ? COLLATE NOCASE').bind(name).first(),201);
  }
  const match=path.match(/^\/api\/library\/entries\/([A-Za-z0-9-]+)$/);
  if((path==='/api/library/entries' && method==='POST') || (match && method==='PATCH')) {
    const {data,error}=validateEntry(body);
    if(error) return reply({error},400);
    if(!await env.DB.prepare('SELECT id FROM library_sections WHERE id=?').bind(data.section_id).first()) return reply({error:'This section does not exist.'},400);
    const id=match ? match[1] : crypto.randomUUID(), now=Date.now();
    if(match) {
      const {meta}=await env.DB.prepare('UPDATE library_entries SET section_id=?,title=?,creator=?,source_url=?,notes=?,updated_at=? WHERE id=?').bind(data.section_id,data.title,data.creator,data.source_url,data.notes,now,id).run();
      if(!meta.changes) return reply({error:'This entry no longer exists.'},404);
    } else await env.DB.prepare('INSERT INTO library_entries (id,section_id,title,creator,source_url,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,data.section_id,data.title,data.creator,data.source_url,data.notes,now,now).run();
    return reply({id,...data},match?200:201);
  }
  return reply({error:'Method not allowed.'},405);
}
