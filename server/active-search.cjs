'use strict';

const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
const requestId=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const studentKey=/^[a-f0-9]{64}$/;
const timeOfDay=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const civilDate=/^[1-9]\d{3}-\d{2}-\d{2}$/;
const format=new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
});

async function handleActiveSearch({action,url,body,store,owner,email,author,editor,canDelete,now=new Date()}){
  const reading=action==='active-search-students'||action==='active-search-records';
  if((reading?url.searchParams.get('mailbox'):body.mailbox)!==email)fail('account_changed',409);
  if(action==='active-search-records'){
    const records=await store.getActiveSearches(owner,url.searchParams.get('pageToken')||'',editor);
    return {mailbox:email,...records,canDelete:Boolean(canDelete&&!records.editingUnavailable)};
  }
  if(action==='active-search-students'){
    const students=(await store.getStudents(owner)).map(({id,Nome,CGM,Escola,Serie,Turma,Turno})=>({
      id,name:Nome,cgm:CGM,school:Escola,serie:Serie,turma:Turma,turno:Turno,
      className:[Serie,Turma,Turno].filter(Boolean).join(' · ')
    }));
    return {mailbox:email,author,students};
  }

  if(action==='active-search-edit'||action==='active-search-delete'){
    const {id,editVersion}=body;
    const deleting=action==='active-search-delete';
    const allowed=['type','mailbox','id',...(deleting?[]:['text','editVersion'])];
    if(body.type!=='general'||typeof id!=='string'||!uuid.test(id)
      ||Object.keys(body).some(key=>!allowed.includes(key)))fail('invalid_active_search',400);
    const recordId=id.toLowerCase();
    if(deleting){
      if(!canDelete)fail('admin_required',403);
      return {mailbox:email,id:recordId,deleted:await store.deleteActiveSearch(owner,recordId)};
    }
    const text=typeof body.text==='string'?body.text.trim():'';
    if(!text||text.length>5000||text.includes('\0')||typeof editVersion!=='string'||!uuid.test(editVersion)){
      fail('invalid_active_search',400);
    }
    if(!editor?.all&&!editor?.emails?.length)fail('active_search_edit_forbidden',403);
    return {mailbox:email,id:recordId,...await store.editActiveSearch(owner,recordId,editor,text,editVersion.toLowerCase())};
  }
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
