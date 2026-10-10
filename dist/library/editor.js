const $ = id => document.getElementById(id);
let catalogue = {sections:[],entries:[]}, editing = null, loaded = false;
async function api(path, method='GET', body) {
  const res=await fetch('/api/library'+path,{method,credentials:'same-origin',headers:{'content-type':'application/json'},...(body ? {body:JSON.stringify(body)} : {})});
  const data=await res.json().catch(()=>null);
  if(!res.ok || !data) throw Error(data?.error || 'Could not connect. Check your sign-in and try again.');
  return data;
}
function node(tag,text) { const n=document.createElement(tag); if(text)n.textContent=text; return n; }
function safeLink(value) {try {const u=new URL(value); return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function render() {
  const target=$('catalogue'); target.replaceChildren();
  const q=$('catalogue-search').value.trim().toLowerCase(); let visible=false;
  catalogue.sections.forEach((section,index)=>{
    const entries=catalogue.entries.filter(e=>e.section_id===section.id && (!q || [section.name,e.title,e.creator,e.notes].join(' ').toLowerCase().includes(q)));
    if(q && !entries.length && !section.name.toLowerCase().includes(q))return;
    visible=true;
    const group=node('section'), heading=node('h2',(index+1)+'. '+section.name), list=node('ul');
    group.append(heading,list);
    entries.forEach(entry=>{
      const item=node('li'), url=safeLink(entry.source_url);
      const title=node(url?'a':'span',entry.title); if(url) title.href=url;
      item.append(title);
      if(entry.creator) {const credit=node('div',entry.creator);credit.className='catalogue-credit';item.append(credit);}
      if(entry.notes) {const notes=node('p',entry.notes);notes.className='catalogue-credit';notes.style.whiteSpace='pre-wrap';item.append(notes);}
      const edit=node('button','Edit');edit.type='button';edit.className='edit-entry';edit.setAttribute('aria-label','Edit '+entry.title);edit.onclick=()=>openEntry(entry);item.append(edit);list.append(item);
    });
    target.append(group);
  });
  if(!visible)target.append(node('p','No matching entries.'));
}
function options(selected) {
  $('entry-section').replaceChildren(...catalogue.sections.map(s=>{const o=node('option',s.name);o.value=s.id;return o;}));
  if(selected)$('entry-section').value=selected;
}
function openEntry(entry=null) {
  editing=entry?.id || null; $('entry-heading').textContent=entry?'Edit Entry':'Add Entry';
  options(entry?.section_id); $('entry-title').value=entry?.title||''; $('entry-creator').value=entry?.creator||'';
  $('entry-link').value=entry?.source_url||''; $('entry-notes').value=entry?.notes||''; $('entry-status').textContent='';
  $('entry-form').hidden=false; $('entry-title').focus();
}
async function load() {
  $('retry-library').hidden=true;
  try { const data=await api(''); if(!Array.isArray(data.sections)||!Array.isArray(data.entries))throw Error('The catalogue update is not available yet. Please retry shortly.'); catalogue=data;loaded=true;render();$('add-entry').disabled=false;$('add-section').disabled=false;$('library-status').textContent=''; }
  catch(e) {$('library-status').textContent=e.message;$('retry-library').hidden=false;}
}
$('add-entry').onclick=()=>openEntry();
$('add-section').onclick=()=>{$('section-form').hidden=false;$('section-name').focus();};
$('cancel-entry').onclick=()=>{$('entry-form').hidden=true;$('add-entry').focus();};
$('cancel-section').onclick=()=>{$('section-form').hidden=true;$('add-section').focus();};
$('retry-library').onclick=load;
$('catalogue-search').oninput=()=>{if(loaded)render();};
$('section-form').onsubmit=async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;$('section-status').textContent='Saving…';
  try {const section=await api('/sections','POST',{name:$('section-name').value});if(!catalogue.sections.some(s=>s.id===section.id))catalogue.sections.push(section);render();options(section.id);$('section-form').reset();$('section-form').hidden=true;$('section-status').textContent='';$('library-status').textContent='Section saved.';$('add-section').focus();}
  catch(e){$('section-status').textContent=e.message;}
  finally {button.disabled=false;}
};
$('entry-form').onsubmit=async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;$('entry-status').textContent='Saving…';
  const body={section_id:$('entry-section').value,title:$('entry-title').value,creator:$('entry-creator').value,source_url:$('entry-link').value,notes:$('entry-notes').value};
  try {const entry=await api(editing?'/entries/'+editing:'/entries',editing?'PATCH':'POST',body);const index=catalogue.entries.findIndex(e=>e.id===entry.id);if(index<0)catalogue.entries.push(entry);else catalogue.entries[index]=entry;
    $('catalogue-search').value='';render();$('entry-form').hidden=true;$('entry-status').textContent='';$('library-status').textContent='Entry saved.';$('add-entry').focus();}
  catch(e){$('entry-status').textContent=e.message;}
  finally {button.disabled=false;}
};
load();
