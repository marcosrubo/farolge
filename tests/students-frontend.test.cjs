'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function ui(file,name){
 const nodes=new Map(),requests=[],window={FAROL_CONFIG:{schoolName:'Do not use this as identity'}};
 const get=key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',listeners:{},open:false,addEventListener(e,fn){this.listeners[e]=fn;},focus(){},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}});return nodes.get(key);};
 const root={innerHTML:'',querySelector:get};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{window,crypto,Intl,Date,URLSearchParams,fetch:(url,opts)=>new Promise(resolve=>requests.push({url,opts,resolve}))});
 return {app:window[name],root,get,requests,respond:(i,data,ok=true)=>requests[i].resolve({ok,json:async()=>data})};
}
const general={email:'school@example.com',driveMetadata:true,driveRead:true};
const student={id:'a'.repeat(64),Nome:'ALUNA <TESTE>',Escola:'ESCOLA FICTICIA',CGM:'0000123',Serie:'8º Ano',Turma:'A',Turno:'Manhã'};
const click=id=>({target:{closest:()=>({dataset:id})}});
test('Inspetores mantém explicação sem conexão e mostra nome/turma com texto seguro',async()=>{
 const h=ui('students.js','FarolStudents');h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.root.innerHTML.includes('Inspetores/Monitores'));
 h.app.connectionChanged(general);h.respond(0,{mailbox:general.email,students:[student]});await settle();
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
