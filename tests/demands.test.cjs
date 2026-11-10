'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {handleDemands,validDate,plainText}=require('../server/demands.cjs');
const LABELS=['1-ME DEVEM','2-MINHAS','3-DEVO'];
function harness(){
 const rows=new Map(),threads=new Map(),calls=[];
 const email='person@gmail.com',owner='owner-a';
 const message=(id,labels=['L0'])=>({id,internalDate:'1794300000000',labelIds:labels,snippet:'Trecho <script>não executar</script>',payload:{mimeType:'multipart/alternative',headers:[{name:'Subject',value:'Trabalho <img onerror=alert(1)>'},{name:'From',value:'Pessoa <pessoa@example.com>'},{name:'To',value:email}],parts:[{mimeType:'text/html',body:{data:Buffer.from('<img src="https://tracking.invalid">').toString('base64url')}},{mimeType:'text/plain',body:{data:Buffer.from('Texto da mensagem').toString('base64url')}}]}});
 threads.set('thread1',{id:'thread1',messages:[message('message1',['L0','L1','UNREAD'])]});
 threads.set('other',{id:'other',messages:[message('message2',['OTHER'])]});
 let conflict=false,providerFailure=null;
 const store={
  async getDemands(user,ids){return ids.map(id=>rows.get(user+'.'+id)).filter(Boolean).map(r=>structuredClone(r));},
  async saveDemand(user,id,value,version){if(conflict || (rows.get(user+'.'+id)?.version||0)!==version)return null;const row={...structuredClone(value),id:'demand1',threadId:id,version:version+1};rows.set(user+'.'+id,row);return row;}
 };
 const client={async request({url,method='GET'}){
  calls.push({url,method});if(providerFailure)throw Object.assign(new Error('provider'),{response:{status:providerFailure}});
  const parsed=new URL(url),path=parsed.pathname.split('/').at(-1);
  if(path==='labels')return {data:{labels:LABELS.map((name,index)=>({name,id:'L'+index}))}};
  if(path==='threads')return {data:{threads:parsed.searchParams.get('labelIds')==='L2'?[]:[{id:'thread1'}],nextPageToken:parsed.searchParams.has('pageToken')?undefined:'next'}};
  return {data:structuredClone(threads.get(path))};
 }};
 async function run(action,{query={},body,who=owner,mailbox=email}={}){
  return handleDemands({action,url:new URL('https://farol.invalid/?'+new URLSearchParams({mailbox,...query})),body,client,store,owner:who,email:mailbox});
 }
 const body=(change={})=>({type:'personal',mailbox:email,threadId:'thread1',version:0,dueDate:'2026-11-20',completed:false,responsible:'Pessoa',...change});
 return {run,body,rows,threads,calls,owner,email,message,store,client,conflict:()=>conflict=true,fail:status=>providerFailure=status};
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
  set innerHTML(value){this._html=value;this.nodes.clear();}
  get innerHTML(){return this._html;}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector);}
  querySelectorAll(){return [];}
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
 assert.equal(requests.length,3);assert.ok(h.root.querySelector('#demand-columns').innerHTML.includes('1-ME DEVEM'));
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
