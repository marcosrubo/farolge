'use strict';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const emailOf=value=>typeof value==='string'?value.trim().toLowerCase():'';
const validEmail=email=>email.length<=254&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
const validUserId=id=>typeof id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
const validUserOrder=order=>order===null||(Number.isInteger(order)&&order>=1&&order<=2147483647);
const textOf=value=>typeof value==='string'?value.trim():'';

async function handleAuthorizedUsers({action,url,body,store,email}){
  if((action==='authorized-emails'?url.searchParams.get('mailbox'):body.mailbox)!==email)fail('account_changed',409);
  if(action==='authorized-emails')return {mailbox:email,...await store.listAuthorizedEmails(url.searchParams.get('pageToken')||'')};
  const {operation,id}=body;
  const keys=['type','mailbox','operation'];
  if(operation!=='include')keys.push('id');
  if(operation!=='exclude')keys.push('email','nome','escola','funcao','ordem');
  if(body.type!=='general'||!['include','update','exclude'].includes(operation)
    ||Object.keys(body).some(key=>!keys.includes(key))
    ||(operation!=='include'&&!validUserId(id)))fail('invalid_authorized_email');

  if(operation==='exclude'){
    await store.excludeAuthorizedEmail(id);
  }else{
    const Nome=textOf(body.nome),Escola=textOf(body.escola),Funcao=textOf(body.funcao);
    const Ordem=body.ordem===undefined?null:body.ordem;
    const target=emailOf(body.email);
    if([Nome,Escola,Funcao].some(value=>!value||value.length>200)
      ||(body.email!=null&&typeof body.email!=='string')
      ||(target&&!validEmail(target))||!validUserOrder(Ordem))fail('invalid_authorized_email');
    const row={email:target||null,Nome,Escola,Funcao,Ordem};
    if(operation==='include')await store.includeAuthorizedEmail(row);
    else await store.updateAuthorizedEmail(id,row);
  }
  return {mailbox:email,operation,saved:true};
}
module.exports={handleAuthorizedUsers,validUserId,validUserOrder};
