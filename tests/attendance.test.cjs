'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Readable}=require('node:stream');
const {filePeriod,parseAttendancePages,readAttendancePdf}=require('../server/attendance-pdf.cjs');
const {handleAttendanceImport}=require('../server/attendance-import.cjs');
const {makeAttendanceStore}=require('../server/attendance-store.cjs');
const {seal,unseal}=require('../server/google.cjs');
const name='2026_11_0811_1411_Manha.pdf',email='school@example.com',owner='owner-a';
const line=(y,items)=>({y,items:items.map(([text,x])=>({text,x})),text:items.map(i=>i[0]).join(' ')});
function page({first=true,duplicate=false,badTotal=false,missing=false,combined=false}={}){
 const lines=first?[line(-28,[['ANO LETIVO: 2026-1',30]]),line(-50,[['ESCOLA FICTICIA',30]]),line(-55,[['RELATÓRIO DE FREQUÊNCIA',295]]),line(-61,[['Manhã',30]])]:[];
 lines.push(line(-78,[['09',388],['10',403],['Dias',462],['Tot',485],['Tot',505]]),line(-83,[['TURMA (C.G.M.)',30],['NOME DO ALUNO (DATA DE NASCIMENTO)',165]]),line(-87,[['Falta',501]]));
 lines.push(line(-102,[['ALUNO FICTICIO',165]]),line(-106,[['1',390],['0',405],[badTotal?'9':'1',505]]));
 if(!missing)lines.push(line(combined?-106:-115,[[combined?'1 serie (00123)':'(00123)',30]]));
 if(duplicate)lines.push(line(-129,[['ALUNO FICTICIO',165]]),line(-133,[['2',390],['2',505]]),line(-142,[['(00123)',30]]));
 return lines.sort((a,b)=>b.y-a.y);
}
test('faltas usam ano/mês do nome e dia da coluna; zeros e soma por aluno/dia',()=>{
 const r=parseAttendancePages([page({duplicate:true})],name);
 assert.deepEqual(r.records,[{Escola:'ESCOLA FICTICIA',CGM:'00123',data:'2026-11-09',faltas:3},{Escola:'ESCOLA FICTICIA',CGM:'00123',data:'2026-11-10',faltas:0}]);
 assert.equal(r.studentRows,2);
 assert.equal(parseAttendancePages([page(),page({first:false})],name).records[0].faltas,2);
 assert.equal(parseAttendancePages([page({combined:true})],name).records[0].faltas,1);
 assert.equal(filePeriod('2028_02_2802_2902_Tarde.PDF').end,29);
 for(const file of ['wrong.pdf','2026_13_0813_1413_Manha.pdf','2026_02_2802_2902_Tarde.pdf','2026_11_3011_0612_Manha.pdf'])assert.throws(()=>filePeriod(file),{message:'attendance_filename'});
});
test('leitor rejeita total divergente, aluno sem CGM, escola ausente e dias fora do intervalo',()=>{
 for(const pages of [[page({badTotal:true})],[page({missing:true})],[page({first:false})]])assert.throws(()=>parseAttendancePages(pages,name),{message:'attendance_layout'});
 assert.throws(()=>parseAttendancePages([page()],'2026_11_0111_0711_Manha.pdf'),{message:'attendance_layout'});
});
function fixturePdf(){
 // A rotated PDF with the same axis orientation as the reports, entirely fictitious.
 const items=page().flatMap(l=>l.items.map(i=>({text:i.text,x:i.x,y:-l.y})));
 const escaped=text=>Array.from(text).map(c=>c.charCodeAt(0)>127?'\\'+c.charCodeAt(0).toString(8).padStart(3,'0'):c==='('||c===')'||c==='\\'?'\\'+c:c).join('');
 const content=items.map(i=>`BT /F1 8 Tf 0 1 -1 0 ${i.y} ${i.x} Tm (${escaped(i.text)}) Tj ET`).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Rotate 90 /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});
 const start=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(pdf);
}
test('PDF.js normaliza rotação do relatório e não aceita arquivo sem PDF',async()=>{
 const r=await readAttendancePdf(fixturePdf(),name);assert.equal(r.records[0].faltas,1);assert.equal(r.records[1].data,'2026-11-10');
 await assert.rejects(readAttendancePdf(Buffer.from('invalid'),name),{message:'unsupported_file'});
});
function importer(){
 const bytes=Buffer.from('%PDF-fixture'),loads=[],calls=[];let meta=0;
 const state={version:'7',parent:'weekly',name,download:true};
 const file=()=>({id:'pdf',name:state.name,version:state.version,mimeType:'application/pdf',parents:[state.parent],size:String(bytes.length),capabilities:{canDownload:state.download}});
 const store={attendanceLoadedFiles:async()=>new Set([name]),loadAttendance:async(o,r,n)=>{loads.push({o,r,n});return r.records.length;}};
 const client={async request(opts){calls.push(opts);const u=new URL(opts.url),q=u.searchParams.get('q')||'';
  if(q.includes("name = 'FarolGE'"))return {data:{files:[{id:'farol',name:'FarolGE'}]}};
  if(q.includes("name = 'FaltasSemanais'"))return {data:{files:[{id:'weekly',name:'FaltasSemanais'}]}};
  if(q.includes('in parents'))return {data:{files:[file()]}};
  if(u.searchParams.has('alt'))return {data:Readable.from([bytes])};
  meta++;if(state.changeAfterDownload&&meta===2)state.version='8';return {data:file()};
 }};
 const body={type:'general',mailbox:email,fileId:'pdf',version:'7',folder:'weekly'};
 const run=(extra={})=>handleAttendanceImport({action:'attendance-import',body,client,store,owner,email,readPdf:async()=>parseAttendancePages([page()],name),...extra});
 return {run,state,loads,calls,body,client,store};
}
test('carga valida pasta/versão antes e após download, marca histórico apenas após leitura válida',async()=>{
 const h=importer();await h.run();await h.run();assert.equal(h.loads.length,2);assert.equal(h.loads[1].r.records[0].faltas,1);assert.equal(h.loads[0].o,owner);
 assert.ok(h.calls.every(c=>c.method==='GET'&&c.retry===false));
 const listed=await h.run({action:'attendance-files',url:new URL('https://farol.invalid/?mailbox='+email)});assert.equal(listed.files[0].loaded,true);
 for(const change of [{parent:'elsewhere'},{version:'8'},{changeAfterDownload:true},{download:false},{name:'bad.pdf'}]){
  const bad=importer();Object.assign(bad.state,change);await assert.rejects(bad.run());assert.equal(bad.loads.length,0);
 }
 const bad=importer();await assert.rejects(bad.run({readPdf:async()=>{throw new Error('attendance_layout');}}));assert.equal(bad.loads.length,0);
 await assert.rejects(h.run({body:{...h.body,mailbox:'other@example.com'}}),{message:'account_changed'});
 await assert.rejects(h.run({body:{...h.body,owner:'forged'}}),{message:'invalid_import'});
});
test('armazenamento usa uma RPC para faltas e histórico, cifra identificadores e separa proprietários',async()=>{
 const cfg={storage:'https://test.invalid',serviceKey:'fake',key:Buffer.alloc(32,6)},calls=[];
 const store=makeAttendanceStore(cfg,async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>opts.method==='POST'?2:[{file_key:JSON.parse(calls[0].opts.body).p_file.file_key}]};},{seal});
 const r=parseAttendancePages([page()],name);await store.loadAttendance(owner,r,name);await store.loadAttendance('other',r,name);
 const first=JSON.parse(calls[0].opts.body),second=JSON.parse(calls[1].opts.body),row=first.p_rows[0];
 assert.ok(calls[0].url.includes('/rpc/farol_load_attendance'));assert.equal(first.p_owner,owner);assert.equal(row.faltas,1);
 assert.notEqual(row.student_key,second.p_rows[0].student_key);assert.notEqual(first.p_file.file_key,second.p_file.file_key);
 assert.equal(unseal(row.CGM,cfg.key,`attendance.${owner}.${row.student_key}.CGM`),'00123');
 assert.ok(!calls[0].opts.body.includes('ESCOLA FICTICIA'));assert.ok(!calls[0].opts.body.includes(name));
 assert.equal((await store.attendanceLoadedFiles(owner,[name])).has(name),true);
 assert.ok(calls[2].url.includes('owner_id=eq.owner-a'));
 const broken=makeAttendanceStore(cfg,async()=>({ok:false,status:404,json:async()=>({code:'42P01'})}),{seal});
 await assert.rejects(broken.attendanceLoadedFiles(owner,[name]),{message:'attendance_setup_required'});
});
