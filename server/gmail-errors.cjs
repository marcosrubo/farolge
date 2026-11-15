'use strict';
// Only stable error codes are inspected; never expose/log raw provider responses.
function gmailFailure(error){
  const status=error.response?.status;
  const details=error.response?.data?.error;
  const reasons=(details?.errors||[]).map(item=>item.reason);
  const limited=status===429||details?.status==='RESOURCE_EXHAUSTED'||reasons.some(reason=>['rateLimitExceeded','userRateLimitExceeded','dailyLimitExceeded','quotaExceeded'].includes(reason));
  if(limited)return {status:503,code:'gmail_rate_limit',retry:!reasons.includes('dailyLimitExceeded')};
  if(status===403){
    if(reasons.some(reason=>['insufficientPermissions','insufficientAuthenticationScopes'].includes(reason)))return {status:403,code:'missing_scope',retry:false};
    if(reasons.includes('domainPolicy'))return {status:403,code:'gmail_domain_policy',retry:false};
    return {status:503,code:'unavailable',retry:false};
  }
  if([500,502,503,504].includes(status)||['ETIMEDOUT','ECONNRESET','ECONNABORTED'].includes(error.code))return {status:503,code:'unavailable',retry:true};
  return null;
}
async function readGmail(client,options,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
  for(let attempt=0;attempt<2;attempt++){
    try{return await client.request({...options,method:'GET',retry:false});}
    catch(error){
      if(attempt||!gmailFailure(error)?.retry)throw error;
      await wait(1000);
    }
  }
}
module.exports={gmailFailure,readGmail};
