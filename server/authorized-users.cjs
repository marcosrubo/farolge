'use strict';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const emailOf=value=>typeof value==='string'?value.trim().toLowerCase():'';
const validEmail=email=>email.length<=254&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
async function handleAuthorizedUsers({action,url,body,store,email}){
  if((action==='authorized-emails'?url.searchParams.get('mailbox'):body.mailbox)!==email)fail('account_changed',409);
  if(action==='authorized-emails')return {mailbox:email,...await store.listAuthorizedEmails(url.searchParams.get('pageToken')||'')};
  if(body.type!=='general'||!['include','exclude'].includes(body.operation)||Object.keys(body).some(k=>!['type','mailbox','operation','email','nome','escola'].includes(k)))fail('invalid_authorized_email');
  const target=emailOf(body.email);if(!validEmail(target))fail('invalid_authorized_email');
  if(body.operation==='include'){
    const nome=typeof body.nome==='string'?body.nome.trim():'',escola=typeof body.escola==='string'?body.escola.trim():'';
    if(!nome||nome.length>200||!escola||escola.length>200)fail('invalid_authorized_email');
    await store.includeAuthorizedEmail({email:target,Nome:nome,Escola:escola});
  }else{
    if('nome' in body||'escola' in body)fail('invalid_authorized_email');
    await store.excludeAuthorizedEmail(target);
  }
  return {mailbox:email,email:target,operation:body.operation,saved:true};
}
module.exports={handleAuthorizedUsers};
