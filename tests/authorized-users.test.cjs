'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {handleAuthorizedUsers}=require('../server/authorized-users.cjs');
const {makeStore}=require('../server/google.cjs');
const email='school@example.com';
const id='12345678-1234-4234-8234-123456789abc';
test('cadastro exige Escola, Nome e Função, aceita e-mail vazio e opera pelo ID',async()=>{
 const saved=[],updated=[],removed=[];
 const store={
  includeAuthorizedEmail:async row=>saved.push(row),
  updateAuthorizedEmail:async (target,row)=>updated.push([target,row]),
  excludeAuthorizedEmail:async target=>removed.push(target)
 };
 const body={type:'general',mailbox:email,operation:'include',email:' USER@EXAMPLE.COM ',nome:' Pessoa ',escola:' Escola ',funcao:' Inspetora ',ordem:2};
 const base={action:'authorized-email',email,store,body};
 const result=await handleAuthorizedUsers(base);
 assert.equal(result.saved,true);
 const profile={email:'user@example.com',Nome:'Pessoa',Escola:'Escola',Funcao:'Inspetora',Ordem:2};
 assert.deepEqual(saved,[profile]);
 await handleAuthorizedUsers({...base,body:{...body,email:' ',ordem:null}});
 assert.deepEqual(saved[1],{...profile,email:null,Ordem:null});
 await handleAuthorizedUsers({...base,body:{...body,operation:'update',id,email:null,ordem:1}});
 assert.deepEqual(updated,[[id,{...profile,email:null,Ordem:1}]]);
 await handleAuthorizedUsers({...base,body:{type:'general',mailbox:email,operation:'exclude',id}});
 assert.deepEqual(removed,[id]);
 await assert.rejects(handleAuthorizedUsers({...base,body:{...body,mailbox:'other@example.com'}}),{message:'account_changed'});
 for(const invalid of [{role:'admin'},{nome:''},{escola:' '},{funcao:undefined},{email:'inválido'},{email:123},{ordem:0},{ordem:1.5},{ordem:2147483648},{ordem:'1'},{operation:'update',id:'inválido'}]){
  await assert.rejects(handleAuthorizedUsers({...base,body:{...body,...invalid}}),{message:'invalid_authorized_email'});
 }
});
test('persistência pagina por ordem e ID, inclusive após registros sem ordem',async()=>{
 const config={storage:'https://example.supabase.co',serviceKey:'test',key:Buffer.alloc(32,7)},calls=[];
 let order=5,duplicate=false;
 const store=makeStore(config,async(url,opts)=>{
  calls.push({url:new URL(url),opts});
  if(duplicate)return {ok:false,status:409,json:async()=>({code:'23505'})};
  return {ok:true,status:200,json:async()=>opts.method==='GET'?Array.from({length:51},()=>({id,Ordem:order,email:null})):[{}]};
 });
 const page=await store.listAuthorizedEmails();
 assert.equal(page.users.length,50);
 assert.equal(calls[0].url.searchParams.get('order'),'Ordem.asc.nullslast,id.asc');
 order=null;
 const next=await store.listAuthorizedEmails(page.nextPageToken);
 assert.equal(calls[1].url.searchParams.get('or'),'(Ordem.gt.5,and(Ordem.eq.5,id.gt.'+id+'),Ordem.is.null)');
 await store.listAuthorizedEmails(next.nextPageToken);
 assert.equal(calls[2].url.searchParams.get('Ordem'),'is.null');
 assert.equal(calls[2].url.searchParams.get('id'),'gt.'+id);
 await assert.rejects(store.listAuthorizedEmails(Buffer.from(JSON.stringify([5,'invalido'])).toString('base64url')),{message:'invalid_page'});
 await store.includeAuthorizedEmail({email:null});
 assert.equal(calls[3].opts.method,'POST');
 assert.ok(!calls[3].opts.headers.Prefer.includes('merge-duplicates'));
 await store.updateAuthorizedEmail(id,{email:null,Ordem:3});
 assert.equal(calls[4].opts.method,'PATCH');
 assert.equal(calls[4].url.searchParams.get('id'),'eq.'+id);
 await store.excludeAuthorizedEmail(id);
 assert.equal(calls[5].opts.method,'DELETE');
 assert.equal(calls[5].url.searchParams.get('id'),'eq.'+id);
 duplicate=true;
 await assert.rejects(store.includeAuthorizedEmail({}),{message:'email_exists'});
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function ui(){
 const nodes=new Map(),requests=[],window={FAROL_CONFIG:{schoolName:'Escola'}};
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',listeners:{},open:false,addEventListener(n,fn){this.listeners[n]=fn;},focus(){},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const root={innerHTML:'',querySelector:get};vm.runInNewContext(fs.readFileSync('authorized-users.js','utf8'),{window,URLSearchParams,fetch:(url,opts)=>new Promise(resolve=>requests.push({url,opts,resolve}))});
 return {app:window.FarolAuthorizedUsers,root,get,requests,respond:(i,result,ok=true)=>requests[i].resolve({ok,json:async()=>result})};
}
test('Configurações inclui e exclui somente por ação confirmada, escapando texto do cadastro',async()=>{
 const h=ui();h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.root.innerHTML.includes('Cadastro de usuários'));
 h.app.connectionChanged({email});h.respond(0,{mailbox:email,users:[{id,email:null,Nome:'Pessoa <teste>',Escola:'Escola',Funcao:'Inspetora',Ordem:2}],nextPageToken:null});await settle();assert.ok(h.get('#authorized-rows').innerHTML.includes('Pessoa &lt;teste&gt;'));
 h.get('#authorized-rows').listeners.click({target:{closest:()=>({dataset:{authorizedAction:'exclude',userId:id}})}});assert.equal(h.get('#authorized-delete-dialog').open,true);assert.equal(h.requests.length,1);
 h.get('#authorized-delete-cancel').listeners.click();assert.equal(h.requests.length,1);
 h.get('#authorized-name').value='Pessoa';h.get('#authorized-function').value='Inspetora';h.get('#authorized-school').value='Escola';h.get('#authorized-form').listeners.submit({preventDefault(){}});h.get('#authorized-form').listeners.submit({preventDefault(){}});assert.equal(h.requests.length,2);
 const body=JSON.parse(h.requests[1].opts.body);assert.equal(body.operation,'include');assert.equal(body.type,'general');assert.equal(body.nome,'Pessoa');assert.equal(body.funcao,'Inspetora');assert.equal(body.email,'');assert.equal(body.ordem,null);assert.equal(h.requests[1].opts.headers['X-Farol-Request'],'1');
 h.respond(1,{mailbox:email,saved:true,operation:'include'});await settle();assert.equal(h.requests.length,3);
 h.app.connectionChanged(null);h.respond(2,{mailbox:email,users:[{email:'private@example.com',Nome:'Pessoa',Escola:'Escola'}]});await settle();assert.equal(h.get('#authorized-rows').innerHTML,'');
});

test('Configurações edita a ordem e exclui cadastro sem e-mail usando o ID da pessoa',async()=>{
 const h=ui();
 h.app.mount(h.root);h.app.connectionChanged({email});
 const row={id,email:null,Nome:'Pessoa',Escola:'Escola',Funcao:'Inspetora',Ordem:4};
 h.respond(0,{mailbox:email,users:[row]});await settle();
 const click=authorizedAction=>h.get('#authorized-rows').listeners.click({target:{closest:()=>({dataset:{authorizedAction,userId:id}})}});
 click('edit');
 assert.equal(h.get('#authorized-function').value,'Inspetora');
 assert.equal(h.get('#authorized-order').value,4);
 h.get('#authorized-order').value='1';
 h.get('#authorized-form').listeners.submit({preventDefault(){}});
 assert.deepEqual(JSON.parse(h.requests[1].opts.body),{type:'general',mailbox:email,operation:'update',id,escola:'Escola',nome:'Pessoa',funcao:'Inspetora',email:'',ordem:1});
 h.respond(1,{mailbox:email,saved:true,operation:'update'});await settle();
 h.respond(2,{mailbox:email,users:[{...row,Ordem:1}]});await settle();
 click('exclude');
 assert.equal(h.get('#authorized-delete-email').textContent,'Pessoa');
 h.get('#authorized-delete-confirm').listeners.click();
 assert.deepEqual(JSON.parse(h.requests[3].opts.body),{type:'general',mailbox:email,operation:'exclude',id});
});
