'use strict';
const {plainText,validDate}=require('./demands.cjs');
const {GENERAL_FOLDERS,GENERAL_ARCHIVE_LABEL}=require('./mailbox-labels.cjs');
const {readGmail}=require('./gmail-errors.cjs');
const BASE='https://gmail.googleapis.com/gmail/v1/users/me';
const validId=value=>typeof value==='string'&&/^[\w-]{1,128}$/.test(value);
const fail=(code,status)=>{throw Object.assign(new Error(code),{status});};
const fold=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const months=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const entities={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",aacute:'á',agrave:'à',acirc:'â',atilde:'ã',eacute:'é',ecirc:'ê',iacute:'í',oacute:'ó',ocirc:'ô',otilde:'õ',uacute:'ú',uuml:'ü',ccedil:'ç'};
const civil=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
function dateValue(year,month,day){
  if(!year)return null;
  const value=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return validDate(value)?value:null;
}
// Convert HTML to inert text only. Never render HTML or fetch its resources.
function htmlText(part){
  if(!part||part.filename)return '';
  if(part.mimeType==='text/html'&&part.body?.data){
    return Buffer.from(part.body.data,'base64url').toString('utf8').slice(0,200000)
      .replace(/<(script|style|blockquote)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
      .replace(/<(?:br\b[^>]*|\/(?:p|div|li|tr|h[1-6])\s*)>/gi,'\n').replace(/<[^>]*>/g,' ')
      .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi,(all,entity)=>{
        if(entity[0]==='#'){
          const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));
          return n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';
        }
        return entities[entity.toLowerCase()]||all;
      }).slice(0,100000);
  }
  return (part.parts||[]).map(htmlText).filter(Boolean).join('\n').slice(0,100000);
}
function currentText(text){
  const lines=text.replace(/\r/g,'').split('\n'),result=[];
  for(const line of lines){
    if(/^\s*(?:>+|Em .+ escreveu:|On .+ wrote:|-+\s*(?:Mensagem original|Original Message|Forwarded message)|De:.*@)/i.test(line))break;
    result.push(line);
  }
  return result.join('\n');
}
function extractActivities(text,subject,receivedAt){
  const source=currentText(text).slice(0,100000).replace(/((?:prazo|data limite|at[eé])\s*:?)[ \t]*\n[ \t]*(?=\d)/gi,'$1 ');
  // Keep each sentence/line as evidence; do not borrow a deadline from another sentence.
  const sentences=source.split(/\n+|(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
  const activities=[];
  for(const evidence of sentences){
    const normalized=fold(evidence);
    const cue=/\b(?:prazo|data[ -]limite|ate|entregar|entrega|enviar|envio|encaminhar|encaminhamento|preencher|preenchimento|responder|resposta|concluir|conclusao|realizar|realizacao|inscrever|inscricoes)\b/.exec(normalized);
    if(!cue)continue;
    const pattern=/\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}|\d{2}))?\b|\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+(?:de\s+)?(\d{4}))?\b|\b(hoje|amanha)\b/g;
    const matches=[...normalized.matchAll(pattern)].filter(m=>m.index>cue.index);
    if(!matches.length)continue;
    let dueDate=null,reason=null;
    const match=matches[0];
    if(matches.length>1)reason='Há várias datas neste trecho; confira qual é o prazo de cada atividade.';
    else if(/\b(?:nao|sem|cancelad\w*|prorrogad\w*|suspens\w*)\b/.test(normalized))reason='O trecho menciona negação ou mudança de prazo; confira a mensagem.';
    else if(match[1])dueDate=dateValue(match[1],match[2],match[3]);
    else if(match[4])dueDate=match[6]?.length===4?dateValue(match[6],match[5],match[4]):null;
    else if(match[7])dueDate=dateValue(match[9],months.indexOf(match[8])+1,match[7]);
    else if(match[10]&&Number.isFinite(receivedAt)&&receivedAt>0){
      const base=civil(new Date(receivedAt));
      const day=new Date(base+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+(match[10]==='amanha'?1:0));
      dueDate=day.toISOString().slice(0,10);
      reason='Data relativa calculada a partir do recebimento em Brasília; confira a intenção do remetente.';
    }
    if(!dueDate&&!reason)reason='Data incompleta ou inválida; confira o ano e o calendário no e-mail.';
    // Event dates alone do not establish a delivery deadline.
    const before=normalized.slice(cue.index,match.index);
    if(!/\b(?:ate|prazo|data[ -]limite|entrega|envio|encaminhamento|preenchimento|conclusao|inscricoes)\b/.test(before)){
      dueDate=null;reason='Uma data foi mencionada junto de uma atividade, mas não há indicação clara de prazo.';
    }
    activities.push({activity:evidence.slice(0,300),dueDate,evidence:evidence.slice(0,1800),review:reason});
  }
  if(!activities.length&&subject)return extractActivities(subject,'',receivedAt).map(item=>({...item,activity:item.evidence?item.activity:subject}));
  return activities.length?activities:[{activity:subject||'(Sem assunto)',dueDate:null,evidence:'',review:'Prazo não identificado no texto disponível.'}];
}
// Keep existing column IDs stable for clients with a previous release cached.
const ARCHIVE_COLUMN=4;
const FOLDERS=['INBOX',...GENERAL_FOLDERS,GENERAL_ARCHIVE_LABEL];
async function handleInstitutional({action='institutional',url,body={},client,store,owner,email,canModify=false}){
  const moving=action==='institutional-move';
  const deadArchive=body.operation==='dead-archive',restoring=body.operation==='restore';
  const archiveMove=deadArchive||restoring;
  const annual=body.operation==='annual',classifying=body.operation==='classify';
  const observations=typeof body.observations==='string'?body.observations.trim():'';
  if((moving?body.mailbox:url.searchParams.get('mailbox'))!==email)fail('account_changed',409);
  const request=async path=>(await readGmail(client,{url:BASE+path,timeout:10000})).data;
  if(moving){
    if(body.type!=='general'||!validId(body.messageId)||!['classify','annual','archive','dead-archive','restore'].includes(body.operation)||Object.keys(body).some(key=>!['type','mailbox','messageId','operation',...(!archiveMove?['dueDate','version']:[]),...(annual?['observations']:[])].includes(key)))fail('invalid_institutional',400);
    if((classifying||annual)&&(!Number.isSafeInteger(body.version)||body.version<0))fail('invalid_institutional',400);
    if(classifying&&(!body.dueDate||!validDate(body.dueDate)))fail('invalid_institutional',400);
    if(annual&&(!observations||body.observations.length>4000))fail('invalid_institutional',400);
    if(!canModify)fail('institutional_scope',403);
  }
  const column=Number(url.searchParams.get('column')||'0');
  const page=url.searchParams.get('page')||'';
  if(!moving&&(!/^[0-4]$/.test(url.searchParams.get('column')||'0')))fail('invalid_column',400);
  if(!moving&&page.length>2048)fail('invalid_page',400);
  const {labels=[]}=await request('/labels');
  const ids=FOLDERS.map((name,i)=>i===0?'INBOX':labels.find(label=>label.name===name)?.id||null);
  const archiveId=ids[ARCHIVE_COLUMN];
  if(moving){
    const [inbox,classified,archived,annualLabel]=ids;
    if(archiveMove&&!archiveId)fail('archive_label_missing',409);
    if(!archiveMove&&(!classified||!archived||(annual&&!annualLabel)))fail('labels_missing',409);
    const id=body.messageId;
    let message=await request('/messages/'+id+'?format=metadata');
    if(message?.id!==id)fail('invalid_provider',502);
    const eligible=m=>{
      const current=m.labelIds||[];
      if(current.some(l=>['SPAM','TRASH','DRAFT'].includes(l)))return false;
      if(restoring)return current.includes(archiveId)||current.includes(inbox);
      if(current.includes(archiveId))return deadArchive;
      if(annual)return current.includes(inbox)&&![classified,archived,annualLabel].some(l=>current.includes(l));
      if(classifying)return ![archived,annualLabel].some(l=>current.includes(l))&&[inbox,classified].some(l=>current.includes(l));
      return ids.some(l=>l&&current.includes(l));
    };
    if(!eligible(message))fail('not_inbox',409);
    let saved=null;
    if(classifying||annual){
      const previous=(await store.getInstitutionalDemands(owner,[id]))[0];
      const matching=previous?.mailbox===email?previous:null;
      const field=annual?'observations':'dueDate',value=annual?observations:body.dueDate;
      if(matching?.[field]===value)saved=matching;
      else{
        if(body.version!==(previous?.version||0))fail('conflict',409);
        saved=await store.saveInstitutionalDemand(owner,id,{mailbox:email,dueDate:matching?.dueDate||null,observations:matching?.observations||null,[field]:value},body.version);
        if(!saved)fail('conflict',409);
      }
      // Recheck Gmail after saving to avoid moving a message that left its source.
      message=await request('/messages/'+id+'?format=metadata');
      if(message?.id!==id||!eligible(message))fail('not_inbox',409);
    }
    const target=restoring?inbox:deadArchive?archiveId:annual?annualLabel:classifying?classified:archived;
    const remove=restoring?[archiveId]:deadArchive?ids.slice(0,ARCHIVE_COLUMN).filter(Boolean):annual||classifying?[inbox]:[inbox,classified,annualLabel].filter(Boolean);
    let result=message;
    if(!archiveMove||!message.labelIds?.includes(target)||remove.some(label=>message.labelIds?.includes(label))){
      ({data:result}=await client.request({url:BASE+'/messages/'+id+'/modify',method:'POST',data:{addLabelIds:[target],removeLabelIds:remove},timeout:10000,...(archiveMove?{retry:false}:{})}));
    }
    if(result?.id!==id||!(result.labelIds||[]).includes(target)||remove.some(l=>(result.labelIds||[]).includes(l)))fail('classification_unconfirmed',502);
    return {mailbox:email,messageId:id,operation:body.operation,demand:saved?{dueDate:saved.dueDate,observations:saved.observations||null,version:saved.version}:null};
  }
  if(!ids[column])return {mailbox:email,column,items:[],nextPage:null,missingLabels:column!==ARCHIVE_COLUMN,archiveMissing:!archiveId,canModify};
  let messages,nextPage,demands;
  if(column===1){
    // Gmail orders by receipt, not by the saved deadline. Scan only IDs first,
    // then sort by encrypted auxiliary dates before retrieving this page's bodies.
    if(page&&!/^\d{1,8}$/.test(page))fail('invalid_page',400);
    const all=new Map();let token='';let pages=0;
    do{
      const params=new URLSearchParams({labelIds:ids[1],maxResults:'500',includeSpamTrash:'false'});if(token)params.set('pageToken',token);
      const listed=await request('/messages?'+params);
      for(const item of listed.messages||[]){if(!validId(item.id))fail('invalid_provider',502);all.set(item.id,item);}
      token=listed.nextPageToken||'';if(++pages>=20&&token)fail('listing_limit',503);
    }while(token);
    const allDemands=await store.getInstitutionalDemands(owner,[...all.keys()]);
    const byId=new Map(allDemands.filter(row=>row.mailbox===email).map(row=>[row.messageId,row]));
    const sorted=[...all.values()].sort((a,b)=>(byId.get(a.id)?.dueDate||'9999-12-31').localeCompare(byId.get(b.id)?.dueDate||'9999-12-31')||a.id.localeCompare(b.id));
    const offset=Number(page)||0;messages=sorted.slice(offset,offset+20);nextPage=offset+20<sorted.length?String(offset+20):null;demands=byId;
  }else{
    const params=new URLSearchParams({labelIds:ids[column],maxResults:'20',includeSpamTrash:'false'});if(page)params.set('pageToken',page);
    const listed=await request('/messages?'+params);messages=listed.messages||[];nextPage=listed.nextPageToken||null;
    if(!Array.isArray(messages)||messages.length>20||messages.some(m=>!validId(m.id)))fail('invalid_provider',502);
    const rows=await store.getInstitutionalDemands(owner,messages.map(m=>m.id));
    demands=new Map(rows.filter(row=>row.mailbox===email).map(row=>[row.messageId,row]));
  }
  const items=new Array(messages.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,messages.length)},async()=>{
    while(cursor<messages.length){
      const index=cursor++,id=messages[index].id;
      try {
        const message=await request('/messages/'+id+'?format=full');
        if(message.id!==id||!validId(message.threadId))fail('invalid_provider',502);
        const labels=message.labelIds||[];
        if(!labels.includes(ids[column])||labels.some(l=>['TRASH','SPAM','DRAFT'].includes(l))||(column!==ARCHIVE_COLUMN&&labels.includes(archiveId)))continue;
        const headers=Object.fromEntries((message.payload?.headers||[]).map(h=>[h.name.toLowerCase(),String(h.value||'')]));
        const subject=headers.subject||'(Sem assunto)',date=Number(message.internalDate)||0;
        const text=plainText(message.payload)||htmlText(message.payload),demand=demands.get(id);
        items[index]={id,threadId:message.threadId,subject,from:headers.from||'',date,unread:labels.includes('UNREAD'),dueDate:demand?.dueDate||null,observations:demand?.observations||null,version:demand?.version||0,limitedText:!text||text.length>=100000,activities:extractActivities(text,subject,date)};
      }catch(error){if(error.response?.status!==404)throw error;}
    }
  }));
  const result=items.filter(Boolean);
  if(column!==1)result.sort((a,b)=>b.date-a.date||a.id.localeCompare(b.id));
  return {mailbox:email,column,items:result,nextPage,canModify,missingLabels:!ids[1]||!ids[2],archiveMissing:!archiveId};
}
module.exports={handleInstitutional,extractActivities,htmlText,currentText,FOLDERS};
