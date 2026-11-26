'use strict';
const crypto=require('node:crypto');
const storageError=(code,status=503)=>Object.assign(new Error(code),{status});
function makeStudentStore(config,fetcher,{seal,unseal}){
  async function call(path,method,query='',body){
    let response;
    try{response=await fetcher(`${config.storage}/rest/v1/${path}?${query}`,{method,headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json',Prefer:method==='POST'?'resolution=ignore-duplicates,return=representation':'return=representation'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});}catch{throw storageError('storage_unavailable');}
    if(!response.ok){let code;try{code=(await response.json()).code;}catch{}
      if(['42P01','42703','42883','PGRST202','PGRST204','PGRST205'].includes(code))throw storageError('setup_required');
      if(['42501','PGRST301'].includes(code)||[401,403].includes(response.status))throw storageError('storage_access_denied',403);
      if(['23502','23503','23505','21000','22023','22P02'].includes(code))throw storageError('student_schema_invalid');
      throw storageError('storage_unavailable');
    }
    return response.status===204?null:response.json();
  }
  const key=(owner,cgm)=>crypto.createHmac('sha256',config.key).update(`student.${owner}.${cgm}`).digest('hex');
  const fields=['Escola','CGM','Nome','Serie','Turma','Turno'];
  const decode=(owner,row)=>({id:row.cgm_key,...Object.fromEntries(fields.map(field=>[field,unseal(row[field],config.key,`student.${owner}.${row.cgm_key}.${field}`)]))});
  const ownerQuery=owner=>`owner_id=eq.${encodeURIComponent(owner)}`;
  const occurrenceKey=(owner,id,field)=>`occurrence.${owner}.${id}.${field}`;
  function canEditOccurrence(row,owner,editor){
    if(editor?.all)return true;
    if(!editor)return false;
    const field=editor.id?'AutorId':'EmailAutor';
    if(!row[field])return false;
    const identity=unseal(row[field],config.key,occurrenceKey(owner,row.id,field));
    return typeof identity==='string'&&Boolean(identity)&&(editor.id?identity===editor.id:identity===editor.email||identity===editor.personalEmail);
  }
  return {
    async getStudents(owner){
      const all=[];
      for(let offset=0;offset<=10000;offset+=500){
        const rows=await call('Alunos','GET',`${ownerQuery(owner)}&select=cgm_key,Escola,CGM,Nome,Serie,Turma,Turno&order=cgm_key&limit=500&offset=${offset}`);
        if(!Array.isArray(rows))throw new Error('storage_unavailable');
        all.push(...rows.map(row=>decode(owner,row)));
        if(all.length>10000)throw Object.assign(new Error('listing_limit'),{status:413});
        if(rows.length<500)return all;
      }
    },
    async getStudent(owner,id){
      const rows=await call('Alunos','GET',`${ownerQuery(owner)}&cgm_key=eq.${id}&select=cgm_key,Escola,CGM,Nome,Serie,Turma,Turno&limit=1`);
      return rows[0]?decode(owner,rows[0]):null;
    },
    async loadStudents(owner,students){
      const rows=students.map(student=>{const id=key(owner,JSON.stringify([student.Escola,student.CGM,student.Serie,student.Turma,student.Turno]));return {cgm_key:id,...Object.fromEntries(fields.map(field=>[field,seal(student[field],config.key,`student.${owner}.${id}.${field}`)]))};});
      const count=await call('rpc/farol_load_students','POST','',{p_owner:owner,p_rows:rows});
      if(count!==students.length)throw storageError('import_unconfirmed',502);
      return count;
    },
    async getOccurrences(owner,pageToken='',editor=null){
      let after='';
      if(pageToken){
        let cursor;try{if(pageToken.length>1024)throw new Error();cursor=JSON.parse(Buffer.from(pageToken,'base64url').toString('utf8'));}catch{throw storageError('invalid_page',400);}
        const date=cursor?.date,time=cursor?.time,id=cursor?.id;
        if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||typeof time!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?$/.test(time)||typeof id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw storageError('invalid_page',400);
        after='&or='+encodeURIComponent(`(Data.lt.${date},and(Data.eq.${date},Hora.lt.${time}),and(Data.eq.${date},Hora.eq.${time},id.lt.${id}))`);
      }
      const editFields=editor?`,edit_revision${editor.all?'':editor.id?',AutorId':',EmailAutor'}`:'';
      const readPage=fields=>call('Ocorrencias','GET',
        `${ownerQuery(owner)}&select=id,cgm_key,Nome,Data,Hora,Ocorrencia,NomeAutor${fields},Alunos(Serie,Turma,Turno)&order=Data.desc,Hora.desc,id.desc&limit=21${after}`);
      let rows,editingUnavailable=false;
      try{
        rows=await readPage(editFields);
      }catch(error){
        if(!editFields||error.message!=='setup_required')throw error;
        rows=await readPage('');
        editingUnavailable=true;
      }
      if(!Array.isArray(rows))throw storageError('storage_unavailable');
      const page=rows.slice(0,20),last=page.at(-1);
      const items=page.map(row=>{
        const student=row.Alunos;
        const turma=student?['Serie','Turma','Turno'].map(field=>unseal(student[field],config.key,`student.${owner}.${row.cgm_key}.${field}`)).join(' · '):'—';
        const editVersion=!editingUnavailable&&canEditOccurrence(row,owner,editor)?row.edit_revision:null;
        return {id:row.id,date:row.Data,time:row.Hora,student:unseal(row.Nome,config.key,occurrenceKey(owner,row.id,'Nome')),className:turma,text:unseal(row.Ocorrencia,config.key,occurrenceKey(owner,row.id,'Ocorrencia')),authorName:row.NomeAutor?unseal(row.NomeAutor,config.key,occurrenceKey(owner,row.id,'NomeAutor')):null,...(editVersion?{editVersion}:{})};
      });
      const nextPageToken=rows.length>20?Buffer.from(JSON.stringify({date:last.Data,time:last.Hora,id:last.id})).toString('base64url'):null;
      return {items,nextPageToken,...(editingUnavailable?{editingUnavailable:true}:{})};
    },
    async deleteOccurrence(owner,id){
      const rows=await call('Ocorrencias','DELETE',`${ownerQuery(owner)}&id=eq.${encodeURIComponent(id)}&select=id`);
      if(!Array.isArray(rows)||rows.length>1||(rows.length===1&&rows[0]?.id!==id.toLowerCase()))throw storageError('storage_unavailable');
      return rows.length===1;
    },
    async editOccurrence(owner,id,editor,text,version){
      const filter=`${ownerQuery(owner)}&id=eq.${id}`;
      const rows=await call('Ocorrencias','GET',`${filter}&select=id,Ocorrencia,EmailAutor,AutorId,edit_revision&limit=1`);
      if(!Array.isArray(rows)||rows.length>1||(rows[0]&&rows[0].id!==id))throw storageError('storage_unavailable');
      const row=rows[0];
      if(!row)throw storageError('occurrence_missing',404);
      if(!canEditOccurrence(row,owner,editor))throw storageError('occurrence_edit_forbidden',403);
      const key=occurrenceKey(owner,id,'Ocorrencia');
      if(unseal(row.Ocorrencia,config.key,key)===text)return {text,editVersion:row.edit_revision};
      if(row.edit_revision!==version)throw storageError('conflict',409);
      const revision=crypto.randomUUID();
      const updated=await call('Ocorrencias','PATCH',`${filter}&edit_revision=eq.${version}&select=id,edit_revision`,{Ocorrencia:seal(text,config.key,key),edit_revision:revision});
      if(!Array.isArray(updated)||updated.length>1)throw storageError('storage_unavailable');
      if(!updated.length)throw storageError('conflict',409);
      if(updated[0].id!==id||updated[0].edit_revision!==revision)throw storageError('storage_unavailable');
      return {text,editVersion:revision};
    },
    async saveActiveSearch(owner,id,value){
      const fields=['Escola','Usuario','Acao'];
      const keyFor=field=>`active-search.${owner}.${id}.${field}`;
      const encoded=Object.fromEntries(fields.map(field=>[field,seal(value[field],config.key,keyFor(field))]));
      const rows=await call('BuscaAtiva','POST','on_conflict=owner_id,id',{...value,...encoded,owner_id:owner,id});
      if(!Array.isArray(rows)||rows.length>1)throw storageError('storage_unavailable');
      if(rows.length){
        if(rows[0].id!==id)throw storageError('storage_unavailable');
        return rows[0];
      }
      // A retry with the same ID returns the original registration timestamp.
      const existing=await call('BuscaAtiva','GET',`${ownerQuery(owner)}&id=eq.${id}&limit=1`);
      if(!Array.isArray(existing)||existing.length!==1||existing[0].id!==id)throw storageError('storage_unavailable');
      const row=existing[0];
      if(['cgm_key','DataBusca','HoraBusca'].some(field=>row[field]!==value[field])
        ||fields.some(field=>unseal(row[field],config.key,keyFor(field))!==value[field])){
        throw storageError('conflict',409);
      }
      return row;
    },
    async saveOccurrence(owner,id,value){
      const protectedFields=['Escola','CGM','Nome','Ocorrencia','EmailAutor','NomeAutor',...(value.AutorId?['AutorId']:[])];
      const encode=()=>Object.fromEntries(protectedFields.map(field=>[field,value[field]===null?null:seal(value[field],config.key,`occurrence.${owner}.${id}.${field}`)]));
      const rows=await call('Ocorrencias','POST','on_conflict=owner_id,id',{owner_id:owner,id,cgm_key:value.studentId,Data:value.Data,Hora:value.Hora,...encode()});
      if(rows?.length)return value;
      // Reusing the same submission ID after a lost response never duplicates an occurrence.
      const existing=await call('Ocorrencias','GET',`${ownerQuery(owner)}&id=eq.${id}&select=*`);
      if(!existing[0])throw new Error('storage_unavailable');
      const old={...existing[0],...Object.fromEntries(protectedFields.map(field=>[field,existing[0][field]?unseal(existing[0][field],config.key,`occurrence.${owner}.${id}.${field}`):null]))};
      if(protectedFields.some(field=>old[field]!==value[field])||old.cgm_key!==value.studentId)throw Object.assign(new Error('conflict'),{status:409});
      return old;
    }
  };
}
module.exports={makeStudentStore};
