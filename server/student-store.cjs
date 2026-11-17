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
    async saveOccurrence(owner,id,value){
      const protectedFields=['Escola','CGM','Nome','Ocorrencia'];
      const encode=()=>Object.fromEntries(protectedFields.map(field=>[field,seal(value[field],config.key,`occurrence.${owner}.${id}.${field}`)]));
      const rows=await call('Ocorrencias','POST','on_conflict=owner_id,id',{owner_id:owner,id,cgm_key:value.studentId,Data:value.Data,Hora:value.Hora,...encode()});
      if(rows?.length)return value;
      // Reusing the same submission ID after a lost response never duplicates an occurrence.
      const existing=await call('Ocorrencias','GET',`${ownerQuery(owner)}&id=eq.${id}&select=*`);
      if(!existing[0])throw new Error('storage_unavailable');
      const old={...existing[0],...Object.fromEntries(protectedFields.map(field=>[field,unseal(existing[0][field],config.key,`occurrence.${owner}.${id}.${field}`)]))};
      if(protectedFields.some(field=>old[field]!==value[field])||old.cgm_key!==value.studentId)throw Object.assign(new Error('conflict'),{status:409});
      return old;
    }
  };
}
module.exports={makeStudentStore};
