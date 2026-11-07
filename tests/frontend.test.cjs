const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function ui(status={configured:false,connections:{general:null,personal:null}}){
 const nodes=new Map();
 const make=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,classList:{toggle(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},showModal(){this.open=true;}});
 const get=selector=>{if(!nodes.has(selector))nodes.set(selector,make());return nodes.get(selector);};
 const connect=['general','personal'].map(type=>Object.assign(get(`[data-connect-email="${type}"]`),{dataset:{connectEmail:type}}));
 const disconnect=['general','personal'].map(type=>Object.assign(get(`[data-disconnect-email="${type}"]`),{dataset:{disconnectEmail:type}}));
 const requests=[];
 const window={FAROL_CONFIG:{schoolName:'Escola',schoolInitials:'E'},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},location:{assign(url){window.destination=url;}},history:{replaceState(){}},scrollTo(){}};
 const context=vm.createContext({window,document:{querySelector:get,querySelectorAll:s=>s==='[data-connect-email]'?connect:s==='[data-disconnect-email]'?disconnect:[]},location:{hash:'#radar',search:'',pathname:'/'},URL,URLSearchParams,fetch:async(url,opts)=>{requests.push({url,opts});return {ok:true,json:async()=>url.endsWith('/start')?{url:'https://accounts.google.com/o/oauth2/v2/auth?state=fake'}:status};}});
 vm.runInContext(fs.readFileSync('app.js','utf8'),context);
 return {get,connect,disconnect,requests,window,context};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('diálogos usam os novos textos com Farol GE em negrito e preservam Radar',async()=>{
 const h=ui();await settle();
 h.connect[0].listeners.click();
 assert.equal(h.get('#email-connection-description').innerHTML,'Esta conexão será usada para integração entre o <strong>Farol GE</strong> e a conta INSTITUCIONAL do colégio.');
 h.connect[1].listeners.click();
 assert.ok(h.get('#email-connection-description').innerHTML.includes('conta INSTITUCIONAL da pessoa que estiver utilizando a aplicação.'));
 assert.equal(h.get('#email-connection-continue').hidden,true);
 assert.ok(h.get('#main').innerHTML.includes('ANÁLISES'));
});
test('mostra endereço confirmado e envia a caixa correta ao iniciar OAuth',async()=>{
 const h=ui({configured:true,connections:{general:{email:'escola@escola.pr.gov.br'},personal:null}});await settle();
 assert.equal(h.get('#email-general-status').textContent,'escola@escola.pr.gov.br');
 assert.equal(h.get('#email-personal-status').textContent,'NÃO conectado');
 assert.equal(h.disconnect[0].hidden,false);
 h.connect[1].listeners.click();
 assert.equal(h.get('#email-connection-continue').hidden,false);
 await h.get('#email-connection-continue').listeners.click();
 assert.equal(JSON.parse(h.requests.at(-1).opts.body).type,'personal');
 assert.ok(h.window.destination.startsWith('https://accounts.google.com/'));
});
