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
test('sem sessão o conteúdo fica oculto e Entrar com Google abre o fluxo pessoal',async()=>{
 const h=ui({configured:true,user:null,connections:{general:null,personal:null}});await settle();
 assert.equal(h.get('#main').hidden,true);
 assert.equal(h.connect[0].disabled,true);
 assert.equal(h.connect[1].hidden,true);
 h.get('#portal-login').listeners.click();
 assert.ok(h.get('#email-connection-description').innerHTML.includes('<strong>Farol GE</strong>'));
 assert.ok(h.get('#email-connection-description').innerHTML.includes('conta Google da pessoa'));
 await h.get('#email-connection-continue').listeners.click();
 assert.equal(JSON.parse(h.requests.at(-1).opts.body).type,'personal');
 assert.ok(h.window.destination.startsWith('https://accounts.google.com/'));
});
test('usuário identificado vê Radar e permissões reais de Gmail e Drive',async()=>{
 const h=ui({configured:true,user:{id:'u1',email:'person@gmail.com'},canConnectGeneral:true,connections:{general:{email:'escola@escola.pr.gov.br',gmail:true,drive:true},personal:{email:'person@gmail.com',gmail:true,drive:false}}});await settle();
 assert.equal(h.get('#main').hidden,false);
 assert.ok(h.get('#main').innerHTML.includes('ANÁLISES'));
 assert.ok(h.get('#email-personal-status').textContent.includes('person@gmail.com'));
 assert.ok(h.get('#email-personal-status').textContent.includes('Drive: não autorizado'));
 h.connect[0].listeners.click();
 assert.equal(h.get('#email-connection-description').innerHTML,'Esta conexão será usada para integração entre o <strong>Farol GE</strong> e a conta INSTITUCIONAL do colégio.');
 await h.get('#email-connection-continue').listeners.click();
 assert.equal(JSON.parse(h.requests.at(-1).opts.body).type,'general');
});
test('endereço isolado sem identidade de usuário não libera conteúdo nem conexão',async()=>{
 const h=ui({configured:true,user:null,connections:{personal:{email:'someone@gmail.com',gmail:true,drive:true}}});await settle();
 assert.equal(h.get('#main').hidden,true);
 assert.equal(h.get('#email-personal-status').textContent,'NÃO conectado');
});
test('configuração ausente mantém entrada indisponível sem simular login',async()=>{
 const h=ui();await settle();
 assert.equal(h.get('#portal-login').disabled,true);
 assert.equal(h.get('#main').hidden,true);
});
