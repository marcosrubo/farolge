'use strict';
const crypto=require('node:crypto');
function makeAttendanceStore(config,fetcher,{seal,unseal}){
  const fail=(code,status=503)=>{throw Object.assign(new Error(code),{status});};
  const key=(owner,type,value)=>crypto.createHmac('sha256',config.key).update(`attendance.${owner}.${type}.${value}`).digest('hex');
  async function call(path,method,query='',body){
    let response;
    try{response=await fetcher(`${config.storage}/rest/v1/${path}?${query}`,{method,headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});}catch{fail('storage_unavailable');}
    if(!response.ok){let code;try{code=(await response.json()).code;}catch{}
      if(['42P01','42703','42883','PGRST202','PGRST204','PGRST205'].includes(code))fail('attendance_setup_required');
      if(['42501','PGRST301'].includes(code)||[401,403].includes(response.status))fail('storage_access_denied',403);
      fail('storage_unavailable');
    }
    return response.json();
  }
  return {
    async getAttendanceRecords(owner,start,end){
      const all=[];
      for(let offset=0;offset<=100000;offset+=500){
        const query=new URLSearchParams({owner_id:`eq.${owner}`,select:'student_key,Escola,CGM,data,faltas',order:'student_key.asc,data.asc',limit:'500',offset:String(offset)});
        query.append('data','gte.'+start);query.append('data','lte.'+end);
        const rows=await call('FaltasDosAlunos','GET',query);
        if(!Array.isArray(rows))fail('storage_unavailable');
        all.push(...rows.map(row=>({data:row.data,faltas:row.faltas,...Object.fromEntries(['Escola','CGM'].map(field=>[field,unseal(row[field],config.key,`attendance.${owner}.${row.student_key}.${field}`)]))})));
        if(all.length>100000)fail('analysis_limit',413);
        if(rows.length<500)return all;
      }
    },
    async attendanceLoadedFiles(owner,names){
      if(!names.length)return new Set();
      const keys=[...new Set(names.map(name=>key(owner,'file',name)))];
      // Only this displayed page (at most 10 names), no full history sent to browser.
      const rows=await call('ArquivosDeFaltasCarregados','GET',new URLSearchParams({owner_id:`eq.${owner}`,file_key:`in.(${keys.join(',')})`,select:'file_key',limit:'1000'}));
      if(!Array.isArray(rows))fail('storage_unavailable');
      const found=new Set(rows.map(r=>r.file_key));return new Set(names.filter(name=>found.has(key(owner,'file',name))));
    },
    async loadAttendance(owner,result,name){
      const rows=result.records.map(row=>{
        const id=key(owner,'student',JSON.stringify([row.Escola,row.CGM]));
        return {student_key:id,data:row.data,faltas:row.faltas,...Object.fromEntries(['Escola','CGM'].map(field=>[field,seal(row[field],config.key,`attendance.${owner}.${id}.${field}`)]))};
      });
      const school_key=key(owner,'school',result.Escola),file_key=key(owner,'file',name);
      const file={school_key,file_key,Escola:seal(result.Escola,config.key,`attendance-file.${owner}.${school_key}.${file_key}.Escola`),Arquivo:seal(name,config.key,`attendance-file.${owner}.${school_key}.${file_key}.Arquivo`)};
      const count=await call('rpc/farol_load_attendance','POST','',{p_owner:owner,p_rows:rows,p_file:file});
      if(count!==rows.length)fail('import_unconfirmed',502);return count;
    }
  };
}
module.exports={makeAttendanceStore};
