'use strict';
const {PERSONAL_LABELS,GENERAL_LABELS,ANNUAL_LABEL}=require('./mailbox-labels.cjs');
const BASE='https://gmail.googleapis.com/gmail/v1/users/me/labels';
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
async function handleOverview({url,client,email,type}){
  if(!['general','personal'].includes(type))fail('invalid_type',400);
  if(url.searchParams.get('mailbox')!==email)fail('account_changed',409);
  const names=type==='general'?['INBOX',...GENERAL_LABELS.filter(name=>name!==ANNUAL_LABEL)]:[...PERSONAL_LABELS.slice(0,3),'INBOX',PERSONAL_LABELS[3]];
  const {data}=await client.request({url:BASE,timeout:10000});
  if(!Array.isArray(data?.labels))fail('invalid_provider',502);
  const ids=names.map(name=>name==='INBOX'?'INBOX':data.labels.find(label=>label.name===name)?.id);
  const items=new Array(names.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,names.length)},async()=>{
    while(cursor<names.length){
      const index=cursor++,name=names[index],id=ids[index];
      if(!id){items[index]={name,total:null,status:'missing'};continue;}
      if(typeof id!=='string'||!/^[\w-]{1,128}$/.test(id))fail('invalid_provider',502);
      try{
        const {data:label}=await client.request({url:BASE+'/'+encodeURIComponent(id),timeout:10000});
        if(label?.id!==id||!Number.isSafeInteger(label.messagesTotal)||label.messagesTotal<0)fail('invalid_provider',502);
        items[index]={name,total:label.messagesTotal,status:'ready'};
      }catch(error){
        // Authentication failures must invalidate this response, not appear as partial success.
        if([401,403].includes(error.response?.status))throw error;
        items[index]={name,total:null,status:error.response?.status===404?'missing':'unavailable'};
      }
    }
  }));
  return {mailbox:email,type,items};
}
module.exports={handleOverview};
