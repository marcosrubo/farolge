'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function ui(file,name){
 const nodes=new Map(),requests=[],window={FAROL_CONFIG:{schoolName:'Do not use this as identity'}};
 const get=key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',listeners:{},open:false,setAttribute(key,value){this[key]=value;},addEventListener(e,fn){this.listeners[e]=fn;},focus(){},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}});return nodes.get(key);};
 get('#inspector-panel-consult').querySelector=get;
 const root={innerHTML:'',querySelector:get};
 const context=vm.createContext({window,crypto,Intl,Date,URLSearchParams,fetch:(url,opts)=>new Promise(resolve=>requests.push({url,opts,resolve}))});
 if(file==='students.js')vm.runInContext(fs.readFileSync('occurrences.js','utf8'),context);
 vm.runInContext(fs.readFileSync(file,'utf8'),context);
 return {app:window[name],window,root,get,requests,respond:(i,data,ok=true)=>requests[i].resolve({ok,json:async()=>data})};
}
const general={email:'school@example.com',driveMetadata:true,driveRead:true};
const student={id:'a'.repeat(64),Nome:'ALUNA <TESTE>',Escola:'ESCOLA FICTICIA',CGM:'0000123',Serie:'8º Ano',Turma:'A',Turno:'Manhã'};
const click=id=>({target:{closest:()=>({dataset:id})}});
test('Inspetores mantém explicação sem conexão e mostra nome/turma com texto seguro',async()=>{
 const h=ui('students.js','FarolStudents');h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.root.innerHTML.includes('Inspetores/Monitores'));
 h.app.personalConnectionChanged({email:'monitor@example.com',name:'Monitor Fictício'});h.app.connectionChanged(general);h.respond(0,{mailbox:general.email,students:[student]});await settle();
 assert.ok(h.get('#student-list').innerHTML.includes('ALUNA &lt;TESTE&gt;'));assert.ok(h.get('#student-list').innerHTML.includes('8º Ano · A · Manhã'));
 h.get('#student-list').listeners.click(click({student:student.id}));assert.equal(h.get('#student-dialog').open,true);assert.equal(h.get('#student-school').textContent,student.Escola);
 h.get('#student-occurrence').value='Observação factual.';
 const event={preventDefault(){}};h.get('#student-form').listeners.submit(event);h.get('#student-form').listeners.submit(event);assert.equal(h.requests.length,2);
 const body=JSON.parse(h.requests[1].opts.body);assert.equal(body.studentId,student.id);assert.equal(body.ocorrencia,'Observação factual.');assert.ok(!('Nome' in body));assert.ok(!('escola' in body));assert.equal(h.requests[1].opts.headers['X-Farol-Request'],'1');
 h.respond(1,{mailbox:general.email,saved:true,date:'2026-11-17',time:'09:00:00'});await settle();assert.equal(h.get('#student-dialog').open,false);assert.ok(h.get('#student-status').textContent.includes('17/11/2026'));
});
test('Inspetores descarta respostas antigas e limpa aluno/modal na troca da Geral',async()=>{
 const h=ui('students.js','FarolStudents');h.app.mount(h.root);h.app.connectionChanged(general);h.app.connectionChanged({...general,email:'new@example.com'});
 h.respond(0,{mailbox:general.email,students:[student]});await settle();assert.equal(h.get('#student-list').innerHTML,'');
 h.respond(1,{mailbox:'new@example.com',students:[student]});await settle();h.get('#student-list').listeners.click(click({student:student.id}));
 h.app.connectionChanged(null);assert.equal(h.get('#student-list').innerHTML,'');assert.equal(h.get('#student-dialog').open,false);
});
const file={id:'pdf-a',name:'alunos <teste>.pdf',mimeType:'application/pdf',version:'7',size:'100',createdTime:'2026-11-17T12:00:00Z',generatedAt:'2026-11-17T08:53:56-03:00',generationStatus:'ready'};
test('Carga de Alunos mostra nome e geração, exige ação explícita e bloqueia POST duplicado',async()=>{
 const h=ui('student-import.js','FarolStudentImport');h.app.mount(h.root);assert.equal(h.requests.length,0);
 h.app.connectionChanged(general);h.respond(0,{mailbox:general.email,folder:{id:'lista'},files:[file],nextPageToken:null});await settle();
 const html=h.get('#student-import-list').innerHTML;assert.ok(html.includes('alunos &lt;teste&gt;.pdf'));assert.ok(html.includes('17/11/2026'));assert.ok(html.includes('08:53:56'));assert.equal(h.requests.length,1);
 h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));assert.equal(h.requests.length,2);
 const body=JSON.parse(h.requests[1].opts.body);assert.equal(body.folder,'lista');assert.equal(body.fileId,file.id);assert.equal(body.version,'7');assert.equal(body.mailbox,general.email);
 h.respond(1,{mailbox:general.email,fileId:file.id,count:341,rows:374,generatedAt:file.generatedAt});await settle();assert.ok(h.get('#student-import-status').textContent.includes('341 vínculos'));
});
test('Carga preserva lista em falha, exige nova permissão para importar e ignora resposta depois da troca',async()=>{
 const h=ui('student-import.js','FarolStudentImport');h.app.mount(h.root);h.app.connectionChanged({...general,driveRead:false});h.respond(0,{mailbox:general.email,folder:{id:'lista'},files:[file],nextPageToken:null});await settle();
 h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));assert.equal(h.requests.length,1);assert.equal(h.get('#student-import-scope').hidden,false);
 h.get('#student-import-refresh').listeners.click();h.respond(1,{error:'unavailable'},false);await settle();assert.ok(h.get('#student-import-list').innerHTML.includes('alunos'));assert.ok(h.get('#student-import-status').textContent.includes('lista anterior'));
 h.app.connectionChanged(general);h.app.connectionChanged(null);h.respond(2,{mailbox:general.email,folder:{id:'lista'},files:[file],nextPageToken:null});await settle();assert.equal(h.get('#student-import-list').innerHTML,'');
});

test('Carga identifica falha do leitor e do Supabase sem repetir POST ou apagar a lista',async()=>{
 const h=ui('student-import.js','FarolStudentImport');h.app.mount(h.root);h.app.connectionChanged(general);h.respond(0,{mailbox:general.email,folder:{id:'lista'},files:[file],nextPageToken:null});await settle();
 h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));h.respond(1,{error:'pdf_runtime_unavailable'},false);await settle();
 assert.ok(h.get('#student-import-status').textContent.includes('leitor de PDF não iniciou'));assert.ok(h.get('#student-import-list').innerHTML.includes('alunos'));assert.equal(h.requests.length,2);
 h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));h.respond(2,{error:'storage_access_denied'},false);await settle();
 assert.ok(h.get('#student-import-status').textContent.includes('Supabase recusou'));assert.equal(h.requests.length,3);
});

test('ocorrência exige Pessoal com nome e fecha o formulário quando o autor muda',async()=>{
 const h=ui('students.js','FarolStudents');h.app.mount(h.root);h.app.connectionChanged(general);h.respond(0,{mailbox:general.email,students:[student]});await settle();
 h.get('#student-list').listeners.click(click({student:student.id}));assert.equal(h.get('#student-save').disabled,true);assert.ok(h.get('#student-actor').textContent.includes('Identifique'));
 h.app.personalConnectionChanged({email:'monitor@example.com',name:'Monitor Fictício'});assert.equal(h.get('#student-dialog').open,false);
 h.get('#student-list').listeners.click(click({student:student.id}));assert.equal(h.get('#student-save').disabled,false);assert.ok(h.get('#student-actor').textContent.includes('Monitor Fictício'));
 h.get('#student-occurrence').value='Registro.';h.get('#student-form').listeners.submit({preventDefault(){}});assert.equal(JSON.parse(h.requests[1].opts.body).authorMailbox,'monitor@example.com');
 h.app.personalConnectionChanged({email:'new@example.com',name:'Outra pessoa'});h.respond(1,{mailbox:general.email,saved:true,date:'2026-11-17',time:'10:00:00'});await settle();assert.ok(!h.get('#student-status').textContent.includes('Ocorrência registrada'));
});

test('as abas preservam a busca e Consultar carrega a lista paginada com cartões seguros',async()=>{
 const h=ui('students.js','FarolStudents');
 h.app.connectionChanged(general);
 h.app.personalConnectionChanged({id:'monitor-id',name:'Monitor Fictício'});
 h.app.mount(h.root);
 assert.match(h.root.innerHTML,/aria-selected="true"[^>]*>REGISTRAR/);
 assert.equal(h.requests.length,1);
 h.respond(0,{mailbox:general.email,students:[student]});await settle();
 h.get('#student-search').value='ALUNA';
 const register=h.get('#inspector-tab-register'),consult=h.get('#inspector-tab-consult');
 register.listeners.keydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(consult['aria-selected'],'true');
 assert.equal(h.get('#inspector-panel-register').hidden,true);
 assert.equal(h.get('#inspector-panel-consult').hidden,false);
 assert.match(h.requests[1].url,/^\/api\/google\/inspector-occurrences\?/);
 const item={id:'b',date:'2026-11-24',time:'11:00:00',student:'Aluna <teste>',className:'8º A',text:'Linha 1\nLinha <2>',authorName:'Monitor Fictício'};
 h.respond(1,{mailbox:general.email,items:[item],nextPageToken:'next'});await settle();
 const cards=h.get('#inspector-occurrences-cards');
 assert.match(cards.innerHTML,/24\/11\/2026 · 11:00:00/);
 assert.match(cards.innerHTML,/Aluna &lt;teste&gt;/);
 assert.match(cards.innerHTML,/8º A/);
 assert.match(cards.innerHTML,/Linha 1\nLinha &lt;2&gt;/);
 assert.match(cards.innerHTML,/Registrado por: Monitor Fictício/);
 assert.doesNotMatch(cards.innerHTML,/Excluir/);
 h.get('#inspector-occurrences-more').listeners.click();
 assert.match(h.requests[2].url,/pageToken=next/);
 h.respond(2,{mailbox:general.email,items:[item,{...item,id:'a',time:'10:00:00',authorName:null}],nextPageToken:null});await settle();
 assert.equal((cards.innerHTML.match(/<li>/g)||[]).length,2);
 assert.match(cards.innerHTML,/Não informado/);
 h.get('#inspector-occurrences-refresh').listeners.click();
 register.listeners.click();
 assert.equal(h.get('#student-search').value,'ALUNA');
 assert.equal(h.get('#inspector-panel-consult').hidden,true);
 h.respond(3,{mailbox:general.email,items:[item]});await settle();
 assert.equal(cards.innerHTML,'');
 consult.listeners.click();
 assert.doesNotMatch(h.requests[4].url,/pageToken/);
 h.app.personalConnectionChanged(null);
 h.respond(4,{mailbox:general.email,items:[item]});await settle();
 assert.equal(cards.innerHTML,'');
});

test('Consultar confirma a exclusão e remove somente a ocorrência confirmada pelo servidor',async()=>{
 const h=ui('students.js','FarolStudents');
 let confirm=false,question='';
 h.window.confirm=message=>{question=message;return confirm;};
 h.app.personalConnectionChanged({email:'marcos.rubo@gmail.com',name:'Marcos Rubo'});
 h.app.connectionChanged(general);h.app.mount(h.root);
 h.respond(0,{mailbox:general.email,students:[student]});await settle();
 h.get('#inspector-tab-consult').listeners.click();
 const item={id:'12345678-1234-4234-8234-123456789abc',date:'2026-11-24',time:'11:00:00',student:'Aluna fictícia',className:'8º A',text:'Ocorrência de teste',authorName:'Monitor fictício'};
 const other={...item,id:'22345678-1234-4234-8234-123456789abc',text:'Outra ocorrência'};
 h.respond(1,{mailbox:general.email,items:[item,other],canDelete:true});await settle();
 const cards=h.get('#inspector-occurrences-cards'),rows=h.get('#inspector-occurrences-rows');
 assert.equal((cards.innerHTML.match(/>Excluir</g)||[]).length,2);
 assert.equal((rows.innerHTML.match(/>Excluir</g)||[]).length,2);
 const event=click({deleteOccurrence:item.id});
 cards.listeners.click(event);
 assert.match(question,/definitivamente.*Aluna fictícia.*24\/11\/2026/);
 assert.equal(h.requests.length,2);
 confirm=true;
 cards.listeners.click(event);rows.listeners.click(event);
 assert.equal(h.requests.length,3);
 assert.equal(h.requests[2].opts.method,'POST');
 assert.equal(h.requests[2].opts.headers['X-Farol-Request'],'1');
 assert.equal(h.requests[2].url,'/api/google/occurrence-delete');
 assert.deepEqual(JSON.parse(h.requests[2].opts.body),{type:'general',mailbox:general.email,id:item.id});
 h.respond(2,{error:'storage_unavailable'},false);await settle();
 assert.match(cards.innerHTML,/Ocorrência de teste/);
 assert.match(h.get('#inspector-occurrences-status').textContent,/Atualize a lista/);
 rows.listeners.click(event);
 h.respond(3,{mailbox:general.email,id:item.id,deleted:true});await settle();
 assert.doesNotMatch(cards.innerHTML,/Ocorrência de teste/);
 assert.match(cards.innerHTML,/Outra ocorrência/);
 assert.equal(h.get('#inspector-occurrences-status').textContent,'Ocorrência excluída.');
 cards.listeners.click(click({deleteOccurrence:other.id}));
 h.respond(4,{error:'admin_required'},false);await settle();
 assert.doesNotMatch(cards.innerHTML,/>Excluir</);
 assert.match(cards.innerHTML,/Outra ocorrência/);
});
