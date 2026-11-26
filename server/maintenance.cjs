'use strict';
const BASE='https://www.googleapis.com/drive/v3/files';
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
async function list(client,params,signal){
  signal?.throwIfAborted();
  const {data}=await client.request({url:BASE+'?'+new URLSearchParams({...params,spaces:'drive',corpora:'user',pageSize:params.pageSize||'100',fields:params.fields||'nextPageToken,incompleteSearch,files(id,name)'}),method:'GET',timeout:10000,retry:false,signal});
  if(data?.incompleteSearch)fail('drive_incomplete',503);
  if(!Array.isArray(data?.files)||data.files.some(file=>typeof file.name!=='string'||typeof file.id!=='string'||!/^[-\w]+$/.test(file.id)))fail('invalid_provider',502);
  if(data.nextPageToken!==undefined&&typeof data.nextPageToken!=='string')fail('invalid_provider',502);
  return data;
}
async function resolveFolder(client,subfolder,signal){
  if(!['FaltasSemanais','ListaAlunos'].includes(subfolder))fail('invalid_folder',400);
  // Resolve the fixed path among folders accessible to this account, including shared folders.
  // Never require ownership or accept an arbitrary folder ID.
  const folders=await list(client,{q:"trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = 'FarolGE'"},signal);
  if(!folders.files.length&&!folders.nextPageToken)fail('folder_missing',404);
  if(folders.files.length!==1||folders.nextPageToken)fail('folder_ambiguous',409);
  const parent=folders.files[0];
  const subfolders=await list(client,{q:`trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '${subfolder}' and '${parent.id}' in parents`},signal);
  if(!subfolders.files.length&&!subfolders.nextPageToken)fail('folder_missing',404);
  if(subfolders.files.length!==1||subfolders.nextPageToken)fail('folder_ambiguous',409);
  const folder=subfolders.files[0];
  return folder;
}
async function handleMaintenance({url,client,email,subfolder='FaltasSemanais',details=false,pageSize='100'}){
  if(url.searchParams.get('mailbox')!==email)fail('account_changed',409);
  const pageToken=url.searchParams.get('pageToken')||'';
  if(pageToken.length>4096)fail('invalid_page',400);
  const folder=await resolveFolder(client,subfolder);
  if(pageToken&&url.searchParams.get('folder')!==folder.id)fail('account_changed',409);
  const data=await list(client,{q:`trashed = false and '${folder.id}' in parents and mimeType != 'application/vnd.google-apps.folder'`,orderBy:'name',pageSize,...(details?{fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,createdTime,modifiedTime,size,version)'}:{}),...(pageToken?{pageToken}:{})});
  return {mailbox:email,folder,files:data.files,nextPageToken:data.nextPageToken||null};
}
module.exports={handleMaintenance,resolveFolder};
