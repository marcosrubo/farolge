'use strict';
const LABELS=['1-ME DEVEM','2-MINHAS','3-DEVO'];
const BASE='https://gmail.googleapis.com/gmail/v1/users/me';
const validId=value=>typeof value==='string' && /^[\w-]{1,128}$/.test(value);
const fail=(code,status)=>{throw Object.assign(new Error(code),{status});};
const headers=message=>Object.fromEntries((message.payload?.headers||[]).map(h=>[h.name.toLowerCase(),h.value]));
const clean=value=>String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
function validDate(value){
  return value===null || (typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value>='1900-01-01' && value<='9999-12-31' && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value);
}
function plainText(part){
  if(!part || part.filename)return '';
  if(part.mimeType==='text/plain' && part.body?.data)return clean(Buffer.from(part.body.data,'base64url').toString('utf8')).slice(0,100000);
  return (part.parts||[]).map(plainText).filter(Boolean).join('\n').slice(0,100000);
}
async function limitedMap(values,fn){
  const results=new Array(values.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,values.length)},async()=>{while(cursor<values.length){const index=cursor++;results[index]=await fn(values[index]);}}));
  return results;
}
function summary(thread,labelIds){
  if(!validId(thread.id) || !Array.isArray(thread.messages) || !thread.messages.length)fail('invalid_provider',502);
  const messages=[...thread.messages].sort((a,b)=>Number(a.internalDate||0)-Number(b.internalDate||0));
  const relevant=messages.filter(m=>(m.labelIds||[]).some(id=>labelIds.includes(id)) && !(m.labelIds||[]).some(id=>['TRASH','SPAM','DRAFT'].includes(id)));
  if(!relevant.length)return null;
  const last=messages.at(-1),head=headers(last),first=relevant[0];
  return {id:thread.id,sourceMessageId:first.id,subject:clean(head.subject||headers(first).subject||'(Sem assunto)'),from:clean(head.from),to:clean(head.to),snippet:clean(last.snippet||thread.snippet),date:Number(last.internalDate)||0,unread:messages.some(m=>(m.labelIds||[]).includes('UNREAD')),messageCount:messages.length,labels:LABELS.filter((_,i)=>relevant.some(m=>(m.labelIds||[]).includes(labelIds[i])))};
}
function publicDemand(row){
  return row?{id:row.id,version:row.version,dueDate:row.dueDate,completed:row.completed,responsible:row.responsible,sourceMessageId:row.sourceMessageId,history:row.history}:null;
}
async function handleDemands({action,url,body,client,store,owner,email}){
  const request=async(path)=>{const {data}=await client.request({url:BASE+path,timeout:10000});return data;};
  const expected=action==='demand'?body.mailbox:url.searchParams.get('mailbox');
  if(expected!==email)fail('account_changed',409);
  if(action==='demand'){
    if(Object.keys(body).some(key=>!['type','mailbox','threadId','version','dueDate','completed','responsible'].includes(key)) || body.type!=='personal' || !validId(body.threadId) || !Number.isSafeInteger(body.version) || body.version<0 || !validDate(body.dueDate) || typeof body.completed!=='boolean' || typeof body.responsible!=='string' || body.responsible.length>200)fail('invalid_demand',400);
  }
  const {labels=[]}=await request('/labels');
  const ids=LABELS.map(name=>labels.find(label=>label.name===name)?.id||null);
  if(action==='board'){
    const column=Number(url.searchParams.get('column'));
    if(!/^[0-2]$/.test(url.searchParams.get('column')||''))fail('invalid_column',400);
    const page=url.searchParams.get('page')||'';
    if(page.length>2048)fail('invalid_page',400);
    if(!ids[column])return {mailbox:email,column,missingLabel:true,items:[],nextPage:null};
    const params=new URLSearchParams({labelIds:ids[column],maxResults:'20',includeSpamTrash:'false'});
    if(page)params.set('pageToken',page);
    const list=await request('/threads?'+params);
    const items=(await limitedMap(list.threads||[],async item=>{
      if(!validId(item.id))fail('invalid_provider',502);
      try {
        const thread=await request('/threads/'+item.id+'?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To');
        const card=summary(thread,ids);return card?.labels.includes(LABELS[column])?card:null;
      } catch(error){if(error.response?.status===404)return null;throw error;}
    })).filter(Boolean);
    const demands=await store.getDemands(owner,items.map(item=>item.id));
    return {mailbox:email,column,items:items.map(item=>({...item,demand:publicDemand(demands.find(row=>row.threadId===item.id))})),nextPage:list.nextPageToken||null};
  }
  const id=action==='demand'?body.threadId:url.searchParams.get('id');
  if(!validId(id))fail('invalid_thread',400);
  const thread=await request('/threads/'+id+'?format='+(action==='thread'?'full':'metadata'));
  const card=summary(thread,ids);if(!card)fail('not_found',404);
  const previous=(await store.getDemands(owner,[id]))[0]||null;
  if(action==='thread')return {mailbox:email,thread:{...card,demand:publicDemand(previous),messages:thread.messages.map(message=>{
    const h=headers(message),text=plainText(message.payload);
    return {id:message.id,from:clean(h.from),to:clean(h.to),date:Number(message.internalDate)||0,text:text||clean(message.snippet),previewOnly:!text};
  })}};
  if(body.version!==(previous?.version||0))fail('conflict',409);
  const state={dueDate:body.dueDate,completed:body.completed,responsible:body.responsible.trim()};
  if(previous && Object.keys(state).every(key=>previous[key]===state[key]))return {mailbox:email,demand:publicDemand(previous)};
  const before=previous?{dueDate:previous.dueDate,completed:previous.completed,responsible:previous.responsible}:null;
  const value={...state,sourceMessageId:previous?.sourceMessageId||card.sourceMessageId,history:[...(previous?.history||[]),{at:new Date().toISOString(),before,after:state}]};
  const saved=await store.saveDemand(owner,id,value,body.version);
  if(!saved)fail('conflict',409);
  return {mailbox:email,demand:publicDemand(saved)};
}
module.exports={handleDemands,validDate,plainText,summary};
