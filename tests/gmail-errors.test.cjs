'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {gmailFailure,readGmail}=require('../server/gmail-errors.cjs');
const error=(status,reason)=>Object.assign(new Error('private provider message'),{response:{status,data:{error:{errors:reason?[{reason}]:[]}}}});
test('403 por limite é diferente de escopo, política de domínio e motivo desconhecido',()=>{
 for(const reason of ['rateLimitExceeded','userRateLimitExceeded','quotaExceeded'])assert.deepEqual(gmailFailure(error(403,reason)),{status:503,code:'gmail_rate_limit',retry:true});
 assert.equal(gmailFailure(error(403,'dailyLimitExceeded')).retry,false);
 assert.equal(gmailFailure(error(429)).code,'gmail_rate_limit');
 assert.equal(gmailFailure(error(403,'insufficientPermissions')).code,'missing_scope');
 assert.equal(gmailFailure(error(403,'domainPolicy')).code,'gmail_domain_policy');
 assert.equal(gmailFailure(error(403)).code,'unavailable');
 assert.equal(gmailFailure(error(401)),null);
});
test('repete somente leitura transitória uma vez, após espera mínima de um segundo',async()=>{
 const waits=[],calls=[];let count=0;
 const client={async request(options){calls.push(options);if(count++===0)throw error(403,'userRateLimitExceeded');return {data:{id:'m1'}};}};
 const result=await readGmail(client,{url:'https://gmail.googleapis.com/gmail/v1/users/me/messages/m1'},async ms=>waits.push(ms));
 assert.equal(result.data.id,'m1');assert.deepEqual(waits,[1000]);assert.equal(calls.length,2);assert.ok(calls.every(c=>c.method==='GET'&&c.retry===false));
});
test('não insiste em falta de permissão e não repete indefinidamente falhas transitórias',async()=>{
 let calls=0;const client={async request(){calls++;throw error(403,'insufficientPermissions');}};
 await assert.rejects(readGmail(client,{},async()=>assert.fail('must not wait')));assert.equal(calls,1);
 calls=0;client.request=async()=>{calls++;throw error(503);};
 await assert.rejects(readGmail(client,{},async()=>{}));assert.equal(calls,2);
});
