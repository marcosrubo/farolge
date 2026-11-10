'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {makeHandler,configuration,seal,unseal,validateAccount,makeStore,makeAuth,SCOPES,READ_SCOPE,DRIVE_SCOPE,LABEL_SCOPE,PERSONAL_LABELS}=require('../server/google.cjs');
const env={FAROL_GOOGLE_ENABLED:'true',FAROL_ORIGIN:'https://farol.example',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',FAROL_TOKEN_KEY:Buffer.alloc(32,7).toString('base64'),FAROL_SUPABASE_URL:'https://test.supabase.co',FAROL_SUPABASE_SERVICE_ROLE_KEY:'test-service',FAROL_SUPABASE_ANON_KEY:'test-anon'};
const GENERAL_EMAIL='escola@escola.pr.gov.br';
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const sessionCookie=(response,type='personal')=>(response.headers['set-cookie']||[]).find(c=>c.startsWith('__Host-farol-account-'+type+'=') && !c.includes('Max-Age=0'))?.split(';')[0];
function harness(overrides={}){
 const rows=new Map(),connections=new Map(),users=new Map(),labels=new Map(),labelRequests=[];
 let labelFailure=null,labelRace=false;
 const labelError=status=>Object.assign(new Error('label_error'),{response:{status}});
 const store={async cleanup(){},async get(id){return structuredClone(rows.get(id)||null);},async take(id){const value=await this.get(id);rows.delete(id);return value;},async put(id,value){rows.set(id,structuredClone(value));},async remove(id){rows.delete(id);},async getConnection(id,type){return structuredClone(connections.get(id+'.'+type)||null);},async putConnection(id,type,value){connections.set(id+'.'+type,structuredClone(value));},async removeConnection(id,type){connections.delete(id+'.'+type);}};
 let email='admin@gmail.com',identityOverride={},scopes=null,options,issuedOptions,flowOptions=new Map(),calls=0,authUnavailable=false,nowLogout=[],gmailDenied=false,failedEmail=null,failedStatus=503,revokedAuthEmail=null;
 const userFor=value=>{if(!users.has(value))users.set(value,{id:'user-'+digest(value).slice(0,16),email:value,identities:[{provider:'google',identity_data:{sub:'sub-'+value}}]});return users.get(value);};
 const auth={async signIn(token,access,nonce){assert.equal(digest(nonce),issuedOptions.nonce);assert.equal(token,'id:'+email);const user=userFor(email);return {user,access_token:'auth:'+email,refresh_token:'refresh:'+email,expires_in:3600};},async user(token){if(authUnavailable || token.slice(5)===revokedAuthEmail)throw new Error('login_required');return userFor(token.slice(5));},async refresh(token){const value=token.slice(8);return {access_token:'auth:'+value,refresh_token:token,expires_in:3600};},async logout(token){nowLogout.push(token);}};
 const clientFactory=()=>({credentials:{},async generateCodeVerifierAsync(){return {codeVerifier:'verifier',codeChallenge:'challenge'};},generateAuthUrl(opts){options=opts;flowOptions.set(opts.state,opts);return 'https://accounts.google.com/o/oauth2/v2/auth?state='+opts.state;},async getToken(opts){assert.equal(opts.codeVerifier,'verifier');issuedOptions=flowOptions.get(opts.code);calls++;return {tokens:{access_token:'google:'+email,refresh_token:'grefresh:'+email,id_token:'id:'+email,scope:scopes??issuedOptions.scope.join(' '),expiry_date:Date.now()+3600000}};},async verifyIdToken(opts){assert.equal(opts.audience,'test-client');return {getPayload:()=>({email_verified:true,email,sub:'sub-'+email,nonce:issuedOptions.nonce,...identityOverride})};},setCredentials(value){this.credentials=value;},async request({url,method='GET',data}){if(this.credentials.access_token.slice(7)===failedEmail)throw Object.assign(new Error('provider_error'),{response:{status:failedStatus}});if(gmailDenied && url.includes('/gmail/'))throw Object.assign(new Error('service_unavailable'),{response:{status:403}});const value=this.credentials.access_token.slice(7);
 if(url.endsWith('/labels')) {
   labelRequests.push({email:value,method,data});
   if(labelFailure && (labelFailure.method===method || !labelFailure.method))throw labelError(labelFailure.status);
   if(!labels.has(value))labels.set(value,new Set());
   const names=labels.get(value);
   if(method==='POST') {
     assert.ok(users.has(value),'identity must be verified before creating labels');
     assert.deepEqual(Object.keys(data).sort(),['labelListVisibility','messageListVisibility','name']);
     assert.ok(PERSONAL_LABELS.includes(data.name));
     if(labelRace){names.add(data.name);labelRace=false;throw labelError(409);}
     if(names.has(data.name))throw labelError(409);
     names.add(data.name);return {data:{id:'label-'+names.size,name:data.name}};
   }
   return {data:{labels:[...names].map(name=>({id:'id-'+name,name}))}};
 }
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
 async function login(value='admin@gmail.com',cookie='',type='personal'){email=value;const flow=await start(type,cookie);const response=await callback(flow,flow.cookie+'; '+cookie);return {response,cookie:sessionCookie(response,type)};}
 return {labels,labelRequests,failLabels:(status,method)=>labelFailure=status?{status,method}:null,raceLabels:()=>labelRace=true,rows,connections,users,auth,request,start,callback,login,setEmail:value=>email=value,setIdentity:value=>identityOverride=value,setScopes:value=>scopes=value,expireAuth:()=>authUnavailable=true,revokeAuth:value=>revokedAuthEmail=value,failAccount:(value,status=503)=>{failedEmail=value;failedStatus=status;},denyGmail:()=>gmailDenied=true,calls:()=>calls,userFor};
}
test('conexões não exigem domínio nem endereço Geral fixo',()=>{
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
 const identity={email:'person@gmail.com',email_verified:true,nonce:'nonce',sub:'123'};
 assert.equal(validateAccount(identity,{emailAddress:identity.email},'nonce'),identity.email);
 for(const override of [{nonce:'wrong'},{email_verified:false},{email:'different@gmail.com'}])assert.throws(()=>validateAccount({...identity,...override},{emailAddress:identity.email},'nonce'));
 assert.throws(()=>validateAccount(identity,{emailAddress:'outra@escola.pr.gov.br'},'nonce'));
});
test('CSRF e métodos inválidos são bloqueados; login inclui Gmail readonly e Drive file',async()=>{
 const h=harness();
 assert.equal((await h.request('start',{method:'POST',origin:'https://evil.example',body:{type:'personal'}})).status,403);
 assert.equal((await h.request('start')).status,405);
 const flow=await h.start();
 assert.deepEqual(flow.options.scope,[...SCOPES,LABEL_SCOPE]);
 assert.deepEqual((await h.start('general')).options.scope,SCOPES);
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
 assert.equal(result.json().connections.personal.email,'admin@gmail.com');assert.equal(result.json().connections.personal.drive,true);
 assert.equal(h.users.size,1);assert.ok(!result.body.includes('google:'));assert.ok(!result.body.includes('refresh:'));
});
test('permissões recusadas permitem login e ficam indicadas como não autorizadas',async()=>{
 const h=harness();h.setScopes('openid email profile '+DRIVE_SCOPE);
 const {response,cookie}=await h.login('visitor@gmail.com');assert.match(response.headers.location,/partial/);
 const data=(await h.request('status',{cookie})).json();assert.equal(data.connections.personal.email,'visitor@gmail.com');
 assert.equal(data.connections.personal.gmail,false);assert.equal(data.connections.personal.drive,true);
});
test('cancelar autorização não cria usuário nem substitui a sessão atual',async()=>{
 const h=harness(),first=await h.login(),flow=await h.start('personal',first.cookie);
 const response=await h.request('callback',{cookie:flow.cookie+'; '+first.cookie,query:'?state='+flow.state+'&error=access_denied'});
 assert.match(response.headers.location,/cancelled/);assert.equal(h.users.size,1);
 assert.equal((await h.request('status',{cookie:first.cookie})).json().connections.personal.email,'admin@gmail.com');
});
for(const email of ['escola-a@escola.pr.gov.br','escola-b@escola.pr.gov.br'])test('Geral conecta diretamente com a conta escolhida: '+email,async()=>{
 const h=harness(),flow=await h.start('general');
 assert.equal(flow.options.login_hint,undefined);
 assert.equal(flow.options.hd,undefined);
 h.setEmail(email);
 const response=await h.callback(flow),cookie=sessionCookie(response,'general');
 assert.ok(cookie);assert.match(response.headers.location,/connected/);
 const data=(await h.request('status',{cookie})).json();
 assert.equal(data.mode,'general');assert.equal(data.connections.personal,null);
 assert.equal(data.connections.general.email,email);
 assert.ok(h.connections.has(h.userFor(email).id+'.general'));
});
test('variável Geral antiga não fixa nem impede a conta escolhida no Google',async()=>{
 const h=harness({FAROL_GENERAL_EMAIL:'antiga@escola.pr.gov.br'});
 const account=await h.login('outra@escola.pr.gov.br','','general');
 assert.equal((await h.request('status',{cookie:account.cookie})).json().connections.general.email,'outra@escola.pr.gov.br');
});
test('contas Gerais de escolas diferentes ficam isoladas',async()=>{
 const h=harness(),first=await h.login('escola-a@escola.pr.gov.br','','general');
 const second=await h.login('escola-b@escola.pr.gov.br','','general');
 assert.equal((await h.request('status',{cookie:first.cookie})).json().connections.general.email,'escola-a@escola.pr.gov.br');
 assert.equal((await h.request('status',{cookie:second.cookie})).json().connections.general.email,'escola-b@escola.pr.gov.br');
 assert.notEqual(h.userFor('escola-a@escola.pr.gov.br').id,h.userFor('escola-b@escola.pr.gov.br').id);
 assert.equal((await h.request('status')).json().mode,'none');
});
test('trocar Geral preserva Pessoal e não recupera a conta Geral anterior',async()=>{
 const h=harness(),first=await h.login('escola-a@escola.pr.gov.br','','general');
 const personal=await h.login('pessoa@gmail.com',first.cookie);
 const second=await h.login('escola-b@escola.pr.gov.br',first.cookie+'; '+personal.cookie,'general');
 const data=(await h.request('status',{cookie:second.cookie+'; '+personal.cookie})).json();
 assert.equal(data.mode,'both');assert.equal(data.connections.general.email,'escola-b@escola.pr.gov.br');
 assert.equal(data.connections.personal.email,'pessoa@gmail.com');
 assert.equal((await h.request('status',{cookie:first.cookie})).json().connections.general,null);
});
for(const firstType of ['general','personal'])test('conectar em qualquer ordem e desconectar somente '+firstType,async()=>{
 const h=harness(),secondType=firstType==='general'?'personal':'general';
 const emailFor=type=>type==='general'?GENERAL_EMAIL:'visitor@gmail.com';
 const first=await h.login(emailFor(firstType),'',firstType);
 const second=await h.login(emailFor(secondType),first.cookie,secondType);
 assert.ok(!second.response.headers['set-cookie'].some(c=>c.startsWith('__Host-farol-account-'+firstType+'=')));
 const cookie=first.cookie+'; '+second.cookie;
 const status=(await h.request('status',{cookie})).json();
 assert.equal(status.mode,'both');assert.equal(status.connections.general.email,GENERAL_EMAIL);
 assert.equal(status.connections.personal.email,'visitor@gmail.com');
 await h.request('disconnect',{method:'POST',body:{type:firstType},cookie});
 const after=(await h.request('status',{cookie})).json();
 assert.equal(after.mode,secondType);assert.equal(after.connections[firstType],null);
 assert.equal(after.connections[secondType].email,emailFor(secondType));
 assert.equal((await h.request('status')).json().mode,'none');
});
test('trocar conta Pessoal preserva Geral e não transfere autorizações pessoais',async()=>{
 const h=harness(),general=await h.login(GENERAL_EMAIL,'','general');
 const first=await h.login('first@gmail.com',general.cookie);
 const second=await h.login('second@gmail.com',general.cookie+'; '+first.cookie);
 const data=(await h.request('status',{cookie:general.cookie+'; '+second.cookie})).json();
 assert.equal(data.mode,'both');assert.equal(data.connections.personal.email,'second@gmail.com');
 assert.equal(data.connections.general.email,GENERAL_EMAIL);
 assert.equal((await h.request('status',{cookie:first.cookie})).json().connections.personal,null);
 const returning=await h.login('first@gmail.com');
 assert.equal((await h.request('status',{cookie:returning.cookie})).json().connections.personal.email,'first@gmail.com');
 assert.equal((await h.request('status',{cookie:returning.cookie})).json().connections.general,null);
});
test('sessão Geral não pode ser usada como sessão Pessoal',async()=>{
 const h=harness(),general=await h.login(GENERAL_EMAIL,'','general');
 const forged=general.cookie.replace('account-general=','account-personal=');
 assert.equal((await h.request('status',{cookie:forged})).json().mode,'none');
});
test('falha temporária ou revogação de Geral preserva Pessoal',async()=>{
 const h=harness(),general=await h.login(GENERAL_EMAIL,'','general');
 const personal=await h.login('visitor@gmail.com',general.cookie);
 const cookie=general.cookie+'; '+personal.cookie;
 h.failAccount(GENERAL_EMAIL);
 const temporary=(await h.request('status',{cookie})).json();
 assert.equal(temporary.errors.general,'unavailable');assert.ok(temporary.connections.personal);
 h.failAccount(GENERAL_EMAIL,401);
 const revoked=(await h.request('status',{cookie})).json();
 assert.equal(revoked.errors.general,'reconnect');assert.ok(revoked.connections.personal);
 h.failAccount(null);
 assert.equal((await h.request('status',{cookie})).json().connections.general,null);
});
test('expiração de uma sessão não encerra a outra',async()=>{
 const h=harness(),general=await h.login(GENERAL_EMAIL,'','general');
 const personal=await h.login('visitor@gmail.com',general.cookie);
 const id=general.cookie.split('=')[1],key=digest('account.general.'+id);
 h.rows.get(key).expiresAt=Date.now()-1;
 const data=(await h.request('status',{cookie:general.cookie+'; '+personal.cookie})).json();
 assert.equal(data.mode,'personal');assert.equal(data.connections.general,null);
});
test('callback antigo não substitui uma conexão já trocada',async()=>{
 const h=harness(),first=await h.login('first@gmail.com'),pending=await h.start('personal',first.cookie);
 const second=await h.login('second@gmail.com',first.cookie);
 assert.match((await h.callback(pending,pending.cookie+'; '+second.cookie)).headers.location,/invalid_state/);
 assert.equal((await h.request('status',{cookie:second.cookie})).json().connections.personal.email,'second@gmail.com');
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
 const login=await h.login('person@another.example');
 assert.ok(login.cookie);assert.match(login.response.headers.location,/partial/);
 const result=(await h.request('status',{cookie:login.cookie})).json();
 assert.equal(result.connections.personal.email,'person@another.example');
 assert.equal(result.connections.personal.gmail,false);assert.equal(result.connections.personal.drive,true);
});

test('fluxos OAuth Geral e Pessoal podem ficar pendentes simultaneamente',async()=>{
 const h=harness(),generalFlow=await h.start('general'),personalFlow=await h.start('personal');
 const flows=generalFlow.cookie+'; '+personalFlow.cookie;
 h.setEmail(GENERAL_EMAIL);
 const general=await h.callback(generalFlow,flows);
 h.setEmail('visitor@gmail.com');
 const personal=await h.callback(personalFlow,flows+'; '+sessionCookie(general,'general'));
 const data=(await h.request('status',{cookie:sessionCookie(general,'general')+'; '+sessionCookie(personal)})).json();
 assert.equal(data.mode,'both');assert.equal(data.connections.general.email,GENERAL_EMAIL);
 assert.equal(data.connections.personal.email,'visitor@gmail.com');
});
test('revogar a sessão Supabase Geral não encerra a Pessoal',async()=>{
 const h=harness(),general=await h.login(GENERAL_EMAIL,'','general');
 const personal=await h.login('visitor@gmail.com',general.cookie);
 h.revokeAuth(GENERAL_EMAIL);
 const data=(await h.request('status',{cookie:general.cookie+'; '+personal.cookie})).json();
 assert.equal(data.mode,'personal');assert.equal(data.connections.general,null);
 assert.equal(data.connections.personal.email,'visitor@gmail.com');
});

test('Pessoal cria somente as três labels ausentes e reconectar não duplica',async()=>{
 const h=harness();h.labels.set('person@gmail.com',new Set(['Outra',PERSONAL_LABELS[0]]));
 const first=await h.login('person@gmail.com');
 assert.match(first.response.headers.location,/connected/);
 assert.deepEqual([...h.labels.get('person@gmail.com')].sort(),['Outra',...PERSONAL_LABELS].sort());
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').map(r=>r.data.name),PERSONAL_LABELS.slice(1));
 const second=await h.login('person@gmail.com',first.cookie);
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,2);
 assert.equal((await h.request('status',{cookie:second.cookie})).json().connections.personal.labels,'ready');
 h.labels.get('person@gmail.com').delete(PERSONAL_LABELS[0]);
 assert.equal((await h.request('status',{cookie:second.cookie})).json().connections.personal.labels,'missing');
 assert.equal(h.labelRequests.filter(r=>r.method==='POST').length,2,'status must never create');
});
test('Geral não solicita nem consulta/cria labels; Pessoal cria na própria conta',async()=>{
 const h=harness(),general=await h.login('school@gmail.com','','general');
 await h.request('status',{cookie:general.cookie});assert.equal(h.labelRequests.length,0);
 const personal=await h.login('person@gmail.com',general.cookie);
 assert.ok(h.labelRequests.every(r=>r.email==='person@gmail.com'));
 assert.deepEqual(h.labelRequests.filter(r=>r.method==='POST').map(r=>r.data.name),['1-ME DEVEM','2-MINHAS','3-DEVO']);
 const data=(await h.request('status',{cookie:general.cookie+'; '+personal.cookie})).json();
 assert.equal(data.mode,'both');assert.equal(data.connections.general.labels,undefined);
 assert.equal(data.connections.personal.labels,'ready');assert.equal(h.labels.has('school@gmail.com'),false);
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
 h.failLabels(null);const next=await h.login('admin@gmail.com',first.cookie);
 assert.match(next.response.headers.location,/connected/);
 assert.equal(h.labels.get('admin@gmail.com').size,3);
});
test('criação concorrente aceita conflito apenas após confirmar o nome existente',async()=>{
 const h=harness();h.raceLabels();const account=await h.login();
 assert.match(account.response.headers.location,/connected/);assert.equal(h.labels.get('admin@gmail.com').size,3);
 const bad=harness();bad.failLabels(400,'POST');const failed=await bad.login();
 assert.match(failed.response.headers.location,/partial/);assert.equal(bad.labels.get('admin@gmail.com').size,0);
});
test('identidade inválida nunca cria labels e desconectar não apaga marcadores',async()=>{
 const bad=harness();bad.setIdentity({email_verified:false});await bad.login();assert.equal(bad.labelRequests.length,0);
 const h=harness(),account=await h.login();
 await h.request('disconnect',{method:'POST',body:{type:'personal'},cookie:account.cookie});
 assert.equal(h.labels.get('admin@gmail.com').size,3);
 assert.ok(h.labelRequests.every(r=>['GET','POST'].includes(r.method)));
});
