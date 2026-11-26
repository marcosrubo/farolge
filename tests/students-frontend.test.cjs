'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function ui(file,name){
 const nodes=new Map(),requests=[],window={FAROL_CONFIG:{schoolName:'Do not use this as identity'}};
 const get=key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',listeners:{},open:false,setAttribute(key,value){this[key]=value;},addEventListener(e,fn){this.listeners[e]=fn;},insertAdjacentHTML(position,html){this.innerHTML+=html;},focus(){},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}});return nodes.get(key);};
 get('#inspector-panel-consult').querySelector=get;
 get('#active-search-panel-consult').querySelector=get;
 const root={innerHTML:'',querySelector:get,insertAdjacentHTML(position,html){this.innerHTML+=html;}};
 const context=vm.createContext({window,crypto,Intl,Date,URLSearchParams,AbortController,TextDecoder,fetch:(url,opts)=>new Promise(resolve=>requests.push({url,opts,resolve}))});
 if(['students.js','active-search.js'].includes(file)){
  vm.runInContext(fs.readFileSync('occurrences.js','utf8'),context);
  vm.runInContext(fs.readFileSync('student-list.js','utf8'),context);
 }
 vm.runInContext(fs.readFileSync(file,'utf8'),context);
 return {app:window[name],window,root,get,requests,respond:(i,data,ok=true)=>requests[i].resolve({ok,json:async()=>data})};
}
const general={email:'school@example.com',driveMetadata:true,driveRead:true};
const student={id:'a'.repeat(64),Nome:'ALUNA <TESTE>',Escola:'ESCOLA FICTICIA',CGM:'0000123',Serie:'8º Ano',Turma:'A',Turno:'Manhã'};
const click=id=>({target:{closest:()=>({dataset:id})}});
test('Inspetores mantém explicação sem conexão e mostra nome/turma com texto seguro',async()=>{
 const h=ui('students.js','FarolStudents');h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.root.innerHTML.includes('Inspetores/Monitores'));
 const other={...student,id:'b'.repeat(64),Nome:'BRUNO',CGM:'0000456',Serie:'1ª Série'};
 const sameSeries={...student,id:'c'.repeat(64),Nome:'CARLA',CGM:'0000789',Turma:'B'};
 h.app.personalConnectionChanged({email:'monitor@example.com',name:'Monitor Fictício'});h.app.connectionChanged(general);h.respond(0,{mailbox:general.email,students:[student,other,sameSeries]});await settle();
 const list=h.get('#student-list'),filter=h.get('#student-search');
 assert.match(list.innerHTML,/<span class="student-name">ALUNA &lt;TESTE&gt;<\/span>\s*<span class="student-cgm">CGM 0000123<\/span>\s*<span class="student-class">8oA - Manhã<\/span>/);
 assert.match(list.innerHTML,/BRUNO<\/span>\s*<span class="student-cgm">CGM 0000456<\/span>\s*<span class="student-class">1aA - Manhã/);
 assert.match(list.innerHTML,/CARLA<\/span>\s*<span class="student-cgm">CGM 0000789<\/span>\s*<span class="student-class">8oB - Manhã/);
 for(const value of ['8oa','8ºA']){
  filter.value=value;filter.listeners.input();
  assert.match(list.innerHTML,/ALUNA/);assert.doesNotMatch(list.innerHTML,/BRUNO|CARLA/);
 }
 for(const value of ['8o','8º','0000123']){
  filter.value=value;filter.listeners.input();
  assert.match(list.innerHTML,/ALUNA/);assert.doesNotMatch(list.innerHTML,/BRUNO/);
 }
 for(const value of ['1a','1ª','1aA','1ªA']){
  filter.value=value;filter.listeners.input();
  assert.match(list.innerHTML,/BRUNO/);assert.doesNotMatch(list.innerHTML,/ALUNA/);
 }
 filter.value='';filter.listeners.input();
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
const previewSummary={mailbox:general.email,fileId:file.id,count:1,rows:1,generatedAt:file.generatedAt};
function streamPreview(h,index){
 const encoder=new TextEncoder();
 let controller;
 const body=new ReadableStream({start(value){controller=value;}});
 h.requests[index].opts.signal.addEventListener('abort',()=>{try{controller.error(new Error('aborted'));}catch{}},{once:true});
 h.requests[index].resolve({ok:true,headers:new Headers({'Content-Type':'application/x-ndjson'}),body});
 return {
  write:event=>controller.enqueue(encoder.encode(JSON.stringify(event)+'\n')),
  close:()=>controller.close()
 };
}
test('Carga de Alunos mostra nome e geração, exige ação explícita e bloqueia POST duplicado',async()=>{
 const h=ui('student-import.js','FarolStudentImport');h.app.mount(h.root);assert.equal(h.requests.length,0);
 h.app.connectionChanged(general);h.respond(0,{mailbox:general.email,folder:{id:'lista'},files:[file],nextPageToken:null});await settle();
 const html=h.get('#student-import-list').innerHTML;assert.ok(html.includes('alunos &lt;teste&gt;.pdf'));assert.ok(html.includes('17/11/2026'));assert.ok(html.includes('08:53:56'));assert.equal(h.requests.length,1);
 h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));assert.equal(h.requests.length,2);
 const body=JSON.parse(h.requests[1].opts.body);assert.equal(body.folder,'lista');assert.equal(body.fileId,file.id);assert.equal(body.version,'7');assert.equal(body.mailbox,general.email);assert.equal(body.preview,true);
 const stream=streamPreview(h,1);
 assert.equal(h.get('#student-import-dialog').open,true);
 assert.match(h.root.innerHTML,/>Turno<\/th>.*>Série<\/th>.*>Turma<\/th>.*>CGM<\/th>.*>Nome<\/th>/);
 stream.write({rows:[student]});await settle();
 assert.match(h.get('#student-import-rows').innerHTML,/<td>Manhã<\/td><td>8º Ano<\/td><td>A<\/td><td>0000123<\/td><td>ALUNA &lt;TESTE&gt;<\/td>/);
 assert.equal(h.get('#student-import-save').hidden,true);
 stream.write({preview:previewSummary});stream.close();await settle();
 assert.equal(h.get('#student-import-save').hidden,false);
 assert.equal(h.requests.length,2);
 h.get('#student-import-save').listeners.click();h.get('#student-import-save').listeners.click();
 assert.equal(h.requests.length,3);
 assert.equal(h.get('#student-import-stop').disabled,true);
 assert.equal(JSON.parse(h.requests[2].opts.body).preview,undefined);
 h.respond(2,previewSummary);await settle();
 assert.match(h.get('#student-import-status').textContent,/Carga concluída/);
 assert.equal(h.get('#student-import-dialog').open,false);
});
test('Parar aborta a leitura ou dispensa a revisão sem iniciar a gravação',async()=>{
 const h=ui('student-import.js','FarolStudentImport');h.app.mount(h.root);h.app.connectionChanged(general);
 h.respond(0,{mailbox:general.email,folder:{id:'lista'},files:[file]});await settle();
 for(const ready of [false,true]){
  h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));
  const index=h.requests.length-1,stream=streamPreview(h,index);
  stream.write({rows:[student]});
  if(ready){stream.write({preview:previewSummary});stream.close();}
  await settle();
  h.get('#student-import-stop').listeners.click();
  assert.equal(h.requests[index].opts.signal.aborted,true);
  assert.equal(h.get('#student-import-dialog').open,false);
  assert.equal(h.get('#student-import-rows').innerHTML,'');
  assert.match(h.get('#student-import-status').textContent,/Nenhum aluno/);
  h.get('#student-import-save').listeners.click();await settle();
  assert.equal(h.requests.length,index+1);
 }
});
test('prévia interrompida após mostrar alunos nunca habilita a confirmação',async()=>{
 const h=ui('student-import.js','FarolStudentImport');h.app.mount(h.root);h.app.connectionChanged(general);
 h.respond(0,{mailbox:general.email,folder:{id:'lista'},files:[file]});await settle();
 h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));
 const stream=streamPreview(h,1);
 stream.write({rows:[student]});await settle();
 assert.match(h.get('#student-import-rows').innerHTML,/ALUNA/);
 stream.close();await settle();
 assert.equal(h.get('#student-import-dialog').open,false);
 assert.equal(h.get('#student-import-rows').innerHTML,'');
 assert.match(h.get('#student-import-status').textContent,/Nenhum aluno/);
 h.get('#student-import-save').listeners.click();
 assert.equal(h.requests.length,2);
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
 h.get('#student-import-list').listeners.click(click({loadStudents:file.id}));
 const stream=streamPreview(h,2);stream.write({rows:[student]});stream.write({preview:previewSummary});stream.close();await settle();
 h.get('#student-import-save').listeners.click();h.respond(3,{error:'storage_access_denied'},false);await settle();
 assert.ok(h.get('#student-import-status').textContent.includes('Supabase recusou'));assert.equal(h.requests.length,4);
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

test('Consultar mantém registros e Excluir enquanto a migração de Alterar estiver indisponível',async()=>{
 const h=ui('students.js','FarolStudents');
 h.app.personalConnectionChanged({email:'marcos.rubo@gmail.com',name:'Marcos Rubo'});
 h.app.connectionChanged(general);h.app.mount(h.root);
 h.respond(0,{mailbox:general.email,students:[student]});await settle();
 h.get('#inspector-tab-consult').listeners.click();
 const item={id:'12345678-1234-4234-8234-123456789abc',date:'2026-11-24',time:'11:00:00',student:'Aluna fictícia',className:'8º A',text:'Ocorrência existente'};
 h.respond(1,{mailbox:general.email,items:[item],canDelete:true,editingUnavailable:true});await settle();
 const cards=h.get('#inspector-occurrences-cards'),status=h.get('#inspector-occurrences-status');
 assert.match(cards.innerHTML,/Ocorrência existente/);
 assert.match(cards.innerHTML,/>Excluir</);
 assert.doesNotMatch(cards.innerHTML,/>Alterar</);
 assert.match(status.textContent,/atualização de ocorrências no Supabase/);
 h.get('#inspector-occurrences-refresh').listeners.click();
 h.respond(2,{mailbox:general.email,items:[{...item,editVersion:item.id}],canDelete:true});await settle();
 assert.match(cards.innerHTML,/>Alterar</);
 assert.equal(status.textContent,'');
});

test('Consultar mostra Alterar nas ocorrências autorizadas e atualiza somente o texto confirmado',async()=>{
 const h=ui('students.js','FarolStudents');
 h.app.connectionChanged(general);
 h.app.personalConnectionChanged({id:'monitor-id',name:'Inspetora'});
 h.app.mount(h.root);
 h.respond(0,{mailbox:general.email,students:[student]});await settle();
 h.get('#inspector-tab-consult').listeners.click();
 const item={id:'a',date:'2026-11-24',time:'11:00:00',student:'Aluna fictícia',className:'8º A',text:'Texto original.',authorName:'Inspetora',editVersion:'version-a'};
 h.respond(1,{mailbox:general.email,items:[item,{...item,id:'b',text:'Outro texto.',editVersion:undefined}]});await settle();
 const cards=h.get('#inspector-occurrences-cards'),rows=h.get('#inspector-occurrences-rows');
 assert.equal((cards.innerHTML.match(/>Alterar</g)||[]).length,1);
 assert.equal((rows.innerHTML.match(/>Alterar</g)||[]).length,1);
 assert.doesNotMatch(rows.innerHTML,/Excluir/);
 cards.listeners.click(click({editOccurrence:'b'}));
 const dialog=h.get('#inspector-occurrences-edit-dialog'),input=h.get('#inspector-occurrences-edit-text');
 assert.equal(dialog.open,false);
 rows.listeners.click(click({editOccurrence:'a'}));
 assert.equal(dialog.open,true);assert.equal(input.value,item.text);
 input.value='Novo <texto>\nSegunda linha.';
 const submit=()=>h.get('#inspector-occurrences-edit-form').listeners.submit({preventDefault(){}});
 submit();submit();
 assert.equal(h.requests.length,3);
 assert.equal(h.requests[2].url,'/api/google/occurrence-edit');
 assert.deepEqual(JSON.parse(h.requests[2].opts.body),{type:'general',mailbox:general.email,id:'a',ocorrencia:input.value,editVersion:'version-a'});
 h.respond(2,{mailbox:general.email,id:'a',text:input.value,editVersion:'version-b'});await settle();
 assert.equal(dialog.open,false);
 assert.match(rows.innerHTML,/Novo &lt;texto&gt;\nSegunda linha\./);
 assert.match(rows.innerHTML,/Outro texto\./);
 assert.match(rows.innerHTML,/11:00:00/);
});

test('Pessoal de Marcos com acesso só a ocorrências abre diretamente a consulta',()=>{
 const h=ui('students.js','FarolStudents');
 h.app.connectionChanged({...general,occurrencesOnly:true});
 h.app.personalConnectionChanged({email:'marcos.rubo@gmail.com',name:'Marcos Rubo'},'marcos.rubo@gmail.com');
 h.app.mount(h.root);
 assert.equal(h.get('#inspector-tab-register').hidden,true);
 assert.equal(h.get('#inspector-tab-consult')['aria-selected'],'true');
 assert.equal(h.requests.length,1);
 assert.match(h.requests[0].url,/inspector-occurrences/);
});

test('Consultar buscas ativas mostra as duas datas, edita a ação e pede confirmação da exclusão',async()=>{
 const h=ui('active-search.js','FarolActiveSearch');
 let confirmation=false,question='';
 h.window.confirm=message=>{question=message;return confirmation;};
 h.app.connectionChanged(general.email,'viewer',true);
 h.app.mount(h.root);
 assert.equal(h.get('#active-search-tab-consult')['aria-selected'],'true');
 assert.match(h.requests[0].url,/active-search-records/);
 const item={id:'a',date:'2026-11-26',time:'11:00:00',searchDate:'2026-11-24',searchTime:'09:10:00',
  student:'Aluna fictícia',className:'8º A',text:'Texto original.',authorName:'autora@escola.pr.gov.br',editVersion:'version-a'};
 h.respond(0,{mailbox:general.email,items:[item],canDelete:true});await settle();
 const cards=h.get('#active-search-records-cards'),rows=h.get('#active-search-records-rows');
 assert.match(h.get('#active-search-panel-consult').innerHTML,/Data da busca/);
 assert.match(rows.innerHTML,/26\/11\/2026.*11:00:00.*24\/11\/2026.*09:10:00/);
 assert.match(cards.innerHTML,/Busca · 24\/11\/2026 · 09:10:00/);
 rows.listeners.click(click({editOccurrence:item.id}));
 const input=h.get('#active-search-records-edit-text');
 assert.equal(input.value,item.text);
 input.value='Ação revisada.';
 h.get('#active-search-records-edit-form').listeners.submit({preventDefault(){}});
 assert.equal(h.requests[1].url,'/api/google/active-search-edit');
 assert.deepEqual(JSON.parse(h.requests[1].opts.body),{type:'general',mailbox:general.email,id:item.id,text:input.value,editVersion:item.editVersion});
 h.respond(1,{mailbox:general.email,id:item.id,text:input.value,editVersion:'version-b'});await settle();
 assert.match(rows.innerHTML,/Ação revisada/);
 cards.listeners.click(click({deleteOccurrence:item.id}));
 assert.match(question,/Excluir definitivamente a busca ativa/);
 assert.equal(h.requests.length,2);
 confirmation=true;
 cards.listeners.click(click({deleteOccurrence:item.id}));
 assert.equal(h.requests[2].url,'/api/google/active-search-delete');
 h.respond(2,{mailbox:general.email,id:item.id,deleted:true});await settle();
 assert.equal(rows.innerHTML,'');
});
