'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {makeHandler,configuration,seal,unseal,validateAccount,makeStore}=require('../server/google.cjs');
const scope='https://www.googleapis.com/auth/gmail.readonly';
const env={FAROL_GOOGLE_ENABLED:'true',FAROL_ORIGIN:'https://farol.example',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',FAROL_TOKEN_KEY:Buffer.alloc(32,7).toString('base64'),FAROL_SUPABASE_URL:'https://test.supabase.co',FAROL_SUPABASE_SERVICE_ROLE_KEY:'test-service',FAROL_GENERAL_EMAIL:'escola@escola.pr.gov.br',FAROL_ALLOWED_PERSONAL_EMAILS:'pessoa@escola.pr.gov.br'};
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function harness(){
 const rows=new Map();
 const store={async cleanup(){},async get(id){return structuredClone(rows.get(id)||null);},async take(id){const value=await this.get(id);rows.delete(id);return value;},async put(id,value){rows.set(id,structuredClone(value));},async remove(id){rows.delete(id);}};
 let currentEmail=env.FAROL_GENERAL_EMAIL;
 let identityOverride={};
 let grantedScope=scope;
 let lastOptions;
 let calls=0;
 const client={credentials:{},async generateCodeVerifierAsync(){return {codeVerifier:'verifier',codeChallenge:'challenge'};},generateAuthUrl(opts){lastOptions=opts;return 'https://accounts.google.com/o/oauth2/v2/auth?state='+opts.state;},async getToken(opts){assert.equal(opts.codeVerifier,'verifier');calls++;return {tokens:{access_token:'secret-access',refresh_token:'secret-refresh',id_token:'signed-token',scope:grantedScope,expiry_date:Date.now()+3600000}};},async verifyIdToken(opts){assert.equal(opts.audience,'test-client');return {getPayload:()=>({email_verified:true,email:currentEmail,hd:'escola.pr.gov.br',sub:'user',nonce:lastOptions.nonce,...identityOverride})};},setCredentials(value){this.credentials=value;},async request(){return {data:{emailAddress:currentEmail}};}};
 const handler=makeHandler({env,storeFactory:()=>store,clientFactory:()=>client});
 async function request(action,{method='GET',body,cookie='',origin=env.FAROL_ORIGIN,query=''}={}){
  const headers={};
  const res={statusCode:200,setHeader(k,v){headers[k.toLowerCase()]=v;},getHeader(k){return headers[k.toLowerCase()];},end(body=''){this.body=body;}};
  await handler({url:'/api/google/'+action+query,method,body,headers:{cookie,origin,'x-farol-request':'1','content-type':'application/json'}},res);
  return {status:res.statusCode,headers,body:res.body,json:()=>JSON.parse(res.body)};
 }
 async function start(type='general',cookie=''){
  const result=await request('start',{method:'POST',body:{type,route:'radar'},cookie});
  assert.equal(result.status,200);
  return {state:lastOptions.state,cookie:result.headers['set-cookie'][0].split(';')[0],options:lastOptions};
 }
 async function callback(flow,cookie=flow.cookie){return request('callback',{cookie,query:'?state='+flow.state+'&code=one-use-code'});}
 return {rows,request,start,callback,setEmail:value=>currentEmail=value,setIdentity:value=>identityOverride=value,setScope:value=>grantedScope=value,calls:()=>calls};
}
test('configuração incompleta, origem insegura e contas sem domínio não habilitam OAuth',()=>{
 assert.ok(configuration(env));
 for(const change of [{FAROL_GOOGLE_ENABLED:'false'},{FAROL_TOKEN_KEY:'invalid'},{FAROL_GENERAL_EMAIL:'school@gmail.com'},{FAROL_ORIGIN:'http://farol.example'},{FAROL_ORIGIN:'https://farol.example/?x=1'},{FAROL_ALLOWED_PERSONAL_EMAILS:'outside@gmail.com'}])assert.equal(configuration({...env,...change}),null);
});
test('criptografia protege tokens e detecta adulteração e mudança de chave da linha',()=>{
 const key=Buffer.alloc(32,1);
 const value=seal({access_token:'private'},key,'row');
 assert.ok(!value.includes('private'));
 assert.deepEqual(unseal(value,key,'row'),{access_token:'private'});
 assert.throws(()=>unseal(value,key,'other-row'));
 const bytes=Buffer.from(value,'base64url');bytes[30]^=1;
 assert.throws(()=>unseal(bytes.toString('base64url'),key,'row'));
});
test('valida nonce, domínio Workspace, e-mail verificado e caixa geral exata',()=>{
 const config=configuration(env),profile={emailAddress:env.FAROL_GENERAL_EMAIL};
 const identity={email:profile.emailAddress,email_verified:true,hd:'escola.pr.gov.br',nonce:'nonce',sub:'123'};
 assert.equal(validateAccount(identity,profile,'general',config,'nonce'),profile.emailAddress);
 for(const override of [{nonce:'wrong'},{email_verified:false},{hd:'other.example'},{email:'different@escola.pr.gov.br'}])assert.throws(()=>validateAccount({...identity,...override},profile,'general',config,'nonce'));
 assert.throws(()=>validateAccount({...identity,email:'outra@escola.pr.gov.br'},{emailAddress:'outra@escola.pr.gov.br'},'general',config,'nonce'));
});
test('start rejeita CSRF e método incorreto; solicita só leitura e retorno controlado',async()=>{
 const h=harness();
 assert.equal((await h.request('start',{method:'POST',origin:'https://evil.example',body:{type:'general'}})).status,403);
 assert.equal((await h.request('start')).status,405);
 const flow=await h.start();
 assert.deepEqual(flow.options.scope,['openid','email',scope]);
 assert.equal(flow.options.hd,'escola.pr.gov.br');
 assert.equal(flow.options.code_challenge_method,'S256');
 assert.equal(flow.options.login_hint,env.FAROL_GENERAL_EMAIL);
 assert.ok(flow.cookie.startsWith('__Host-farol-flow-general='));
});
test('callback exige vínculo ao navegador e estado só pode ser consumido uma vez',async()=>{
 const h=harness(),flow=await h.start();
 assert.match((await h.callback(flow,'')).headers.location,/invalid_state/);
 assert.equal(h.calls(),0);
 const success=await h.callback(flow);
 assert.match(success.headers.location,/connection=connected&mailbox=general#radar$/);
 assert.match(success.headers['set-cookie'].join(';'),/HttpOnly; Secure; SameSite=Lax/);
 assert.ok(!JSON.stringify(success).includes('secret-access'));
 assert.match((await h.callback(flow)).headers.location,/invalid_state/);
 assert.equal(h.calls(),1);
});
test('conta incorreta, consentimento insuficiente e cancelamento não conectam',async()=>{
 for(const reason of ['wrong','scope','cancelled']){
  const h=harness(),flow=await h.start();
  if(reason==='wrong')h.setEmail('outra@escola.pr.gov.br');
  if(reason==='scope')h.setScope('openid email');
  const response=reason==='cancelled'?await h.request('callback',{cookie:flow.cookie,query:'?state='+flow.state+'&error=access_denied'}):await h.callback(flow);
  assert.match(response.headers.location,new RegExp(reason==='wrong'?'wrong_account':reason==='scope'?'missing_scope':'cancelled'));
  assert.ok(!response.headers['set-cookie'].some(c=>c.startsWith('__Host-farol-session-')));
 }
});
test('Geral e Pessoal têm cookies separados e desconectar uma preserva a outra',async()=>{
 const h=harness();
 const general=await h.callback(await h.start());
 const generalCookie=general.headers['set-cookie'].find(c=>c.startsWith('__Host-farol-session-')).split(';')[0];
 h.setEmail('pessoa@escola.pr.gov.br');
 const personalFlow=await h.start('personal',generalCookie);
 const personal=await h.callback(personalFlow,personalFlow.cookie+'; '+generalCookie);
 const personalCookie=personal.headers['set-cookie'].find(c=>c.startsWith('__Host-farol-session-')).split(';')[0];
 const all=generalCookie+'; '+personalCookie;
 assert.equal(h.rows.size,2);
 await h.request('disconnect',{method:'POST',body:{type:'general'},cookie:all});
 assert.equal(h.rows.size,1);
 const status=await h.request('status',{cookie:all});
 assert.equal(status.json().connections.general,null);
 assert.equal(status.json().connections.personal.email,'pessoa@escola.pr.gov.br');
 assert.ok(!status.body.includes('secret-access'));
 assert.ok(!status.body.includes('secret-refresh'));
});
test('estado usa DELETE atômico no armazenamento e payload criptografado',async()=>{
 const config=configuration(env);let stored;
 const store=makeStore(config,async(url,opts)=>{
  if(opts.method==='POST'){stored=JSON.parse(opts.body);return {ok:true,status:204};}
  assert.equal(opts.method,'DELETE');
  assert.ok(url.includes('id=eq.'));
  return {ok:true,status:200,json:async()=>[stored]};
 });
 await store.put(digest('test'),{access_token:'private'},Date.now()+60000);
 assert.ok(!stored.payload.includes('private'));
 assert.deepEqual(await store.take(digest('test')),{access_token:'private'});
});
