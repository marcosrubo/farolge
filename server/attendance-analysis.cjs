'use strict';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
function analysisPeriod(start,end,now=new Date()){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  end=end||today;
  if(typeof end!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(Date.parse(end+'T00:00:00Z')))fail('invalid_period');
  start=start||new Date(Date.parse(end+'T00:00:00Z')-29*86400000).toISOString().slice(0,10);
  for(const date of [start,end])if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)fail('invalid_period');
  const length=(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000+1;
  if(length<1||length>366)fail('invalid_period');
  const dates=Array.from({length},(_,n)=>new Date(Date.parse(start+'T00:00:00Z')+n*86400000).toISOString().slice(0,10));
  return {start,end,dates};
}
async function handleAttendanceAnalysis({url,store,owner,email,now}){
  if(url.searchParams.get('mailbox')!==email)fail('account_changed',409);
  const period=analysisPeriod(url.searchParams.get('start'),url.searchParams.get('end'),now);
  const [students,records]=await Promise.all([store.getStudents(owner),store.getAttendanceRecords(owner,period.start,period.end)]);
  const rows=new Map(),key=(school,cgm)=>JSON.stringify([school,cgm]);
  const create=(school,cgm)=>({school,cgm,name:'Nome não cadastrado',classes:[],counts:{},total:0});
  for(const s of students){
    const id=key(s.Escola,s.CGM);if(!rows.has(id))rows.set(id,create(s.Escola,s.CGM));
    const row=rows.get(id),className=[s.Serie,s.Turma,s.Turno].filter(Boolean).join(' · ');
    if(row.name==='Nome não cadastrado')row.name=s.Nome;
    if(className&&!row.classes.includes(className))row.classes.push(className);
  }
  const index=new Map(period.dates.map((date,n)=>[date,n]));
  for(const record of records){
    const n=index.get(record.data);if(n===undefined||!Number.isSafeInteger(record.faltas)||record.faltas<0)fail('storage_unavailable',503);
    const id=key(record.Escola,record.CGM);if(!rows.has(id))rows.set(id,create(record.Escola,record.CGM));
    const row=rows.get(id);if(Object.hasOwn(row.counts,record.data))fail('storage_unavailable',503);
    row.counts[record.data]=record.faltas;row.total+=record.faltas;
  }
  const items=[...rows.values()];
  items.forEach(row=>row.classes.sort((a,b)=>a.localeCompare(b,'pt-BR')));
  items.sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'})||a.cgm.localeCompare(b.cgm)||a.school.localeCompare(b.school));
  const result={mailbox:email,...period,items};
  if(Buffer.byteLength(JSON.stringify(result))>3*1024*1024)fail('analysis_limit',413);
  return result;
}
module.exports={analysisPeriod,handleAttendanceAnalysis};
