'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {handleOverview}=require('../server/overview.cjs');
function backend(){
 const calls=[],names=['GE_ME DEVEM','GE_MINHAS','GE_DEVO','GE_Despachadas','GE_Classificadas','GE_Arquivadas'];
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
 assert.deepEqual(result.items.map(i=>i.name),['INBOX','GE_Classificadas','GE_Arquivadas']);
 assert.equal(result.items[0].total,12345);assert.equal(result.items[0].status,'ready');assert.equal(h.calls.length,4);
 assert.ok(h.calls.every(call=>!call.method&&!call.data&&call.url.includes('/labels')));
 assert.ok(h.calls.every(call=>!call.url.includes('/messages')));
 const personal=await h.run('personal');assert.deepEqual(personal.items.map(i=>i.name),['GE_ME DEVEM','GE_MINHAS','GE_DEVO','INBOX','GE_Despachadas']);
 assert.equal(personal.items[0].total,0);assert.equal(personal.items[0].status,'ready');
});
test('ausência, falha parcial e resposta inválida não viram zero',async()=>{
 const h=backend();h.labels.pop();h.failures.set('L4',503);
 const result=await h.run();assert.equal(result.items[0].status,'ready');assert.deepEqual(result.items[1],{name:'GE_Classificadas',total:null,status:'unavailable'});assert.deepEqual(result.items[2],{name:'GE_Arquivadas',total:null,status:'missing'});
 h.counts.set('INBOX',-1);assert.equal((await h.run()).items[0].total,null);
 h.failures.set('INBOX',404);assert.equal((await h.run()).items[0].status,'missing');
});
test('valida identidade e tipo antes de consultar; revogação não produz sucesso parcial',async()=>{
 const h=backend();await assert.rejects(h.run('general','other@example.com'),{message:'account_changed'});await assert.rejects(h.run('unknown'),{message:'invalid_type'});assert.equal(h.calls.length,0);
 h.failures.set('INBOX',403);await assert.rejects(h.run(),error=>error.response?.status===403);
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function frontend(){
 const nodes=new Map(),requests=[],timers=new Map();let nextTimer=0;
 const document={hidden:false,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},removeEventListener(name){delete this.listeners[name];}};
 const get=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',innerHTML:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}});return nodes.get(selector);};
 const root={innerHTML:'',querySelector:get},window={};
 const context=vm.createContext({window,document,Intl,URLSearchParams,setInterval:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearInterval:id=>timers.delete(id),fetch:(url)=>new Promise(resolve=>requests.push({url,resolve}))});
 vm.runInContext(fs.readFileSync('overview.js','utf8'),context);
 const respond=(type,mailbox,items,ok=true)=>{const req=requests.find(r=>!r.done&&new URL('https://farol.invalid'+r.url).searchParams.get('type')===type);assert.ok(req);req.done=true;req.resolve({ok,json:async()=>ok?{type,mailbox,items}:{error:'unavailable'}});};
 return {app:window.FarolOverview,root,get,requests,respond,timers,document,tick:()=>{for(const timer of timers.values())timer.fn();}};
}
const generalItems=[{name:'INBOX',total:1234,status:'ready'},{name:'GE_Classificadas',total:0,status:'ready'},{name:'GE_Arquivadas',total:null,status:'missing'}];
const personalItems=['GE_ME DEVEM','GE_MINHAS','GE_DEVO','INBOX','GE_Despachadas'].map(name=>({name,total:12,status:'ready'}));
test('Visão GERAL exibe dois quadros com oito linhas sem autenticação, sem inventar totais',()=>{
 const h=frontend();h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.root.innerHTML.includes('E-mails da ESCOLA'));assert.ok(h.root.innerHTML.includes('E-mails PESSOAIS'));
 const combined=h.get('#overview-cards-general').innerHTML+h.get('#overview-cards-personal').innerHTML;
 assert.equal((h.root.innerHTML.match(/class="overview-group"/g)||[]).length,2);assert.equal((combined.match(/<dt>/g)||[]).length,8);assert.ok(combined.includes('Classificadas'));assert.ok(combined.includes('Arquivadas'));assert.ok(combined.includes('Despachadas'));assert.ok(!combined.includes('>0<'));
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

test('títulos da Visão GERAL não expõem GE_ nem os números antigos',()=>{
 const h=frontend();h.app.mount(h.root);
 const html=h.get('#overview-cards-general').innerHTML+h.get('#overview-cards-personal').innerHTML;
 assert.ok(!html.includes('GE_'));assert.ok(!html.includes('1-ME'));assert.ok(!html.includes('4-DESPACH'));
 for(const title of ['ME DEVEM','MINHAS','DEVO','Despachadas','Classificadas','Arquivadas'])assert.ok(html.includes(title));
});

const occurrenceItems=[
 {id:'b',date:'2026-11-17',time:'10:30:00',student:'ALUNA <TESTE>',className:'8º Ano · A · Manhã',text:'Primeira linha\n<script>texto</script>'},
 {id:'a',date:'2026-11-16',time:'15:00:00',student:'OUTRA ALUNA',className:'7º Ano · B · Tarde',text:'Registro anterior.'}
];
function respondOccurrences(h,body,ok=true){const req=h.requests.find(r=>!r.done&&r.url.startsWith('/api/google/occurrences?'));assert.ok(req);req.done=true;req.resolve({ok,json:async()=>body});}
test('ocorrências ficam após o quadro pessoal com os cinco campos e não usam conexão Pessoal',async()=>{
 const h=frontend();h.app.mount(h.root);
 assert.ok(h.root.innerHTML.indexOf('id="overview-occurrences-title"')>h.root.innerHTML.indexOf('id="overview-title-personal"'));
 for(const title of ['Data','Hora','Aluno','Turma','Ocorrência'])assert.ok(h.root.innerHTML.includes('>'+title+'</th>'));
 h.app.connectionChanged('personal',{email:'person@example.com',gmail:true});assert.ok(!h.requests.some(r=>r.url.startsWith('/api/google/occurrences?')));
 h.app.connectionChanged('general',{email:'school@example.com',gmail:false});respondOccurrences(h,{mailbox:'school@example.com',items:[...occurrenceItems].reverse(),nextPageToken:'next'});await settle();
 const html=h.get('#overview-occurrences-rows').innerHTML;assert.ok(html.includes('17/11/2026'));assert.ok(html.includes('10:30:00'));assert.ok(html.indexOf('ALUNA &lt;TESTE&gt;')<html.indexOf('OUTRA ALUNA'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
});
test('ocorrências paginam sem duplicar e mantêm os registros quando a atualização falha',async()=>{
 const h=frontend();h.app.mount(h.root);h.app.connectionChanged('general',{email:'school@example.com',gmail:false});
 respondOccurrences(h,{mailbox:'school@example.com',items:[occurrenceItems[0]],nextPageToken:'next'});await settle();h.get('#overview-occurrences-more').listeners.click();
 assert.ok(h.requests.at(-1).url.includes('pageToken=next'));
 respondOccurrences(h,{mailbox:'school@example.com',items:occurrenceItems,nextPageToken:null});await settle();assert.equal((h.get('#overview-occurrences-rows').innerHTML.match(/<tr>/g)||[]).length,2);
 h.get('#overview-occurrences-refresh').listeners.click();respondOccurrences(h,{error:'storage_unavailable'},false);await settle();assert.ok(h.get('#overview-occurrences-rows').innerHTML.includes('OUTRA ALUNA'));assert.ok(h.get('#overview-occurrences-status').textContent.includes('lista anterior'));
});
test('ocorrências descartam respostas da Geral anterior e separam ausência de falha',async()=>{
 const h=frontend();h.app.mount(h.root);h.app.connectionChanged('general',{email:'old@example.com',gmail:false});h.app.connectionChanged('general',{email:'new@example.com',gmail:false});
 respondOccurrences(h,{mailbox:'old@example.com',items:occurrenceItems});await settle();assert.equal(h.get('#overview-occurrences-rows').innerHTML,'');
 respondOccurrences(h,{error:'storage_unavailable'},false);await settle();assert.ok(h.get('#overview-occurrences-status').textContent.includes('Não foi possível'));assert.ok(!h.get('#overview-occurrences-status').textContent.includes('Nenhuma ocorrência'));
 h.get('#overview-occurrences-refresh').listeners.click();respondOccurrences(h,{mailbox:'new@example.com',items:[],nextPageToken:null});await settle();assert.equal(h.get('#overview-occurrences-status').textContent,'Nenhuma ocorrência registrada.');
 h.app.connectionChanged('general',null);assert.equal(h.get('#overview-occurrences-rows').innerHTML,'');assert.ok(h.get('#overview-occurrences-status').textContent.includes('Conecte a conta GERAL'));
});

test('atualização automática começa marcada, usa 60 segundos e não sobrepõe consultas pendentes',async()=>{
 const h=frontend();h.app.mount(h.root);assert.equal(h.get('#overview-auto-refresh').checked,true);assert.equal(h.timers.size,1);
 h.app.connectionChanged('general',{email:'school@example.com',gmail:true});h.app.connectionChanged('personal',{email:'person@example.com',gmail:true});assert.equal(h.requests.length,3);
 h.get('#overview-auto-refresh').checked=true;h.get('#overview-auto-refresh').listeners.change();assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,60000);
 h.tick();assert.equal(h.requests.length,3);
 h.respond('general','school@example.com',generalItems);h.respond('personal','person@example.com',personalItems);respondOccurrences(h,{mailbox:'school@example.com',items:occurrenceItems,nextPageToken:null});await settle();
 h.tick();assert.equal(h.requests.length,6);assert.ok(h.get('#overview-cards-general').innerHTML.includes('1.234'));assert.ok(h.get('#overview-occurrences-rows').innerHTML.includes('ALUNA'));
 h.respond('general','school@example.com',[],false);h.respond('personal','person@example.com',personalItems);respondOccurrences(h,{error:'storage_unavailable'},false);await settle();
 assert.ok(h.get('#overview-cards-general').innerHTML.includes('1.234'));assert.ok(h.get('#overview-status-general').textContent.includes('Dados anteriores mantidos'));assert.ok(h.get('#overview-occurrences-status').textContent.includes('lista anterior'));
 h.get('#overview-auto-refresh').checked=false;h.get('#overview-auto-refresh').listeners.change();assert.equal(h.timers.size,0);h.tick();assert.equal(h.requests.length,6);
});
test('atualização automática pausa em aba oculta, retoma visível e encerra ao sair da Visão GERAL',async()=>{
 const h=frontend();h.app.mount(h.root);h.app.connectionChanged('general',{email:'school@example.com',gmail:false});respondOccurrences(h,{mailbox:'school@example.com',items:[],nextPageToken:null});await settle();
 h.get('#overview-auto-refresh').checked=true;h.get('#overview-auto-refresh').listeners.change();respondOccurrences(h,{mailbox:'school@example.com',items:[],nextPageToken:null});await settle();
 const before=h.requests.length;h.document.hidden=true;h.document.listeners.visibilitychange();assert.equal(h.timers.size,0);h.tick();assert.equal(h.requests.length,before);assert.ok(h.get('#overview-auto-status').textContent.includes('pausada'));
 h.document.hidden=false;h.document.listeners.visibilitychange();assert.equal(h.requests.length,before+1);assert.equal(h.timers.size,1);
 h.app.unmount();assert.equal(h.timers.size,0);assert.equal(h.document.listeners.visibilitychange,undefined);
 respondOccurrences(h,{mailbox:'school@example.com',items:occurrenceItems,nextPageToken:null});await settle();h.app.mount(h.root);assert.equal(h.get('#overview-auto-refresh').checked,true);assert.equal(h.timers.size,1);
 h.app.connectionChanged('general',null);const count=h.requests.length;h.tick();assert.equal(h.requests.length,count);assert.equal(h.get('#overview-occurrences-rows').innerHTML,'');
});
