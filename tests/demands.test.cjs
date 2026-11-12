'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {handleDemands,validDate,plainText}=require('../server/demands.cjs');
const LABELS=['1-ME DEVEM','2-MINHAS','3-DEVO','9-Classificado'];
function harness(){
 const rows=new Map(),threads=new Map(),messages=new Map(),calls=[];
 const email='person@gmail.com',owner='owner-a';
 const message=(id,labels=['L0'])=>({id,threadId:'thread1',internalDate:'1794300000000',labelIds:labels,snippet:'Trecho <script>não executar</script>',payload:{mimeType:'multipart/alternative',headers:[{name:'Subject',value:'Trabalho <img onerror=alert(1)>'},{name:'From',value:'Pessoa <pessoa@example.com>'},{name:'To',value:email}],parts:[{mimeType:'text/html',body:{data:Buffer.from('<img src="https://tracking.invalid">').toString('base64url')}},{mimeType:'text/plain',body:{data:Buffer.from('Texto da mensagem').toString('base64url')}}]}});
 threads.set('thread1',{id:'thread1',messages:[message('message1',['L0','L1','UNREAD'])]});
 threads.set('other',{id:'other',messages:[message('message2',['OTHER'])]});
 messages.set('message1',threads.get('thread1').messages[0]);
 messages.get('message1').labelIds.push('INBOX','CUSTOM');
 messages.set('inbox2',{...message('inbox2',['INBOX','UNREAD']),threadId:'thread2'});
 threads.set('thread2',{id:'thread2',messages:[messages.get('inbox2')]});
 let conflict=false,providerFailure=null;
 const store={
  async getDemands(user,ids){return ids.map(id=>rows.get(user+'.'+id)).filter(Boolean).map(r=>structuredClone(r));},
  async saveDemand(user,id,value,version){if(conflict || (rows.get(user+'.'+id)?.version||0)!==version)return null;const row={...structuredClone(value),id:'demand1',threadId:id,version:version+1};rows.set(user+'.'+id,row);return row;}
 };
 const client={async request({url,method='GET',data}){
  calls.push({url,method,data});if(providerFailure)throw Object.assign(new Error('provider'),{response:{status:providerFailure}});
  const parsed=new URL(url),path=parsed.pathname.split('/').at(-1);
  if(path==='messages')return {data:{messages:[...messages.values()].filter(m=>m.labelIds.includes(parsed.searchParams.get('labelIds'))).map(m=>({id:m.id,threadId:m.threadId})),nextPageToken:parsed.searchParams.has('pageToken')?undefined:'inbox-next'}};
  if(parsed.pathname.includes('/messages/')){
    const id=path==='modify'?parsed.pathname.split('/').at(-2):path;
    const message=messages.get(id);if(!message)throw Object.assign(new Error('missing'),{response:{status:404}});
    if(path==='modify'){
      assert.equal(method,'POST');assert.deepEqual(Object.keys(data),['addLabelIds','removeLabelIds']);
      if(this.beforeModify)this.beforeModify(message);
      message.labelIds=[...new Set([...message.labelIds,...data.addLabelIds])].filter(id=>!data.removeLabelIds.includes(id));
      return {data:{id:message.id,threadId:message.threadId,labelIds:message.labelIds}};
    }
    return {data:structuredClone(message)};
  }
  if(path==='labels')return {data:{labels:LABELS.map((name,index)=>({name,id:'L'+index}))}};
  if(path==='threads')return {data:{threads:parsed.searchParams.get('labelIds')==='L2'?[]:[{id:'thread1'}],nextPageToken:parsed.searchParams.has('pageToken')?undefined:'next'}};
  return {data:structuredClone(threads.get(path))};
 }};
 async function run(action,{query={},body,who=owner,mailbox=email,canClassify=true}={}){
  return handleDemands({action,url:new URL('https://farol.invalid/?'+new URLSearchParams({mailbox,...query})),body,client,store,owner:who,email:mailbox,canClassify});
 }
 const body=(change={})=>({type:'personal',mailbox:email,threadId:'thread1',column:0,version:0,dueDate:'2026-11-20',completed:false,responsible:'Pessoa',...change});
 return {run,body,rows,threads,messages,calls,owner,email,message,store,client,conflict:()=>conflict=true,fail:status=>providerFailure=status};
}
test('datas aceitam calendário válido e remoção do prazo; rejeitam datas inválidas',()=>{
 for(const date of [null,'2026-11-20','2028-02-29'])assert.equal(validDate(date),true);
 for(const date of ['2026-02-29','2026-99-01','2026-11-31','2026-1-01','2026-11-20T12:00Z','1899-12-31',undefined])assert.equal(validDate(date),false);
});
test('quadro pagina por marcador, não grava e reúne a conversa em ambas as colunas',async()=>{
 const h=harness();const board=await h.run('board',{query:{column:0,page:'before'}});
 assert.equal(board.items.length,1);assert.equal(board.items[0].messageCount,1);assert.equal(board.items[0].unread,true);
 assert.deepEqual(board.items[0].labels,['1-ME DEVEM','2-MINHAS']);assert.equal(board.items[0].demand,null);
 const request=new URL(h.calls.find(c=>c.url.includes('/threads?')).url);
 assert.equal(request.searchParams.get('maxResults'),'20');assert.equal(request.searchParams.get('pageToken'),'before');
 assert.equal(request.searchParams.get('includeSpamTrash'),'false');assert.equal(h.rows.size,0);
 assert.ok(h.calls.every(c=>c.method==='GET'));
 assert.deepEqual((await h.run('board',{query:{column:2}})).items,[]);
});
test('salvar, concluir, reabrir e remover prazo preserva origem e registra histórico',async()=>{
 const h=harness();const created=await h.run('demand',{body:h.body()});
 assert.equal(created.demand.version,1);assert.equal(created.demand.sourceMessageId,'message1');
 assert.equal(created.demand.history.length,1);
 h.threads.get('thread1').messages.push(h.message('reply',['L0']));
 const changed=await h.run('demand',{body:h.body({version:1,dueDate:'2026-11-25',completed:true})});
 assert.equal(changed.demand.sourceMessageId,'message1');assert.equal(changed.demand.completed,true);
 assert.equal(changed.demand.history[1].before.dueDate,'2026-11-20');
 const reopened=await h.run('demand',{body:h.body({version:2,dueDate:null,completed:false})});
 assert.equal(reopened.demand.dueDate,null);assert.equal(reopened.demand.completed,false);assert.equal(reopened.demand.history.length,3);
 const detail=await h.run('thread',{query:{id:'thread1'}});assert.equal(detail.thread.messages.length,2);
 assert.equal(detail.thread.demand.version,3);assert.equal(detail.thread.messages[0].text,'Texto da mensagem');
 const stored=JSON.stringify([...h.rows.values()]);assert.ok(!stored.includes('Trabalho'));assert.ok(!stored.includes('Texto da mensagem'));
 assert.ok(h.calls.every(c=>c.method==='GET'),'Gmail is always read-only');
});
test('mesmo threadId em outra conta não herda prazos; conta alterada é rejeitada',async()=>{
 const h=harness();await h.run('demand',{body:h.body()});
 const other=await h.run('board',{query:{column:0},who:'owner-b'});assert.equal(other.items[0].demand,null);
 await assert.rejects(h.run('demand',{body:h.body({mailbox:'other@gmail.com'})}),{message:'account_changed'});
 assert.equal(h.rows.size,1);
});
test('não permite criar prazo para conversa sem os marcadores nem manipular campos de proprietário',async()=>{
 const h=harness();
 await assert.rejects(h.run('demand',{body:h.body({threadId:'other'})}),{message:'not_found'});
 await assert.rejects(h.run('thread',{query:{id:'other'}}),{message:'not_found'});
 for(const change of [{threadId:'../../messages'},{owner:'owner-b'},{type:'general'},{completed:'true'},{version:-1},{dueDate:'2026-99-31'},{responsible:'x'.repeat(201)}])await assert.rejects(h.run('demand',{body:h.body(change)}),{message:'invalid_demand'});
 assert.equal(h.rows.size,0);
});
test('edições concorrentes não sobrescrevem histórico e salvar sem mudanças não gera alteração',async()=>{
 const h=harness();await h.run('demand',{body:h.body()});
 await assert.rejects(h.run('demand',{body:h.body()}),{message:'conflict'});
 const unchanged=await h.run('demand',{body:h.body({version:1})});assert.equal(unchanged.demand.version,1);
 h.conflict();await assert.rejects(h.run('demand',{body:h.body({version:1,completed:true})}),{message:'conflict'});
 assert.equal(h.rows.get(h.owner+'.thread1').history.length,1);
});
test('texto HTML e anexos não são executados nem devolvidos como corpo de leitura',()=>{
 assert.equal(plainText({mimeType:'text/html',body:{data:Buffer.from('<script>alert(1)</script>').toString('base64url')}}),'');
 assert.equal(plainText({mimeType:'text/plain',filename:'anexo.txt',body:{data:Buffer.from('anexo privado').toString('base64url')}}),'');
});
function browser(){
 const context=vm.createContext({window:{},Intl,URLSearchParams});vm.runInContext(fs.readFileSync('demands.js','utf8'),context);return context.window.FarolDemands;
}
test('prazos distinguem hoje/atraso/conclusão no calendário de Brasília',()=>{
 const api=browser();assert.equal(api.day(new Date('2026-11-11T01:00:00Z')),'2026-11-10');
 assert.equal(api.deadline({dueDate:'2026-11-09'},'2026-11-10').text,'Atrasado há 1 dia');
 assert.equal(api.deadline({dueDate:'2026-11-10'},'2026-11-10').text,'Vence hoje');
 assert.equal(api.deadline({dueDate:'2026-11-11'},'2026-11-10').text,'Vence em 11/11/2026');
 assert.equal(api.deadline({dueDate:'2026-11-09',completed:true},'2026-11-10').text,'Concluída');
 assert.equal(api.deadline(null).text,'Sem prazo');
});
test('conteúdo de e-mail é escapado e filtros não marcam mensagens como lidas',()=>{
 const api=browser();assert.equal(api.escape('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 const cards=[{id:'one',date:100,unread:true,demand:null},{id:'two',date:200,demand:{completed:true}}];
 assert.equal(api.list(cards).length,1);assert.equal(cards[0].unread,true);
});

// DOM mínimo para verificar eventos e mudanças de conta sem servidor/HTML local.
function interactive(fetcher){
 class Node {
  constructor(){this.nodes=new Map();this.listeners={};this.dataset={};this.value='';this.checked=false;this.open=false;this.textContent='';this.disabled=false;this._html='';}
  set innerHTML(value){this._html=value;this.nodes.clear();this.detailButtons=null;}
  get innerHTML(){return this._html;}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector);}
  querySelectorAll(selector){
   if(selector==='[data-thread]'){
    this.threadButtons=[...this.querySelector('#demand-columns').innerHTML.matchAll(/<button[^>]*data-thread="([\w-]+)" data-column="([0-2])"/g)].map(match=>{const b=new Node();b.dataset={thread:match[1],column:match[2]};return b;});return this.threadButtons;
   }
   if(selector==='[data-detail-classify]'){
    if(!this.detailButtons)this.detailButtons=[...this.innerHTML.matchAll(/<button[^>]*data-detail-classify="([0-2])" data-message="([\w-]+)"([^>]*)>/g)].map(match=>{const b=new Node();b.dataset={detailClassify:match[1],message:match[2]};b.disabled=match[3].includes('disabled');return b;});return this.detailButtons;
   }
   if(selector==='[data-classified-classify]'){
    this.classifiedButtons=[...this.querySelector('#classified-list').innerHTML.matchAll(/<button[^>]*data-classified-classify="([0-2])" data-message="([\w-]+)"([^>]*)>/g)].map(match=>{const b=new Node();b.dataset={classifiedClassify:match[1],message:match[2]};b.disabled=match[3].includes('disabled');return b;});return this.classifiedButtons;
   }
   if(selector!=='[data-classify]')return [];
   const html=this.querySelector('#inbox-list').innerHTML;
   this.classifyButtons=[...html.matchAll(/<button[^>]*data-classify="([0-2])" data-message="([\w-]+)"([^>]*)>/g)].map(match=>{const button=new Node();button.dataset={classify:match[1],message:match[2]};button.disabled=match[3].includes('disabled');return button;});
   return this.classifyButtons;
  }
  addEventListener(type,fn){this.listeners[type]=fn;}
  setAttribute(){}focus(){}showModal(){this.open=true;}close(){this.open=false;}
 }
 const document=new Node(),root=new Node(),context=vm.createContext({window:{},document,Intl,URLSearchParams,fetch:fetcher});
 vm.runInContext(fs.readFileSync('demands.js','utf8'),context);
 return {api:context.window.FarolDemands,root,document};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('quadro carrega três colunas e apaga dados imediatamente quando a conta muda',async()=>{
 const requests=[];
 const h=interactive(async(url)=>{requests.push(url);return {ok:true,json:async()=>({mailbox:'person@gmail.com',items:[],nextPage:null})};});
 h.api.connectionChanged({email:'person@gmail.com',gmail:true});h.api.mount(h.root);await settle();
 assert.equal(requests.length,5);assert.ok(h.root.querySelector('#demand-columns').innerHTML.includes('1-ME DEVEM'));
 h.api.connectionChanged(null);
 assert.ok(h.root.querySelector('#demand-notice').textContent.includes('Conecte a conta Pessoal'));
 assert.ok(!h.root.querySelector('#demand-columns').innerHTML.includes('person@gmail.com'));
 h.api.unmount();
});
test('resposta antiga do quadro não aparece depois de trocar a conta',async()=>{
 let release;
 const h=interactive(()=>new Promise(resolve=>{release=resolve;}));
 h.api.connectionChanged({email:'person@gmail.com',gmail:true});h.api.mount(h.root);
 h.api.connectionChanged(null);
 release({ok:true,json:async()=>({mailbox:'person@gmail.com',items:[{id:'old',subject:'SEGREDO DA CONTA ANTIGA'}],nextPage:null})});
 await settle();
 assert.ok(!h.root.querySelector('#demand-columns').innerHTML.includes('SEGREDO'));
 assert.ok(h.root.querySelector('#demand-notice').textContent.includes('Conecte'));
 h.api.unmount();
});

test('Caixa de entrada lista mensagens individuais inclusive já classificadas sem depender do banco',async()=>{
 const h=harness(),result=await h.run('inbox',{query:{page:'page1'}});
 assert.equal(result.items.length,2);assert.equal(result.canClassify,true);
 assert.equal(result.items[0].id,'message1');assert.deepEqual(result.items[0].labels,['1-ME DEVEM','2-MINHAS']);
 const call=new URL(h.calls.find(c=>new URL(c.url).pathname.endsWith('/messages')).url);
 assert.equal(call.searchParams.get('labelIds'),'INBOX');assert.equal(call.searchParams.get('pageToken'),'page1');
 assert.equal(call.searchParams.get('maxResults'),'20');assert.equal(h.rows.size,0);assert.ok(h.calls.every(c=>c.method==='GET'));
});
test('classifica só a mensagem escolhida movendo para 9-Classificado e preservando UNREAD e outras etiquetas',async()=>{
 const h=harness(),body={type:'personal',mailbox:h.email,messageId:'inbox2',column:2};
 const result=await h.run('classify',{body});
 assert.deepEqual(h.calls.find(c=>c.method==='POST').data,{addLabelIds:['L2','L3'],removeLabelIds:['INBOX']});
 assert.equal(result.inInbox,false);assert.equal(result.item.unread,true);assert.ok(result.item.subject.includes('Trabalho'));
 assert.deepEqual(h.messages.get('inbox2').labelIds,['UNREAD','L2','L3']);
 assert.ok(!h.messages.get('message1').labelIds.includes('L2'));
 const board=await h.run('thread',{query:{id:'thread2'}});assert.deepEqual(board.thread.labels,['3-DEVO']);
 await h.run('classify',{body});assert.equal(h.calls.filter(c=>c.method==='POST').length,1,'repetir etiqueta é idempotente');
 await h.run('classify',{body:{...body,column:0}});
 assert.deepEqual(h.messages.get('inbox2').labelIds,['UNREAD','L2','L3','L0']);
 assert.ok(h.calls.filter(c=>c.method==='POST').every(c=>c.url.endsWith('/messages/inbox2/modify')));
});
test('classificação rejeita falta de permissão, conta diferente e mensagens fora de INBOX',async()=>{
 const h=harness(),body={type:'personal',mailbox:h.email,messageId:'inbox2',column:0};
 await assert.rejects(h.run('classify',{body,canClassify:false}),{message:'classify_scope'});
 await assert.rejects(h.run('classify',{body:{...body,mailbox:'someone@gmail.com'}}),{message:'account_changed'});
 for(const change of [{column:3},{column:'0'},{messageId:'../other'},{removeLabelIds:['INBOX']},{type:'general'}])await assert.rejects(h.run('classify',{body:{...body,...change}}),{message:'invalid_classification'});
 h.messages.get('inbox2').labelIds=['UNREAD'];await assert.rejects(h.run('classify',{body}),{message:'not_inbox'});
 assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});

test('classificação não recoloca na entrada uma mensagem arquivada em outra operação',async()=>{
 const h=harness();h.client.beforeModify=message=>message.labelIds=message.labelIds.filter(id=>id!=='INBOX');
 const result=await h.run('classify',{body:{type:'personal',mailbox:h.email,messageId:'inbox2',column:0}});
 assert.equal(result.inInbox,false);assert.ok(result.item.labels.includes('1-ME DEVEM'));
 assert.deepEqual(h.calls.find(c=>c.method==='POST').data,{addLabelIds:['L0','L3'],removeLabelIds:['INBOX']});
});
test('interface confirma etiqueta removendo a linha e insere a conversa nas colunas',async()=>{
 const h=harness(),posted=[];
 const ui=interactive(async(url,options={})=>{
  const parsed=new URL(url,'https://farol.invalid'),action=parsed.pathname.split('/').at(-1);
  const body=options.body?JSON.parse(options.body):undefined;if(body)posted.push(body);
  try {const result=await h.run(action,{body,query:Object.fromEntries(parsed.searchParams)});return {ok:true,json:async()=>result};}
  catch(error){return {ok:false,json:async()=>({error:error.message})};}
 });
 ui.api.connectionChanged({email:h.email,gmail:true,classify:true});ui.api.mount(ui.root);await settle();
 const button=ui.root.classifyButtons.find(b=>b.dataset.message==='inbox2'&&b.dataset.classify==='2');
 assert.equal(button.disabled,false);await button.listeners.click();
 assert.equal(posted.length,1);assert.equal(posted[0].messageId,'inbox2');
 assert.ok(ui.root.querySelector('#inbox-feedback').textContent.includes('movida para 9-Classificado'));
 assert.ok(!ui.root.querySelector('#inbox-list').innerHTML.includes('data-message="inbox2"'));
 assert.ok(!ui.root.classifyButtons.some(b=>b.dataset.message==='inbox2'));
 assert.ok(ui.root.querySelector('#demand-columns').innerHTML.includes('data-thread="thread2"'));
 const summaries=h.calls.filter(call=>call.url.includes('/threads/thread2'));
 assert.ok(summaries.every(call=>new URL(call.url).searchParams.get('format')==='metadata'));
 ui.api.unmount();
});

test('falha de classificação não anuncia sucesso nem altera a linha na interface',async()=>{
 const h=harness();
 const ui=interactive(async(url,options={})=>{
  const parsed=new URL(url,'https://farol.invalid'),action=parsed.pathname.split('/').at(-1);
  if(action==='classify')return {ok:false,json:async()=>({error:'classify_scope'})};
  const result=await h.run(action,{query:Object.fromEntries(parsed.searchParams)});return {ok:true,json:async()=>result};
 });
 ui.api.connectionChanged({email:h.email,gmail:true,classify:true});ui.api.mount(ui.root);await settle();
 await ui.root.classifyButtons.find(b=>b.dataset.message==='inbox2'&&b.dataset.classify==='2').listeners.click();
 assert.ok(ui.root.querySelector('#inbox-feedback').textContent.includes('Revisar autorização'));
 assert.ok(!ui.root.querySelector('#inbox-feedback').textContent.includes('aplicada'));
 assert.ok(!h.messages.get('inbox2').labelIds.includes('L2'));
 assert.ok(ui.root.classifyButtons.every(b=>b.disabled));ui.api.unmount();
});


test('responsáveis são independentes por categoria e MINHAS força a identidade Pessoal',async()=>{
 const h=harness();h.threads.get('thread1').messages[0].labelIds.push('L2');
 await h.run('demand',{body:h.body({responsible:'Ana'})});
 await h.run('demand',{body:h.body({version:1,column:2,responsible:'Bruno'})});
 const saved=await h.run('demand',{body:h.body({version:2,column:1,responsible:'Não deve aceitar'})});
 assert.deepEqual(saved.demand.responsibles,{'0':'Ana','1':h.email,'2':'Bruno'});
 assert.equal(saved.demand.history[1].column,2);
 assert.equal(saved.demand.version,2);
 const unchanged=await h.run('demand',{body:h.body({version:2,column:1,responsible:'Outro'})});
 assert.equal(unchanged.demand.version,2);
 await assert.rejects(h.run('demand',{body:h.body({version:3,column:3})}),{message:'invalid_demand'});
});
test('registro anterior mantém prazo, conclusão, histórico e responsável inicial',async()=>{
 const h=harness();h.rows.set(h.owner+'.thread1',{id:'old',threadId:'thread1',version:4,dueDate:'2026-11-25',completed:true,responsible:'Legado',sourceMessageId:'message1',history:[]});
 const result=await h.run('demand',{body:h.body({version:4,column:0,dueDate:'2026-11-25',completed:true,responsible:'Novo'})});
 assert.equal(result.demand.responsible,'Legado');assert.equal(result.demand.responsibles[0],'Novo');
 assert.equal(result.demand.dueDate,'2026-11-25');assert.equal(result.demand.completed,true);
 assert.equal(result.demand.history[0].before.responsible,'Legado');
});
test('não salva responsável em categoria que não pertence à conversa',async()=>{
 const h=harness();await assert.rejects(h.run('demand',{body:h.body({column:2})}),{message:'not_found'});
 assert.equal(h.rows.size,0);
});
test('classificar categoria já aplicada ainda completa a movimentação e preserva etiquetas',async()=>{
 const h=harness();await h.run('classify',{body:{type:'personal',mailbox:h.email,messageId:'message1',column:0}});
 const labels=h.messages.get('message1').labelIds;
 assert.ok(labels.includes('L0')&&labels.includes('L1')&&labels.includes('L3')&&labels.includes('CUSTOM')&&labels.includes('UNREAD'));
 assert.ok(!labels.includes('INBOX'));
});

test('MINHAS salva a identidade verificada mesmo que o cliente informe outro responsável',async()=>{
 const h=harness();const saved=await h.run('demand',{body:h.body({column:1,responsible:'Outro'})});
 assert.equal(saved.demand.responsibles[1],h.email);
 assert.equal(saved.demand.history[0].column,1);assert.equal(saved.demand.history[0].after.responsible,h.email);
});

test('interface abre a categoria correta, salva responsável independente e mostra MINHAS automaticamente',async()=>{
 const h=harness();h.threads.get('thread1').messages[0].labelIds.push('L2');
 await h.run('demand',{body:h.body({responsible:'Ana'})});
 await h.run('demand',{body:h.body({version:1,column:2,responsible:'Bruno'})});
 const posted=[],ui=interactive(async(url,options={})=>{
  const parsed=new URL(url,'https://farol.invalid'),action=parsed.pathname.split('/').at(-1),body=options.body?JSON.parse(options.body):undefined;
  if(body)posted.push(body);
  const result=await h.run(action,{body,query:Object.fromEntries(parsed.searchParams)});return {ok:true,json:async()=>result};
 });
 ui.api.connectionChanged({email:h.email,gmail:true,classify:true});ui.api.mount(ui.root);await settle();
 assert.ok(ui.root.querySelector('#demand-columns').innerHTML.includes('Responsável: '+h.email));
 await ui.root.threadButtons.find(b=>b.dataset.column==='1').listeners.click();
 let content=ui.document.querySelector('#demand-detail');
 assert.match(content.innerHTML,/id="demand-responsible"[^>]*readonly[^>]*value="person@gmail.com"/);
 await ui.root.threadButtons.find(b=>b.dataset.column==='0').listeners.click();
 assert.match(content.innerHTML,/id="demand-responsible"[^>]*value="Ana"/);
 content.querySelector('#demand-responsible').value='Carla';content.querySelector('#demand-date').value='2026-11-20';
 await content.querySelector('#demand-form').listeners.submit({preventDefault(){}});
 assert.equal(posted[0].column,0);assert.equal(h.rows.get(h.owner+'.thread1').responsibles[2],'Bruno');
 ui.api.unmount();
});
test('adicionar categoria pela conversa preserva campos ainda não salvos e move só a mensagem',async()=>{
 const h=harness(),ui=interactive(async(url,options={})=>{
  const parsed=new URL(url,'https://farol.invalid'),action=parsed.pathname.split('/').at(-1),body=options.body?JSON.parse(options.body):undefined;
  const result=await h.run(action,{body,query:Object.fromEntries(parsed.searchParams)});return {ok:true,json:async()=>result};
 });
 ui.api.connectionChanged({email:h.email,gmail:true,classify:true});ui.api.mount(ui.root);await settle();
 await ui.root.threadButtons.find(b=>b.dataset.column==='0').listeners.click();
 const content=ui.document.querySelector('#demand-detail');content.querySelector('#demand-responsible').value='Ainda editando';
 await content.detailButtons.find(b=>b.dataset.detailClassify==='2').listeners.click();
 assert.equal(content.querySelector('#demand-responsible').value,'Ainda editando');
 assert.ok(h.messages.get('message1').labelIds.includes('L2'));assert.ok(h.messages.get('message1').labelIds.includes('L3'));
 assert.ok(!h.messages.get('message1').labelIds.includes('INBOX'));
 assert.ok(content.querySelector('#demand-save-status').textContent.includes('9-Classificado'));
 ui.api.unmount();
});

test('lista 9-Classificado pagina mensagens individuais, exclui lixeira e não exige banco',async()=>{
 const h=harness();h.messages.get('message1').labelIds.push('L3');
 h.messages.get('inbox2').labelIds=['L3','TRASH'];
 h.store.getDemands=()=>{throw new Error('não consultar banco');};
 const result=await h.run('classified',{query:{page:'classified-next'}});
 assert.deepEqual(result.items.map(item=>item.id),['message1']);
 assert.deepEqual(result.items[0].labels,['1-ME DEVEM','2-MINHAS']);
 assert.equal(result.items[0].unread,true);assert.equal(result.canClassify,true);
 const call=new URL(h.calls.find(c=>new URL(c.url).pathname.endsWith('/messages')).url);
 assert.equal(call.searchParams.get('labelIds'),'L3');assert.equal(call.searchParams.get('pageToken'),'classified-next');
 assert.equal(call.searchParams.get('maxResults'),'20');assert.ok(h.calls.every(c=>c.method==='GET'));
});
test('interface acrescenta categoria em 9-Classificado preservando mensagem, categorias e prazo',async()=>{
 const h=harness();h.messages.get('message1').labelIds=['L0','L3','UNREAD','CUSTOM'];
 await h.run('demand',{body:h.body({responsible:'Ana'})});
 const ui=interactive(async(url,options={})=>{
  const parsed=new URL(url,'https://farol.invalid'),action=parsed.pathname.split('/').at(-1),body=options.body?JSON.parse(options.body):undefined;
  const result=await h.run(action,{body,query:Object.fromEntries(parsed.searchParams)});return {ok:true,json:async()=>result};
 });
 ui.api.connectionChanged({email:h.email,gmail:true,classify:true});ui.api.mount(ui.root);await settle();
 assert.ok(ui.root.classifiedButtons.find(b=>b.dataset.classifiedClassify==='0').disabled);
 await ui.root.classifiedButtons.find(b=>b.dataset.classifiedClassify==='2').listeners.click();
 assert.ok(ui.root.querySelector('#classified-list').innerHTML.includes('data-message="message1"'));
 assert.ok(ui.root.classifiedButtons.find(b=>b.dataset.classifiedClassify==='2').disabled);
 assert.ok(ui.root.querySelector('#classified-feedback').textContent.includes('mantida em 9-Classificado'));
 assert.deepEqual(h.messages.get('message1').labelIds,['L0','L3','UNREAD','CUSTOM','L2']);
 assert.equal(h.rows.get(h.owner+'.thread1').responsibles[0],'Ana');assert.equal(h.rows.get(h.owner+'.thread1').dueDate,'2026-11-20');
 ui.root.querySelector('#classified-search').listeners.input({target:{value:'não existe'}});
 assert.ok(!ui.root.querySelector('#classified-list').innerHTML.includes('data-message="message1"'));
 ui.api.connectionChanged(null);assert.ok(!ui.root.querySelector('#classified-list').innerHTML.includes('Trabalho'));
 ui.api.unmount();
});
test('classificação na entrada aparece também na lista final de classificados',async()=>{
 const h=harness(),ui=interactive(async(url,options={})=>{
  const parsed=new URL(url,'https://farol.invalid'),action=parsed.pathname.split('/').at(-1),body=options.body?JSON.parse(options.body):undefined;
  const result=await h.run(action,{body,query:Object.fromEntries(parsed.searchParams)});return {ok:true,json:async()=>result};
 });
 ui.api.connectionChanged({email:h.email,gmail:true,classify:true});ui.api.mount(ui.root);await settle();
 await ui.root.classifyButtons.find(b=>b.dataset.message==='inbox2'&&b.dataset.classify==='1').listeners.click();
 assert.ok(ui.root.querySelector('#classified-list').innerHTML.includes('data-message="inbox2"'));
 assert.ok(!ui.root.querySelector('#inbox-list').innerHTML.includes('data-message="inbox2"'));
 ui.api.unmount();
});
