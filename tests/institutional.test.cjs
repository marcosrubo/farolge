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
 const calls=[],rows=new Map(),messages=new Map(),labels=[{id:'C',name:'Classificadas'},{id:'A',name:'Arquivadas'}];
 let failStore=false,failModify=false,missingLabel=false;
 const message=(id,date=received,labels=['INBOX','UNREAD','CUSTOM'])=>({id,threadId:'t'+id,internalDate:String(date),labelIds:[...labels],payload:{mimeType:'text/plain',headers:[{name:'Subject',value:'Relatório '+id},{name:'From',value:'Pessoa <pessoa@example.com>'}],body:{data:Buffer.from('Enviar relatório até 20/11/2026.').toString('base64url')}}});
 messages.set('m1',message('m1'));messages.set('m2',message('m2',received-10000));
 const store={async getInstitutionalDemands(owner,ids){return ids.map(id=>rows.get(owner+'.'+id)).filter(Boolean).map(v=>structuredClone(v));},async saveInstitutionalDemand(owner,id,value,version){if(failStore)throw new Error('setup_required');const key=owner+'.'+id;if((rows.get(key)?.version||0)!==version)return null;const row={...value,messageId:id,version:version+1};rows.set(key,row);return row;}};
 const client={async request(options){calls.push(options);const url=new URL(options.url),path=url.pathname.split('/').at(-1);
  if(path==='labels')return {data:{labels:missingLabel?[]:labels}};
  if(path==='messages'){
   const all=[...messages.values()].filter(m=>m.labelIds.includes(url.searchParams.get('labelIds'))&&!m.labelIds.some(l=>['SPAM','TRASH','DRAFT'].includes(l))).sort((a,b)=>Number(b.internalDate)-Number(a.internalDate));
   const offset=Number(url.searchParams.get('pageToken'))||0,size=Number(url.searchParams.get('maxResults'));
   return {data:{messages:all.slice(offset,offset+size).map(m=>({id:m.id})),nextPageToken:offset+size<all.length?String(offset+size):null}};
  }
  const id=path==='modify'?url.pathname.split('/').at(-2):path,m=messages.get(id);
  if(!m)throw Object.assign(new Error('missing'),{response:{status:404}});
  if(path==='modify'){
   if(failModify)throw Object.assign(new Error('provider'),{response:{status:503}});
   m.labelIds=[...new Set([...m.labelIds,...options.data.addLabelIds])].filter(l=>!options.data.removeLabelIds.includes(l));
  }
  return {data:structuredClone(m)};
 }};
 const body=(change={})=>({type:'general',mailbox:'school@example.com',messageId:'m1',operation:'classify',dueDate:'2026-11-20',version:0,...change});
 const run=({query={},action='institutional',body:requestBody,owner='owner-a',canModify=true}={})=>handleInstitutional({action,body:requestBody,url:new URL('https://farol.invalid/?'+new URLSearchParams({mailbox:'school@example.com',...query})),client,store,owner,email:'school@example.com',canModify});
 const move=change=>run({action:'institutional-move',body:body(change)});
 return {calls,rows,messages,message,store,run,move,body,failStore:()=>failStore=true,failModify:value=>failModify=value,missingLabels:()=>missingLabel=true};
}
test('entrada e arquivadas ordenam data/hora decrescente, com paginação e sem escrita',async()=>{
 const h=harness();h.messages.set('last',h.message('last',received+5000));
 h.messages.set('archived',h.message('archived',received,['A','UNREAD']));
 const inbox=await h.run();assert.deepEqual(inbox.items.map(m=>m.id),['last','m1','m2']);
 assert.equal(inbox.items[1].unread,true);assert.equal(inbox.column,0);
 assert.equal((await h.run({query:{column:2}})).items[0].id,'archived');
 assert.ok(h.calls.every(c=>!c.method&&!c.data));assert.equal(h.rows.size,0);
 h.messages.set('gone',h.message('gone',received,['TRASH','INBOX']));assert.equal((await h.run()).items.length,3);
});
test('classificar exige data válida, salva conta verificada/chave e move apenas a mensagem',async()=>{
 const h=harness();const result=await h.move();
 assert.equal(result.demand.dueDate,'2026-11-20');assert.equal(result.operation,'classify');
 assert.deepEqual(h.messages.get('m1').labelIds,['UNREAD','CUSTOM','C']);assert.ok(h.messages.get('m2').labelIds.includes('INBOX'));
 assert.equal(h.rows.get('owner-a.m1').mailbox,'school@example.com');assert.equal(h.rows.get('owner-a.m1').messageId,'m1');
 assert.equal(JSON.stringify([...h.rows.values()]).includes('Relatório'),false);
 const call=h.calls.find(c=>c.method==='POST');assert.deepEqual(call.data,{addLabelIds:['C'],removeLabelIds:['INBOX']});
 for(const dueDate of [null,'','2026-02-30','20/11/2026'])await assert.rejects(h.move({dueDate}),{message:'invalid_institutional'});
});
test('arquivar da entrada e de Classificadas preserva UNREAD/outros marcadores e prazo',async()=>{
 const h=harness();await h.move();
 await h.move({operation:'archive'});assert.deepEqual(h.messages.get('m1').labelIds,['UNREAD','CUSTOM','A']);
 assert.equal(h.rows.get('owner-a.m1').dueDate,'2026-11-20');
 await h.move({messageId:'m2',operation:'archive'});assert.ok(h.messages.get('m2').labelIds.includes('A'));assert.equal(h.rows.has('owner-a.m2'),false);
 const archived=await h.run({query:{column:2}});assert.deepEqual(archived.items.map(m=>m.id),['m1','m2']);
 assert.ok(h.calls.filter(c=>c.method==='POST').every(c=>!c.data.removeLabelIds.includes('UNREAD')));
});
test('Classificadas ordena todos os prazos antes de paginar, incluindo marcador preexistente sem prazo',async()=>{
 const h=harness();h.messages.clear();
 for(let index=1;index<=25;index++){
  const id='x'+String(index).padStart(2,'0');h.messages.set(id,h.message(id,received+index*1000,['C']));
  h.rows.set('owner-a.'+id,{messageId:id,mailbox:'school@example.com',dueDate:'2026-11-'+String(index).padStart(2,'0'),version:1});
 }
 h.messages.set('legacy',h.message('legacy',received+500000,['C']));
 const first=await h.run({query:{column:1}});assert.equal(first.items.length,20);assert.equal(first.items[0].id,'x01');assert.equal(first.items.at(-1).id,'x20');
 const next=await h.run({query:{column:1,page:first.nextPage}});assert.deepEqual(next.items.map(m=>m.id),['x21','x22','x23','x24','x25','legacy']);assert.equal(next.nextPage,null);
 assert.equal(h.calls.filter(c=>c.url.includes('format=full')).length,26,'only page bodies are fetched');
});
test('falha no Supabase impede movimentação; falha Gmail preserva prazo e permite repetir sem duplicação',async()=>{
 const blocked=harness();blocked.failStore();await assert.rejects(blocked.move(),{message:'setup_required'});assert.ok(!blocked.calls.some(c=>c.method==='POST'));
 const h=harness();h.failModify(true);await assert.rejects(h.move());assert.ok(h.messages.get('m1').labelIds.includes('INBOX'));assert.equal(h.rows.get('owner-a.m1').version,1);
 h.failModify(false);await h.move();assert.equal(h.rows.get('owner-a.m1').version,1);
 await h.move();assert.equal(h.rows.size,1);
});
test('valida identidade, escopo, destino, marcadores e versões; recusa spam/lixeira/arquivadas',async()=>{
 const h=harness();await assert.rejects(h.run({query:{mailbox:'other@example.com'}}),{message:'account_changed'});
 await assert.rejects(h.run({query:{page:'a'.repeat(2049)}}),{message:'invalid_page'});
 await assert.rejects(h.run({query:{column:3}}),{message:'invalid_column'});assert.equal(h.calls.length,0);
 await assert.rejects(h.run({action:'institutional-move',body:h.body(),canModify:false}),{message:'institutional_scope'});
 for(const change of [{type:'personal'},{owner:'other'},{messageId:'../evil'},{operation:'delete'}])await assert.rejects(h.move(change),{message:'invalid_institutional'});
 h.rows.set('owner-a.m1',{messageId:'m1',version:2,mailbox:'school@example.com',dueDate:'2026-11-21'});
 await assert.rejects(h.move(),{message:'conflict'});
 h.messages.get('m1').labelIds=['INBOX','TRASH'];await assert.rejects(h.move(),{message:'not_inbox'});
 h.messages.get('m1').labelIds=['A'];await assert.rejects(h.move(),{message:'not_inbox'});
 h.missingLabels();await assert.rejects(h.move(),{message:'labels_missing'});
});
test('prazo da mesma chave em outra identidade não aparece na Geral atual',async()=>{
 const h=harness();await h.move();
 const result=await h.run({owner:'owner-b',query:{column:1}});assert.equal(result.items[0].dueDate,null);
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function ui(){
 const nodes=new Map(),requests=[];
 const make=()=>({textContent:'',innerHTML:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},querySelectorAll(){return [];}});
 const get=selector=>{
  if(!nodes.has(selector)){
   const node=make(),children=new Map();
   node.querySelectorAll=selector=>{
    const attr=selector.slice(1,-1),pattern=new RegExp(attr+'="([^"]+)"','g');
    return [...node.innerHTML.matchAll(pattern)].map(match=>{
     const key=attr+match[1];if(!children.has(key))children.set(key,make());const child=children.get(key);
     child.dataset={};child.dataset[attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=match[1];
     if(attr==='data-due'){const input=node.innerHTML.match(new RegExp('data-due="'+match[1]+'"[^>]*value="([^"]*)"'));if(child.rendered!==node.innerHTML){child.value=input?.[1]||'';child.rendered=node.innerHTML;}child.reportValidity=()=>Boolean(child.value);}
     child.querySelector=()=>node.querySelectorAll('[data-due]').find(n=>n.dataset.due===match[1]);return child;
    });
   };nodes.set(selector,node);
  }return nodes.get(selector);
 };
 const root={querySelector:get,innerHTML:''},window={};
 const context=vm.createContext({window,URLSearchParams,Intl,Date,Map,fetch:(url,options)=>new Promise(resolve=>requests.push({url,options,resolve}))});
 vm.runInContext(fs.readFileSync('institutional.js','utf8'),context);
 const respond=(index,items=[],extra={})=>{const req=requests.filter(r=>!r.done&&r.url.includes('/institutional?')&&Number(new URL('https://farol.invalid'+r.url).searchParams.get('column'))===index)[0];assert.ok(req);req.done=true;req.resolve({ok:true,json:async()=>({mailbox:'school@example.com',column:index,items,nextPage:null,canModify:true,missingLabels:false,...extra})});};
 return {app:window.FarolInstitutional,root,get,requests,respond};
}
const makeItem=(id,date=received,dueDate=null)=>({id,threadId:'t'+id,subject:'Relatório '+id,from:'Pessoa',date,dueDate,version:dueDate?1:0,activities:[{activity:id,dueDate:'2026-11-20',evidence:'<script>não executar</script>',review:null}]});
test('três colunas ficam visíveis sem conexão e respostas antigas não voltam após desconectar',async()=>{
 const h=ui();h.app.mount(h.root);assert.equal(h.requests.length,0);for(const name of ['Caixa de entrada','Classificadas','Arquivadas'])assert.ok(h.root.innerHTML.includes(name));
 h.app.connectionChanged({email:'school@example.com',gmail:true,manageInstitutional:true});assert.equal(h.requests.length,3);
 h.app.connectionChanged(null);for(let i=0;i<3;i++)h.respond(i,[makeItem('secret')]);await settle();
 for(let i=0;i<3;i++){assert.equal(h.get('#institutional-count-'+i).textContent,'0');assert.ok(!h.get('#institutional-list-'+i).innerHTML.includes('secret'));}
});
test('tela ordena cada coluna, escapa texto e não preenche prazo com sugestão',async()=>{
 const h=ui();h.app.connectionChanged({email:'school@example.com',gmail:true,manageInstitutional:true});h.app.mount(h.root);
 h.respond(0,[makeItem('old',received-1000),makeItem('new',received)]);
 h.respond(1,[makeItem('later',received,'2026-11-21'),makeItem('earlier',received,'2026-11-20'),makeItem('unknown')]);
 h.respond(2,[makeItem('oldarch',received-1000),makeItem('newarch')]);await settle();
 const html=h.get('#institutional-list-0').innerHTML;assert.ok(html.indexOf('Relatório new')<html.indexOf('Relatório old'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 assert.equal(h.get('#institutional-list-0').querySelectorAll('[data-due]')[0].value,'');
 const classed=h.get('#institutional-list-1').innerHTML;assert.ok(classed.indexOf('Relatório earlier')<classed.indexOf('Relatório later'));assert.ok(classed.indexOf('Relatório later')<classed.indexOf('Relatório unknown'));
 assert.ok(!classed.includes('data-classify-form'));
 const archived=h.get('#institutional-list-2').innerHTML;assert.ok(archived.indexOf('Relatório newarch')<archived.indexOf('Relatório oldarch'));assert.ok(!archived.includes('data-archive'));
});
test('classificação exige data explícita e só remove origem após confirmação do servidor',async()=>{
 const h=ui();h.app.connectionChanged({email:'school@example.com',gmail:true,manageInstitutional:true});h.app.mount(h.root);
 h.respond(0,[makeItem('m1')]);h.respond(1);h.respond(2);await settle();
 const list=h.get('#institutional-list-0'),form=list.querySelectorAll('[data-classify-form]')[0];
 form.listeners.submit({preventDefault(){}});assert.equal(h.requests.length,3);
 const input=form.querySelector('[data-due]');input.value='2026-11-20';input.listeners.input();
 form.listeners.submit({preventDefault(){}});assert.equal(h.requests.length,4);
 assert.ok(list.innerHTML.includes('Relatório m1'));
 const req=h.requests.at(-1),body=JSON.parse(req.options.body);
 assert.deepEqual(body,{type:'general',mailbox:'school@example.com',messageId:'m1',operation:'classify',dueDate:'2026-11-20',version:0});
 assert.equal(req.options.headers['X-Farol-Request'],'1');req.resolve({ok:true,json:async()=>({mailbox:'school@example.com',messageId:'m1',operation:'classify'})});await settle();
 h.respond(0);h.respond(1,[makeItem('m1',received,'2026-11-20')]);h.respond(2);await settle();
 assert.ok(!list.innerHTML.includes('Relatório m1'));assert.ok(h.get('#institutional-list-1').innerHTML.includes('Relatório m1'));
});
test('arquivar usa operação dedicada; erro não anuncia sucesso nem remove a linha',async()=>{
 const h=ui();h.app.connectionChanged({email:'school@example.com',gmail:true,manageInstitutional:true});h.app.mount(h.root);
 h.respond(0,[makeItem('m1')]);h.respond(1);h.respond(2);await settle();
 h.get('#institutional-list-0').querySelectorAll('[data-archive]')[0].listeners.click();
 const req=h.requests.at(-1);assert.equal(JSON.parse(req.options.body).operation,'archive');
 req.resolve({ok:false,json:async()=>({error:'institutional_scope'})});await settle();
 assert.ok(h.get('#institutional-list-0').innerHTML.includes('Relatório m1'));assert.ok(h.get('#institutional-feedback').textContent.includes('Revisar autorização'));
});
test('também identifica prazo informado somente no assunto',()=>{
 const result=extractActivities('Prezados, segue a atividade solicitada.','Entrega do relatório até 24/11/2026',received);
 assert.equal(result[0].dueDate,'2026-11-24');assert.ok(result[0].evidence.includes('Entrega do relatório'));
});
