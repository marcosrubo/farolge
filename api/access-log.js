'use strict';
const {publicIP,describeDevice,approximateLocation}=require('../server/request-network.cjs');

function httpsOrigin(value){
  try{
    const url=new URL(value);
    if(url.protocol==='https:'&&url.pathname==='/'&&!url.username&&!url.password&&!url.search&&!url.hash)return url.origin;
  }catch{}
  return null;
}

module.exports=function accessLog(req,res){
  return recordAccess(req,res,process.env,fetch);
};

async function recordAccess(req,res,env,fetcher){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).end();
  }

  const origin=httpsOrigin(env.FAROL_ORIGIN),storage=httpsOrigin(env.FAROL_SUPABASE_URL);
  const serviceKey=env.FAROL_SUPABASE_SERVICE_ROLE_KEY;
  if(!origin||!storage||!serviceKey)return res.status(503).end();
  if(req.headers.origin!==origin||req.headers['x-farol-request']!=='1')return res.status(403).end();

  try{
    const ip=publicIP(req.headers);
    const location=ip?approximateLocation(req.headers):null;
    const observation=[describeDevice(req.headers['user-agent']),location&&'Local aproximado: '+location].filter(Boolean).join(' · ');
    const response=await fetcher(storage+'/rest/v1/LogDoSistema',{
      method:'POST',
      headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({IP:ip,Observacao:observation||null}),
      signal:AbortSignal.timeout(5000)
    });
    return res.status(response.ok?204:503).end();
  }catch{
    return res.status(503).end();
  }
}

module.exports.recordAccess=recordAccess;
