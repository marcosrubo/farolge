'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {handleStudents}=require('../server/students.cjs');
const {handleStudentImport}=require('../server/student-import.cjs');
const {parsePages,readStudentPdf,pdfDate}=require('../server/student-pdf.cjs');
const {makeStudentStore}=require('../server/student-store.cjs');
const {seal,unseal}=require('../server/google.cjs');
const student={id:'a'.repeat(64),Escola:'ESCOLA FICTICIA',CGM:'0001234567',Nome:'ALUNA FICTICIA',Serie:'8º Ano',Turma:'A',Turno:'Manhã'};
const email='school@example.com',owner='owner-a';
const actor={email:'monitor@example.com',name:'Monitor Fictício'};
const id='12345678-1234-4234-8234-123456789abc';
const url=new URL('https://farol.invalid/?mailbox='+email);
const line=(y,...items)=>({y,items:items.map(([x,text])=>({x,text})),text:items.map(i=>i[1]).join(' ')});
function page({first=true,ordinal='1',CGM=student.CGM,Nome=student.Nome,turma='A'}={}){
 return [...(first?[line(750,[22,student.Escola],[667,'2026']),line(720,[260,'RELAÇÃO DE ALUNOS POR TURMA'])]:[]),
 line(700,[22,'Curso: ENS FUND'],[277,'Seriação: 8º Ano'],[475,'Turno: Manhã'],[580,'Turma: '+turma]),
 line(680,[22,'N.'],[37,'CGM'],[87,'Nome do Estudante'],[260.49,'Data de']),
 line(660,...(ordinal?[[22,ordinal]]:[]),[37,CGM],[87,Nome],[256.99,'01/01/2012'],[600,'CPF IGNORADO'])];
}
test('modelo PDF usa coordenadas e contexto por página, ignora outros dados e reúne vínculos idênticos',()=>{
 const result=parsePages([page(),page({first:false}),page({first:false,turma:'B',ordinal:''})]);
 assert.equal(result.totalRows,3);assert.equal(result.students.length,2);
 assert.deepEqual(Object.keys(result.students[0]),['Escola','CGM','Nome','Serie','Turma','Turno']);
 assert.equal(result.students[0].CGM,'0001234567');assert.equal(result.students[1].Turma,'B');assert.equal(result.students[0].Nome,student.Nome);
 assert.equal(pdfDate("D:20261117085356-03'00'"),'2026-11-17T08:53:56-03:00');assert.equal(pdfDate('invalid'),null);
});
test('modelo PDF recusa cabeçalho ausente, CGM inválido e linha perdida sem aceitar carga parcial',()=>{
 assert.throws(()=>parsePages([page({CGM:'invalid'})]),{message:'pdf_layout'});
 assert.throws(()=>parsePages([page({ordinal:'2'})]),{message:'pdf_layout'});
 assert.throws(()=>parsePages([page({first:false})]),{message:'pdf_layout'});
 assert.throws(()=>parsePages([page(),page({first:false,Nome:'OUTRO NOME'})]),{message:'pdf_layout'});
});
// Minimal, fictitious PDF fixture exercises PDF.js itself without student data or a file artifact.
function fixturePdf(){
 const commands=[['ESCOLA FICTICIA',22,750],['2026',667,750],['RELACAO',260,720],['Curso: ENS FUND',22,700],['Seriacao: 8 Ano',277,700],['Turno: Manha',475,700],['Turma: A',580,700],['CGM',37,680],['Nome do Estudante',87,680],['Data de',260.49,680],['1',22,660],['0001234567',37,660],['ALUNA FICTICIA',87,660]];
 // WinAnsi octal escapes produce the exact accented headers expected in the model.
 const content=commands.map(([text,x,y])=>`BT /F1 8 Tf ${x} ${y} Td (${text.replace('RELACAO','RELA\\307\\303O DE ALUNOS POR TURMA').replace('Seriacao','Seria\\347\\343o')}) Tj ET`).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 705 849] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,"<< /CreationDate (D:20261117085356-03'00') >>"];
 let pdf='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const start=Buffer.byteLength(pdf);pdf+=`xref\n0 7\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${start}\n%%EOF`;
 return Buffer.from(pdf);
}
test('PDF.js lê arquivo fictício e extrai a geração do PDF, sem depender da criação do Drive',async()=>{
 const result=await readStudentPdf(fixturePdf());assert.equal(result.students.length,1);assert.equal(result.students[0].CGM,student.CGM);assert.equal(result.generatedAt,'2026-11-17T08:53:56-03:00');
 await assert.rejects(readStudentPdf(Buffer.from('not pdf')),{message:'unsupported_file'});
});
test('alunos ordenados em português e ocorrências derivam identidade, escola/aluno e horário de Brasília',async()=>{
 const saved=[];const store={getStudents:async o=>{assert.equal(o,owner);return [{...student,Nome:'ZÉ'},{...student,Nome:'ÁGATA'}];},getStudent:async(o,s)=>{assert.equal(o,owner);return s===student.id?student:null;},saveOccurrence:async(o,i,v)=>{assert.equal(o,owner);assert.equal(i,id);saved.push(v);return v;}};
 const listed=await handleStudents({action:'students',url,store,owner,email});assert.equal(listed.students[0].Nome,'ÁGATA');
 const body={type:'general',mailbox:email,authorMailbox:actor.email,id,studentId:student.id,ocorrencia:' Registro factual. '};
 const result=await handleStudents({action:'occurrence',body,store,owner,email,actor,now:new Date('2026-11-18T01:30:00Z')});
 assert.equal(result.date,'2026-11-17');assert.equal(result.time,'22:30:00');assert.equal(saved[0].Escola,student.Escola);assert.equal(saved[0].Nome,student.Nome);assert.equal(saved[0].Ocorrencia,'Registro factual.');assert.equal(saved[0].EmailAutor,actor.email);assert.equal(saved[0].NomeAutor,actor.name);
 await assert.rejects(handleStudents({action:'occurrence',body:{...body,Nome:'forged'},store,owner,email,actor}),{message:'invalid_occurrence'});
 await assert.rejects(handleStudents({action:'occurrence',body:{...body,studentId:'b'.repeat(64)},store,owner,email,actor}),{message:'student_missing'});
 await assert.rejects(handleStudents({action:'students',url:new URL('https://farol.invalid/?mailbox=other'),store,owner,email}),{message:'account_changed'});
});
function importHarness(){
 const bytes=Buffer.from('%PDF-fixture'),calls=[],state={folder:'students-folder',version:'7',parent:true,mime:'application/pdf',changed:false},loads=[];
 const store={loadStudents:async(o,students)=>{loads.push({o,students});return students.length;}};
 let metadataCalls=0;
 const client={async request(options){calls.push(options);const u=new URL(options.url),q=u.searchParams.get('q')||'';
  if(q.includes("name = 'FarolGE'"))return {data:{files:[{id:'farol',name:'FarolGE'}]}};
  if(q.includes("name = 'ListaAlunos'"))return {data:{files:[{id:state.folder,name:'ListaAlunos'}]}};
  if(u.searchParams.has('alt'))return {data:Readable.from([bytes])};
  metadataCalls++;return {data:{id:'pdf-1',name:'alunos.pdf',mimeType:state.mime,version:state.changed&&metadataCalls>1?'8':state.version,size:String(bytes.length),parents:state.parent?[state.folder]:['elsewhere'],trashed:false}};
 }};
 const body={type:'general',mailbox:email,fileId:'pdf-1',version:'7',folder:state.folder};
 return {state,calls,loads,body,run:(extra={})=>handleStudentImport({action:'student-import',body,client,store,owner,email,readPdf:async()=>({students:[student],totalRows:1,generatedAt:null}),...extra})};
}
test('carga resolve ListaAlunos, confere versão/local e grava só após validar todo o arquivo',async()=>{
 const h=importHarness(),result=await h.run();assert.equal(result.count,1);assert.equal(h.loads.length,1);assert.equal(h.loads[0].o,owner);
 assert.ok(h.calls[1].url.includes('ListaAlunos'));assert.ok(h.calls.some(c=>c.responseType==='stream'));assert.ok(h.calls.every(c=>c.method==='GET'));
 const outside=importHarness();outside.state.parent=false;await assert.rejects(outside.run(),{message:'file_outside_folder'});assert.equal(outside.loads.length,0);
 const changed=importHarness();changed.state.changed=true;await assert.rejects(changed.run(),{message:'file_changed'});assert.equal(changed.loads.length,0);
 const invalid=importHarness();await assert.rejects(invalid.run({readPdf:async()=>{throw Object.assign(new Error('pdf_layout'),{status:422});}}),{message:'pdf_layout'});assert.equal(invalid.loads.length,0);
});
test('armazenamento cifra todos os campos, separa proprietários/vínculos e importa em uma transação RPC',async()=>{
 const calls=[],cfg={storage:'https://example.supabase.co',serviceKey:'test',key:Buffer.alloc(32,3)};
 const store=makeStudentStore(cfg,async(url,opts)=>{calls.push({url,opts});const data=JSON.parse(opts.body);return {ok:true,status:200,json:async()=>data.p_rows.length};},{seal,unseal});
 await store.loadStudents(owner,[student,{...student,Turma:'B'}]);await store.loadStudents('owner-b',[student]);
 const first=JSON.parse(calls[0].opts.body),second=JSON.parse(calls[1].opts.body);
 assert.ok(calls.every(c=>c.url.includes('rpc/farol_load_students')));assert.notEqual(first.p_rows[0].cgm_key,first.p_rows[1].cgm_key);assert.notEqual(first.p_rows[0].cgm_key,second.p_rows[0].cgm_key);
 for(const field of ['Escola','CGM','Nome','Serie','Turma','Turno'])assert.notEqual(first.p_rows[0][field],student[field]);
 assert.ok(!calls[0].opts.body.includes(student.Nome));assert.equal(first.p_owner,owner);
 const row=first.p_rows[0];const read=makeStudentStore(cfg,async()=>({ok:true,status:200,json:async()=>[row]}),{seal,unseal});
 assert.equal((await read.getStudent(owner,row.cgm_key)).Nome,student.Nome);
 await assert.rejects(read.getStudent('wrong-owner',row.cgm_key));
});

test('lista consulta geração por faixa limitada sem importar alunos nem confundir criação no Drive',async()=>{
 const requests=[],dateBytes=Buffer.from("/CreationDate (D:20261117085356-03'00')"),file={id:'pdf-a',name:'alunos.pdf',mimeType:'application/pdf',size:'71966',version:'2',createdTime:'2026-11-18T00:00:00Z'};
 const client={async request(opts){requests.push(opts);const q=new URL(opts.url).searchParams.get('q')||'';
  if(q.includes("name = 'FarolGE'"))return {data:{files:[{id:'farol',name:'FarolGE'}]}};
  if(q.includes("name = 'ListaAlunos'"))return {data:{files:[{id:'lista',name:'ListaAlunos'}]}};
  if(q.includes('in parents'))return {data:{files:[{...file}]}};
  return {data:Readable.from([dateBytes])};
 }};
 const result=await handleStudentImport({action:'student-files',url,client,email,canRead:true});
 assert.equal(result.files[0].generatedAt,'2026-11-17T08:53:56-03:00');assert.equal(result.files[0].createdTime,file.createdTime);
 assert.equal(requests[3].headers.Range,'bytes=6430-71965');assert.equal(new URL(requests[2].url).searchParams.get('pageSize'),'10');
 requests.length=0;const denied=await handleStudentImport({action:'student-files',url,client,email,canRead:false});assert.equal(requests.length,3);assert.equal(denied.files[0].generationStatus,'permission_required');
});
test('reenvio de ocorrência após resposta perdida reutiliza o registro; conflito não sobrescreve texto',async()=>{
 const cfg={storage:'https://example.supabase.co',serviceKey:'test',key:Buffer.alloc(32,4)},value={...student,studentId:student.id,EmailAutor:actor.email,NomeAutor:actor.name,Ocorrencia:'Fato.',Data:'2026-11-17',Hora:'09:00:00'};
 let row=null;const calls=[];
 const store=makeStudentStore(cfg,async(url,opts)=>{calls.push(opts);if(opts.method==='POST'){const data=JSON.parse(opts.body);if(row)return {ok:true,status:200,json:async()=>[]};row=data;return {ok:true,status:200,json:async()=>[data]};}return {ok:true,status:200,json:async()=>[row]};},{seal,unseal});
 await store.saveOccurrence(owner,id,value);const replay=await store.saveOccurrence(owner,id,{...value,Hora:'09:01:00'});assert.equal(replay.Hora,'09:00:00');
 assert.notEqual(row.Nome,value.Nome);assert.notEqual(row.Ocorrencia,value.Ocorrencia);assert.notEqual(row.EmailAutor,value.EmailAutor);assert.notEqual(row.NomeAutor,value.NomeAutor);assert.equal(row.owner_id,owner);
 await assert.rejects(store.saveOccurrence(owner,id,{...value,Ocorrencia:'Outro texto.'}),{message:'conflict'});
 assert.ok(calls.filter(c=>c.method==='POST').every(c=>JSON.parse(c.body).id===id));
});

test('leitor distingue inicialização e worker ausentes de um PDF inválido, sem expor exceções',async()=>{
 const bytes=fixturePdf();
 await assert.rejects(readStudentPdf(bytes,{loadEngine:async()=>({getDocument(){throw new ReferenceError('DOMMatrix missing: private-path');}})}),{message:'pdf_runtime_unavailable',status:503});
 await assert.rejects(readStudentPdf(bytes,{loadEngine:async()=>({getDocument:()=>({promise:Promise.reject(new Error('Setting up fake worker failed: private-path')),destroy:async()=>{}})})}),{message:'pdf_runtime_unavailable',status:503});
 await assert.rejects(readStudentPdf(bytes,{loadEngine:async()=>({getDocument:()=>({promise:Promise.reject(new Error('Invalid PDF structure: private-data')),destroy:async()=>{}})})}),{message:'pdf_layout',status:422});
});
test('armazenamento devolve códigos seguros para SQL incompleto, permissão, estrutura e indisponibilidade',async()=>{
 const cfg={storage:'https://example.supabase.co',serviceKey:'test',key:Buffer.alloc(32,5)};
 for(const [code,status,message] of [['PGRST202',404,'setup_required'],['42703',400,'setup_required'],['42501',403,'storage_access_denied'],['23502',400,'student_schema_invalid'],['XX000',500,'storage_unavailable']]){
  const store=makeStudentStore(cfg,async()=>({ok:false,status,json:async()=>({code,message:'PRIVATE raw provider error',details:'private student information'})}),{seal,unseal});
  await assert.rejects(store.loadStudents(owner,[student]),error=>error.message===message&&!JSON.stringify(error).includes('PRIVATE'));
 }
});
test('carga identifica a etapa que falhou e não grava após falha do leitor',async()=>{
 const h=importHarness();await assert.rejects(h.run({readPdf:async()=>{throw new Error('unexpected private runtime error');}}),error=>error.studentImportStage==='pdf');assert.equal(h.loads.length,0);
 const h2=importHarness();await assert.rejects(h2.run({store:{loadStudents:async()=>{throw new Error('storage_unavailable');}}}),error=>error.studentImportStage==='storage');
});

test('consulta de ocorrências usa proprietário, ordem temporal e paginação estável, decifrando somente campos exibidos',async()=>{
 const cfg={storage:'https://example.supabase.co',serviceKey:'test',key:Buffer.alloc(32,6)},calls=[];
 const rows=Array.from({length:21},(_,i)=>{
  const rowId='12345678-1234-4234-8234-'+String(99-i).padStart(12,'0');
  return {id:rowId,cgm_key:student.id,Data:'2026-11-17',Hora:'09:00:00',Nome:seal(student.Nome,cfg.key,`occurrence.${owner}.${rowId}.Nome`),Ocorrencia:seal('Observação factual.',cfg.key,`occurrence.${owner}.${rowId}.Ocorrencia`),Alunos:Object.fromEntries(['Serie','Turma','Turno'].map(field=>[field,seal(student[field],cfg.key,`student.${owner}.${student.id}.${field}`)]))};
 });
 const store=makeStudentStore(cfg,async(url,opts)=>{calls.push({url,opts});return {ok:true,status:200,json:async()=>rows};},{seal,unseal});
 const first=await store.getOccurrences(owner);assert.equal(first.items.length,20);assert.equal(first.items[0].student,student.Nome);assert.equal(first.items[0].className,'8º Ano · A · Manhã');assert.equal(first.items[0].authorName,null);assert.ok(!('CGM' in first.items[0]));
 const params=new URL(calls[0].url).searchParams;assert.equal(params.get('owner_id'),'eq.'+owner);assert.equal(params.get('order'),'Data.desc,Hora.desc,id.desc');assert.equal(params.get('limit'),'21');assert.equal(calls[0].opts.method,'GET');
 await store.getOccurrences(owner,first.nextPageToken);const second=new URL(calls[1].url).searchParams;
 assert.equal(second.get('owner_id'),'eq.'+owner);assert.ok(second.get('or').includes('id.lt.'+rows[19].id));assert.ok(second.get('or').includes('Hora.lt.09:00:00'));
 const count=calls.length;await assert.rejects(store.getOccurrences(owner,Buffer.from(JSON.stringify({date:'2026-11-17',time:'09:00:00',id:'x),owner_id.neq.a'})).toString('base64url')),{message:'invalid_page'});assert.equal(calls.length,count);
 await assert.rejects(store.getOccurrences('other-owner'));
});
test('endpoint de ocorrências valida caixa antes de consultar e não depende do Gmail',async()=>{
 let calls=0;const store={getOccurrences:async(o,token)=>{calls++;assert.equal(o,owner);assert.equal(token,'next');return {items:[],nextPageToken:null};}};
 const result=await handleStudents({action:'occurrences',url:new URL('https://farol.invalid/?mailbox='+email+'&pageToken=next'),store,owner,email});assert.deepEqual(result,{mailbox:email,items:[],nextPageToken:null});
 await assert.rejects(handleStudents({action:'occurrences',url:new URL('https://farol.invalid/?mailbox=other'),store,owner,email}),{message:'account_changed'});assert.equal(calls,1);
});

test('exclusão usa somente a tabela de ocorrências e exige proprietário e ID na mesma linha',async()=>{
 const cfg={storage:'https://example.supabase.co',serviceKey:'test',key:Buffer.alloc(32,6)};
 let rows=[{owner,id},{owner:'other-owner',id},{owner,id:'22345678-1234-4234-8234-123456789abc'}];
 const store=makeStudentStore(cfg,async(url,opts)=>{
  const {pathname,searchParams}=new URL(url);
  assert.equal(pathname,'/rest/v1/Ocorrencias');
  assert.equal(opts.method,'DELETE');
  assert.equal(opts.headers.Prefer,'return=representation');
  assert.equal(searchParams.get('select'),'id');
  const matches=row=>searchParams.get('owner_id')==='eq.'+row.owner&&searchParams.get('id')==='eq.'+row.id;
  const deleted=rows.filter(matches).map(row=>({id:row.id}));
  rows=rows.filter(row=>!matches(row));
  return {ok:true,status:200,json:async()=>deleted};
 },{seal,unseal});
 assert.equal(await store.deleteOccurrence(owner,id),true);
 assert.equal(await store.deleteOccurrence(owner,id),false);
 assert.equal(rows.length,2);
 assert.ok(rows.some(row=>row.owner==='other-owner'&&row.id===id));
});

test('edição confere a autoria, limita o PATCH ao texto cifrado e protege a revisão',async()=>{
 const cfg={storage:'https://example.supabase.co',serviceKey:'test',key:Buffer.alloc(32,7)};
 const key=field=>`occurrence.${owner}.${id}.${field}`;
 const version='12345678-1234-4234-8234-123456789abc';
 const text='Observação original.';
 let row={id,edit_revision:version,Ocorrencia:seal(text,cfg.key,key('Ocorrencia')),
  EmailAutor:seal(actor.email,cfg.key,key('EmailAutor')),AutorId:null,Nome:seal(student.Nome,cfg.key,key('Nome')),
  Data:'2026-11-17',Hora:'09:00:00'};
 const writes=[];
 const store=makeStudentStore(cfg,async(url,opts)=>{
  const {pathname,searchParams}=new URL(url);
  assert.equal(pathname,'/rest/v1/Ocorrencias');
  const matches=searchParams.get('owner_id')==='eq.'+owner&&(!searchParams.has('id')||searchParams.get('id')==='eq.'+id);
  if(opts.method==='GET')return {ok:true,status:200,json:async()=>matches?[structuredClone(row)]:[]};
  assert.equal(opts.method,'PATCH');assert.ok(matches);
  assert.equal(searchParams.get('edit_revision'),'eq.'+row.edit_revision);
  const update=JSON.parse(opts.body);writes.push(update);
  assert.deepEqual(Object.keys(update).sort(),['Ocorrencia','edit_revision']);
  assert.notEqual(update.Ocorrencia,'Texto corrigido.');
  row={...row,...update};
  return {ok:true,status:200,json:async()=>[{id,edit_revision:row.edit_revision}]};
 },{seal,unseal});
 const own=(await store.getOccurrences(owner,'',{email:actor.email})).items[0];
 assert.equal(own.editVersion,version);
 assert.equal(own.EmailAutor,undefined);
 assert.equal((await store.getOccurrences(owner,'',{email:'other@example.com',personalEmail:actor.email})).items[0].editVersion,version);
 assert.equal((await store.getOccurrences(owner,'',{email:'other@example.com'})).items[0].editVersion,undefined);
 assert.equal((await store.getOccurrences(owner)).items[0].editVersion,undefined);
 await assert.rejects(store.editOccurrence(owner,id,{email:'other@example.com'},'Texto corrigido.',version),{message:'occurrence_edit_forbidden'});
 await assert.rejects(store.editOccurrence('other-owner',id,{all:true},'Texto corrigido.',version),{message:'occurrence_missing'});
 const saved=await store.editOccurrence(owner,id,{email:actor.email},'Texto corrigido.',version);
 assert.equal(unseal(row.Ocorrencia,cfg.key,key('Ocorrencia')),'Texto corrigido.');
 assert.equal(row.Data,'2026-11-17');
 assert.equal(unseal(row.EmailAutor,cfg.key,key('EmailAutor')),actor.email);
 assert.deepEqual(await store.editOccurrence(owner,id,{email:actor.email},'Texto corrigido.',version),saved);
 await assert.rejects(store.editOccurrence(owner,id,{all:true},'Outra revisão.',version),{message:'conflict'});
 assert.equal(writes.length,1);
 row.EmailAutor=null;
 row.AutorId=seal('cadastro-original',cfg.key,key('AutorId'));
 assert.equal((await store.getOccurrences(owner,'',{id:'cadastro-original'})).items[0].editVersion,saved.editVersion);
 assert.equal((await store.getOccurrences(owner,'',{id:'outro-cadastro'})).items[0].editVersion,undefined);
 row.AutorId=null;
 assert.equal((await store.getOccurrences(owner,'',{id:'cadastro-original'})).items[0].editVersion,undefined);
 assert.equal((await store.getOccurrences(owner,'',{all:true})).items[0].editVersion,saved.editVersion);
});
