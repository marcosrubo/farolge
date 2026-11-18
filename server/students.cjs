'use strict';
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
async function handleStudents({action,url,body,store,owner,email,actor,now=new Date()}){
  if((['students','occurrences'].includes(action)?url.searchParams.get('mailbox'):body.mailbox)!==email)fail('account_changed',409);
  if(action==='occurrences')return {mailbox:email,...await store.getOccurrences(owner,url.searchParams.get('pageToken')||'')};
  if(action==='students'){
    const students=await store.getStudents(owner);
    students.sort((a,b)=>a.Nome.localeCompare(b.Nome,'pt-BR',{sensitivity:'base'})||a.Turma.localeCompare(b.Turma,'pt-BR')||a.CGM.localeCompare(b.CGM));
    return {mailbox:email,students};
  }
  if(body.type!=='general'||Object.keys(body).some(key=>!['type','mailbox','studentId','id','ocorrencia','authorMailbox','authorId'].includes(key)))fail('invalid_occurrence',400);
  if(!/^[a-f0-9]{64}$/.test(body.studentId||'')||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.id||''))fail('invalid_occurrence',400);
  if(!(actor?.id||actor?.email)||!actor?.name)fail('author_required',401);
  if(actor.id?body.authorId!==actor.id||'authorMailbox' in body:body.authorMailbox!==actor.email||'authorId' in body)fail('author_changed',409);
  const text=typeof body.ocorrencia==='string'?body.ocorrencia.trim():'';
  if(!text||text.length>5000)fail('invalid_occurrence',400);
  const student=await store.getStudent(owner,body.studentId);
  if(!student)fail('student_missing',404);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const value=await store.saveOccurrence(owner,body.id,{studentId:student.id,Escola:student.Escola,CGM:student.CGM,Nome:student.Nome,Data:`${parts.year}-${parts.month}-${parts.day}`,Hora:`${parts.hour}:${parts.minute}:${parts.second}`,Ocorrencia:text,EmailAutor:actor.email,NomeAutor:actor.name});
  return {mailbox:email,id:body.id,date:value.Data,time:value.Hora,saved:true};
}
module.exports={handleStudents};
