'use strict';
const crypto = require('node:crypto');
const {handleDemands}=require('./demands.cjs');
const {OAuth2Client} = require('google-auth-library');
const READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const LABEL_SCOPE = 'https://www.googleapis.com/auth/gmail.labels';
const PERSONAL_LABELS = ['1-ME DEVEM','2-MINHAS','3-DEVO','9-Classificado'];
const LABEL_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/labels';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const SCOPES = ['openid','email','profile',READ_SCOPE,DRIVE_SCOPE];
const ROUTES = new Set(['inicio','radar','institucionais','pessoais','bi-seed','configuracoes']);
const TYPES = ['general','personal'];
const TTL = 30 * 24 * 3600;
const random = () => crypto.randomBytes(32).toString('base64url');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const routeOf = value => ROUTES.has(value) ? value : 'inicio';
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
      throw new Error(table==='farol_personal_demands' && ['42P01','PGRST205'].includes(code)?'setup_required':'storage_unavailable');
    }
    return response.status===204 || !prefer?.includes('representation')?null:response.json();
  }
  const sessions=(...args)=>call('farol_google_sessions',...args);
  const connectionId=(owner,type)=>`connection.${owner}.${type}`;
  const query=(owner,type)=>`owner_id=eq.${encodeURIComponent(owner)}&type=eq.${type}`;
  const decode=row=>row && Date.parse(row.expires_at)>Date.now()?unseal(row.payload,config.key,row.id):null;
  return {
    async get(id) {const rows=await sessions('GET',`id=eq.${id}&select=id,payload,expires_at`,null,'return=representation');return decode(rows[0]);},
    async take(id) {const rows=await sessions('DELETE',`id=eq.${id}`,null,'return=representation');return decode(rows[0]);},
    async put(id,value,expiresAt) {await sessions('POST','on_conflict=id',{id,payload:seal(value,config.key,id),expires_at:new Date(expiresAt).toISOString()},'resolution=merge-duplicates,return=minimal');},
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
// GET status only checks labels. Only the personal OAuth callback may create them.
async function personalLabels(client,allowed,create=false) {
  if(!allowed)return 'permission_required';
  const list=async()=>{
    const {data}=await client.request({url:LABEL_URL,timeout:10000});
    if(data.labels!==undefined && !Array.isArray(data.labels))throw new Error('invalid_labels');
    return new Set((data.labels||[]).map(label=>label.name));
  };
  try {
    let names=await list();
    for(const name of PERSONAL_LABELS) {
      if(names.has(name))continue;
      if(!create)return 'missing';
      try {
        await client.request({url:LABEL_URL,method:'POST',data:{name,labelListVisibility:'labelShow',messageListVisibility:'show'},timeout:10000});
        names.add(name);
      } catch(error) {
        // Another callback can create the same name while this one is running.
        if(![400,409].includes(error.response?.status))throw error;
        names=await list();
        if(!names.has(name))throw error;
      }
    }
    // Confirm the result instead of inferring success from POST responses.
    names=await list();
    return PERSONAL_LABELS.every(name=>names.has(name))?'ready':'missing';
  } catch {return 'unavailable';}
}
function makeHandler({env=process.env,storeFactory=makeStore,authFactory=makeAuth,clientFactory=c=>new OAuth2Client(c.clientId,c.clientSecret,`${c.origin}/api/google/callback`)}={}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
    const url=new URL(req.url,'https://farol.invalid'),action=url.pathname.split('/').pop(),config=configuration(env);
    const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    if(!['status','start','callback','disconnect','logout','board','thread','demand','inbox','classified','classify'].includes(action))return reply(404,{error:'not_found'});
    const expected=['start','disconnect','logout','demand','classify'].includes(action)?'POST':'GET';
    if(req.method!==expected){res.setHeader('Allow',expected);return reply(405,{error:'method_not_allowed'});}
    if(!config)return reply(action==='status'?200:503,{configured:false,mode:'none',connections:{general:null,personal:null},error:'not_configured'});
    if(expected==='POST' && (req.headers.origin!==config.origin || req.headers['x-farol-request']!=='1'))return reply(403,{error:'forbidden'});
    const jar=cookies(req),store=storeFactory(config),auth=authFactory(config);
    const finish=(route,type,result)=>{res.statusCode=303;res.setHeader('Location',`${config.origin}/?connection=${result}&mailbox=${type}#${routeOf(route)}`);res.end();};
    let body={};
    if(expected==='POST') {
      if(!String(req.headers['content-type']||'').startsWith('application/json'))return reply(415,{error:'invalid_body'});
      try {body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{return reply(400,{error:'invalid_body'});}
      if(!body || typeof body!=='object' || Array.isArray(body))return reply(400,{error:'invalid_body'});
      if(action!=='logout' && !TYPES.includes(body.type))return reply(400,{error:'invalid_type'});
    }
    async function account(type) {
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
    try {
      if(['board','thread','demand','inbox','classified','classify'].includes(action)) {
        try {
          const current=await account('personal');
          if(!current)return reply(401,{error:'login_required'});
          const connection=await store.getConnection(current.user.id,'personal');
          if(!connection || connection.email!==current.user.email || !connection.capabilities.gmail)return reply(403,{error:'missing_scope'});
          const client=clientFactory(config);client.setCredentials(connection.credentials);
          const result=await handleDemands({action,url,body,client,store,owner:current.user.id,email:current.user.email,canClassify:connection.capabilities.classify===true});
          // Credential caching must not turn an already committed demand into a false failure.
          // The stored refresh token remains available for the next request.
          try {await store.putConnection(current.user.id,'personal',{...connection,credentials:credentialsOf(client)});}catch{}
          return reply(200,result);
        } catch(error) {
          const known=['account_changed','invalid_demand','invalid_column','invalid_page','invalid_thread','not_found','conflict','invalid_provider','invalid_classification','classify_scope','labels_missing','not_inbox','classification_unconfirmed'];
          if(known.includes(error.message))return reply(error.status,{error:error.message});
          if(error.message==='setup_required')return reply(503,{error:'setup_required'});
          if(error.response?.status===401 || error.response?.data?.error==='invalid_grant')return reply(401,{error:'login_required'});
          if(error.response?.status===403)return reply(403,{error:action==='classify'?'classify_scope':'missing_scope'});
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
        const authUrl=client.generateAuthUrl({scope:type==='personal'?[...SCOPES,LABEL_SCOPE,MODIFY_SCOPE]:SCOPES,access_type:'offline',prompt:'select_account consent',state,nonce:hash(nonce),
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
          const current=await account(type);
          const code=url.searchParams.get('code');if(!code)throw new Error('failed');
          const client=clientFactory(config),{tokens}=await client.getToken({code,codeVerifier:flow.codeVerifier});
          if(!tokens.access_token || !tokens.id_token)throw new Error('failed');
          const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:config.clientId}),identity=ticket.getPayload();
          const email=validateAccount(identity,{emailAddress:identity?.email},hash(flow.nonce));
          const scopes=String(tokens.scope||'').split(' '),capabilities={gmail:scopes.includes(READ_SCOPE)||scopes.includes(MODIFY_SCOPE),drive:scopes.includes(DRIVE_SCOPE),...(type==='personal'?{classify:scopes.includes(MODIFY_SCOPE)}:{})};
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
          if(capabilities.drive) {
            try {
              const {data}=await client.request({url:'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',timeout:10000});
              if(emailOf(data.user?.emailAddress)!==email)throw new Error('wrong_account');
            } catch(error) {
              if([400,403].includes(error.response?.status))capabilities.drive=false;
              else throw error;
            }
          }
          const session=await auth.signIn(tokens.id_token,tokens.access_token,flow.nonce),user=session.user;
          const google=user?.identities?.find(item=>item.provider==='google' && String(item.identity_data?.sub)===String(identity.sub));
          if(!session.access_token || !session.refresh_token || !user?.id || emailOf(user.email)!==email || !google)throw new Error('failed');
          const owner=user.id;
          const labelsAllowed=type==='personal' && capabilities.gmail && (scopes.includes(LABEL_SCOPE)||scopes.includes(MODIFY_SCOPE));
          const labels=type==='personal'?await personalLabels(client,labelsAllowed,true):undefined;
          await saveConnection(owner,type,{email,capabilities,labelsAllowed,credentials:credentialsOf(client)});
          const id=random(),expiresAt=Date.now()+TTL*1000;
          await store.put(accountKey(type,id),{version:3,type,user:{id:owner,email},auth:{accessToken:session.access_token,refreshToken:session.refresh_token,expiresAt:Date.now()+session.expires_in*1000},expiresAt},expiresAt);
          await discardAccount(type,current);setCookie(res,accountCookie(type),id,TTL);
          // Invalidate browser-only cookies from the prototype; never adopt unowned legacy connections.
          for(const oldType of TYPES)setCookie(res,cookieName('session',oldType),'',0);
          setCookie(res,'__Host-farol-portal','',0);
          return finish(flow.route,type,capabilities.gmail && capabilities.drive && (type!=='personal' || (labels==='ready' && capabilities.classify))?'connected':'partial');
        } catch(error) {
          return finish(flow.route,type,['wrong_account','login_required','invalid_state'].includes(error.message)?error.message:'failed');
        }
      }
      if(action==='logout'){
        for(const type of TYPES)await discardAccount(type,await account(type));
        return reply(200,{signedOut:true});
      }
      if(action==='disconnect') {
        const current=await account(body.type);
        if(!current)return reply(401,{error:'login_required'});
        await store.removeConnection(current.user.id,body.type);
        await discardAccount(body.type,current);
        return reply(200,{disconnected:true});
      }
      const connections={general:null,personal:null},errors={};
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
          if(connection.capabilities.drive) {
            const {data}=await client.request({url:'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',timeout:10000});
            if(emailOf(data.user?.emailAddress)!==connection.email)throw new Error('wrong_account');
          }
          const labels=type==='personal'?await personalLabels(client,connection.labelsAllowed===true):undefined;
          connection.credentials=credentialsOf(client);
          await store.putConnection(current.user.id,type,connection);
          connections[type]={email:connection.email,...connection.capabilities,...(type==='personal'?{labels}:{})};
        } catch(error) {
          const googleError=error.response?.data?.error;
          if(error.response?.status===401 || googleError==='invalid_grant' || error.message==='wrong_account') {
            if(current){await store.removeConnection(current.user.id,type);await discardAccount(type,current);}
            errors[type]='reconnect';
          } else errors[type]='unavailable';
        }
      }
      const mode=connections.general?(connections.personal?'both':'general'):(connections.personal?'personal':'none');
      return reply(200,{configured:true,mode,connections,errors});
    } catch {
      // Do not log OAuth exceptions; they may contain credentials, codes or tokens.
      if(action==='callback')return finish('inicio','personal','unavailable');
      return reply(503,{configured:true,error:'unavailable'});
    }
  };
}
module.exports={makeHandler,configuration,seal,unseal,validateAccount,makeStore,makeAuth,SCOPES,READ_SCOPE,DRIVE_SCOPE,LABEL_SCOPE,MODIFY_SCOPE,PERSONAL_LABELS};
