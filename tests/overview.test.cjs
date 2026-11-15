'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {handleOverview}=require('../server/overview.cjs');
function backend(){
 const calls=[],names=['1-ME DEVEM','2-MINHAS','3-DEVO','4-DESPACHADAS','Classificadas','Arquivadas'];
 const labels=names.map((name,index)=>({id:'L'+index,name}));
 const counts=new Map([['INBOX',12345],...labels.map((label,index)=>[label.id,index*10])]);
 const failures=new Map();
 const client={async request(options){calls.push(options);const url=new URL(options.url),id=decodeURIComponent(url.pathname.split('/').at(-1));
  if(id==='labels')return {data:{labels}};
  if(failures.has(id))throw Object.assign(new Error('provider'),{response:{status:failures.get(id)}});
  return {data:{id,messagesTotal:counts.get(id),threadsTotal:999}};
 }};
 const run=(type='general',mailbox='school@example.com')=>handleOverview({url:new URL('https://farol.invalid/?'+new URLSearchParams({mailbox})),client,email:'school@example.com',type});
 return {calls,labels,counts,failures,run};
}
test('conta mensagens de todas as páginas por marcador, sem usar contagem de conversas ou listar e-mails',async()=>{
 const h=backend(),result=await h.run();
 assert.deepEqual(result.items.map(i=>i.name),['INBOX','Classificadas','Arquivadas']);
 assert.equal(result.items[0].total,12345);assert.equal(result.items[0].status,'ready');assert.equal(h.calls.length,4);
 assert.ok(h.calls.every(call=>!call.method&&!call.data&&call.url.includes('/labels')));
 assert.ok(h.calls.every(call=>!call.url.includes('/messages')));
 const personal=await h.run('personal');assert.deepEqual(personal.items.map(i=>i.name),['1-ME DEVEM','2-MINHAS','3-DEVO','INBOX','4-DESPACHADAS']);
 assert.equal(personal.items[0].total,0);assert.equal(personal.items[0].status,'ready');
});
test('ausência, falha parcial e resposta inválida não viram zero',async()=>{
 const h=backend();h.labels.pop();h.failures.set('L4',503);
 const result=await h.run();assert.equal(result.items[0].status,'ready');assert.deepEqual(result.items[1],{name:'Classificadas',total:null,status:'unavailable'});assert.deepEqual(result.items[2],{name:'Arquivadas',total:null,status:'missing'});
 h.counts.set('INBOX',-1);assert.equal((await h.run()).items[0].total,null);
 h.failures.set('INBOX',404);assert.equal((await h.run()).items[0].status,'missing');
});
test('valida identidade e tipo antes de consultar; revogação não produz sucesso parcial',async()=>{
 const h=backend();await assert.rejects(h.run('general','other@example.com'),{message:'account_changed'});await assert.rejects(h.run('unknown'),{message:'invalid_type'});assert.equal(h.calls.length,0);
 h.failures.set('INBOX',403);await assert.rejects(h.run(),error=>error.response?.status===403);
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function frontend(){
 const nodes=new Map(),requests=[];
 const get=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',innerHTML:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}});return nodes.get(selector);};
 const root={innerHTML:'',querySelector:get},window={};
 const context=vm.createContext({window,Intl,URLSearchParams,fetch:(url)=>new Promise(resolve=>requests.push({url,resolve}))});
 vm.runInContext(fs.readFileSync('overview.js','utf8'),context);
 const respond=(type,mailbox,items,ok=true)=>{const req=requests.find(r=>!r.done&&new URL('https://farol.invalid'+r.url).searchParams.get('type')===type);assert.ok(req);req.done=true;req.resolve({ok,json:async()=>ok?{type,mailbox,items}:{error:'unavailable'}});};
 return {app:window.FarolOverview,root,get,requests,respond};
}
const generalItems=[{name:'INBOX',total:1234,status:'ready'},{name:'Classificadas',total:0,status:'ready'},{name:'Arquivadas',total:null,status:'missing'}];
const personalItems=['1-ME DEVEM','2-MINHAS','3-DEVO','INBOX','4-DESPACHADAS'].map(name=>({name,total:12,status:'ready'}));
test('Visão GERAL exibe oito caixas sem autenticação, sem inventar totais',()=>{
 const h=frontend();h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.root.innerHTML.includes('E-mails da ESCOLA'));assert.ok(h.root.innerHTML.includes('E-mails PESSOAIS'));
 const combined=h.get('#overview-cards-general').innerHTML+h.get('#overview-cards-personal').innerHTML;
 assert.equal((combined.match(/<article /g)||[]).length,8);assert.ok(combined.includes('Classificadas'));assert.ok(combined.includes('Arquivadas'));assert.ok(combined.includes('Despachadas'));assert.ok(!combined.includes('>0<'));
});
test('totais independentes mostram zero confirmado, ausência e limpam somente a conta desconectada',async()=>{
 const h=frontend();h.app.mount(h.root);h.app.connectionChanged('general',{email:'school@example.com',gmail:true});h.app.connectionChanged('personal',{email:'person@example.com',gmail:true});
 h.respond('general','school@example.com',generalItems);h.respond('personal','person@example.com',personalItems);await settle();
 const html=h.get('#overview-cards-general').innerHTML;assert.ok(html.includes('1.234'));assert.ok(html.includes('>0</strong>'));assert.ok(html.includes('Marcador ausente'));
 h.app.connectionChanged('general',null);assert.ok(!h.get('#overview-cards-general').innerHTML.includes('1.234'));assert.ok(h.get('#overview-cards-personal').innerHTML.includes('>12</strong>'));
});
test('troca de conta descarta resposta anterior; falha não mostra zero nem total antigo',async()=>{
 const h=frontend();h.app.mount(h.root);h.app.connectionChanged('general',{email:'old@example.com',gmail:true});h.app.connectionChanged('general',{email:'new@example.com',gmail:true});
 h.respond('general','old@example.com',generalItems);await settle();assert.ok(!h.get('#overview-cards-general').innerHTML.includes('1.234'));
 h.respond('general','new@example.com',[],false);await settle();assert.ok(h.get('#overview-status-general').textContent.includes('Não foi possível'));assert.ok(!h.get('#overview-cards-general').innerHTML.includes('>0</strong>'));
});
