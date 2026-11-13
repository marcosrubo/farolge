'use strict';
const {plainText,validDate}=require('./demands.cjs');
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
async function handleInstitutional({url,client,email}){
  if(url.searchParams.get('mailbox')!==email)fail('account_changed',409);
  const page=url.searchParams.get('page')||'';if(page.length>2048)fail('invalid_page',400);
  const params=new URLSearchParams({labelIds:'INBOX',maxResults:'20',includeSpamTrash:'false'});
  if(page)params.set('pageToken',page);
  const request=async path=>(await client.request({url:BASE+path,timeout:10000})).data;
  const listed=await request('/messages?'+params),messages=listed.messages||[];
  if(!Array.isArray(messages)||messages.length>20)fail('invalid_provider',502);
  const items=new Array(messages.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,messages.length)},async()=>{
    while(cursor<messages.length){
      const index=cursor++,id=messages[index].id;if(!validId(id))fail('invalid_provider',502);
      try {
        const message=await request('/messages/'+id+'?format=full');
        if(message.id!==id||!validId(message.threadId))fail('invalid_provider',502);
        const labels=message.labelIds||[];
        if(!labels.includes('INBOX')||labels.some(l=>['TRASH','SPAM','DRAFT'].includes(l)))continue;
        const headers=Object.fromEntries((message.payload?.headers||[]).map(h=>[h.name.toLowerCase(),String(h.value||'')]));
        const subject=headers.subject||'(Sem assunto)',date=Number(message.internalDate)||0;
        const text=plainText(message.payload)||htmlText(message.payload);
        items[index]={id,threadId:message.threadId,subject,from:headers.from||'',date,unread:labels.includes('UNREAD'),limitedText:!text||text.length>=100000,activities:extractActivities(text,subject,date)};
      }catch(error){if(error.response?.status!==404)throw error;}
    }
  }));
  return {mailbox:email,items:items.filter(Boolean),nextPage:listed.nextPageToken||null};
}
module.exports={handleInstitutional,extractActivities,htmlText,currentText};
