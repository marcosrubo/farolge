const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function ui(status={configured:false,connections:{general:null,personal:null}}){
 const nodes=new Map();
 const make=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,classList:{toggle(){}},listeners:{},focus(){},addEventListener(name,fn){this.listeners[name]=fn;},showModal(){this.open=true;}});
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
test('sem conexão há dois botões independentes e nenhum login separado',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null}});await settle();
 assert.equal(h.get('#main').hidden,false);
 for(const button of h.connect){
  assert.equal(button.disabled,false);assert.equal(button.hidden,false);
  button.listeners.click();
  await h.get('#email-connection-continue').listeners.click();
  assert.equal(JSON.parse(h.requests.at(-1).opts.body).type,button.dataset.connectEmail);
  assert.ok(h.window.destination.startsWith('https://accounts.google.com/'));
 }
 const html=fs.readFileSync('index.html','utf8');
 assert.ok(!html.includes('portal-login'));assert.ok(!html.includes('Entrar no FAROL GE'));
});
for(const mode of ['general','personal','both'])test('conexões verificadas: '+mode,async()=>{
 const connections={
  general:mode!=='personal'?{email:'escola@escola.pr.gov.br',gmail:true,drive:true}:null,
  personal:mode!=='general'?{email:'person@gmail.com',gmail:true,drive:false}:null
 };
 const h=ui({configured:true,mode,connections});await settle();
 assert.equal(h.get('#main').hidden,false);
 assert.ok(h.get('#main').innerHTML.includes('ANÁLISES'));
 for(const type of ['general','personal']){
  assert.equal(h.get('#email-'+type+'-status').textContent.includes('NÃO conectado'),!connections[type]);
  assert.equal(h.get('[data-disconnect-email="'+type+'"]').hidden,!connections[type]);
 }
 if(connections.personal)assert.ok(h.get('#email-personal-status').textContent.includes('Drive: não autorizado'));
 for(const [route,type] of [['institucionais','general'],['pessoais','personal'],['demandas','personal']]){
  h.context.location.hash='#'+route;h.window.listeners.hashchange();
  assert.equal(h.get('#main').hidden,false);
 }
});
test('Geral abre escolha no Google sem endereço pré-configurado',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null}});await settle();
 assert.equal(h.connect[0].disabled,false);assert.equal(h.connect[1].disabled,false);
 h.connect[0].listeners.click();
 assert.ok(h.get('#email-connection-description').innerHTML.includes('Escolha no Google a conta geral da sua escola'));
 await h.get('#email-connection-continue').listeners.click();
 assert.equal(JSON.parse(h.requests.at(-1).opts.body).type,'general');
 assert.ok(!h.get('#email-connection-feedback').textContent.includes('configurado'));
});
test('configuração ausente mantém ambas indisponíveis sem simular conexão',async()=>{
 const h=ui();await settle();
 assert.ok(h.connect.every(button=>button.disabled));assert.equal(h.get('#main').hidden,false);
});
test('explicações e Radar ficam disponíveis em todos os módulos sem conexão',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null}});await settle();
 for(const route of ['inicio','radar','institucionais','pessoais','bi-seed','configuracoes']){
  h.context.location.hash='#'+route;h.window.listeners.hashchange();
  assert.equal(h.get('#main').hidden,false);
  assert.ok(h.get('#main').innerHTML.includes(route==='radar'?'ANÁLISES':route==='pessoais'?'Demandas PESSOAIS':route==='institucionais'?'Demandas INSTITUCIONAIS':'em Desenvolvimento'));
 }
 assert.ok(!fs.readFileSync('index.html','utf8').includes('<main hidden'));
 assert.equal(h.get('#email-general-status').textContent,'NÃO conectado');
 assert.equal(h.get('#email-personal-status').textContent,'NÃO conectado');
});
test('desconectar Geral preserva Pessoal e a explicação do módulo',async()=>{
 const status={configured:true,connections:{general:{email:'school@example.com',gmail:true,drive:true},personal:{email:'person@gmail.com',gmail:true,drive:true}}};
 const h=ui(status);await settle();
 h.context.location.hash='#institucionais';h.window.listeners.hashchange();
 assert.equal(h.get('#main').hidden,false);
 status.connections.general=null;
 await h.disconnect[0].listeners.click();
 assert.equal(h.get('#main').hidden,false);
 assert.ok(h.get('#email-personal-status').textContent.includes('person@gmail.com'));
 assert.equal(JSON.parse(h.requests.find(r=>r.url.endsWith('/disconnect')).opts.body).type,'general');
});

test('diálogo explica criação de labels somente em Pessoal',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null}});await settle();
 h.connect[1].listeners.click();assert.equal(h.get('#email-connection-labels').hidden,false);
 h.connect[0].listeners.click();assert.equal(h.get('#email-connection-labels').hidden,true);
 assert.ok(fs.readFileSync('index.html','utf8').includes('2-MINHAS'));
});
for(const [labels,expected] of [['ready','labels prontas (3/3)'],['missing','labels incompletas'],['permission_required','autorize o gerenciamento'],['unavailable','não foi possível verificar']])test('situação real das labels: '+labels,async()=>{
 const h=ui({configured:true,connections:{personal:{email:'person@gmail.com',gmail:true,drive:true,labels}}});await settle();
 assert.ok(h.get('#email-personal-status').textContent.includes(expected));
});

test('diálogo GERAL explica marcadores e alcance da escrita antes do consentimento',async()=>{
 const h=ui({configured:true,connections:{general:{email:'school@example.com',gmail:true,drive:true,manageInstitutional:true,labels:'ready'},personal:null}});await settle();
 h.connect[0].listeners.click();assert.equal(h.get('#email-general-labels').hidden,false);assert.equal(h.get('#email-connection-labels').hidden,true);
 assert.ok(h.get('#email-general-status').textContent.includes('Classificadas e Arquivadas prontas'));
 assert.ok(h.get('#email-general-status').textContent.includes('Classificação: autorizada'));
 h.connect[1].listeners.click();assert.equal(h.get('#email-general-labels').hidden,true);assert.equal(h.get('#email-connection-labels').hidden,false);
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.includes('A data limite, o e-mail da conta GERAL e a chave da mensagem'));
});
