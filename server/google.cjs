'use strict';
const {once}=require('node:events');
const crypto = require('node:crypto');
const {makeAttendanceStore}=require('./attendance-store.cjs');
const {handleAttendanceAnalysis}=require('./attendance-analysis.cjs');
const {handleActiveSearch}=require('./active-search.cjs');
const {handleAttendanceImport}=require('./attendance-import.cjs');
const {makeStudentStore}=require('./student-store.cjs');
const {handleStudents}=require('./students.cjs');
const {handleAuthorizedUsers,validUserId,validUserOrder}=require('./authorized-users.cjs');
const {handleStudentImport}=require('./student-import.cjs');
const {handleDemands}=require('./demands.cjs');
const {handleMaintenance}=require('./maintenance.cjs');
const {handleOverview}=require('./overview.cjs');
const {gmailFailure}=require('./gmail-errors.cjs');
const {handleInstitutional}=require('./institutional.cjs');
const {
  SESSION_COOKIE,SESSION_SECONDS,ENROLLMENT_COOKIE,ENROLLMENT_SECONDS,
  temporarySessionKey,readTemporarySession,writeTemporarySession,renewTemporarySession,confirmEnrollment,canEnroll,resetTemporaryPassword,authenticateTemporary
}=require('./temporary-access.cjs');
const {ADMIN_EMAIL:FIXED_AUTHORIZED_EMAIL,MODULES,actionModules,settingsActions,modulesFor}=require('./module-access.cjs');
const {OAuth2Client} = require('google-auth-library');
const READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const LABEL_SCOPE = 'https://www.googleapis.com/auth/gmail.labels';
const {PERSONAL_LABELS,GENERAL_LABELS,ANNUAL_LABEL,GENERAL_ARCHIVE_LABEL,PERSONAL_ARCHIVE_LABEL}=require('./mailbox-labels.cjs');
const LABEL_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/labels';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_READ_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DRIVE_METADATA_SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly';
const SCHOOL_DOMAIN='escola.pr.gov.br';
const SCOPES = ['openid','email','profile',READ_SCOPE,DRIVE_SCOPE];
const ROUTES = new Set(['inicio','analise-faltas','busca-ativa','radar','institucionais','pessoais','bi-seed','inspetores-monitores','manutencao-sistema','configuracoes']);
const TYPES = ['general','personal'];
const personalActions=new Set(['board','thread','demand','inbox','classified','classify','personal-archive','archived','personal-restore','personal-archive-next']);
const driveReadActions=new Set(['student-import','attendance-import']);
const driveMetadataActions=new Set(['maintenance','student-files','attendance-files']);
const schoolActions=new Set(['students','occurrence','occurrence-edit','occurrences','inspector-occurrences','attendance-analysis','active-search-students','active-search-register','active-search-records','active-search-edit','active-search-delete']);
const actionMailbox=action=>personalActions.has(action)?'personal':'general';
const TTL = 30 * 24 * 3600;
const random = () => crypto.randomBytes(32).toString('base64url');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const routeOf = value => ROUTES.has(value) ? value : 'bi-seed';
const cookieName = (kind,type) => `__Host-farol-${kind}-${type}`;
const accountCookie = type => cookieName('account',type);
const accountKey = (type,id) => hash(`account.${type}.${id}`);
const validId = value => typeof value === 'string' && /^[\w-]{43}$/.test(value);
const emailOf = value => String(value || '').trim().toLowerCase();
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(value => value.trim().split('=')).filter(pair => pair.length === 2));
}
function setCookie(res,name,value,age) {
  const previous = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie',[...previous,`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`]);
}
function configuration(env) {
  const names=['FAROL_ORIGIN','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','FAROL_TOKEN_KEY','FAROL_SUPABASE_URL','FAROL_SUPABASE_SERVICE_ROLE_KEY','FAROL_SUPABASE_ANON_KEY'];
  if(env.FAROL_GOOGLE_ENABLED !== 'true' || names.some(name => !env[name]))return null;
  try {
    const origin=new URL(env.FAROL_ORIGIN),storage=new URL(env.FAROL_SUPABASE_URL);
    const key=Buffer.from(env.FAROL_TOKEN_KEY,'base64');
    if([origin,storage].some(url=>url.protocol!=='https:' || url.pathname!=='/' || url.search || url.hash || url.username || url.password) || key.length!==32)return null;
    return {origin:origin.origin,storage:storage.origin,key,clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET,serviceKey:env.FAROL_SUPABASE_SERVICE_ROLE_KEY,anonKey:env.FAROL_SUPABASE_ANON_KEY};
  } catch {return null;}
}
function seal(data,key,id) {
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(id));
  const body=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}
function unseal(value,key,id) {
  const bytes=Buffer.from(value,'base64url'),decipher=crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
  decipher.setAAD(Buffer.from(id));decipher.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));
}
function makeStore(config,fetcher=fetch) {
  async function call(table,method,query,body,prefer) {
    const response=await fetcher(`${config.storage}/rest/v1/${table}?${query}`,{
      method,headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json',Prefer:prefer||'return=minimal'},
      body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)
    });
    if(!response.ok){
      let code;try {code=(await response.json()).code;}catch{}
      if(table==='EmailsAutorizados'){
        if(['42P01','42703','PGRST204','PGRST205'].includes(code))throw new Error('access_setup_required');
        if(method!=='GET'&&[401,403].includes(response.status))throw Object.assign(new Error('authorized_write_denied'),{status:503});
        if(code==='23505')throw Object.assign(new Error('email_exists'),{status:409});
        throw new Error('access_unavailable');
      }
      throw new Error(['farol_personal_demands','farol_institutional_demands'].includes(table) && ['42P01','PGRST205'].includes(code)?'setup_required':'storage_unavailable');
    }
    return response.status===204 || !prefer?.includes('representation')?null:response.json();
  }
  const sessions=(...args)=>call('farol_google_sessions',...args);
  const connectionId=(owner,type)=>`connection.${owner}.${type}`;
  const query=(owner,type)=>`owner_id=eq.${encodeURIComponent(owner)}&type=eq.${type}`;
  const decode=row=>row && Date.parse(row.expires_at)>Date.now()?unseal(row.payload,config.key,row.id):null;
  return {
    ...makeStudentStore(config,fetcher,{seal,unseal}),
    ...makeAttendanceStore(config,fetcher,{seal,unseal}),
    async listAuthorizedEmails(pageToken='',temporary=false){
      let after='';
      if(pageToken){
        const invalidPage=()=>Object.assign(new Error('invalid_page'),{status:400});
        if(!/^[A-Za-z0-9_-]{1,128}$/.test(pageToken))throw invalidPage();
        let cursor;
        try{cursor=JSON.parse(Buffer.from(pageToken,'base64url').toString('utf8'));}catch{throw invalidPage();}
        if(!Array.isArray(cursor)||cursor.length!==2)throw invalidPage();
        const [order,id]=cursor;
        if(!validUserOrder(order)||!validUserId(id))throw invalidPage();
        after=order===null
          ?'&Ordem=is.null&id=gt.'+id
          :'&or='+encodeURIComponent(`(Ordem.gt.${order},and(Ordem.eq.${order},id.gt.${id}),Ordem.is.null)`);
      }
      const select=temporary?'id,Nome,Ordem':'id,Escola,Nome,Funcao,Ordem,email,password_hash,permissions';
      const rows=await call('EmailsAutorizados','GET','select='+select+'&order=Ordem.asc.nullslast,id.asc&limit=51'+after,null,'return=representation');
      if(!Array.isArray(rows))throw new Error('access_unavailable');
      const last=rows[49];
      const users=rows.slice(0,50).map(({password_hash,...row})=>temporary
        ?{id:row.id,name:row.Nome}
        :{...row,permissions:modulesFor(row),hasPassword:Boolean(password_hash)});
      return {users,nextPageToken:rows.length>50?Buffer.from(JSON.stringify([last.Ordem,last.id])).toString('base64url'):null};
    },
    async includeAuthorizedEmail(row){
      const rows=await call('EmailsAutorizados','POST','',row,'return=representation');
      if(!rows?.length)throw new Error('access_unavailable');
    },
    async updateAuthorizedEmail(id,row){
      const rows=await call('EmailsAutorizados','PATCH','id=eq.'+id,row,'return=representation');
      if(!rows?.length)throw Object.assign(new Error('not_found'),{status:404});
    },
    async excludeAuthorizedEmail(id){
      await call('EmailsAutorizados','DELETE','id=eq.'+id,null,'return=representation');
    },
    async getRegisteredUser(email){
      const rows=await call('EmailsAutorizados','GET','email=eq.'+encodeURIComponent(email)+'&select=id,Nome,email,permissions&limit=1',null,'return=representation');
      if(!Array.isArray(rows))throw new Error('access_unavailable');
      const profile=rows[0];
      return profile?.email===email&&validUserId(profile.id)?profile:null;
    },
    async getTemporaryUser(id){
      const rows=await call('EmailsAutorizados','GET','id=eq.'+id+'&select=id,Nome,password_hash,activation_hash,activation_expires_at,permissions&limit=1',null,'return=representation');
      return rows[0]||null;
    },
    async issueTemporaryActivation(id,activationHash,expiresAt){
      const rows=await call('EmailsAutorizados','PATCH','id=eq.'+id+'&password_hash=is.null&Funcao=not.is.null&select=id',
        {activation_hash:activationHash,activation_expires_at:expiresAt},'return=representation');
      return rows?.length===1;
    },
    async activateTemporaryUser(id,activationHash,passwordHash){
      const rows=await call('EmailsAutorizados','PATCH','id=eq.'+id+'&password_hash=is.null&activation_hash=eq.'+activationHash+'&activation_expires_at=gt.now&select=id',
        {password_hash:passwordHash,activation_hash:null,activation_expires_at:null},'return=representation');
      return rows?.length===1;
    },
    async changeTemporaryPassword(id,previous,passwordHash){
      const rows=await call('EmailsAutorizados','PATCH','id=eq.'+id+'&password_hash=eq.'+encodeURIComponent(previous)+'&select=id',
        {password_hash:passwordHash},'return=representation');
      return rows?.length===1;
    },
    async allowTemporaryAttempt(id,source){
      return call('rpc/farol_temporary_attempt','POST','',{p_user:id,p_source:source},'return=representation');
    },
    async getTemporaryOwner(){
      const id=await call('rpc/farol_temporary_owner','GET','',null,'return=representation');
      return validUserId(id)?id:null;
    },
    async get(id) {const rows=await sessions('GET',`id=eq.${id}&select=id,payload,expires_at`,null,'return=representation');return decode(rows[0]);},
    async take(id) {const rows=await sessions('DELETE',`id=eq.${id}`,null,'return=representation');return decode(rows[0]);},
    async put(id,value,expiresAt) {await sessions('POST','on_conflict=id',{id,payload:seal(value,config.key,id),expires_at:new Date(expiresAt).toISOString()},'resolution=merge-duplicates,return=minimal');},
    async extendTemporarySession(id,previousExpiry,value,expiresAt) {
      const previous=encodeURIComponent(new Date(previousExpiry).toISOString());
      const rows=await sessions('PATCH',`id=eq.${id}&expires_at=eq.${previous}&and=(expires_at.gt.now)&select=id`,
        {payload:seal(value,config.key,id),expires_at:new Date(expiresAt).toISOString()},'return=representation');
      return rows.length===1;
    },
    async remove(id) {await sessions('DELETE',`id=eq.${id}`);},
    async cleanup() {await sessions('DELETE',`expires_at=lt.${encodeURIComponent(new Date().toISOString())}`);},
    async getConnection(owner,type) {
      const rows=await call('farol_google_connections','GET',query(owner,type)+'&select=payload',null,'return=representation');
      return rows[0]?unseal(rows[0].payload,config.key,connectionId(owner,type)):null;
    },
    async putConnection(owner,type,value) {
      await call('farol_google_connections','POST','on_conflict=owner_id,type',{owner_id:owner,type,payload:seal(value,config.key,connectionId(owner,type)),updated_at:new Date().toISOString()},'resolution=merge-duplicates,return=minimal');
    },
    async getDemands(owner,ids) {
      if(!ids.length)return [];
      const rows=await call('farol_personal_demands','GET',`owner_id=eq.${encodeURIComponent(owner)}&thread_id=in.(${ids.map(encodeURIComponent).join(',')})&select=id,thread_id,version,payload`,null,'return=representation');
      return rows.map(row=>({id:row.id,threadId:row.thread_id,version:row.version,...unseal(row.payload,config.key,`demand.${owner}.personal.${row.thread_id}`)}));
    },
    async saveDemand(owner,id,value,version) {
      const payload=seal(value,config.key,`demand.${owner}.personal.${id}`);
      const rows=version===0
        ?await call('farol_personal_demands','POST','on_conflict=owner_id,thread_id',{owner_id:owner,thread_id:id,version:1,payload},'resolution=ignore-duplicates,return=representation')
        :await call('farol_personal_demands','PATCH',`owner_id=eq.${encodeURIComponent(owner)}&thread_id=eq.${encodeURIComponent(id)}&version=eq.${version}`,{version:version+1,payload,updated_at:new Date().toISOString()},'return=representation');
      return rows[0]?{...value,id:rows[0].id,threadId:id,version:rows[0].version}:null;
    },
    async getInstitutionalDemands(owner,ids) {
      const result=[];
      for(let start=0;start<ids.length;start+=100){
        const batch=ids.slice(start,start+100);
        const rows=await call('farol_institutional_demands','GET',`owner_id=eq.${encodeURIComponent(owner)}&message_id=in.(${batch.map(encodeURIComponent).join(',')})&select=message_id,version,payload&limit=100`,null,'return=representation');
        result.push(...rows.map(row=>({messageId:row.message_id,version:row.version,...unseal(row.payload,config.key,`institutional.${owner}.${row.message_id}`)})));
      }
      return result;
    },
    async saveInstitutionalDemand(owner,id,value,version) {
      const payload=seal(value,config.key,`institutional.${owner}.${id}`);
      const rows=version===0
        ?await call('farol_institutional_demands','POST','on_conflict=owner_id,message_id',{owner_id:owner,message_id:id,version:1,payload},'resolution=ignore-duplicates,return=representation')
        :await call('farol_institutional_demands','PATCH',`owner_id=eq.${encodeURIComponent(owner)}&message_id=eq.${encodeURIComponent(id)}&version=eq.${version}`,{version:version+1,payload,updated_at:new Date().toISOString()},'return=representation');
      return rows[0]?{...value,messageId:id,version:rows[0].version}:null;
    },
    async removeConnection(owner,type) {await call('farol_google_connections','DELETE',query(owner,type));}
  };
}
function makeAuth(config,fetcher=fetch) {
  async function call(path,body,accessToken) {
    const response=await fetcher(config.storage+'/auth/v1/'+path,{
      method:body?'POST':'GET',headers:{apikey:config.anonKey,'Content-Type':'application/json',...(accessToken?{Authorization:'Bearer '+accessToken}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)
    });
    if(!response.ok) {
      const error=new Error(response.status===400 || response.status===401 || response.status===403?'login_required':'auth_unavailable');
      throw error;
    }
    return response.status===204?{}:response.json();
  }
  return {
    signIn:(token,accessToken,nonce)=>call('token?grant_type=id_token',{provider:'google',id_token:token,access_token:accessToken,nonce}),
    refresh:token=>call('token?grant_type=refresh_token',{refresh_token:token}),
    user:token=>call('user',null,token),
    logout:token=>call('logout?scope=local',{},token)
  };
}
function validateAccount(identity,profile,nonce) {
  const email=emailOf(profile.emailAddress);
  if(!identity || identity.email_verified!==true || identity.nonce!==nonce || !identity.sub || emailOf(identity.email)!==email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new Error('wrong_account');
  return email;
}
const credentialsOf=client=>({access_token:client.credentials.access_token,expiry_date:client.credentials.expiry_date,refresh_token:client.credentials.refresh_token});
// GET status never creates labels. OAuth and the explicit GERAL repair action may create.
async function mailboxLabels(client,allowed,create=false,expectedLabels=PERSONAL_LABELS,details=false) {
  const finish=(status,names=new Set(),reason=null)=>details?{status,missing:expectedLabels.filter(name=>!names.has(name)),reason}:status;
  if(!allowed)return finish('permission_required');
  let names=new Set();
  const list=async()=>{
    const {data}=await client.request({url:LABEL_URL,headers:{'Cache-Control':'no-cache'},timeout:10000});
    if(data.labels!==undefined && !Array.isArray(data.labels))throw new Error('invalid_labels');
    return new Set((data.labels||[]).map(label=>label.name));
  };
  const reasonOf=error=>error.response?.status===403?'permission_denied':[400,409].includes(error.response?.status)?'name_rejected':'provider_unavailable';
  try {
    names=await list();
    let failureReason=null;
    for(const name of expectedLabels) {
      if(names.has(name))continue;
      if(!create)return finish('missing',names);
      try {
        await client.request({url:LABEL_URL,method:'POST',data:{name,labelListVisibility:'labelShow',messageListVisibility:'show'},timeout:10000});
        names.add(name);
      } catch(error) {
        // A timeout or conflict may mean another request already created it.
        // Confirm the exact name, then continue preparing the other fixed labels.
        try {names=await list();}catch{throw error;}
        if(!names.has(name))failureReason=reasonOf(error);
      }
    }
    names=await list();
    if(create&&!expectedLabels.every(name=>names.has(name)))names=await list();
    const ready=expectedLabels.every(name=>names.has(name));
    return finish(ready?'ready':failureReason?'unavailable':'missing',names,ready?null:failureReason);
  } catch(error) {
    return finish('unavailable',names,reasonOf(error));
  }
}
function makeHandler({env=process.env,storeFactory=makeStore,authFactory=makeAuth,clientFactory=c=>new OAuth2Client(c.clientId,c.clientSecret,`${c.origin}/api/google/callback`)}={}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    const url=new URL(req.url,'https://farol.invalid'),action=url.pathname.split('/').pop(),config=configuration(env);
    let previewSignal;
    const reply=(status,data)=>{
      if(previewSignal?.aborted){
        if(!res.destroyed&&!res.writableEnded)res.end();
        return;
      }
      if(previewSignal&&res.headersSent)return res.end(JSON.stringify(data)+'\n');
      res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));
    };
    const temporaryPublic=['temporary-users','temporary-user','temporary-login','temporary-activate','temporary-password','temporary-logout'];
    if(!['status','access-denied','start','callback','disconnect','logout',...temporaryPublic].includes(action)
      &&!actionModules.has(action))return reply(404,{error:'not_found'});
    const expected=['start','disconnect','logout','demand','classify','personal-archive','personal-restore','personal-archive-next','institutional-move','institutional-labels','occurrence','occurrence-delete','occurrence-edit','active-search-register','active-search-edit','active-search-delete','student-import','attendance-import','authorized-email','temporary-login','temporary-activate','temporary-password','temporary-logout','temporary-confirm','temporary-reset-password'].includes(action)?'POST':'GET';
    if(req.method!==expected){res.setHeader('Allow',expected);return reply(405,{error:'method_not_allowed'});}
    if(!config)return reply(action==='status'?200:503,{
      configured:false,mode:'none',connections:{general:null,personal:null},error:'not_configured',
      ...(action==='status'?{modules:modulesFor(null)}:{})
    });
    if(expected==='POST' && (req.headers.origin!==config.origin || req.headers['x-farol-request']!=='1'))return reply(403,{error:'forbidden'});
    const jar=cookies(req),store=storeFactory(config),auth=authFactory(config);
    const finish=(route,type,result)=>{res.statusCode=303;res.setHeader('Location',`${config.origin}/?connection=${result}&mailbox=${type}#${routeOf(route)}`);res.end();};
    let body={};
    if(expected==='POST') {
      if(!String(req.headers['content-type']||'').startsWith('application/json'))return reply(415,{error:'invalid_body'});
      try {body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{return reply(400,{error:'invalid_body'});}
      if(!body || typeof body!=='object' || Array.isArray(body))return reply(400,{error:'invalid_body'});
      if(action!=='logout'&&!temporaryPublic.includes(action)&&!TYPES.includes(body.type))return reply(400,{error:'invalid_type'});
    }
    function authorizeEmail(email,hostedDomain){
      if(email===FIXED_AUTHORIZED_EMAIL)return;
      if(email.split('@')[1]===SCHOOL_DOMAIN&&typeof hostedDomain==='string'&&hostedDomain.trim())return;
      throw Object.assign(new Error('access_denied'),{email});
    }
    async function account(type,checkAccess=true) {
      const name=accountCookie(type),id=jar[name];
      if(!validId(id))return null;
      const key=accountKey(type,id),session=await store.get(key);
      if(!session || session.version!==3 || session.type!==type || session.expiresAt<=Date.now()){setCookie(res,name,'',0);return null;}
      try {
        if(session.auth.expiresAt<Date.now()+60000) {
          const refreshed=await auth.refresh(session.auth.refreshToken);
          session.auth={accessToken:refreshed.access_token,refreshToken:refreshed.refresh_token,expiresAt:Date.now()+refreshed.expires_in*1000};
          await store.put(key,session,session.expiresAt);
        }
        const user=await auth.user(session.auth.accessToken);
        if(user.id!==session.user.id || emailOf(user.email)!==session.user.email)throw new Error('login_required');
        session.user={id:user.id,email:emailOf(user.email)};
        if(checkAccess)authorizeEmail(session.user.email,session.hostedDomain);
        return {id,key,type,session,user:session.user};
      } catch(error) {
        if(error.message!=='login_required')throw error;
        await store.remove(key);setCookie(res,name,'',0);return null;
      }
    }
    async function saveConnection(owner,type,connection) {
      if(!connection.credentials.refresh_token) {
        const previous=await store.getConnection(owner,type);
        if(previous?.email===connection.email)connection.credentials.refresh_token=previous.credentials.refresh_token;
      }
      await store.putConnection(owner,type,connection);
    }
    async function discardAccount(type,current) {
      if(current) {
        await store.remove(current.key);
        // Removing the local capability ends this browser session even if logout is unavailable.
        try {await auth.logout(current.session.auth.accessToken);}catch{}
      }
      setCookie(res,accountCookie(type),'',0);
    }
    async function clearLocalGoogle(){
      for(const type of TYPES){
        const id=jar[accountCookie(type)];
        if(validId(id))await store.remove(accountKey(type,id));
        setCookie(res,accountCookie(type),'',0);
        setCookie(res,cookieName('flow',type),'',0);
      }
    }
    async function revokeTemporary(){
      const token=jar[SESSION_COOKIE];
      if(validId(token))await store.remove(temporarySessionKey(token));
    }
    async function clearTemporary(){
      await revokeTemporary();
      setCookie(res,SESSION_COOKIE,'',0);
    }
    const allowsModule=(profile,module)=>Boolean(profile&&modulesFor(profile).includes(module));
    const profileForModule=(profiles,module)=>allowsModule(profiles.general,module)?profiles.general
      :allowsModule(profiles.personal,module)?profiles.personal:null;
    const publicProfile=profile=>profile?{id:profile.id,name:profile.Nome,email:profile.email}:null;
    async function verifiedConnection(type){
      const current=await account(type).catch(error=>{error.type=type;throw error;});
      if(!current)return null;
      const connection=await store.getConnection(current.user.id,type);
      return connection?.email===current.user.email?{user:current.user,connection}:null;
    }
    async function moduleIdentity(temporary){
      if(temporary)return {profiles:{general:null,personal:temporary.profile}};
      const [general,personal]=await Promise.all(TYPES.map(verifiedConnection));
      if(general?.user.email===FIXED_AUTHORIZED_EMAIL&&personal?.user.id===general.user.id&&personal.user.email===FIXED_AUTHORIZED_EMAIL){
        return {admin:{general,personal},profiles:{}};
      }
      const [generalProfile,personalProfile]=await Promise.all([
        general?store.getRegisteredUser(general.user.email):null,
        personal?(personal.user.email===general?.user.email?null:store.getRegisteredUser(personal.user.email)):null
      ]);
      return {general,personal,profiles:{
        general:generalProfile,
        personal:personal?.user.email===general?.user.email?generalProfile:personalProfile
      }};
    }
    async function canManageSettings(temporary){
      const {admin,profiles}=await moduleIdentity(temporary);
      return Boolean(admin||profileForModule(profiles,'configuracoes'));
    }
    async function moduleConnections(profiles,connections={},temporary=false,occurrencesOnly=false){
      const modules=temporary?modulesFor(profiles.personal):profiles.general||profiles.personal
        ?MODULES.filter(module=>profileForModule(profiles,module)):modulesFor(null,connections);
      if(occurrencesOnly)modules.push('inspetores-monitores');
      const institutionalConnection=allowsModule(profiles.general,'institucionais')?connections.general:null;
      const needsSharedGeneral=modules.includes('inicio')||modules.includes('manutencao-sistema')
        ||(modules.includes('institucionais')&&!institutionalConnection);
      const needsPersonal=modules.includes('inicio')||modules.includes('pessoais');
      const needsSchool=needsSharedGeneral||modules.includes('radar')
        ||(!occurrencesOnly&&modules.includes('inspetores-monitores'))||(temporary&&needsPersonal);
      const owner=needsSchool?await store.getTemporaryOwner():null;
      const school=owner||occurrencesOnly?{email:FIXED_AUTHORIZED_EMAIL,...(occurrencesOnly?{occurrencesOnly:true}:{})}:null;
      const sharedConnections={general:null,personal:needsPersonal?connections.personal||null:null};
      await Promise.all(TYPES.filter(type=>type==='general'?needsSharedGeneral:temporary&&needsPersonal).map(async type=>{
        if(!owner)return;
        const connection=await store.getConnection(owner,type);
        if(connection?.email===FIXED_AUTHORIZED_EMAIL)sharedConnections[type]={email:connection.email,...connection.capabilities};
      }));
      return {modules,school,sharedConnections,...(institutionalConnection?{institutionalConnection}:{})};
    }
    try {
      if(action==='access-denied'){
        const ticket=jar['__Host-farol-access-denied'];
        setCookie(res,'__Host-farol-access-denied','',0);
        if(!validId(ticket))return reply(404,{error:'not_found'});
        const denied=await store.take('denied.'+hash(ticket));
        if(!denied||denied.expiresAt<=Date.now()||typeof denied.email!=='string')return reply(404,{error:'not_found'});
        return reply(200,{email:denied.email});
      }
      if(action==='temporary-users')return reply(200,await store.listAuthorizedEmails(url.searchParams.get('pageToken')||'',true));
      if(action==='temporary-user'){
        const id=url.searchParams.get('id');
        if(!validUserId(id))return reply(400,{error:'invalid_temporary_user'});
        const profile=await store.getTemporaryUser(id);
        if(!profile)return reply(404,{error:'invalid_temporary_user'});
        if(profile.password_hash!==null&&!profile.password_hash)return reply(503,{error:'access_unavailable'});
        const canCreatePassword=canEnroll(profile,jar[ENROLLMENT_COOKIE])
          &&await canManageSettings(await readTemporarySession(store,jar[SESSION_COOKIE]));
        return reply(200,{id,name:profile.Nome,hasPassword:profile.password_hash!==null,canCreatePassword});
      }
      if(action==='temporary-logout'){
        await clearTemporary();
        return reply(200,{signedOut:true});
      }
      let temporary=await readTemporarySession(store,jar[SESSION_COOKIE]);
      if(['temporary-login','temporary-activate','temporary-password'].includes(action)){
        if(action==='temporary-activate'&&!await canManageSettings(temporary))return reply(403,{error:'temporary_confirmation_required'});
        const profile=await authenticateTemporary({action,store,body,current:temporary,request:req,key:config.key,enrollment:jar[ENROLLMENT_COOKIE]});
        setCookie(res,ENROLLMENT_COOKIE,'',0);
        if(action==='temporary-activate')return reply(200,{passwordSaved:true});
        await clearLocalGoogle();
        await revokeTemporary();
        try{await store.cleanup();}catch{}
        const token=await writeTemporarySession(store,profile);
        setCookie(res,SESSION_COOKIE,token,SESSION_SECONDS);
        return reply(200,{signedIn:true});
      }
      if(temporary&&action==='status'){
        const previousExpiry=temporary.expiresAt;
        temporary=await renewTemporarySession(store,jar[SESSION_COOKIE],temporary);
        if(temporary?.expiresAt>previousExpiry){
          const remaining=Math.max(1,Math.ceil((temporary.expiresAt-Date.now())/1000));
          setCookie(res,SESSION_COOKIE,jar[SESSION_COOKIE],remaining);
        }
      }
      if(temporary&&action==='status'){
        const {profile}=temporary;
        return reply(200,{configured:true,mode:'temporary',connections:{general:null,personal:null},
          temporary:{id:profile.id,name:profile.Nome,expiresAt:temporary.expiresAt},...await moduleConnections({personal:profile},{},true)});
      }
      if(temporary&&['start','callback','disconnect'].includes(action)){
        if(action==='callback')return finish('inicio','personal','temporary_active');
        return reply(403,{error:'temporary_active'});
      }
      if(actionModules.has(action)) {
        try {
          const module=actionModules.get(action);
          const {admin,general,personal,profiles}=await moduleIdentity(temporary);
          if(['occurrence-delete','active-search-delete'].includes(action)&&!admin)return reply(403,{error:'admin_required'});
          const profile=profileForModule(profiles,module);
          const canEditAll=(admin?.personal||personal)?.user.email===FIXED_AUTHORIZED_EMAIL;
          const occurrenceEditing=['inspector-occurrences','occurrence-edit'].includes(action);
          const activeSearchEditing=['active-search-records','active-search-edit'].includes(action);
          if(!admin&&!profile&&!(canEditAll&&(occurrenceEditing||activeSearchEditing))){
            const error=temporary||profiles.general||(personal&&personal.user.email!==FIXED_AUTHORIZED_EMAIL)||schoolActions.has(action)||action==='overview'?'module_forbidden':'admin_required';
            return reply(403,{error});
          }
          if(settingsActions.has(action)){
            if(action==='temporary-confirm'){
              if(Object.keys(body).some(key=>!['type','id'].includes(key)))return reply(400,{error:'invalid_temporary_user'});
              const token=await confirmEnrollment(store,body.id);
              setCookie(res,ENROLLMENT_COOKIE,token,ENROLLMENT_SECONDS);
              return reply(200,{confirmed:true});
            }
            if(action==='temporary-reset-password'){
              await resetTemporaryPassword(store,body);
              return reply(200,{passwordSaved:true});
            }
            const email=admin?FIXED_AUTHORIZED_EMAIL:temporary?profile.id:profile.email;
            return reply(200,await handleAuthorizedUsers({action,url,body,store,email}));
          }
          const type=action==='overview'?url.searchParams.get('type'):actionMailbox(action);
          if(!TYPES.includes(type))return reply(400,{error:'invalid_type'});
          const useConnectedGeneral=action==='overview'||(module==='institucionais'&&allowsModule(profiles.general,module));
          const direct=admin?.[type]||(type==='personal'||(canEditAll&&(occurrenceEditing||activeSearchEditing))?personal:useConnectedGeneral?general:null);
          if(type==='personal'&&!direct&&(!temporary||action==='personal-archive-next'))return reply(403,{error:'login_required',type});
          const owner=direct?.user.id??await store.getTemporaryOwner();
          const email=direct?.user.email??FIXED_AUTHORIZED_EMAIL;
          if(!owner)return reply(409,{error:'school_unavailable'});
          if(action==='occurrence-delete'){
            const {id}=body;
            if(body.mailbox!==email)return reply(409,{error:'account_changed'});
            if(body.type!=='general'||typeof id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)
              ||Object.keys(body).some(key=>!['type','mailbox','id'].includes(key)))return reply(400,{error:'invalid_occurrence'});
            return reply(200,{mailbox:email,id,deleted:await store.deleteOccurrence(owner,id)});
          }
          if(action==='attendance-analysis')return reply(200,await handleAttendanceAnalysis({url,store,owner,email}));
          if(action.startsWith('active-search-')){
            const identity=allowsModule(profiles.general,module)?general:personal;
            const verifiedEmail=identity?.user.email;
            const author=verifiedEmail?.endsWith('@'+SCHOOL_DOMAIN)?verifiedEmail:null;
            const editor=canEditAll?{all:true}:temporary?null:{emails:[general?.user.email,personal?.user.email].filter(Boolean)};
            return reply(200,await handleActiveSearch({action,url,body,store,owner,email,author,editor,canDelete:Boolean(admin)}));
          }
          if(schoolActions.has(action)){
            const actor=temporary?{id:profile.id,name:profile.Nome,email:null}:admin?{name:'Marcos Rubo',email}:profile?{name:profile.Nome,email:profile.email}:null;
            const editor=occurrenceEditing&&(canEditAll?{all:true}:actor?.id?{id:actor.id}:actor?.email
              ?{email:actor.email,personalEmail:personal?.user.email}:null);
            const studentAction=action==='inspector-occurrences'?'occurrences':action;
            const result=await handleStudents({action:studentAction,url,body,store,owner,email,actor,editor});
            return reply(200,action==='inspector-occurrences'?{...result,canDelete:Boolean(admin)}:result);
          }
          const connection=direct?.connection??await store.getConnection(owner,type);
          const capability=driveReadActions.has(action)?'driveRead':driveMetadataActions.has(action)?'driveMetadata':'gmail';
          if(connection?.email!==email||!connection.capabilities[capability])return reply(403,{error:'missing_scope'});
          const client=clientFactory(config);client.setCredentials(connection.credentials);
          if(action==='overview')return reply(200,await handleOverview({url,client,email,type}));
          if(action==='institutional-labels'){
            if(body.type!=='general'||Object.keys(body).some(key=>!['type','mailbox'].includes(key)))return reply(400,{error:'invalid_institutional'});
            if(body.mailbox!==email)return reply(409,{error:'account_changed'});
            if(!connection.capabilities.manageInstitutional)return reply(403,{error:'institutional_scope'});
            const labelDetails=await mailboxLabels(client,true,true,GENERAL_LABELS,true);
            if(admin)try {await store.putConnection(owner,type,{...connection,labelsAllowed:true,credentials:credentialsOf(client)});}catch{}
            return reply(200,{mailbox:email,labels:labelDetails.status,labelDetails});
          }
          const context={action,url,body,store,client,owner,email};
          if(action==='student-import'&&body.preview===true){
            const controller=new AbortController();
            previewSignal=controller.signal;
            const abort=()=>controller.abort();
            req.on('error',abort);
            res.once('close',()=>{if(!res.writableFinished)abort();});
            if(res.destroyed)abort();
            const onPage=async rows=>{
              previewSignal.throwIfAborted();
              if(!res.headersSent)res.setHeader('Content-Type','application/x-ndjson; charset=utf-8');
              if(!res.write(JSON.stringify({rows})+'\n'))await once(res,'drain',{signal:previewSignal});
            };
            const result=await handleStudentImport({...context,signal:previewSignal,onPage});
            return reply(200,{preview:result});
          }
          const result=action.startsWith('attendance-')?await handleAttendanceImport(context)
            :action.startsWith('student-')?await handleStudentImport({...context,canRead:connection.capabilities.driveRead===true})
            :action==='maintenance'?await handleMaintenance(context)
            :action.startsWith('institutional')?await handleInstitutional({...context,canModify:connection.capabilities.manageInstitutional===true})
            :await handleDemands({...context,canClassify:connection.capabilities.classify===true});
          // Credential caching must not turn an already committed demand into a false failure.
          // The stored refresh token remains available for the next request.
          if(admin)try {await store.putConnection(owner,type,{...connection,credentials:credentialsOf(client)});}catch{}
          return reply(200,result);
        } catch(error) {
          if(error.message==='access_denied')return reply(403,{error:'access_denied',email:error.email,type:error.type||actionMailbox(action)});
          if(['access_setup_required','access_unavailable'].includes(error.message))return reply(503,{error:error.message});
          const known=['account_changed','invalid_demand','invalid_column','invalid_page','invalid_thread','not_found','conflict','invalid_provider','invalid_classification','invalid_archive','archive_label_missing','classify_scope','labels_missing','not_inbox','classification_unconfirmed','institutional_scope','invalid_institutional','listing_limit','folder_missing','folder_ambiguous','drive_incomplete','invalid_occurrence','invalid_active_search','active_search_author_required','active_search_missing','active_search_edit_forbidden','occurrence_missing','occurrence_edit_forbidden','student_missing','invalid_import','file_outside_folder','file_changed','unsupported_file','file_too_large','pdf_layout','pdf_runtime_unavailable','storage_access_denied','student_schema_invalid','storage_unavailable','import_unconfirmed','author_required','author_changed','author_profile_required','invalid_authorized_email','email_exists','authorized_write_denied','attendance_setup_required','attendance_layout','attendance_filename','file_download_denied','invalid_period','analysis_limit','invalid_temporary_user','temporary_activation_unavailable','temporary_reset_unavailable','temporary_password_length','temporary_password_confirmation'];
          if(known.includes(error.message))return reply(error.status||503,{error:error.message});
          if(error.message==='setup_required')return reply(503,{error:'setup_required'});
          if(error.response?.status===401 || error.response?.data?.error==='invalid_grant')return reply(401,{error:'login_required'});
          if(['maintenance','student-files','student-import','attendance-files','attendance-import'].includes(action)){
            const reasons=(error.response?.data?.error?.errors||[]).map(item=>item.reason);
            if(reasons.includes('insufficientPermissions'))return reply(403,{error:'missing_scope'});
            if(reasons.includes('domainPolicy'))return reply(403,{error:'drive_policy'});
            if(action==='student-import'){
              const stages={folder:'import_folder_failed',metadata:'import_metadata_failed',download:'import_download_failed',pdf:'pdf_runtime_unavailable',storage:'storage_unavailable'};
              return reply(503,{error:stages[error.studentImportStage]||'import_server_unavailable'});
            }
            return reply(503,{error:'unavailable'});
          }
          const failure=(action.startsWith('institutional')||['archived','personal-archive','personal-restore','personal-archive-next'].includes(action))?gmailFailure(error):null;
          const scopeError={classify:'classify_scope','personal-archive':'classify_scope','personal-restore':'classify_scope','personal-archive-next':'classify_scope','institutional-move':'institutional_scope'}[action]||'missing_scope';
          if(failure)return reply(failure.status,{error:failure.code==='missing_scope'?scopeError:failure.code});
          if(error.response?.status===403)return reply(403,{error:scopeError});
          if(error.response?.status===404)return reply(404,{error:'not_found'});
          return reply(503,{error:'unavailable'});
        }
      }
      if(action==='start') {
        const type=body.type;
        await store.cleanup();
        const state=`${type}.${random()}`,binding=random(),nonce=random();
        const client=clientFactory(config),{codeVerifier,codeChallenge}=await client.generateCodeVerifierAsync();
        const previous=validId(jar[accountCookie(type)])?hash(jar[accountCookie(type)]):null;
        await store.put(hash(state),{version:3,type,binding:hash(binding),nonce,codeVerifier,route:routeOf(body.route),previous},Date.now()+600000);
        setCookie(res,cookieName('flow',type),binding,600);
        const authUrl=client.generateAuthUrl({scope:type==='personal'?[...SCOPES,LABEL_SCOPE,MODIFY_SCOPE]:[...SCOPES,MODIFY_SCOPE,DRIVE_METADATA_SCOPE,DRIVE_READ_SCOPE],access_type:'offline',prompt:'select_account consent',state,nonce:hash(nonce),
          code_challenge:codeChallenge,code_challenge_method:'S256',include_granted_scopes:false});
        return reply(200,{url:authUrl});
      }
      if(action==='callback') {
        const state=url.searchParams.get('state')||'',parts=state.split('.'),[type,stateId]=parts;
        if(parts.length!==2 || !TYPES.includes(type) || !validId(stateId))return finish('inicio','personal','invalid_state');
        const flow=await store.get(hash(state)),binding=jar[cookieName('flow',type)];
        if(!flow || flow.version!==3 || !validId(binding) || flow.binding!==hash(binding) || flow.type!==type)return finish('inicio',type,'invalid_state');
        const consumed=await store.take(hash(state));setCookie(res,cookieName('flow',type),'',0);
        if(!consumed)return finish('inicio',type,'invalid_state');
        if(url.searchParams.has('error'))return finish(flow.route,type,'cancelled');
        try {
          const previous=validId(jar[accountCookie(type)])?hash(jar[accountCookie(type)]):null;
          if(previous!==flow.previous)throw new Error('invalid_state');
          const current=await account(type,false);
          const code=url.searchParams.get('code');if(!code)throw new Error('failed');
          const client=clientFactory(config),{tokens}=await client.getToken({code,codeVerifier:flow.codeVerifier});
          if(!tokens.access_token || !tokens.id_token)throw new Error('failed');
          const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:config.clientId}),identity=ticket.getPayload();
          const email=validateAccount(identity,{emailAddress:identity?.email},hash(flow.nonce));
          try{authorizeEmail(email,identity.hd);}catch(error){
            if(error.message!=='access_denied')throw error;
            const deniedTicket=random(),expiresAt=Date.now()+600000;
            await store.put('denied.'+hash(deniedTicket),{email,expiresAt},expiresAt);
            setCookie(res,'__Host-farol-access-denied',deniedTicket,600);
            return finish(flow.route,type,'access_denied');
          }
          const scopes=String(tokens.scope||'').split(' '),capabilities={gmail:scopes.includes(READ_SCOPE)||scopes.includes(MODIFY_SCOPE),drive:scopes.includes(DRIVE_SCOPE),...(type==='personal'?{classify:scopes.includes(MODIFY_SCOPE)}:{manageInstitutional:scopes.includes(MODIFY_SCOPE),driveMetadata:scopes.includes(DRIVE_METADATA_SCOPE)||scopes.includes(DRIVE_READ_SCOPE),driveRead:scopes.includes(DRIVE_READ_SCOPE)})};
          client.setCredentials(tokens);
          // Confirm each granted service, without preventing basic login when a permission is declined.
          if(capabilities.gmail) {
            try {
              const {data}=await client.request({url:'https://gmail.googleapis.com/gmail/v1/users/me/profile',timeout:10000});
              if(emailOf(data.emailAddress)!==email)throw new Error('wrong_account');
            } catch(error) {
              if([400,403].includes(error.response?.status))capabilities.gmail=false;
              else throw error;
            }
          }
          if(capabilities.drive||capabilities.driveMetadata) {
            try {
              const {data}=await client.request({url:'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',timeout:10000});
              if(emailOf(data.user?.emailAddress)!==email)throw new Error('wrong_account');
            } catch(error) {
              if([400,403].includes(error.response?.status)){capabilities.drive=false;if(type==='general'){capabilities.driveMetadata=false;capabilities.driveRead=false;}}
              else throw error;
            }
          }
          const session=await auth.signIn(tokens.id_token,tokens.access_token,flow.nonce),user=session.user;
          const google=user?.identities?.find(item=>item.provider==='google' && String(item.identity_data?.sub)===String(identity.sub));
          if(!session.access_token || !session.refresh_token || !user?.id || emailOf(user.email)!==email || !google)throw new Error('failed');
          const owner=user.id;
          const labelsAllowed=capabilities.gmail && (scopes.includes(LABEL_SCOPE)||scopes.includes(MODIFY_SCOPE));
          const isAdminMailbox=email===FIXED_AUTHORIZED_EMAIL;
          const registered=isAdminMailbox?null:await store.getRegisteredUser(email);
          const general=type==='personal'&&!isAdminMailbox&&!allowsModule(registered,'pessoais')?await verifiedConnection('general'):null;
          const generalProfile=general?await store.getRegisteredUser(general.user.email):null;
          const expectedLabels=type==='general'
            ?isAdminMailbox||allowsModule(registered,'institucionais')?GENERAL_LABELS:[ANNUAL_LABEL,GENERAL_ARCHIVE_LABEL]
            :isAdminMailbox||allowsModule(registered,'pessoais')||allowsModule(generalProfile,'pessoais')?PERSONAL_LABELS:[PERSONAL_ARCHIVE_LABEL];
          const labels=await mailboxLabels(client,labelsAllowed,true,expectedLabels);
          await saveConnection(owner,type,{email,capabilities,labelsAllowed,credentials:credentialsOf(client)});
          const id=random(),expiresAt=Date.now()+TTL*1000;
          await store.put(accountKey(type,id),{version:3,type,user:{id:owner,email},hostedDomain:identity.hd,auth:{accessToken:session.access_token,refreshToken:session.refresh_token,expiresAt:Date.now()+session.expires_in*1000},expiresAt},expiresAt);
          await discardAccount(type,current);setCookie(res,accountCookie(type),id,TTL);
          // Invalidate browser-only cookies from the prototype; never adopt unowned legacy connections.
          for(const oldType of TYPES)setCookie(res,cookieName('session',oldType),'',0);
          setCookie(res,'__Host-farol-portal','',0);
          const ready=capabilities.gmail&&capabilities.drive
            &&(type==='personal'?capabilities.classify:(capabilities.manageInstitutional&&capabilities.driveMetadata&&capabilities.driveRead))
            &&labels==='ready';
          return finish(flow.route,type,ready?'connected':'partial');
        } catch(error) {
          return finish(flow.route,type,['wrong_account','login_required','invalid_state','access_setup_required','access_unavailable'].includes(error.message)?error.message:'failed');
        }
      }
      if(action==='logout'){
        await clearTemporary();
        for(const type of TYPES)await discardAccount(type,await account(type,false));
        return reply(200,{signedOut:true});
      }
      if(action==='disconnect') {
        const current=await account(body.type,false);
        if(!current)return reply(401,{error:'login_required'});
        await store.removeConnection(current.user.id,body.type);
        await discardAccount(body.type,current);
        return reply(200,{disconnected:true});
      }
      const connections={general:null,personal:null},errors={},denied={};
      const profiles={general:null,personal:null};
      for(const type of TYPES) {
        let current;
        try {
          current=await account(type);
          if(!current)continue;
          const connection=await store.getConnection(current.user.id,type);
          if(!connection || connection.email!==current.user.email)continue;
          const client=clientFactory(config);client.setCredentials(connection.credentials);
          if(connection.capabilities.gmail) {
            const {data}=await client.request({url:'https://gmail.googleapis.com/gmail/v1/users/me/profile',timeout:10000});
            if(emailOf(data.emailAddress)!==connection.email)throw new Error('wrong_account');
          }
          if(connection.capabilities.drive||connection.capabilities.driveMetadata) {
            const {data}=await client.request({url:'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',timeout:10000});
            if(emailOf(data.user?.emailAddress)!==connection.email)throw new Error('wrong_account');
          }
          const isAdminMailbox=connection.email===FIXED_AUTHORIZED_EMAIL;
          const lookup=store.getRegisteredUser(connection.email);
          const registered=isAdminMailbox?await lookup.catch(()=>null):await lookup;
          const canListLabels=isAdminMailbox||(type==='general'?allowsModule(registered,'institucionais')
            :allowsModule(registered,'pessoais')||allowsModule(profiles.general,'pessoais'));
          const labelDetails=canListLabels&&type==='general'?await mailboxLabels(client,connection.labelsAllowed===true,false,GENERAL_LABELS,true):null;
          const labels=canListLabels?(labelDetails?.status||await mailboxLabels(client,connection.labelsAllowed===true)):'pending_policy';
          connection.credentials=credentialsOf(client);
          await store.putConnection(current.user.id,type,connection);
          connections[type]={email:connection.email,...connection.capabilities,labels,...(labelDetails?{labelDetails}:{})};
          profiles[type]=registered;
        } catch(error) {
          if(error.message==='access_denied'){errors[type]='access_denied';denied[type]=error.email;continue;}
          if(['access_setup_required','access_unavailable'].includes(error.message)){errors[type]=error.message;continue;}
          const googleError=error.response?.data?.error;
          if(error.response?.status===401 || googleError==='invalid_grant' || error.message==='wrong_account') {
            if(current){await store.removeConnection(current.user.id,type);await discardAccount(type,current);}
            errors[type]='reconnect';
          } else errors[type]='unavailable';
        }
      }
      const mode=connections.general?(connections.personal?'both':'general'):(connections.personal?'personal':'none');
      const bothAdmin=TYPES.every(type=>connections[type]?.email===FIXED_AUTHORIZED_EMAIL);
      const occurrencesOnly=!bothAdmin&&connections.personal?.email===FIXED_AUTHORIZED_EMAIL&&!profileForModule(profiles,'inspetores-monitores');
      const access=!bothAdmin&&(profiles.general||profiles.personal||occurrencesOnly)
        ?{generalUser:publicProfile(profiles.general),...(profiles.personal?{institutionalUser:publicProfile(profiles.personal)}:{}),
          settingsUser:publicProfile(profileForModule(profiles,'configuracoes')),
          occurrencesUser:publicProfile(profileForModule(profiles,'inspetores-monitores')),
          ...await moduleConnections(profiles,connections,false,occurrencesOnly)}
        :{modules:modulesFor(null,connections)};
      const activeSearchConsultOnly=!bothAdmin&&connections.personal?.email===FIXED_AUTHORIZED_EMAIL&&!profileForModule(profiles,'radar');
      return reply(200,{configured:true,mode,connections,errors,...access,...(activeSearchConsultOnly?{activeSearchConsultOnly:true}:{}),...(Object.keys(denied).length?{denied}:{})});
    } catch(error) {
      // Do not log OAuth exceptions; they may contain credentials, codes or tokens.
      if(action==='callback')return finish('inicio','personal','unavailable');
      if(['invalid_page','access_setup_required','access_unavailable','login_required','invalid_temporary_user','temporary_rate_limit','temporary_invalid_credentials','temporary_password_confirmation','temporary_password_length','temporary_confirmation_required','temporary_password_already_set'].includes(error.message))
        return reply(error.status||503,{error:error.message});
      return reply(503,{configured:true,error:'unavailable'});
    }
  };
}
module.exports={GENERAL_LABELS,makeHandler,configuration,seal,unseal,validateAccount,makeStore,makeAuth,SCOPES,READ_SCOPE,DRIVE_SCOPE,DRIVE_METADATA_SCOPE,DRIVE_READ_SCOPE,LABEL_SCOPE,MODIFY_SCOPE,PERSONAL_LABELS};
