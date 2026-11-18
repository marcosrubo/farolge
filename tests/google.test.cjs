'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {makeHandler,configuration,seal,unseal,validateAccount,makeStore,makeAuth,SCOPES,READ_SCOPE,DRIVE_SCOPE,DRIVE_METADATA_SCOPE,DRIVE_READ_SCOPE,LABEL_SCOPE,MODIFY_SCOPE,PERSONAL_LABELS,GENERAL_LABELS}=require('../server/google.cjs');
const env={FAROL_GOOGLE_ENABLED:'true',FAROL_ORIGIN:'https://farol.example',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',FAROL_TOKEN_KEY:Buffer.alloc(32,7).toString('base64'),FAROL_SUPABASE_URL:'https://test.supabase.co',FAROL_SUPABASE_SERVICE_ROLE_KEY:'test-service',FAROL_SUPABASE_ANON_KEY:'test-anon'};
const GENERAL_EMAIL='marcos.rubo@gmail.com';
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const sessionCookie=(response,type='personal')=>(response.headers['set-cookie']||[]).find(c=>c.startsWith('__Host-farol-account-'+type+'=') && !c.includes('Max-Age=0'))?.split(';')[0];
function harness(overrides={}){
 const rows=new Map(),connections=new Map(),users=new Map(),labels=new Map(),labelRequests=[];
 let labelFailure=null,labelRace=false;
 const labelError=status=>Object.assign(new Error('label_error'),{response:{status}});
 const store={async cleanup(){},async get(id){return structuredClone(rows.get(id)||null);},async take(id){const value=await this.get(id);rows.delete(id);return value;},async put(id,value){rows.set(id,structuredClone(value));},async remove(id){rows.delete(id);},async getConnection(id,type){return structuredClone(connections.get(id+'.'+type)||null);},async putConnection(id,type,value){connections.set(id+'.'+type,structuredClone(value));},async getInstitutionalDemands(){return [];},async removeConnection(id,type){connections.delete(id+'.'+type);}};
 let email='marcos.rubo@gmail.com',identityOverride={},scopes=null,options,issuedOptions,flowOptions=new Map(),calls=0,authUnavailable=false,nowLogout=[],gmailDenied=false,failedEmail=null,failedStatus=503,failedReason=null,revokedAuthEmail=null;
 const userFor=value=>{if(!users.has(value))users.set(value,{id:'user-'+digest(value).slice(0,16),email:value,identities:[{provider:'google',identity_data:{sub:'sub-'+value}}]});return users.get(value);};
 const auth={async signIn(token,access,nonce){assert.equal(digest(nonce),issuedOptions.nonce);assert.equal(token,'id:'+email);const user=userFor(email);return {user,access_token:'auth:'+email,refresh_token:'refresh:'+email,expires_in:3600};},async user(token){if(authUnavailable || token.slice(5)===revokedAuthEmail)throw new Error('login_required');return userFor(token.slice(5));},async refresh(token){const value=token.slice(8);return {access_token:'auth:'+value,refresh_token:token,expires_in:3600};},async logout(token){nowLogout.push(token);}};
 const clientFactory=()=>({credentials:{},async generateCodeVerifierAsync(){return {codeVerifier:'verifier',codeChallenge:'challenge'};},generateAuthUrl(opts){options=opts;flowOptions.set(opts.state,opts);return 'https://accounts.google.com/o/oauth2/v2/auth?state='+opts.state;},async getToken(opts){assert.equal(opts.codeVerifier,'verifier');issuedOptions=flowOptions.get(opts.code);calls++;return {tokens:{access_token:'google:'+email,refresh_token:'grefresh:'+email,id_token:'id:'+email,scope:scopes??issuedOptions.scope.join(' '),expiry_date:Date.now()+3600000}};},async verifyIdToken(opts){assert.equal(opts.audience,'test-client');return {getPayload:()=>({email_verified:true,email,sub:'sub-'+email,nonce:issuedOptions.nonce,...identityOverride})};},setCredentials(value){this.credentials=value;},async request({url,method='GET',data}){if(this.credentials.access_token.slice(7)===failedEmail)throw Object.assign(new Error('provider_error'),{response:{status:failedStatus,data:{error:{errors:failedReason?[{reason:failedReason}]:[]}}}});if(gmailDenied && url.includes('/gmail/'))throw Object.assign(new Error('service_unavailable'),{response:{status:403}});const value=this.credentials.access_token.slice(7);
 if(url.endsWith('/labels')) {
   labelRequests.push({email:value,method,data});
   if(labelFailure && (labelFailure.method===method || !labelFailure.method) && (!labelFailure.name||labelFailure.name===data?.name))throw labelError(labelFailure.status);
   if(!labels.has(value))labels.set(value,new Set());
   const names=labels.get(value);
   if(method==='POST') {
     assert.ok(users.has(value),'identity must be verified before creating labels');
     assert.deepEqual(Object.keys(data).sort(),['labelListVisibility','messageListVisibility','name']);
     assert.ok([...PERSONAL_LABELS,...GENERAL_LABELS].includes(data.name));
     if(labelRace){names.add(data.name);labelRace=false;throw labelError(409);}
     if(names.has(data.name))throw labelError(409);
     names.add(data.name);return {data:{id:'label-'+names.size,name:data.name}};
   }
   return {data:{labels:[...names].map(name=>({id:'id-'+name,name}))}};
 }
 if(url.includes('/gmail/v1/users/me/labels/'))return {data:{id:decodeURIComponent(url.split('/').at(-1)),messagesTotal:3}};
 if(url.includes('/drive/v3/files?'))return {data:{files:new URL(url).searchParams.get('q').includes("name = 'FarolGE'")?[{id:'folder-1',name:'FarolGE'}]:new URL(url).searchParams.get('q').includes("name = 'FaltasSemanais'")?[{id:'folder-weekly',name:'FaltasSemanais'}]:[{id:'file-1',name:'Ata da escola'}]}};
 return {data:url.includes('drive/v3')?{user:{emailAddress:value}}:{emailAddress:value}};}});
 const handler=makeHandler({env:{...env,...overrides},storeFactory:()=>store,authFactory:()=>auth,clientFactory});
 async function request(action,{method='GET',body,cookie='',origin=env.FAROL_ORIGIN,query=''}={}){
  const headers={},res={statusCode:200,setHeader(k,v){headers[k.toLowerCase()]=v;},getHeader(k){return headers[k.toLowerCase()];},end(body=''){this.body=body;}};
  await handler({url:'/api/google/'+action+query,method,body,headers:{cookie,origin,'x-farol-request':'1','content-type':'application/json'}},res);
  return {status:res.statusCode,headers,body:res.body,json:()=>JSON.parse(res.body)};
 }
 async function start(type='personal',cookie=''){
  const result=await request('start',{method:'POST',body:{type,route:'radar'},cookie});
  assert.equal(result.status,200);
  return {state:options.state,cookie:result.headers['set-cookie'][0].split(';')[0],options};
 }
 async function callback(flow,cookie=flow.cookie){return request('callback',{cookie,query:'?state='+flow.state+'&code='+encodeURIComponent(flow.state)});}
 async function login(value='marcos.rubo@gmail.com',cookie='',type='personal'){email=value;const flow=await start(type,cookie);const response=await callback(flow,flow.cookie+'; '+cookie);return {response,cookie:sessionCookie(response,type)};}
 async function admin(){
  const general=await login(GENERAL_EMAIL,'','general');
  const personal=await login(GENERAL_EMAIL,general.cookie,'personal');
  return {cookie:general.cookie+'; '+personal.cookie,general,personal};
 }
 return {store,admin,labels,labelRequests,failLabels:(status,method,name)=>labelFailure=status?{status,method,name}:null,raceLabels:()=>labelRace=true,rows,connections,users,auth,request,start,callback,login,setEmail:value=>email=value,setIdentity:value=>identityOverride=value,setScopes:value=>scopes=value,expireAuth:()=>authUnavailable=true,revokeAuth:value=>revokedAuthEmail=value,failAccount:(value,status=503,reason=null)=>{failedEmail=value;failedStatus=status;failedReason=reason;},denyGmail:()=>gmailDenied=true,calls:()=>calls,userFor};
}
test('conexões não dependem de variável de endereço Google',()=>{
 assert.ok(configuration(env));
 assert.ok(configuration({...env,FAROL_GENERAL_EMAIL:'valor-antigo-ignorado',FAROL_GENERAL_ADMIN_EMAILS:'valor-antigo-ignorado'}));
 for(const change of [{FAROL_GOOGLE_ENABLED:'false'},{FAROL_TOKEN_KEY:'invalid'},{FAROL_SUPABASE_ANON_KEY:''},{FAROL_ORIGIN:'http://farol.example'},{FAROL_ORIGIN:'https://farol.example/?x=1'}])assert.equal(configuration({...env,...change}),null);
});
test('criptografia detecta adulteração e mudança do proprietário da linha',()=>{
 const key=Buffer.alloc(32,1),value=seal({access_token:'private'},key,'user-a.personal');
 assert.deepEqual(unseal(value,key,'user-a.personal'),{access_token:'private'});
 assert.throws(()=>unseal(value,key,'user-b.personal'));
 const bytes=Buffer.from(value,'base64url');bytes[30]^=1;
 assert.throws(()=>unseal(bytes.toString('base64url'),key,'user-a.personal'));
});
test('identidade Google exige e-mail verificado, nonce e correspondência com o serviço',()=>{
 const identity={email:'marcos.rubo@gmail.com',email_verified:true,nonce:'nonce',sub:'123'};
 assert.equal(validateAccount(identity,{emailAddress:identity.email},'nonce'),identity.email);
 for(const override of [{nonce:'wrong'},{email_verified:false},{email:'different@gmail.com'}])assert.throws(()=>validateAccount({...identity,...override},{emailAddress:identity.email},'nonce'));
 assert.throws(()=>validateAccount(identity,{emailAddress:'outra@escola.pr.gov.br'},'nonce'));
});
test('CSRF e métodos inválidos são bloqueados; login inclui Gmail readonly e Drive file',async()=>{
 const h=harness();
 assert.equal((await h.request('start',{method:'POST',origin:'https://evil.example',body:{type:'personal'}})).status,403);
 assert.equal((await h.request('start')).status,405);
 const flow=await h.start();
 assert.deepEqual(flow.options.scope,[...SCOPES,LABEL_SCOPE,MODIFY_SCOPE]);assert.equal(flow.options.login_hint,GENERAL_EMAIL);
 assert.deepEqual((await h.start('general')).options.scope,[...SCOPES,MODIFY_SCOPE,DRIVE_METADATA_SCOPE,DRIVE_READ_SCOPE]);
 assert.ok(!flow.options.scope.includes(DRIVE_METADATA_SCOPE));assert.ok(!flow.options.scope.includes(DRIVE_READ_SCOPE));
 assert.ok(flow.options.scope.includes(READ_SCOPE));assert.ok(flow.options.scope.includes(DRIVE_SCOPE));
 assert.ok(!flow.options.scope.includes('https://www.googleapis.com/auth/drive'));
 assert.equal(flow.options.hd,undefined);assert.equal(flow.options.code_challenge_method,'S256');
});
test('estado vinculado ao navegador, consumido uma vez; login automático não vaza tokens',async()=>{
 const h=harness(),flow=await h.start();
 assert.match((await h.callback(flow,'')).headers.location,/invalid_state/);assert.equal(h.calls(),0);
 const response=await h.callback(flow);assert.match(response.headers.location,/connected.*#radar$/);
 assert.ok(sessionCookie(response));assert.match(response.headers['set-cookie'].join(';'),/HttpOnly; Secure; SameSite=Lax/);
 assert.match((await h.callback(flow)).headers.location,/invalid_state/);assert.equal(h.calls(),1);
 const result=await h.request('status',{cookie:sessionCookie(response)});
 assert.equal(result.json().connections.personal.email,'marcos.rubo@gmail.com');assert.equal(result.json().connections.personal.drive,true);
 assert.equal(h.users.size,1);assert.ok(!result.body.includes('google:'));assert.ok(!result.body.includes('refresh:'));
});
test('permissões recusadas permitem login e ficam indicadas como não autorizadas',async()=>{
 const h=harness();h.setScopes('openid email profile '+DRIVE_SCOPE);
 const {response,cookie}=await h.login('marcos.rubo@gmail.com');assert.match(response.headers.location,/partial/);
 const data=(await h.request('status',{cookie})).json();assert.equal(data.connections.personal.email,'marcos.rubo@gmail.com');
 assert.equal(data.connections.personal.gmail,false);assert.equal(data.connections.personal.drive,true);
});
test('cancelar autorização não cria usuário nem substitui a sessão atual',async()=>{
 const h=harness(),first=await h.login(),flow=await h.start('personal',first.cookie);
 const response=await h.request('callback',{cookie:flow.cookie+'; '+first.cookie,query:'?state='+flow.state+'&error=access_denied'});
 assert.match(response.headers.location,/cancelled/);assert.equal(h.users.size,1);
 assert.equal((await h.request('status',{cookie:first.cookie})).json().connections.personal.email,'marcos.rubo@gmail.com');
});
for(const firstType of ['general','personal'])test('conectar em qualquer ordem e desconectar somente '+firstType,async()=>{
 const h=harness(),secondType=firstType==='general'?'personal':'general';
 const emailFor=type=>type==='general'?GENERAL_EMAIL:'marcos.rubo@gmail.com';
 const first=await h.login(emailFor(firstType),'',firstType);
 const second=await h.login(emailFor(secondType),first.cookie,secondType);
 assert.ok(!second.response.headers['set-cookie'].some(c=>c.startsWith('__Host-farol-account-'+firstType+'=')));
 const cookie=first.cookie+'; '+second.cookie;
 const status=(await h.request('status',{cookie})).json();
 assert.equal(status.mode,'both');assert.equal(status.connections.general.email,GENERAL_EMAIL);
 assert.equal(status.connections.personal.email,'marcos.rubo@gmail.com');
 await h.request('disconnect',{method:'POST',body:{type:firstType},cookie});
 const after=(await h.request('status',{cookie})).json();
 assert.equal(after.mode,secondType);assert.equal(after.connections[firstType],null);
 assert.equal(after.connections[secondType].email,emailFor(secondType));
 assert.equal((await h.request('status')).json().mode,'none');
});
test('sessão Geral não pode ser usada como sessão Pessoal',async()=>{
 const h=harness(),general=await h.login(GENERAL_EMAIL,'','general');
 const forged=general.cookie.replace('account-general=','account-personal=');
 assert.equal((await h.request('status',{cookie:forged})).json().mode,'none');
});
test('expiração de uma sessão não encerra a outra',async()=>{
 const h=harness(),general=await h.login(GENERAL_EMAIL,'','general');
 const personal=await h.login('marcos.rubo@gmail.com',general.cookie);
 const id=general.cookie.split('=')[1],key=digest('account.general.'+id);
 h.rows.get(key).expiresAt=Date.now()-1;
 const data=(await h.request('status',{cookie:general.cookie+'; '+personal.cookie})).json();
 assert.equal(data.mode,'personal');assert.equal(data.connections.general,null);
});
test('callback antigo não substitui uma conexão já trocada',async()=>{
 const h=harness(),first=await h.login('marcos.rubo@gmail.com'),pending=await h.start('personal',first.cookie);
 const second=await h.login('marcos.rubo@gmail.com',first.cookie);
 assert.match((await h.callback(pending,pending.cookie+'; '+second.cookie)).headers.location,/invalid_state/);
 assert.equal((await h.request('status',{cookie:second.cookie})).json().connections.personal.email,'marcos.rubo@gmail.com');
});
test('logout remove acesso da sessão, sem apagar autorizações do proprietário',async()=>{
 const h=harness(),admin=await h.login();
 await h.request('logout',{method:'POST',body:{},cookie:admin.cookie});
 assert.equal((await h.request('status',{cookie:admin.cookie})).json().connections.personal,null);assert.equal(h.connections.size,1);
 assert.equal((await h.request('disconnect',{method:'POST',body:{type:'personal'},cookie:admin.cookie})).status,401);
});
test('cookies legados e sessão Supabase revogada não dão acesso',async()=>{
 const h=harness();
 assert.equal((await h.request('status',{cookie:'__Host-farol-session-personal='+crypto.randomBytes(32).toString('base64url')+'; __Host-farol-portal='+crypto.randomBytes(32).toString('base64url')})).json().connections.personal,null);
 const admin=await h.login();h.expireAuth();assert.equal((await h.request('status',{cookie:admin.cookie})).json().connections.personal,null);
});
test('armazenamento cifra credenciais e consome fluxo por DELETE atômico',async()=>{
 const config=configuration(env);let stored;
 const store=makeStore(config,async(url,opts)=>{
  if(opts.method==='POST'){stored=JSON.parse(opts.body);return {ok:true,status:204};}
  assert.equal(opts.method,'DELETE');return {ok:true,status:200,json:async()=>[stored]};
 });
 await store.put(digest('test'),{access_token:'private'},Date.now()+60000);
 assert.ok(!stored.payload.includes('private'));assert.deepEqual(await store.take(digest('test')),{access_token:'private'});
});
test('Supabase Auth recebe nonce original e tokens somente no servidor',async()=>{
 let captured;
 const auth=makeAuth(configuration(env),async(url,opts)=>{captured={url,opts};return {ok:true,status:200,json:async()=>({user:{id:'x'}})};});
 await auth.signIn('signed-id','google-access','raw-nonce');
 assert.ok(captured.url.endsWith('token?grant_type=id_token'));assert.equal(captured.opts.headers.apikey,'test-anon');
 assert.equal(JSON.parse(captured.opts.body).nonce,'raw-nonce');assert.equal(JSON.parse(captured.opts.body).provider,'google');
});

test('Conta Google sem serviço Gmail disponível pode entrar e autorizar Drive',async()=>{
 const h=harness();h.denyGmail();
 const login=await h.login('marcos.rubo@gmail.com');
 assert.ok(login.cookie);assert.match(login.response.headers.location,/partial/);
 const result=(await h.request('status',{cookie:login.cookie})).json();
 assert.equal(result.connections.personal.email,'marcos.rubo@gmail.com');
 assert.equal(result.connections.personal.gmail,false);assert.equal(result.connections.personal.drive,true);
});

test('fluxos OAuth Geral e Pessoal podem ficar pendentes simultaneamente',async()=>{
 const h=harness(),generalFlow=await h.start('general'),personalFlow=await h.start('personal');
 const flows=generalFlow.cookie+'; '+personalFlow.cookie;
 h.setEmail(GENERAL_EMAIL);
 const general=await h.callback(generalFlow,flows);
 h.setEmail('marcos.rubo@gmail.com');
 const personal=await h.callback(personalFlow,flows+'; '+sessionCookie(general,'general'));
 const data=(await h.request('status',{cookie:sessionCookie(general,'general')+'; '+sessionCookie(personal)})).json();
 assert.equal(data.mode,'both');assert.equal(data.connections.general.email,GENERAL_EMAIL);
 assert.equal(data.connections.personal.email,'marcos.rubo@gmail.com');
});

test('Pessoal cria somente as quatro labels ausentes e reconectar não duplica',async()=>{
 const h=harness();h.labels.set('marcos.rubo@gmail.com',new Set(['Outra',PERSONAL_LABELS[0]]));
 const first=await h.login('marcos.rubo@gmail.com');
 assert.match(first.response.headers.location,/connected/);
 assert.deepEqual([...h.labels.get('marcos.rubo@gmail.com')].sort(),['Outra',...PERSONAL_LABELS].sort());
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').map(r=>r.data.name),PERSONAL_LABELS.slice(1));
 const second=await h.login('marcos.rubo@gmail.com',first.cookie);
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,3);
 assert.equal((await h.request('status',{cookie:second.cookie})).json().connections.personal.labels,'ready');
 h.labels.get('marcos.rubo@gmail.com').delete(PERSONAL_LABELS[0]);
 assert.equal((await h.request('status',{cookie:second.cookie})).json().connections.personal.labels,'missing');
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,3,'status must never create');
});
test('Geral prepara somente seus dois marcadores e Pessoal mantém os próprios',async()=>{
 const h=harness(),general=await h.login('marcos.rubo@gmail.com','','general');
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').map(r=>r.data.name),GENERAL_LABELS);
 const writes=h.labelRequests.filter(r=>r.method==='POST').length;
 await h.request('status',{cookie:general.cookie});assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,writes);
 const personal=await h.login('marcos.rubo@gmail.com',general.cookie);
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST'&&PERSONAL_LABELS.includes(r.data.name)).map(r=>r.data.name),PERSONAL_LABELS);
 const data=(await h.request('status',{cookie:general.cookie+'; '+personal.cookie})).json();
 assert.equal(data.mode,'both');assert.equal(data.connections.general.labels,'ready');assert.equal(data.connections.general.manageInstitutional,true);
 assert.equal(data.connections.personal.labels,'ready');assert.deepEqual([...h.labels.get('marcos.rubo@gmail.com')],[...GENERAL_LABELS,...PERSONAL_LABELS]);
});
test('recusar labels preserva conexão e não faz chamadas de gerenciamento',async()=>{
 const h=harness();h.setScopes(SCOPES.join(' '));const account=await h.login();
 assert.match(account.response.headers.location,/partial/);
 assert.equal((await h.request('status',{cookie:account.cookie})).json().connections.personal.labels,'permission_required');
 assert.equal(h.labelRequests.length,0);
});
test('falha nas labels não perde conexão e nova autorização completa o preparo',async()=>{
 const h=harness();h.failLabels(503,'POST');const first=await h.login();
 assert.match(first.response.headers.location,/partial/);assert.ok(first.cookie);
 h.failLabels(403);assert.equal((await h.request('status',{cookie:first.cookie})).json().connections.personal.labels,'unavailable');
 h.failLabels(null);const next=await h.login('marcos.rubo@gmail.com',first.cookie);
 assert.match(next.response.headers.location,/connected/);
 assert.equal(h.labels.get('marcos.rubo@gmail.com').size,4);
});
test('criação concorrente aceita conflito apenas após confirmar o nome existente',async()=>{
 const h=harness();h.raceLabels();const account=await h.login();
 assert.match(account.response.headers.location,/connected/);assert.equal(h.labels.get('marcos.rubo@gmail.com').size,4);
 const bad=harness();bad.failLabels(400,'POST');const failed=await bad.login();
 assert.match(failed.response.headers.location,/partial/);assert.equal(bad.labels.get('marcos.rubo@gmail.com').size,0);
});
test('identidade inválida nunca cria labels e desconectar não apaga marcadores',async()=>{
 const bad=harness();bad.setIdentity({email_verified:false});await bad.login();assert.equal(bad.labelRequests.length,0);
 const h=harness(),account=await h.login();
 await h.request('disconnect',{method:'POST',body:{type:'personal'},cookie:account.cookie});
 assert.equal(h.labels.get('marcos.rubo@gmail.com').size,4);
 assert.ok(h.labelRequests.every(r=>['GET','POST'].includes(r.method)));
});

test('endpoints de demandas exigem ambas as conexões e protegem escrita com CSRF',async()=>{
 const h=harness();
 for(const action of ['board','thread','inbox','classified'])assert.equal((await h.request(action,{query:'?mailbox=marcos.rubo@gmail.com&column=0&id=thread1'})).status,403);
 const general=await h.login('marcos.rubo@gmail.com','','general');
 assert.equal((await h.request('board',{cookie:general.cookie,query:'?mailbox=marcos.rubo@gmail.com&column=0'})).status,403);
 assert.equal((await h.request('demand',{method:'POST',body:{type:'personal'},origin:'https://evil.invalid'})).status,403);
 assert.equal((await h.request('demand')).status,405);
 assert.equal((await h.request('classify',{method:'POST',body:{type:'personal'},origin:'https://evil.invalid'})).status,403);
 assert.equal((await h.request('classify')).status,405);
 assert.equal((await h.request('demand',{method:'POST',body:'null'})).status,400);
 const personal=await h.login();
 assert.equal((await h.request('board',{cookie:general.cookie+'; '+personal.cookie,query:'?mailbox=other@gmail.com&column=0'})).status,409);
});
test('armazenamento de demandas cifra dados, filtra proprietário e usa versão atômica',async()=>{
 const requests=[];let row;
 const config=configuration(env),store=makeStore(config,async(url,options)=>{
  requests.push({url,options});
  if(options.method==='POST'){row={...JSON.parse(options.body),id:'task-id'};return {ok:true,status:200,json:async()=>[row]};}
  if(options.method==='GET')return {ok:true,status:200,json:async()=>[row]};
  return {ok:true,status:200,json:async()=>[]};
 });
 const owner='owner-a',value={dueDate:'2026-11-20',responsible:'private-person',completed:false,history:[]};
 assert.equal((await store.saveDemand(owner,'thread1',value,0)).version,1);
 assert.ok(!JSON.stringify(row).includes('private-person'));
 assert.equal((await store.getDemands(owner,['thread1']))[0].responsible,'private-person');
 assert.ok(requests[1].url.includes('owner_id=eq.owner-a'));
 assert.equal(await store.saveDemand(owner,'thread1',value,1),null);
 assert.ok(requests[2].url.includes('version=eq.1'));assert.equal(requests[2].options.method,'PATCH');
 await assert.rejects(store.getDemands('other-owner',['thread1']));
 const missing=makeStore(config,async()=>({ok:false,status:404,json:async()=>({code:'PGRST205'})}));
 await assert.rejects(missing.getDemands(owner,['thread1']),{message:'setup_required'});
});

test('permissão de classificação é exclusiva da Pessoal e recusa preserva consulta',async()=>{
 const h=harness();
 const general=await h.login('marcos.rubo@gmail.com','','general');
 assert.equal((await h.request('status',{cookie:general.cookie})).json().connections.general.classify,undefined);
 h.setScopes([...SCOPES,LABEL_SCOPE].join(' '));const personal=await h.login();
 const status=(await h.request('status',{cookie:personal.cookie})).json();
 assert.equal(status.connections.personal.gmail,true);assert.equal(status.connections.personal.classify,false);
 assert.match(personal.response.headers.location,/partial/);
 h.setScopes(['openid','email','profile',MODIFY_SCOPE,LABEL_SCOPE,DRIVE_SCOPE].join(' '));
 const modified=await h.login('marcos.rubo@gmail.com',personal.cookie);
 const granted=(await h.request('status',{cookie:modified.cookie})).json();
 assert.equal(granted.connections.personal.gmail,true);assert.equal(granted.connections.personal.classify,true);
});

test('Institucionais exige as duas sessões Google, permissão de leitura e caixa verificada',async()=>{
 const h=harness();
 assert.equal((await h.request('institutional')).status,403);
 const personal=await h.login();
 assert.equal((await h.request('institutional',{cookie:personal.cookie,query:'?mailbox=marcos.rubo@gmail.com'})).status,403);
 const general=await h.login(GENERAL_EMAIL,personal.cookie,'general');
 const cookie=general.cookie+'; '+personal.cookie;
 assert.equal((await h.request('institutional',{cookie,query:'?mailbox=other@gmail.com'})).status,409);
 assert.equal((await h.request('institutional',{cookie,query:'?mailbox=marcos.rubo@gmail.com'})).status,200);
 assert.equal((await h.request('institutional',{method:'POST',body:{type:'general'},cookie:general.cookie})).status,405);
 h.setScopes('openid email profile '+DRIVE_SCOPE);
 const denied=await h.login('marcos.rubo@gmail.com','','general');
 assert.equal((await h.request('institutional',{cookie:denied.cookie+'; '+personal.cookie,query:'?mailbox=marcos.rubo@gmail.com'})).status,403);
 assert.equal((await h.request('status',{cookie:personal.cookie})).json().connections.personal.email,'marcos.rubo@gmail.com');
});

test('GERAL cria somente ausentes, reconecta sem duplicar e status nunca cria',async()=>{
 const h=harness();h.labels.set('marcos.rubo@gmail.com',new Set(['Outra','GE_Classificadas']));
 const first=await h.login('marcos.rubo@gmail.com','','general');assert.match(first.response.headers.location,/connected/);
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').map(r=>r.data.name),['GE_Arquivadas']);
 const second=await h.login('marcos.rubo@gmail.com',first.cookie,'general');assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,1);
 h.labels.get('marcos.rubo@gmail.com').delete('GE_Arquivadas');
 assert.equal((await h.request('status',{cookie:second.cookie})).json().connections.general.labels,'missing');
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,1);
});
test('GERAL sem modify mantém consulta e não cria marcadores; falha de preparação preserva conta',async()=>{
 const h=harness();h.setScopes(SCOPES.join(' '));const readonly=await h.login('marcos.rubo@gmail.com','','general');
 assert.match(readonly.response.headers.location,/partial/);assert.equal(h.labelRequests.length,0);
 const status=(await h.request('status',{cookie:readonly.cookie})).json().connections.general;
 assert.equal(status.gmail,true);assert.equal(status.manageInstitutional,false);assert.equal(status.labels,'permission_required');
 h.setScopes([...SCOPES,MODIFY_SCOPE].join(' '));h.failLabels(503);
 const failed=await h.login('marcos.rubo@gmail.com',readonly.cookie,'general');assert.match(failed.response.headers.location,/partial/);
 assert.equal((await h.request('status',{cookie:failed.cookie})).json().connections.general.gmail,true);
});
test('movimentação institucional exige Geral e Pessoal e CSRF, sem herdar a Pessoal',async()=>{
 const h=harness(),personal=await h.login();
 const body={type:'general',mailbox:'marcos.rubo@gmail.com',messageId:'m1',operation:'archive'};
 assert.equal((await h.request('institutional-move',{method:'POST',body,cookie:personal.cookie})).status,403);
 assert.equal((await h.request('institutional-move',{method:'POST',body,origin:'https://evil.invalid'})).status,403);
 assert.equal((await h.request('institutional-move')).status,405);
 const general=await h.login('marcos.rubo@gmail.com','','general');
 assert.equal((await h.request('institutional-move',{method:'POST',cookie:general.cookie+'; '+personal.cookie,body:{...body,mailbox:'other@gmail.com'}})).status,409);
});
test('tabela institucional cifra e-mail/prazo, isola proprietário e atualiza por versão',async()=>{
 const requests=[];let row;
 const config=configuration(env),store=makeStore(config,async(url,options)=>{
  requests.push({url,options});
  if(options.method==='POST'){row=JSON.parse(options.body);return {ok:true,status:200,json:async()=>[row]};}
  if(options.method==='GET')return {ok:true,status:200,json:async()=>[row]};
  return {ok:true,status:200,json:async()=>[]};
 });
 const value={mailbox:'private-school@example.com',dueDate:'2026-11-20'};
 assert.equal((await store.saveInstitutionalDemand('owner-a','m1',value,0)).version,1);
 assert.ok(!JSON.stringify(row).includes(value.mailbox));assert.ok(!JSON.stringify(row).includes(value.dueDate));
 const read=(await store.getInstitutionalDemands('owner-a',['m1']))[0];assert.equal(read.mailbox,value.mailbox);assert.equal(read.messageId,'m1');
 assert.ok(requests[1].url.includes('owner_id=eq.owner-a'));assert.ok(requests[1].url.includes('message_id=in.(m1)'));
 await assert.rejects(store.getInstitutionalDemands('owner-b',['m1']));
 assert.equal(await store.saveInstitutionalDemand('owner-a','m1',value,1),null);
 assert.ok(requests.at(-1).url.includes('version=eq.1'));
 const missing=makeStore(config,async()=>({ok:false,status:404,json:async()=>({code:'PGRST205'})}));
 await assert.rejects(missing.getInstitutionalDemands('owner-a',['m1']),{message:'setup_required'});
});

test('preparação explícita GERAL cria somente marcadores ausentes sem outro OAuth',async()=>{
 const h=harness(),general=await h.admin();
 h.labels.get('marcos.rubo@gmail.com').delete('GE_Arquivadas');
 const before=h.calls(),writes=h.labelRequests.filter(r=>r.method==='POST').length;
 const result=await h.request('institutional-labels',{method:'POST',cookie:general.cookie,body:{type:'general',mailbox:'marcos.rubo@gmail.com'}});
 assert.equal(result.status,200);assert.equal(result.json().labels,'ready');assert.deepEqual(result.json().labelDetails.missing,[]);
 assert.equal(h.calls(),before,'no OAuth exchange required');
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,writes+1);
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').at(-1).data.name,'GE_Arquivadas');
 const status=await h.request('status',{cookie:general.cookie});assert.equal(status.json().connections.general.labels,'ready');
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,writes+1,'status never writes');
});
test('preparação GERAL exige sessão, conta correspondente, permissão e CSRF',async()=>{
 const h=harness(),personal=await h.login();const body={type:'general',mailbox:'marcos.rubo@gmail.com'};
 assert.equal((await h.request('institutional-labels')).status,405);
 assert.equal((await h.request('institutional-labels',{method:'POST',body,cookie:personal.cookie})).status,403);
 assert.equal((await h.request('institutional-labels',{method:'POST',body,origin:'https://evil.invalid'})).status,403);
 const general=await h.login(GENERAL_EMAIL,personal.cookie,'general');
 const cookie=general.cookie+'; '+personal.cookie;
 assert.equal((await h.request('institutional-labels',{method:'POST',cookie,body:{...body,mailbox:'outro@gmail.com'}})).status,409);
 assert.equal((await h.request('institutional-labels',{method:'POST',cookie,body:{...body,label:'ARBITRARY'}})).status,400);
 h.setScopes(SCOPES.join(' '));const readonly=await h.login(GENERAL_EMAIL,cookie,'general');
 assert.equal((await h.request('institutional-labels',{method:'POST',cookie:readonly.cookie+'; '+personal.cookie,body})).status,403);
});
test('status identifica os nomes ausentes e preparação informa recusa sem detalhes sensíveis',async()=>{
 const h=harness(),general=await h.admin();h.labels.get('marcos.rubo@gmail.com').delete('GE_Arquivadas');
 const status=await h.request('status',{cookie:general.cookie});assert.deepEqual(status.json().connections.general.labelDetails.missing,['GE_Arquivadas']);
 h.failLabels(403,'POST');
 const result=await h.request('institutional-labels',{method:'POST',cookie:general.cookie,body:{type:'general',mailbox:'marcos.rubo@gmail.com'}});
 assert.equal(result.json().labels,'unavailable');assert.equal(result.json().labelDetails.reason,'permission_denied');
 assert.deepEqual(result.json().labelDetails.missing,['GE_Arquivadas']);assert.ok(!result.body.includes('google:'));
});

test('nomes definidos por conexão permanecem separados na mesma conta após apagar marcadores',async()=>{
 assert.deepEqual(PERSONAL_LABELS,['GE_ME DEVEM','GE_MINHAS','GE_DEVO','GE_Despachadas']);
 assert.deepEqual(GENERAL_LABELS,['GE_Classificadas','GE_Arquivadas']);
 const h=harness(),email=GENERAL_EMAIL;
 const personal=await h.login(email),general=await h.login(email,personal.cookie,'general');
 assert.deepEqual([...h.labels.get(email)].sort(),[...PERSONAL_LABELS,...GENERAL_LABELS].sort());
 h.labels.get(email).clear();const writes=h.labelRequests.filter(r=>r.method==='POST').length;
 const status=(await h.request('status',{cookie:personal.cookie+'; '+general.cookie})).json();
 assert.equal(status.connections.personal.labels,'missing');assert.equal(status.connections.general.labels,'missing');
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,writes,'status must not recreate labels');
 const nextPersonal=await h.login(email,personal.cookie+'; '+general.cookie);
 assert.deepEqual([...h.labels.get(email)],PERSONAL_LABELS,'Pessoal recreates only its four labels');
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').slice(writes).map(r=>r.data.name),PERSONAL_LABELS);
 const nextGeneral=await h.login(email,nextPersonal.cookie+'; '+general.cookie,'general');
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').slice(writes+4).map(r=>r.data.name),GENERAL_LABELS);
 const complete=(await h.request('status',{cookie:nextPersonal.cookie+'; '+nextGeneral.cookie})).json();
 assert.equal(complete.connections.personal.labels,'ready');assert.equal(complete.connections.general.labels,'ready');
 const finalWrites=h.labelRequests.filter(r=>r.method==='POST');
 assert.ok(finalWrites.every(r=>r.data.name!=='INBOX'&&r.data.name!=='Caixa de Entrada'));
});


test('falha em um marcador GERAL não impede tentar GE_Arquivadas e reconexão completa só o ausente',async()=>{
 const h=harness();h.failLabels(400,'POST','GE_Classificadas');
 const first=await h.login('marcos.rubo@gmail.com','','general');
 assert.match(first.response.headers.location,/partial/);
 assert.deepEqual([...h.labels.get('marcos.rubo@gmail.com')],['GE_Arquivadas']);
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').map(r=>r.data.name),['GE_Classificadas','GE_Arquivadas']);
 h.failLabels(null);const next=await h.login('marcos.rubo@gmail.com',first.cookie,'general');
 assert.match(next.response.headers.location,/connected/);
 assert.equal(h.labelRequests.filter(r=>r.method==='POST'&&r.data.name==='GE_Arquivadas').length,1);
 assert.equal((await h.request('status',{cookie:next.cookie})).json().connections.general.labels,'ready');
});

test('Geral cria os nomes GE_ mesmo se os antigos sem prefixo existirem e preserva os antigos',async()=>{
 const h=harness();h.labels.set('marcos.rubo@gmail.com',new Set(['Classificadas','Arquivadas','Outro']));
 const general=await h.login('marcos.rubo@gmail.com','','general');assert.match(general.response.headers.location,/connected/);
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').map(r=>r.data.name),['GE_Classificadas','GE_Arquivadas']);
 assert.deepEqual([...h.labels.get('marcos.rubo@gmail.com')],['Classificadas','Arquivadas','Outro','GE_Classificadas','GE_Arquivadas']);
});

test('erro 403 institucional só pede nova autorização quando o motivo confirma falta de escopo',async()=>{
 const h=harness(),general=await h.admin();
 h.failAccount('marcos.rubo@gmail.com',403,'insufficientPermissions');
 assert.equal((await h.request('institutional',{cookie:general.cookie,query:'?mailbox=marcos.rubo@gmail.com'})).json().error,'missing_scope');
 h.failAccount('marcos.rubo@gmail.com',403);
 const unknown=await h.request('institutional',{cookie:general.cookie,query:'?mailbox=marcos.rubo@gmail.com'});
 assert.equal(unknown.status,503);assert.equal(unknown.json().error,'unavailable');
 h.failAccount('marcos.rubo@gmail.com',403,'dailyLimitExceeded');
 const limited=await h.request('institutional',{cookie:general.cookie,query:'?mailbox=marcos.rubo@gmail.com'});
 assert.equal(limited.status,503);assert.equal(limited.json().error,'gmail_rate_limit');
 assert.ok(!limited.body.includes('provider_error'));
});


test('Manutenção usa somente Geral e não exige Gmail, exigindo também a sessão Pessoal',async()=>{
 const h=harness();
 assert.equal((await h.request('maintenance',{query:'?mailbox='+GENERAL_EMAIL})).status,403);
 const personal=await h.login('marcos.rubo@gmail.com');
 assert.equal((await h.request('maintenance',{cookie:personal.cookie,query:'?mailbox=marcos.rubo@gmail.com'})).status,403);
 h.setScopes(['openid','email','profile',DRIVE_METADATA_SCOPE].join(' '));
 const general=await h.login(GENERAL_EMAIL,personal.cookie,'general');
 const status=(await h.request('status',{cookie:general.cookie+'; '+personal.cookie})).json();
 assert.equal(status.connections.general.driveMetadata,true);assert.equal(status.connections.general.gmail,false);
 const listing=await h.request('maintenance',{cookie:general.cookie+'; '+personal.cookie,query:'?mailbox='+GENERAL_EMAIL});
 assert.equal(listing.status,200);assert.deepEqual(listing.json().files,[{id:'file-1',name:'Ata da escola'}]);
 assert.equal((await h.request('maintenance',{cookie:general.cookie+'; '+personal.cookie,query:'?mailbox=other@example.com'})).json().error,'account_changed');
 assert.equal((await h.request('maintenance',{method:'POST',cookie:general.cookie+'; '+personal.cookie,body:{type:'general'}})).status,405);
 h.setScopes([...SCOPES,MODIFY_SCOPE].join(' '));
 const old=await h.login(GENERAL_EMAIL,general.cookie,'general');
 assert.equal((await h.request('maintenance',{cookie:old.cookie,query:'?mailbox='+GENERAL_EMAIL})).status,403);
});

test('Inspetores exige conexão temporária mesmo com ambas as conexões Google de Marcos',async()=>{
 const h=harness(),{general,personal,cookie}=await h.admin();
 const query='?mailbox='+GENERAL_EMAIL;
 const body={type:'general',mailbox:GENERAL_EMAIL,studentId:'a'.repeat(64),id:'12345678-1234-4234-8234-123456789abc',ocorrencia:'Fato registrado.'};
 h.store.getStudents=async()=>assert.fail('leitura sem conexão temporária');
 h.store.saveOccurrence=async()=>assert.fail('gravação sem conexão temporária');
 for(const credentials of ['',general.cookie,personal.cookie,cookie]){
  const status=(await h.request('status',{cookie:credentials})).json();
  assert.ok(status.modules.includes('bi-seed'));
  assert.equal(status.modules.includes('inspetores-monitores'),false);
  assert.equal((await h.request('students',{cookie:credentials,query})).json().error,'module_forbidden');
  assert.equal((await h.request('occurrence',{cookie:credentials,method:'POST',body})).json().error,'module_forbidden');
 }
 assert.equal((await h.request('occurrence',{method:'POST',cookie,body,origin:'https://elsewhere.invalid'})).status,403);
 assert.equal((await h.request('occurrence',{method:'GET',cookie})).status,405);
});

test('carga devolve etapa segura de erro Google',async()=>{
 const h=harness(),general=await h.admin();
 h.failAccount(GENERAL_EMAIL,503);
 const result=await h.request('student-import',{method:'POST',cookie:general.cookie,body:{type:'general',mailbox:GENERAL_EMAIL,fileId:'pdf-1',version:'1',folder:'lista'}});
 assert.equal(result.status,503);assert.deepEqual(result.json(),{error:'import_folder_failed'});assert.ok(!result.body.includes('provider_error'));
});


for(const type of ['general','personal'])test('e-mail mesmo cadastrado é bloqueado em '+type+' após identidade Google, antes de Auth, marcadores e sessão',async()=>{
 const h=harness(),attempt='denied@example.com';h.setEmail(attempt);
 const flow=await h.start(type),result=await h.callback(flow);
 assert.match(result.headers.location,/connection=access_denied/);assert.ok(!result.headers.location.includes(attempt));
 assert.equal(h.users.size,0);assert.equal(h.connections.size,0);assert.equal(h.labelRequests.length,0);assert.equal(sessionCookie(result,type),undefined);
 const deniedCookie=result.headers['set-cookie'].find(c=>c.startsWith('__Host-farol-access-denied=')).split(';')[0];
 const claim=await h.request('access-denied',{cookie:deniedCookie});assert.equal(claim.status,200);assert.deepEqual(claim.json(),{email:attempt});
 assert.equal((await h.request('access-denied',{cookie:deniedCookie})).status,404);
 assert.equal((await h.request('access-denied',{query:'?email=forged@example.com'})).status,404);
});
test('ticket de negativa expirado não expõe e-mail; falta da conexão Pessoal bloqueia escrita',async()=>{
 const h=harness();h.setEmail('denied@example.com');const result=await h.callback(await h.start());
 const cookie=result.headers['set-cookie'].find(c=>c.startsWith('__Host-farol-access-denied=')).split(';')[0];
 for(const [key,value] of h.rows)if(key.startsWith('denied.'))h.rows.set(key,{...value,expiresAt:Date.now()-1});
 assert.equal((await h.request('access-denied',{cookie})).status,404);
 const general=await h.login(GENERAL_EMAIL,'','general');const before=h.labelRequests.length;
 assert.equal((await h.request('institutional-labels',{method:'POST',cookie:general.cookie,body:{type:'general',mailbox:GENERAL_EMAIL}})).status,403);assert.equal(h.labelRequests.length,before);

});

for(const type of ['general','personal'])test('exceção fixa '+type+' autoriza Marcos com Google validado sem consultar a lista',async()=>{
 const h=harness();
 const login=await h.login('marcos.rubo@gmail.com','',type);assert.ok(login.cookie);
 const status=(await h.request('status',{cookie:login.cookie})).json();assert.equal(status.connections[type].email,'marcos.rubo@gmail.com');
});
test('exceção fixa não aceita aliases/endereço parecido nem dispensa identidade Google validada',async()=>{
 const h=harness();
 for(const email of ['marcos.rubo+teste@gmail.com','marcosrubo@gmail.com','marcos.rubo@gmail.com.example.org']){
  const login=await h.login(email);assert.match(login.response.headers.location,/access_denied/);assert.equal(login.cookie,undefined);
 }
 h.setIdentity({email_verified:false});const invalid=await h.login('marcos.rubo@gmail.com');assert.match(invalid.response.headers.location,/wrong_account/);assert.equal(invalid.cookie,undefined);
});

test('cadastro de e-mails exige as duas conexões e CSRF, sem precisar de Gmail',async()=>{
 const h=harness();h.store.listAuthorizedEmails=async()=>({users:[],nextPageToken:null});const changes=[];h.store.includeAuthorizedEmail=async row=>changes.push(row);
 const personal=await h.login('marcos.rubo@gmail.com');assert.equal((await h.request('authorized-emails',{cookie:personal.cookie,query:'?mailbox=marcos.rubo@gmail.com'})).status,403);
 h.setScopes('openid email profile');const general=await h.login(GENERAL_EMAIL,personal.cookie,'general');const cookie=general.cookie+'; '+personal.cookie;assert.equal((await h.request('authorized-emails',{cookie,query:'?mailbox='+GENERAL_EMAIL})).status,200);
 const body={type:'general',mailbox:GENERAL_EMAIL,operation:'include',email:null,nome:'Pessoa',escola:'Escola',funcao:'Inspetora'};
 assert.equal((await h.request('authorized-email',{method:'POST',cookie,body,origin:'https://elsewhere.invalid'})).status,403);assert.equal(changes.length,0);
 assert.equal((await h.request('authorized-email',{method:'POST',cookie,body})).status,200);assert.equal(changes[0].Nome,'Pessoa');assert.equal(changes[0].email,null);
});
test('carga de faltas exige as duas conexões, exigem drive.readonly para POST e preservam CSRF',async()=>{
 const h=harness(),g=await h.admin();
 h.store.attendanceLoadedFiles=async(o,names)=>{assert.equal(o,h.userFor(GENERAL_EMAIL).id);return new Set(names);};
 const list=await h.request('attendance-files',{cookie:g.cookie,query:'?mailbox='+encodeURIComponent(GENERAL_EMAIL)});
 assert.equal(list.status,200);assert.equal(list.json().files[0].loaded,true);
 const forged=await h.request('attendance-import',{method:'POST',cookie:g.cookie,origin:'https://attacker.invalid',body:{type:'general'}});assert.equal(forged.status,403);
 const general=h.connections.get(h.userFor(GENERAL_EMAIL).id+'.general');general.capabilities.driveRead=false;h.connections.set(h.userFor(GENERAL_EMAIL).id+'.general',general);
 const blocked=await h.request('attendance-import',{method:'POST',cookie:g.cookie,body:{type:'general',mailbox:GENERAL_EMAIL}});assert.equal(blocked.status,403);assert.equal(blocked.json().error,'missing_scope');
 const p=harness(),personal=await p.login();
 assert.equal((await p.request('attendance-files',{cookie:personal.cookie,query:'?mailbox=marcos.rubo%40gmail.com'})).status,403);
});



const temporaryId='12345678-1234-4234-8234-123456789abc';
const extractCookie=(response,name)=>response.headers['set-cookie']?.find(item=>item.startsWith(name+'=')&&!item.includes('Max-Age=0'))?.split(';')[0];

test('primeiro acesso presencial encerra somente as sessões locais e autoriza a pessoa confirmada',async()=>{
 const h=harness(),admin=await h.admin();
 const id=temporaryId,otherId='22345678-1234-4234-8234-123456789abc';
 const profiles=new Map([[id,{id,Nome:'Adriana',password_hash:null}],[otherId,{id:otherId,Nome:'Sandra',password_hash:null}]]);
 h.store.getTemporaryOwner=async()=>h.userFor(GENERAL_EMAIL).id;
 h.store.getTemporaryUser=async target=>profiles.get(target);
 h.store.allowTemporaryAttempt=async()=>true;
 h.store.issueTemporaryActivation=async(target,hash,expiresAt)=>{
  const profile=profiles.get(target);
  if(!profile||profile.password_hash)return false;
  Object.assign(profile,{activation_hash:hash,activation_expires_at:expiresAt});
  return true;
 };
 h.store.activateTemporaryUser=async(target,hash,password)=>{
  const profile=profiles.get(target);
  if(profile.password_hash||profile.activation_hash!==hash)return false;
  Object.assign(profile,{password_hash:password,activation_hash:null,activation_expires_at:null});
  return true;
 };
 h.store.changeTemporaryPassword=async(target,old,password)=>{
  const profile=profiles.get(target);
  if(profile.password_hash!==old)return false;
  profile.password_hash=password;return true;
 };
 const post=(action,body,cookie='',origin)=>h.request(action,{method:'POST',body,cookie,origin});
 const password='397421';
 const signUp={id,password,confirmation:password};
 const confirm={type:'general',id};
 assert.equal((await post('temporary-confirm',confirm,admin.general.cookie)).json().error,'admin_required');
 assert.equal((await post('temporary-confirm',confirm,admin.cookie,'https://other.test')).status,403);
 assert.equal((await post('temporary-activate',signUp)).json().error,'temporary_confirmation_required');
 const response=await post('temporary-confirm',confirm,admin.cookie);
 assert.deepEqual(response.json(),{confirmed:true});
 const enrollment=extractCookie(response,'__Host-farol-enrollment');
 assert.ok(enrollment);
 assert.match(response.headers['set-cookie'].join(';'),/HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
 assert.equal((await h.request('status',{cookie:admin.cookie})).json().mode,'none');
 assert.equal(h.connections.size,2);
 assert.equal((await post('temporary-activate',{...signUp,id:otherId},enrollment)).status,403);
 const expires=profiles.get(id).activation_expires_at;
 profiles.get(id).activation_expires_at=new Date(Date.now()-1000).toISOString();
 assert.equal((await post('temporary-activate',signUp,enrollment)).status,403);
 profiles.get(id).activation_expires_at=expires;
 assert.equal((await post('temporary-activate',{...signUp,confirmation:'outra senha'},enrollment)).json().error,'temporary_password_confirmation');
 assert.equal((await post('temporary-activate',{id,password:'39742',confirmation:'39742'},enrollment)).json().error,'temporary_password_length');
 const activated=await post('temporary-activate',signUp,enrollment);
 const firstSession=extractCookie(activated,'__Host-farol-temporary');
 assert.ok(firstSession);
 const selected=await h.request('temporary-user',{query:'?id='+id});
 assert.deepEqual(selected.json(),{id,name:'Adriana',hasPassword:true});
 assert.equal(activated.body.includes(password),false);
 assert.match(profiles.get(id).password_hash,/^scrypt-v1:/);
 assert.notEqual(profiles.get(id).password_hash,password);
 assert.equal((await post('temporary-activate',signUp,enrollment)).status,403);
 const info=(await h.request('status',{cookie:firstSession})).json();
 assert.deepEqual(info.modules,['inspetores-monitores','bi-seed','inicio','radar']);
 assert.equal(info.temporary.name,'Adriana');
 assert.deepEqual(info.connections,{general:null,personal:null});
 assert.equal(info.overview.general.gmail,true);
 const secondLogin=await post('temporary-login',{id,password});
 const secondSession=extractCookie(secondLogin,'__Host-farol-temporary');
 assert.ok(secondSession);
 const newPassword='á🙂!  x';
 const changed=await post('temporary-password',{currentPassword:password,password:newPassword,confirmation:newPassword},secondSession);
 const session=extractCookie(changed,'__Host-farol-temporary');
 assert.ok(session);
 assert.equal((await h.request('status',{cookie:firstSession})).json().mode,'none');
 assert.equal((await post('temporary-login',{id,password})).status,401);
 assert.equal((await post('temporary-login',{id,password:newPassword})).status,200);
 assert.equal((await post('temporary-logout',{},session)).status,200);
 assert.equal((await h.request('status',{cookie:session})).json().mode,'none');
 h.store.allowTemporaryAttempt=async()=>false;
 assert.equal((await post('temporary-login',{id,password:newPassword})).status,429);
});

test('permissões temporárias seguem o nome exato no cadastro e bloqueiam a API em cada requisição',async()=>{
 const {writeTemporarySession}=require('../server/temporary-access.cjs');
 const h=harness(),admin=await h.admin();
 const owner=h.userFor(GENERAL_EMAIL).id;
 let profile={id:temporaryId,Nome:'Adriana',password_hash:'hash simulado'};
 h.store.getTemporaryUser=async()=>profile;
 h.store.getTemporaryOwner=async()=>owner;
 h.store.getStudents=async id=>{assert.equal(id,owner);return [];};
 h.store.getOccurrences=async id=>{assert.equal(id,owner);return {items:[]};};
 h.store.getAttendanceRecords=async id=>{assert.equal(id,owner);return [];};
 const token=await writeTemporarySession(h.store,profile);
 const cookie='__Host-farol-temporary='+token;
 const query='?mailbox='+GENERAL_EMAIL;
 for(const [name,overview,radar] of [
  ['Adriana',true,true],[' Vanusa ',true,true],['Sandra',false,true],['Jeisiani',false,true],
  ['Giovana',false,true],['Luciani',false,true],['Adriana Maria',false,false],['Pessoa fictícia',false,false]
 ]){
  profile.Nome=name;
  const status=(await h.request('status',{cookie})).json();
  assert.equal(status.modules.includes('inicio'),overview);
  assert.equal(status.modules.includes('radar'),radar);
  assert.ok(status.modules.includes('inspetores-monitores'));
  assert.ok(status.modules.includes('bi-seed'));
  assert.equal((await h.request('occurrences',{cookie,query})).status,overview?200:403);
  const totals=await h.request('overview',{cookie,query:query+'&type=general'});
  assert.equal(totals.status,overview?200:403);
  if(overview)assert.deepEqual(totals.json().items.map(item=>item.total),[3,3,3]);
  const analysis=query+'&start=2026-11-01&end=2026-11-17';
  assert.equal((await h.request('attendance-analysis',{cookie,query:analysis})).status,radar?200:403);
  assert.equal((await h.request('students',{cookie,query})).status,200);
 }
 assert.equal((await h.request('occurrences',{cookie:admin.cookie,query})).status,403);
 for(const action of ['maintenance','authorized-emails','institutional','board','student-files','attendance-files']){
  assert.equal((await h.request(action,{cookie:admin.cookie+'; '+cookie,query})).json().error,'module_forbidden');
 }
 assert.equal((await h.request('start',{method:'POST',cookie,body:{type:'general'}})).json().error,'temporary_active');
 let saved;
 h.store.getStudent=async o=>{assert.equal(o,owner);return {id:'a'.repeat(64),Escola:'Escola',CGM:'123',Nome:'Aluno'};};
 h.store.saveOccurrence=async(o,id,row)=>{assert.equal(o,owner);saved=row;return row;};
 const body={type:'general',mailbox:GENERAL_EMAIL,authorId:temporaryId,studentId:'a'.repeat(64),id:temporaryId,ocorrencia:'Registro fictício'};
 assert.equal((await h.request('occurrence',{method:'POST',cookie,body:{...body,NomeAutor:'forjado'}})).status,400);
 assert.equal((await h.request('occurrence',{method:'POST',cookie,body:{...body,authorId:'forjado'}})).json().error,'author_changed');
 assert.equal((await h.request('occurrence',{method:'POST',cookie,body})).status,200);
 assert.equal(saved.NomeAutor,'Pessoa fictícia');
 assert.equal(saved.EmailAutor,null);
 h.store.getStudents=async()=>{throw Object.assign(new Error('storage_access_denied'),{status:403});};
 assert.deepEqual((await h.request('students',{cookie,query})).json(),{error:'storage_access_denied'});
 profile=null;
 assert.equal((await h.request('students',{cookie,query})).json().error,'module_forbidden');
});

test('listagem pública segue a ordem e expõe somente ID e nome',async()=>{
 const profile={id:temporaryId,Nome:'Exemplo',Ordem:1,password_hash:'hash fictício'};
 let request;
 const store=makeStore(configuration(env),async(url,opts)=>{
  request=new URL(url);
  return {ok:true,status:200,json:async()=>[profile]};
 });
 const result=await store.listAuthorizedEmails('',true);
 assert.deepEqual(result.users,[{id:temporaryId,name:'Exemplo'}]);
 assert.equal(request.searchParams.get('order'),'Ordem.asc.nullslast,id.asc');
 assert.equal(request.searchParams.get('select'),'id,Nome,Ordem');
});
