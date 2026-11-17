'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {handleAuthorizedUsers}=require('../server/authorized-users.cjs');
const {makeStore,configuration}=require('../server/google.cjs');
const email='school@example.com';
test('cadastro valida caixa, campos e operação; normaliza e-mail sem sobrescrever duplicados',async()=>{
 const saved=[],removed=[],store={includeAuthorizedEmail:async row=>saved.push(row),excludeAuthorizedEmail:async target=>removed.push(target),listAuthorizedEmails:async()=>({users:[],nextPageToken:null})};
 const base={action:'authorized-email',email,store,body:{type:'general',mailbox:email,operation:'include',email:' USER@EXAMPLE.COM ',nome:' Pessoa ',escola:' Escola '}};
 const result=await handleAuthorizedUsers(base);assert.equal(result.email,'user@example.com');assert.deepEqual(saved,[{email:'user@example.com',Nome:'Pessoa',Escola:'Escola'}]);
 await handleAuthorizedUsers({...base,body:{type:'general',mailbox:email,operation:'exclude',email:'USER@EXAMPLE.COM'}});assert.deepEqual(removed,['user@example.com']);
 await assert.rejects(handleAuthorizedUsers({...base,body:{...base.body,mailbox:'other@example.com'}}),{message:'account_changed'});
 await assert.rejects(handleAuthorizedUsers({...base,body:{...base.body,role:'admin'}}),{message:'invalid_authorized_email'});
 await assert.rejects(handleAuthorizedUsers({...base,body:{...base.body,nome:''}}),{message:'invalid_authorized_email'});
});
test('persistência do cadastro usa apenas SELECT/INSERT/DELETE, confirma duplicidade e pagina',async()=>{
 const config={storage:'https://example.supabase.co',serviceKey:'test',key:Buffer.alloc(32,7)},calls=[];let duplicate=false;
 const store=makeStore(config,async(url,opts)=>{calls.push({url,opts});return duplicate?{ok:false,status:409,json:async()=>({code:'23505'})}:{ok:true,status:200,json:async()=>opts.method==='GET'?Array.from({length:51},(_,i)=>({email:String(i).padStart(2,'0')+'@example.com',Nome:'Fictício',Escola:'Escola'})):[{}]};});
 const page=await store.listAuthorizedEmails();assert.equal(page.users.length,50);assert.ok(page.nextPageToken);
 await store.listAuthorizedEmails(page.nextPageToken);assert.ok(new URL(calls[1].url).searchParams.get('email').startsWith('gt.'));
 await store.includeAuthorizedEmail({email:'user@example.com',Nome:'Pessoa',Escola:'Escola'});assert.equal(calls[2].opts.method,'POST');assert.ok(!calls[2].opts.headers.Prefer.includes('merge-duplicates'));
 await store.excludeAuthorizedEmail('user@example.com');assert.equal(calls[3].opts.method,'DELETE');assert.equal(new URL(calls[3].url).searchParams.get('email'),'eq.user@example.com');
 duplicate=true;await assert.rejects(store.includeAuthorizedEmail({}),{message:'email_exists'});
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function ui(){
 const nodes=new Map(),requests=[],window={FAROL_CONFIG:{schoolName:'Escola'}};
 const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',listeners:{},open:false,addEventListener(n,fn){this.listeners[n]=fn;},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const root={innerHTML:'',querySelector:get};vm.runInNewContext(fs.readFileSync('authorized-users.js','utf8'),{window,URLSearchParams,fetch:(url,opts)=>new Promise(resolve=>requests.push({url,opts,resolve}))});
 return {app:window.FarolAuthorizedUsers,root,get,requests,respond:(i,result,ok=true)=>requests[i].resolve({ok,json:async()=>result})};
}
test('Configurações inclui e exclui somente por ação confirmada, escapando texto do cadastro',async()=>{
 const h=ui();h.app.mount(h.root);assert.equal(h.requests.length,0);assert.ok(h.root.innerHTML.includes('Cadastro de E-mails usuários do aplicativo'));
 h.app.connectionChanged({email});h.respond(0,{mailbox:email,users:[{email:'user@example.com',Nome:'Pessoa <teste>',Escola:'Escola'}],nextPageToken:null});await settle();assert.ok(h.get('#authorized-rows').innerHTML.includes('Pessoa &lt;teste&gt;'));
 h.get('#authorized-rows').listeners.click({target:{closest:()=>({dataset:{excludeEmail:'user@example.com'}})}});assert.equal(h.get('#authorized-delete-dialog').open,true);assert.equal(h.requests.length,1);
 h.get('#authorized-delete-cancel').listeners.click();assert.equal(h.requests.length,1);
 h.get('#authorized-name').value='Pessoa';h.get('#authorized-email').value='new@example.com';h.get('#authorized-school').value='Escola';h.get('#authorized-form').listeners.submit({preventDefault(){}});h.get('#authorized-form').listeners.submit({preventDefault(){}});assert.equal(h.requests.length,2);
 const body=JSON.parse(h.requests[1].opts.body);assert.equal(body.operation,'include');assert.equal(body.type,'general');assert.equal(body.nome,'Pessoa');assert.equal(h.requests[1].opts.headers['X-Farol-Request'],'1');
 h.respond(1,{mailbox:email,saved:true,operation:'include'});await settle();assert.equal(h.requests.length,3);
 h.app.connectionChanged(null);h.respond(2,{mailbox:email,users:[{email:'private@example.com',Nome:'Pessoa',Escola:'Escola'}]});await settle();assert.equal(h.get('#authorized-rows').innerHTML,'');
});
