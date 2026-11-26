'use strict';

const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
const requestId=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const studentKey=/^[a-f0-9]{64}$/;
const timeOfDay=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const civilDate=/^[1-9]\d{3}-\d{2}-\d{2}$/;
const format=new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
});

async function handleActiveSearch({action,url,body,store,owner,email,author,now=new Date()}){
  if(action==='active-search-students'){
    if(url.searchParams.get('mailbox')!==email)fail('account_changed',409);
    const students=(await store.getStudents(owner)).map(({id,Nome,CGM,Escola,Serie,Turma,Turno})=>({
      id,name:Nome,cgm:CGM,school:Escola,className:[Serie,Turma,Turno].filter(Boolean).join(' · ')
    }));
    return {mailbox:email,author,students};
  }

  if(body.mailbox!==email)fail('account_changed',409);
  if(!author)fail('active_search_author_required',403);
  if(body.authorMailbox!==author)fail('author_changed',409);
  const {id,studentId,searchDate,searchTime}=body;
  const text=typeof body.text==='string'?body.text.trim():'';
  if(body.type!=='general'||typeof id!=='string'||!requestId.test(id)
    ||typeof studentId!=='string'||!studentKey.test(studentId)
    ||typeof searchDate!=='string'||!civilDate.test(searchDate)
    ||typeof searchTime!=='string'||!timeOfDay.test(searchTime)
    ||!text||text.length>5000||text.includes('\0')
    ||Object.keys(body).some(key=>!['type','mailbox','authorMailbox','id','studentId','searchDate','searchTime','text'].includes(key))){
    fail('invalid_active_search',400);
  }
  const date=new Date(searchDate+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==searchDate)fail('invalid_active_search',400);
  const student=await store.getStudent(owner,studentId);
  if(!student)fail('student_missing',404);
  const {year,month,day,hour,minute,second}=Object.fromEntries(format.formatToParts(now).map(({type,value})=>[type,value]));
  const record=await store.saveActiveSearch(owner,id.toLowerCase(),{
    cgm_key:student.id,Escola:student.Escola,Usuario:author,Acao:text,
    DataRegistro:`${year}-${month}-${day}`,HoraRegistro:`${hour}:${minute}:${second}`,
    DataBusca:searchDate,HoraBusca:searchTime+':00'
  });
  return {id:id.toLowerCase(),saved:true,date:record.DataRegistro,time:record.HoraRegistro};
}

module.exports={handleActiveSearch};
