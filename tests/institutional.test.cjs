'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {extractActivities,handleInstitutional,htmlText}=require('../server/institutional.cjs');
const received=Date.parse('2026-11-14T01:00:00Z'); // 13/11 in Brasília
const extract=text=>extractActivities(text,'Assunto',received);
for(const [text,date] of [
 ['Enviar relatório até 20/11/2026.','2026-11-20'],
 ['Entrega: 2026-11-21','2026-11-21'],
 ['Prazo final: 22 de novembro de 2026','2026-11-22'],
 ['Prazo:\n23/11/2026','2026-11-23'],
 ['Encaminhar a atividade até amanhã.','2026-11-14'],
 ['Preencher o formulário até hoje.','2026-11-13'],
 ['Entrega até 29/02/2028.','2028-02-29']
])test('identifica prazo: '+text,()=>assert.equal(extract(text)[0].dueDate,date));
for(const text of [
 'Reunião em 20/11/2026.',
 'Enviar ata da reunião em 20/11/2026.',
 'Prazo: 31/11/2026',
 'Prazo até 20/11',
 'Prazo até 20/11/26',
 'Prazo até 20 de novembro',
 'Enviar entre 20/11/2026 e 22/11/2026.',
 'O prazo não é 20/11/2026.',
 'Prazo prorrogado de 20/11/2026 para 25/11/2026.',
 'Prazo na próxima sexta-feira.'
])test('pede conferência sem inventar data: '+text,()=>{
 const result=extract(text);assert.ok(result.every(item=>item.dueDate===null));assert.ok(result[0].review);
});
test('separa atividades e não extrai prazo de citações antigas',()=>{
 const result=extract('Entregar relatório até 20/11/2026.\nEnviar planilha até 23/11/2026.\nEm 01/11 alguém escreveu:\nPrazo: 01/11/2026');
 assert.deepEqual(result.map(item=>item.dueDate),['2026-11-20','2026-11-23']);
 assert.ok(result[0].evidence.includes('Entregar relatório'));
 assert.equal(extract('Ok, recebido.\n> Prazo: 01/11/2026')[0].dueDate,null);
});
test('HTML vira texto inerte, ignora anexos e não usa snippets incompletos',async()=>{
 const payload={mimeType:'text/html',body:{data:Buffer.from('<p>Entregar relat&#243;rio at&eacute; 20/11/2026</p><script>Prazo 22/11/2026</script><blockquote>Prazo 01/11/2026</blockquote><img src="https://externo.invalid">').toString('base64url')}};
 const text=htmlText(payload);assert.ok(!text.includes('<img'));assert.ok(!text.includes('22/11'));assert.ok(!text.includes('01/11'));assert.equal(extract(text)[0].dueDate,'2026-11-20');
 assert.equal(htmlText({...payload,filename:'anexo.html'}),'');
});
function harness(){
 const calls=[];
 const messages=[{id:'m1',threadId:'t1',internalDate:String(received),labelIds:['INBOX','UNREAD','CUSTOM'],payload:{mimeType:'text/plain',headers:[{name:'Subject',value:'Relatório'},{name:'From',value:'Pessoa <pessoa@example.com>'}],body:{data:Buffer.from('Enviar relatório até 20/11/2026.').toString('base64url')}}},
 {id:'m2',threadId:'t2',labelIds:['CUSTOM']}, {id:'m3',threadId:'t3',labelIds:['INBOX','SPAM']}];
 const client={async request(options){calls.push(options);const url=new URL(options.url);
  if(url.pathname.endsWith('/messages'))return {data:{messages:[...messages.map(m=>({id:m.id})),{id:'gone'}],nextPageToken:'next'}};
  const id=url.pathname.split('/').at(-1);if(id==='gone')throw Object.assign(new Error('missing'),{response:{status:404}});
  return {data:messages.find(m=>m.id===id)};
 }};
 return {calls,client,run:(query='mailbox=school@example.com')=>handleInstitutional({url:new URL('https://farol.invalid/?'+query),client,email:'school@example.com'})};
}
test('consulta somente INBOX com paginação, full, sem escrita e sem marcadores Pessoais',async()=>{
 const h=harness(),result=await h.run('mailbox=school@example.com&page=before');
 assert.equal(result.items.length,1);assert.equal(result.items[0].unread,true);assert.equal(result.items[0].activities[0].dueDate,'2026-11-20');assert.equal(result.nextPage,'next');
 const url=new URL(h.calls[0].url);assert.equal(url.searchParams.get('labelIds'),'INBOX');assert.equal(url.searchParams.get('maxResults'),'20');assert.equal(url.searchParams.get('pageToken'),'before');
 assert.ok(h.calls.slice(1).every(call=>new URL(call.url).searchParams.get('format')==='full'));
 assert.ok(h.calls.every(call=>!call.method&&!call.data&&!call.url.includes('/labels')));
});
test('recusa outra caixa e páginas excessivas antes de consultar Google',async()=>{
 const h=harness();await assert.rejects(h.run('mailbox=other@example.com'),{message:'account_changed'});
 await assert.rejects(h.run('mailbox=school@example.com&page='+'a'.repeat(2049)),{message:'invalid_page'});assert.equal(h.calls.length,0);
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function ui(){
 const nodes=new Map(),requests=[];let resolve;
 const get=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',innerHTML:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}});return nodes.get(selector);};
 const root={querySelector:get,innerHTML:''},window={};
 const context=vm.createContext({window,URLSearchParams,Intl,Date,Map,fetch:(url)=>{requests.push(url);return new Promise(r=>resolve=r);}});
 vm.runInContext(fs.readFileSync('institutional.js','utf8'),context);
 return {app:window.FarolInstitutional,root,get,requests,respond:items=>resolve({ok:true,json:async()=>({mailbox:'school@example.com',items,nextPage:null})})};
}
test('tela só consulta GERAL autorizada e descarta resposta após desconectar',async()=>{
 const h=ui();h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.get('#institutional-feedback').textContent.includes('GERAL'));
 h.app.connectionChanged({email:'school@example.com',gmail:true});assert.equal(h.requests.length,1);
 h.app.connectionChanged(null);h.respond([{id:'secret',activities:[]}]);await settle();
 assert.equal(h.get('#institutional-count').textContent.includes('0 e-mails'),true);
 assert.ok(!h.get('#institutional-list').innerHTML.includes('secret'));
});
test('tela ordena prazos vencidos primeiro, escapa conteúdo e conserva itens sem data',async()=>{
 const h=ui();h.app.connectionChanged({email:'school@example.com',gmail:true});h.app.mount(h.root);
 const make=(id,dueDate)=>({id,threadId:id,subject:'<img src=x onerror=alert(1)>',from:'Pessoa',date:received,activities:[{activity:id,dueDate,evidence:'<script>não executar</script>',review:null}]});
 h.respond([make('semdata',null),make('futuro','2099-01-01'),make('vencido','2020-01-01')]);await settle();
 const html=h.get('#institutional-list').innerHTML;assert.ok(html.indexOf('>vencido<')<html.indexOf('>futuro<'));assert.ok(html.indexOf('>futuro<')<html.indexOf('>semdata<'));
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;script&gt;'));
});

test('também identifica prazo informado somente no assunto',()=>{
 const result=extractActivities('Prezados, segue a atividade solicitada.','Entrega do relatório até 24/11/2026',received);
 assert.equal(result[0].dueDate,'2026-11-24');assert.ok(result[0].evidence.includes('Entrega do relatório'));
});
