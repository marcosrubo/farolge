'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {analysisPeriod,handleAttendanceAnalysis}=require('../server/attendance-analysis.cjs');
const {makeAttendanceStore}=require('../server/attendance-store.cjs');
const {seal,unseal}=require('../server/google.cjs');
const email='school@example.com',owner='owner-a';
const student=(CGM,Nome,Turma='A',Escola='ESCOLA FICTICIA')=>({Escola,CGM,Nome,Serie:'8º',Turma,Turno:'Manhã'});
test('período inicial inclui hoje e mais 29 dias, com data de Brasília e calendário válido',()=>{
 const p=analysisPeriod(null,null,new Date('2026-11-18T01:30:00Z'));
 assert.equal(p.end,'2026-11-17');assert.equal(p.start,'2026-10-19');assert.equal(p.dates.length,30);
 assert.equal(analysisPeriod('2028-02-28','2028-03-01').dates.length,3);
 for(const [start,end] of [['2026-11-17','2026-11-16'],['2026-02-29','2026-03-01'],['2026-11-01','bad'],['bad','2026-11-01'],['2025-01-01','2026-11-01']])assert.throws(()=>analysisPeriod(start,end),{message:'invalid_period'});
});
test('análise reúne turmas sem multiplicar faltas, preserva zero/ausência e ordena totais com desempate alfabético',async()=>{
 const calls=[],students=[student('1','Ágata'),student('1','Ágata','B'),student('2','Zilda'),student('3','Bia'),student('4','Sem carga'),student('1','Outra escola','A','OUTRA ESCOLA')];
 const records=[{Escola:students[0].Escola,CGM:'1',data:'2026-11-01',faltas:2},{Escola:students[0].Escola,CGM:'1',data:'2026-11-02',faltas:0},{Escola:students[0].Escola,CGM:'2',data:'2026-11-01',faltas:2},{Escola:students[0].Escola,CGM:'3',data:'2026-11-02',faltas:5},{Escola:students[0].Escola,CGM:'9',data:'2026-11-01',faltas:1}];
 const store={getStudents:async o=>{calls.push(o);return students;},getAttendanceRecords:async(o,start,end)=>{calls.push({o,start,end});return records;}};
 const url=new URL('https://farol.invalid/?'+new URLSearchParams({mailbox:email,start:'2026-11-01',end:'2026-11-03'}));
 const r=await handleAttendanceAnalysis({url,store,owner,email});assert.deepEqual(r.items.slice(0,3).map(r=>r.name),['Bia','Ágata','Zilda']);
 const a=r.items[1];assert.equal(a.classes.length,2);assert.equal(a.total,2);assert.equal(a.counts['2026-11-02'],0);assert.equal(a.counts['2026-11-03'],undefined);assert.equal(r.items.length,6);
 assert.equal(r.items.find(r=>r.cgm==='9').name,'Nome não cadastrado');assert.equal(r.items.find(r=>r.school==='OUTRA ESCOLA').total,0);
 assert.equal(calls[0],owner);assert.equal(calls[1].o,owner);
 url.searchParams.set('mailbox','other@example.com');await assert.rejects(handleAttendanceAnalysis({url,store,owner,email}),{message:'account_changed'});assert.equal(calls.length,2);
});
test('consulta pagina todo o período e decifra somente registros da Geral',async()=>{
 const cfg={storage:'https://test.invalid',serviceKey:'fake',key:Buffer.alloc(32,6)},calls=[];
 const id='a'.repeat(64),record={student_key:id,Escola:seal('ESCOLA',cfg.key,`attendance.${owner}.${id}.Escola`),CGM:seal('00123',cfg.key,`attendance.${owner}.${id}.CGM`),data:'2026-11-01',faltas:2};
 const store=makeAttendanceStore(cfg,async(url)=>{calls.push(url);const p=new URL(url).searchParams;assert.equal(p.get('owner_id'),'eq.'+owner);assert.deepEqual(p.getAll('data'),['gte.2026-11-01','lte.2026-11-30']);return {ok:true,json:async()=>p.get('offset')==='0'?Array(500).fill(record):[record]};},{seal,unseal});
 const rows=await store.getAttendanceRecords(owner,'2026-11-01','2026-11-30');assert.equal(rows.length,501);assert.equal(rows[0].CGM,'00123');assert.equal(calls.length,2);
 const broken=makeAttendanceStore(cfg,async()=>({ok:true,json:async()=>[record]}),{seal,unseal});await assert.rejects(broken.getAttendanceRecords('other','2026-11-01','2026-11-30'));
});
function frontend(){
 const nodes=new Map(),requests=[],window={};
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}});return nodes.get(id);};
 const root={innerHTML:'',querySelector:get};
 vm.runInNewContext(fs.readFileSync('attendance-analysis.js','utf8'),{window,Intl,Date,URLSearchParams,fetch:(url,opts)=>new Promise(resolve=>requests.push({url,opts,resolve}))});
 const respond=(index,body,ok=true)=>requests[index].resolve({ok,json:async()=>body});
 const response=(index,items)=>{const p=new URL('https://farol.invalid'+requests[index].url).searchParams;return {mailbox:p.get('mailbox'),start:p.get('start'),end:p.get('end'),dates:analysisPeriod(p.get('start'),p.get('end')).dates,items};};
 return {app:window.FarolAttendanceAnalysis,root,get,requests,respond,response};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('matriz mostra todos os alunos em uma página, distingue zero e sem registro e filtra sem repetir consulta',async()=>{
 const h=frontend();h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.get('#attendance-status').textContent.includes('Conecte'));
 h.get('#attendance-start').value='2026-11-01';h.get('#attendance-end').value='2026-11-03';h.app.connectionChanged({email});
 const items=Array.from({length:51},(_,i)=>({school:'Escola',name:i===0?'<b>Aluno</b>':'ALUNO '+i,cgm:String(i),classes:[i===0?'B':'A'],counts:{'2026-11-01':2,'2026-11-02':0},total:2}));
 h.respond(0,h.response(0,items));await settle();
 const html=h.get('#attendance-rows').innerHTML;assert.ok(html.includes('&lt;b&gt;'));assert.ok(!html.includes('<b>'));assert.ok(html.includes('attendance-zero'));assert.ok(html.includes('attendance-missing'));assert.equal((html.match(/<tr>/g)||[]).length,51);
 assert.ok(html.includes('ALUNO 50'));assert.ok(!h.root.innerHTML.includes('attendance-next'));assert.ok(!h.root.innerHTML.includes('attendance-prev'));
 h.get('#attendance-class').value='B';h.get('#attendance-class').listeners.change();assert.equal((h.get('#attendance-rows').innerHTML.match(/<tr>/g)||[]).length,1);
 h.get('#attendance-class').value='';h.get('#attendance-search').value='ALUNO 50';h.get('#attendance-search').listeners.input();assert.ok(h.get('#attendance-rows').innerHTML.includes('ALUNO 50'));assert.equal(h.requests.length,1);
});
test('alteração do período valida intervalo, preserva dados na falha e descarta resposta após troca de conta',async()=>{
 const h=frontend();h.app.connectionChanged({email});h.app.mount(h.root);h.respond(0,h.response(0,[{name:'ALUNA',school:'Escola',cgm:'1',classes:['A'],counts:{},total:0}]));await settle();
 h.get('#attendance-start').value='2026-11-17';h.get('#attendance-end').value='2026-11-16';await h.get('#attendance-period').listeners.submit({preventDefault(){}});assert.equal(h.requests.length,1);assert.ok(h.get('#attendance-status').textContent.includes('válido'));
 h.get('#attendance-start').value='2026-11-01';h.get('#attendance-end').value='2026-11-17';h.get('#attendance-period').listeners.submit({preventDefault(){}});h.respond(1,{error:'unavailable'},false);await settle();assert.ok(h.get('#attendance-status').textContent.includes('Dados anteriores'));assert.ok(h.get('#attendance-rows').innerHTML.includes('ALUNA'));
 h.get('#attendance-period').listeners.submit({preventDefault(){}});h.app.connectionChanged({email:'other@example.com'});h.respond(2,h.response(2,[{name:'STALE',school:'Escola',cgm:'1',classes:[],counts:{},total:0}]));await settle();assert.ok(!h.get('#attendance-rows').innerHTML.includes('STALE'));
 h.app.unmount();h.respond(3,h.response(3,[]));await settle();
});
