'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {recordAccess}=require('../api/access-log.js');
const {describeDevice}=require('../server/request-network.cjs');

const env={
  FAROL_ORIGIN:'https://farol.example',
  FAROL_SUPABASE_URL:'https://database.example',
  FAROL_SUPABASE_SERVICE_ROLE_KEY:'test-only'
};

async function request({method='POST',headers={},ok=true}={}){
  const calls=[];
  const response={setHeader(){},status(code){this.code=code;return this;},end(){}};
  await recordAccess({
    method,headers:{origin:env.FAROL_ORIGIN,'x-farol-request':'1',...headers},
    body:{IP:'198.51.100.9',movimento:'Falso',data:'2000-01-01'}
  },response,env,async(url,options)=>{
    calls.push({url,options});
    return {ok};
  });
  return {code:response.code,calls};
}

test('acesso registra o IP observado, categorias gerais de equipamento e cidade e estado aproximados',async()=>{
  const result=await request({headers:{
    'x-vercel-forwarded-for':'2001:db8::1',
    'x-forwarded-for':'198.51.100.8',
    'x-vercel-ip-city':'S%C3%A3o%20Paulo',
    'x-vercel-ip-country-region':'SP',
    'user-agent':'Sentinela (Linux; Android 10; ModeloPrivado) Chrome/143.0 Mobile Safari/537.36'
  }});
  assert.equal(result.code,204);
  assert.equal(result.calls[0].url,'https://database.example/rest/v1/LogDoSistema');
  assert.deepEqual(JSON.parse(result.calls[0].options.body),{
    IP:'2001:db8::1',Observacao:'Celular · Android · Chrome · Local aproximado: São Paulo/SP'
  });
  assert.equal(result.calls[0].options.headers.Prefer,'return=minimal');
});

test('registra a UF disponível quando o cabeçalho da cidade é inválido',async()=>{
  const result=await request({headers:{
    'x-vercel-forwarded-for':'192.0.2.7',
    'x-vercel-ip-city':'%00',
    'x-vercel-ip-country-region':'SC'
  }});
  assert.deepEqual(JSON.parse(result.calls[0].options.body),{IP:'192.0.2.7',Observacao:'Local aproximado: SC'});
});

test('bloqueia origens externas e GET, e trata IP desconhecido ou falha de gravação',async()=>{
  assert.deepEqual(await request({headers:{origin:'https://another.example'}}),{code:403,calls:[]});
  assert.deepEqual(await request({method:'GET'}),{code:405,calls:[]});
  const result=await request({headers:{'x-forwarded-for':'invalid'},ok:false});
  assert.equal(result.code,503);
  assert.deepEqual(JSON.parse(result.calls[0].options.body),{IP:null,Observacao:null});
});

test('distingue Edge no computador de Safari no tablet',()=>{
  assert.equal(describeDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/143 Safari/537 Edg/143'),'Computador · Windows · Edge');
  assert.equal(describeDevice('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1'),'Tablet · iPadOS · Safari');
});

test('página registra uma abertura e atualizar IP não envia outro registro',async()=>{
  const requests=[],events={},button={addEventListener(name,fn){events[name]=fn;}},label={};
  vm.runInNewContext(fs.readFileSync('network.js','utf8'),{
    window:{addEventListener(name,fn){events[name]=fn;}},
    document:{getElementById:id=>id==='network-ip'?label:button},AbortSignal,
    fetch:async(url,options)=>{
      requests.push({url,options});
      if(url==='/api/access-log')throw Error('storage failed');
      return {ok:true,json:async()=>({ip:'192.0.2.7'})};
    }
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(label.textContent,'IP público: 192.0.2.7');
  await events.click();
  await events.online();
  assert.deepEqual(requests.map(item=>item.url),['/api/access-log','/api/network','/api/network','/api/network']);
});
