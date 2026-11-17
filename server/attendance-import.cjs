'use strict';
const {resolveFolder,handleMaintenance}=require('./maintenance.cjs');
const {collect}=require('./student-import.cjs');
const {readAttendancePdf,filePeriod}=require('./attendance-pdf.cjs');
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
async function handleAttendanceImport({action,url,body,client,store,owner,email,readPdf=readAttendancePdf}){
  if(action==='attendance-files'){
    const result=await handleMaintenance({url,client,email,details:true,pageSize:'10'});
    // A database failure must not be mistaken for a file never loaded.
    const loaded=await store.attendanceLoadedFiles(owner,result.files.map(f=>f.name));
    return {...result,files:result.files.map(f=>({...f,loaded:loaded.has(f.name)}))};
  }
  if(body.mailbox!==email)fail('account_changed',409);
  if(body.type!=='general'||Object.keys(body).some(k=>!['type','mailbox','fileId','version','folder'].includes(k)))fail('invalid_import');
  if(typeof body.fileId!=='string'||!/^[-\w]{1,256}$/.test(body.fileId)||typeof body.version!=='string'||!/^\d{1,30}$/.test(body.version))fail('invalid_import');
  const folder=await resolveFolder(client,'FaltasSemanais');if(body.folder!==folder.id)fail('account_changed',409);
  const base='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(body.fileId);
  const metadata=async()=>(await client.request({url:base+'?fields=id,name,mimeType,parents,trashed,size,version,capabilities(canDownload)',method:'GET',timeout:10000,retry:false})).data;
  const validate=file=>{
    if(file?.id!==body.fileId||file.trashed||!file.parents?.includes(folder.id))fail('file_outside_folder',403);
    if(file.version!==body.version)fail('file_changed',409);
    if(file.capabilities?.canDownload===false)fail('file_download_denied',403);
    if(file.mimeType!=='application/pdf')fail('unsupported_file',422);
    filePeriod(file.name);
    if(!Number.isSafeInteger(Number(file.size))||Number(file.size)<1||Number(file.size)>10*1024*1024)fail('file_too_large',413);
  };
  const file=await metadata();validate(file);
  const {data:stream}=await client.request({url:base+'?alt=media',method:'GET',responseType:'stream',timeout:15000,retry:false});
  const bytes=await collect(stream,10*1024*1024);if(bytes.length!==Number(file.size))fail('file_changed',409);
  const result=await readPdf(bytes,file.name);const latest=await metadata();validate(latest);if(latest.name!==file.name)fail('file_changed',409);
  const count=await store.loadAttendance(owner,result,file.name);
  return {mailbox:email,fileId:file.id,count,studentRows:result.studentRows,loaded:true};
}
module.exports={handleAttendanceImport};
