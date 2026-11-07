'use strict';
const crypto = require('node:crypto');
const {OAuth2Client} = require('google-auth-library');
const DOMAIN = 'escola.pr.gov.br';
const READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const ROUTES = new Set(['inicio','radar','institucionais','pessoais','bi-seed','configuracoes']);
const TYPES = ['general','personal'];
const TTL = 30 * 24 * 3600;
const random = () => crypto.randomBytes(32).toString('base64url');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const routeOf = value => ROUTES.has(value) ? value : 'inicio';
const cookieName = (kind,type) => `__Host-farol-${kind}-${type}`;
const validId = value => typeof value === 'string' && /^[\w-]{43}$/.test(value);
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(value => value.trim().split('=')).filter(pair => pair.length === 2));
}
function setCookie(res,name,value,age) {
  const previous = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie',[...previous,`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`]);
}
function configuration(env) {
  const names=['FAROL_ORIGIN','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','FAROL_TOKEN_KEY','FAROL_SUPABASE_URL','FAROL_SUPABASE_SERVICE_ROLE_KEY','FAROL_GENERAL_EMAIL','FAROL_ALLOWED_PERSONAL_EMAILS'];
  if(env.FAROL_GOOGLE_ENABLED !== 'true' || names.some(name => !env[name]))return null;
  try {
    const origin=new URL(env.FAROL_ORIGIN);
    const storage=new URL(env.FAROL_SUPABASE_URL);
    const key=Buffer.from(env.FAROL_TOKEN_KEY,'base64');
    const general=env.FAROL_GENERAL_EMAIL.trim().toLowerCase();
    const personal=env.FAROL_ALLOWED_PERSONAL_EMAILS.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    const institutional=value=>/^[^@\s]+@escola\.pr\.gov\.br$/.test(value);
    if(origin.protocol!=='https:' || origin.pathname!=='/' || origin.search || origin.hash || origin.username || origin.password || storage.protocol!=='https:' || storage.username || storage.password || storage.search || storage.hash || storage.pathname!=='/' || key.length!==32 || !institutional(general) || !personal.length || !personal.every(institutional))return null;
    return {origin:origin.origin,storage:storage.origin,key,clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET,serviceKey:env.FAROL_SUPABASE_SERVICE_ROLE_KEY,general,personal};
  } catch {return null;}
}
function seal(data,key,id) {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(id));
  const body=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}
function unseal(value,key,id) {
  const bytes=Buffer.from(value,'base64url');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));
}
function makeStore(config,fetcher=fetch) {
  async function call(method,query,body,prefer) {
    const response=await fetcher(`${config.storage}/rest/v1/farol_google_sessions?${query}`,{
      method,headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json',Prefer:prefer||'return=minimal'},
      body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)throw new Error('storage_unavailable');
    return response.status===204 || !prefer?.includes('representation')?null:response.json();
  }
  const decode=row=>row && Date.parse(row.expires_at)>Date.now()?unseal(row.payload,config.key,row.id):null;
  return {
    async get(id) {const rows=await call('GET',`id=eq.${id}&select=id,payload,expires_at`,null,'return=representation');return decode(rows[0]);},
    async take(id) {const rows=await call('DELETE',`id=eq.${id}`,null,'return=representation');return decode(rows[0]);},
    async put(id,value,expiresAt) {await call('POST','on_conflict=id',{id,payload:seal(value,config.key,id),expires_at:new Date(expiresAt).toISOString()},'resolution=merge-duplicates,return=minimal');},
    async remove(id) {await call('DELETE',`id=eq.${id}`);},
    async cleanup() {await call('DELETE',`expires_at=lt.${encodeURIComponent(new Date().toISOString())}`);}
  };
}
function validateAccount(identity,profile,type,config,nonce) {
  const email=String(profile.emailAddress||'').toLowerCase();
  if(!identity || identity.email_verified!==true || identity.hd!==DOMAIN || identity.nonce!==nonce || !identity.sub || String(identity.email).toLowerCase()!==email || !email.endsWith('@'+DOMAIN))throw new Error('wrong_account');
  if(type==='general' && email!==config.general)throw new Error('wrong_account');
  if(type==='personal' && !config.personal.includes(email))throw new Error('not_allowed');
  return email;
}
function makeHandler({env=process.env,storeFactory=makeStore,clientFactory=c=>new OAuth2Client(c.clientId,c.clientSecret,`${c.origin}/api/google/callback`)}={}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');
    const url=new URL(req.url,'https://farol.invalid');
    const action=url.pathname.split('/').pop();
    const config=configuration(env);
    const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    if(!['status','start','callback','disconnect'].includes(action))return reply(404,{error:'not_found'});
    const expected=['start','disconnect'].includes(action)?'POST':'GET';
    if(req.method!==expected){res.setHeader('Allow',expected);return reply(405,{error:'method_not_allowed'});}
    if(!config)return reply(action==='status'?200:503,{configured:false,connections:{general:null,personal:null},error:'not_configured'});
    // Starts and disconnects must originate on this exact deployment origin.
    if(expected==='POST' && (req.headers.origin!==config.origin || req.headers['x-farol-request']!=='1'))return reply(403,{error:'forbidden'});
    const jar=cookies(req);
    const store=storeFactory(config);
    const client=clientFactory(config);
    const finish=(route,type,result)=>{
      res.statusCode=303;
      res.setHeader('Location',`${config.origin}/?connection=${result}&mailbox=${type}#${routeOf(route)}`);
      res.end();
    };
    let body={};
    if(expected==='POST') {
      if(!String(req.headers['content-type']||'').startsWith('application/json'))return reply(415,{error:'invalid_body'});
      try {body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{return reply(400,{error:'invalid_body'});}
      if(!TYPES.includes(body.type))return reply(400,{error:'invalid_type'});
    }
    try {
      if(action==='start') {
        await store.cleanup();
        const type=body.type;
        const state=`${type}.${random()}`;
        const binding=random();
        const nonce=random();
        const {codeVerifier,codeChallenge}=await client.generateCodeVerifierAsync();
        // Separate cookies/state for each mailbox, with one-use server-side state.
        await store.put(hash(state),{type,binding:hash(binding),nonce,codeVerifier,route:routeOf(body.route)},Date.now()+600000);
        setCookie(res,cookieName('flow',type),binding,600);
        const authUrl=client.generateAuthUrl({scope:['openid','email',READ_SCOPE],access_type:'offline',prompt:'select_account consent',state,nonce,hd:DOMAIN,
          ...(type==='general'?{login_hint:config.general}:{}),code_challenge:codeChallenge,code_challenge_method:'S256',include_granted_scopes:false});
        return reply(200,{url:authUrl});
      }
      if(action==='callback') {
        const state=url.searchParams.get('state')||'';
        const [type,stateId]=state.split('.');
        if(!TYPES.includes(type) || !validId(stateId))return finish('inicio','personal','invalid_state');
        const flow=await store.get(hash(state));
        const binding=jar[cookieName('flow',type)];
        if(!flow || !validId(binding) || flow.binding!==hash(binding) || flow.type!==type)return finish('inicio',type,'invalid_state');
        const consumed=await store.take(hash(state));
        setCookie(res,cookieName('flow',type),'',0);
        if(!consumed)return finish('inicio',type,'invalid_state');
        if(url.searchParams.has('error'))return finish(flow.route,type,'cancelled');
        try {
          const code=url.searchParams.get('code');
          if(!code)throw new Error('failed');
          const {tokens}=await client.getToken({code,codeVerifier:flow.codeVerifier});
          if(!tokens.access_token || !tokens.id_token || !String(tokens.scope||'').split(' ').includes(READ_SCOPE))throw new Error('missing_scope');
          const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:config.clientId});
          client.setCredentials(tokens);
          const {data:profile}=await client.request({url:'https://gmail.googleapis.com/gmail/v1/users/me/profile',timeout:10000});
          const email=validateAccount(ticket.getPayload(),profile,type,config,flow.nonce);
          const sessionId=random();
          const expiresAt=Date.now()+TTL*1000;
          const credentials={access_token:client.credentials.access_token,expiry_date:client.credentials.expiry_date,refresh_token:client.credentials.refresh_token};
          await store.put(hash(`${type}.${sessionId}`),{type,email,credentials,expiresAt},expiresAt);
          const previous=jar[cookieName('session',type)];
          if(validId(previous))await store.remove(hash(`${type}.${previous}`));
          setCookie(res,cookieName('session',type),sessionId,TTL);
          return finish(flow.route,type,'connected');
        } catch(error) {
          const result=['wrong_account','not_allowed','missing_scope'].includes(error.message)?error.message:'failed';
          return finish(flow.route,type,result);
        }
      }
      if(action==='disconnect') {
        const type=body.type;
        const id=jar[cookieName('session',type)];
        if(validId(id))await store.remove(hash(`${type}.${id}`));
        setCookie(res,cookieName('session',type),'',0);
        // Do not revoke Google's whole application grant: it may serve the other mailbox too.
        return reply(200,{disconnected:true});
      }
      const connections={general:null,personal:null};
      const errors={};
      for(const type of TYPES) {
        const id=jar[cookieName('session',type)];
        if(!validId(id))continue;
        const key=hash(`${type}.${id}`);
        const session=await store.get(key);
        if(!session || session.type!==type) {setCookie(res,cookieName('session',type),'',0);continue;}
        const permitted=type==='general'?session.email===config.general:config.personal.includes(session.email);
        if(!permitted){await store.remove(key);setCookie(res,cookieName('session',type),'',0);continue;}
        try {
          client.setCredentials(session.credentials);
          const {data:profile}=await client.request({url:'https://gmail.googleapis.com/gmail/v1/users/me/profile',timeout:10000});
          if(profile.emailAddress.toLowerCase()!==session.email)throw new Error('wrong_account');
          session.credentials={access_token:client.credentials.access_token,refresh_token:client.credentials.refresh_token,expiry_date:client.credentials.expiry_date};
          await store.put(key,session,session.expiresAt);
          connections[type]={email:session.email};
        } catch(error) {
          const status=error.response?.status;
          const googleError=error.response?.data?.error;
          if(status===401 || googleError==='invalid_grant' || error.message==='wrong_account') {
            await store.remove(key);setCookie(res,cookieName('session',type),'',0);errors[type]='reconnect';
          } else {errors[type]='unavailable';}
        }
      }
      return reply(200,{configured:true,connections,errors});
    } catch {
      // Never log OAuth errors: library exceptions may contain tokens or authorization codes.
      if(action==='callback')return finish('inicio','personal','unavailable');
      return reply(503,{configured:true,error:'unavailable'});
    }
  };
}
module.exports={makeHandler,configuration,seal,unseal,validateAccount,makeStore};
