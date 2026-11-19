'use strict';
const {createHash,createHmac,randomBytes,scrypt,timingSafeEqual}=require('node:crypto');
const {isIP}=require('node:net');
const {promisify}=require('node:util');
const {validUserId}=require('./authorized-users.cjs');

const SESSION_COOKIE='__Host-farol-temporary';
const SESSION_SECONDS=8*3600;
const ENROLLMENT_COOKIE='__Host-farol-enrollment';
const ENROLLMENT_SECONDS=600;
const SECRET_PATTERN=/^[A-Za-z0-9_-]{43}$/;
const derive=promisify(scrypt);
const options={N:2**17,r:8,p:1,maxmem:160*1024*1024};
const fail=(message,status)=>{throw Object.assign(new Error(message),{status});};
const digest=value=>createHash('sha256').update(value).digest('hex');
const temporarySessionKey=token=>'temporary.'+digest(token);
function matches(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  const first=Buffer.from(a),second=Buffer.from(b);
  return first.length===second.length&&timingSafeEqual(first,second);
}
const acceptablePassword=value=>typeof value==='string'&&Buffer.byteLength(value)<=512;
async function passwordHash(password){
  const salt=randomBytes(16);
  const proof=await derive(password,salt,32,options);
  return 'scrypt-v1:'+salt.toString('base64url')+':'+proof.toString('base64url');
}
async function verifyPassword(password,stored){
  if(!acceptablePassword(password)||!stored)return false;
  const [version,salt,proof]=stored.split(':');
  if(version!=='scrypt-v1'||!/^[A-Za-z0-9_-]{22}$/.test(salt)||!SECRET_PATTERN.test(proof))return false;
  const result=await derive(password,Buffer.from(salt,'base64url'),32,options);
  return matches(result.toString('base64url'),proof);
}
function newPassword(body){
  const {password,confirmation}=body;
  if(!acceptablePassword(password)||[...password].length<6)fail('temporary_password_length',400);
  if(password!==confirmation)fail('temporary_password_confirmation',400);
  return password;
}
async function readTemporarySession(store,token){
  if(typeof token!=='string'||!SECRET_PATTERN.test(token))return null;
  const session=await store.get(temporarySessionKey(token));
  if(!session||session.expiresAt<=Date.now()||!validUserId(session.id))return null;
  const profile=await store.getTemporaryUser(session.id);
  if(!profile?.password_hash||!matches(digest(profile.password_hash),session.passwordVersion))return null;
  return {profile,expiresAt:session.expiresAt};
}
async function writeTemporarySession(store,profile){
  const token=randomBytes(32).toString('base64url');
  const expiresAt=Date.now()+SESSION_SECONDS*1000;
  await store.put(temporarySessionKey(token),{id:profile.id,passwordVersion:digest(profile.password_hash),expiresAt},expiresAt);
  return token;
}
async function confirmEnrollment(store,id){
  if(!validUserId(id))fail('invalid_temporary_user',400);
  const token=randomBytes(32).toString('base64url');
  if(!await store.issueTemporaryActivation(id,digest(token),new Date(Date.now()+ENROLLMENT_SECONDS*1000).toISOString()))
    fail('temporary_activation_unavailable',409);
  return token;
}
function canEnroll(profile,enrollment){
  return profile.password_hash===null&&typeof enrollment==='string'&&SECRET_PATTERN.test(enrollment)
    &&matches(digest(enrollment),profile.activation_hash)&&Date.parse(profile.activation_expires_at)>Date.now();
}
async function resetTemporaryPassword(store,body){
  if(!validUserId(body.id)||Object.keys(body).some(key=>!['type','id','password','confirmation'].includes(key)))
    fail('invalid_temporary_user',400);
  const password=newPassword(body);
  const profile=await store.getTemporaryUser(body.id);
  if(!profile?.password_hash)fail('temporary_reset_unavailable',409);
  const stored=await passwordHash(password);
  if(!await store.changeTemporaryPassword(body.id,profile.password_hash,stored))fail('temporary_reset_unavailable',409);
}
async function authenticateTemporary({action,store,body,current,request,key,enrollment}){
  if(action==='temporary-password'&&!current)fail('login_required',401);
  const id=current?.profile.id;
  const target=action==='temporary-password'?id:body.id;
  if(!validUserId(target))fail('invalid_temporary_user',400);
  const raw=request.headers['x-vercel-forwarded-for'];
  const candidate=typeof raw==='string'?raw.split(',')[0].trim():'';
  const source=createHmac('sha256',key).update(isIP(candidate)?candidate:'indisponivel').digest('hex');
  if(await store.allowTemporaryAttempt(target,source)!==true)fail('temporary_rate_limit',429);
  const profile=action==='temporary-password'?current.profile:await store.getTemporaryUser(target);
  if(!profile)fail('temporary_invalid_credentials',401);

  if(action==='temporary-activate'){
    if(profile.password_hash)fail('temporary_password_already_set',409);
    if(!canEnroll(profile,enrollment))fail('temporary_confirmation_required',403);
    const stored=await passwordHash(newPassword(body));
    if(!await store.activateTemporaryUser(target,profile.activation_hash,stored)){
      const latest=await store.getTemporaryUser(target);
      if(latest?.password_hash)fail('temporary_password_already_set',409);
      fail('temporary_confirmation_required',403);
    }
    return {...profile,password_hash:stored};
  }
  const password=action==='temporary-password'?body.currentPassword:body.password;
  if(!await verifyPassword(password,profile.password_hash))fail('temporary_invalid_credentials',401);
  if(action!=='temporary-password')return profile;

  const stored=await passwordHash(newPassword(body));
  if(!await store.changeTemporaryPassword(target,profile.password_hash,stored))fail('temporary_invalid_credentials',401);
  return {...profile,password_hash:stored};
}

module.exports={
  SESSION_COOKIE,SESSION_SECONDS,ENROLLMENT_COOKIE,ENROLLMENT_SECONDS,
  temporarySessionKey,readTemporarySession,writeTemporarySession,confirmEnrollment,canEnroll,resetTemporaryPassword,authenticateTemporary
};
