'use strict';
const {resolveFolder,handleMaintenance}=require('./maintenance.cjs');
const {readStudentPdf,pdfDate}=require('./student-pdf.cjs');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const MAX_BYTES=10*1024*1024;
async function step(stage,operation){
  try{return await operation();}catch(error){error.studentImportStage=stage;throw error;}
}
async function collect(stream,limit){
  const chunks=[];let size=0;
  const timer=setTimeout(()=>stream.destroy(new Error('download_timeout')),10000);
  try{
    for await(const chunk of stream){const data=Buffer.from(chunk);size+=data.length;if(size>limit){stream.destroy();fail('file_too_large',413);}chunks.push(data);}
    return Buffer.concat(chunks);
  }finally{clearTimeout(timer);}
}
async function handleStudentImport({action,url,body,client,store,owner,email,readPdf=readStudentPdf,canRead=false}){
  if(action==='student-files'){
    const result=await handleMaintenance({url,client,email,subfolder:'ListaAlunos',details:true,pageSize:'10'});
    let cursor=0;
    await Promise.all(Array.from({length:2},async()=>{
      while(cursor<result.files.length){
        const file=result.files[cursor++];file.generatedAt=null;file.generationStatus=canRead?'unavailable':'permission_required';
        if(!canRead||file.mimeType!=='application/pdf'||!Number.isSafeInteger(Number(file.size))||Number(file.size)<1)continue;
        try{
          // The model stores CreationDate near the end of the PDF. Read only a bounded
          // byte range for display; student rows are parsed only after an explicit POST.
          const end=Number(file.size)-1,start=Math.max(0,end-65535);
          const {data:stream}=await client.request({url:'https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.id)+'?alt=media',method:'GET',headers:{Range:`bytes=${start}-${end}`},responseType:'stream',timeout:10000,retry:false});
          const bytes=await collect(stream,65536);
          const match=/\/CreationDate\s*\((D:[^)]{1,50})\)/.exec(bytes.toString('latin1'));
          file.generatedAt=pdfDate(match?.[1]);file.generationStatus=file.generatedAt?'ready':'not_identified';
        }catch(error){if(error.response?.status===401)throw error;}
      }
    }));
    return result;
  }
  if(body.mailbox!==email)fail('account_changed',409);
  if(body.type!=='general'||Object.keys(body).some(key=>!['type','mailbox','fileId','version','folder'].includes(key)))fail('invalid_import');
  if(typeof body.fileId!=='string'||!/^[-\w]{1,256}$/.test(body.fileId)||typeof body.version!=='string'||!/^\d{1,30}$/.test(body.version))fail('invalid_import');
  const folder=await step('folder',()=>resolveFolder(client,'ListaAlunos'));
  if(body.folder!==folder.id)fail('account_changed',409);
  const base='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(body.fileId);
  const metadata=async()=>(await client.request({url:base+'?fields=id,name,mimeType,parents,trashed,size,version',method:'GET',timeout:10000,retry:false})).data;
  const validate=file=>{
    if(file?.id!==body.fileId||file.trashed||!Array.isArray(file.parents)||!file.parents.includes(folder.id))fail('file_outside_folder',403);
    if(file.version!==body.version)fail('file_changed',409);
    if(file.mimeType!=='application/pdf'||!/\.pdf$/i.test(file.name))fail('unsupported_file',422);
    if(!Number.isSafeInteger(Number(file.size))||Number(file.size)<1||Number(file.size)>MAX_BYTES)fail('file_too_large',413);
  };
  const file=await step('metadata',metadata);validate(file);
  const bytes=await step('download',async()=>{
    const {data:stream}=await client.request({url:base+'?alt=media',method:'GET',responseType:'stream',timeout:15000,retry:false});
    return collect(stream,MAX_BYTES);
  });
  const size=bytes.length;
  if(size!==Number(file.size))fail('file_changed',409);
  const result=await step('pdf',()=>readPdf(bytes));
  // A changed/moved/deleted file is rejected before the database transaction.
  validate(await step('metadata',metadata));
  const count=await step('storage',()=>store.loadStudents(owner,result.students));
  return {mailbox:email,fileId:file.id,count,rows:result.totalRows,generatedAt:result.generatedAt};
}
module.exports={handleStudentImport,collect};
