const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const adminEmail='marcos.rubo@gmail.com';
const adminModules=['inicio','radar','inspetores-monitores','bi-seed','manutencao-sistema','configuracoes','institucionais','pessoais'];
function ui(status={configured:false,connections:{general:null,personal:null}},search='',modules={}){
 const nodes=new Map();
 const make=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,classList:{toggle(){}},listeners:{},focus(){},addEventListener(name,fn){this.listeners[name]=fn;},showModal(){this.open=true;},close(){this.open=false;}});
 const get=selector=>{if(!nodes.has(selector))nodes.set(selector,make());return nodes.get(selector);};
 const connect=['general','personal'].map(type=>Object.assign(get(`[data-connect-email="${type}"]`),{dataset:{connectEmail:type}}));
 const disconnect=['general','personal'].map(type=>Object.assign(get(`[data-disconnect-email="${type}"]`),{dataset:{disconnectEmail:type}}));
 const requests=[];
 const window={FAROL_CONFIG:{schoolName:'Escola',schoolInitials:'E'},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},location:{assign(url){window.destination=url;}},history:{replaceState(){}},scrollTo(){}};
 Object.assign(window,modules);
 const context=vm.createContext({window,document:{querySelector:get,querySelectorAll:s=>s==='[data-connect-email]'?connect:s==='[data-disconnect-email]'?disconnect:[]},location:{hash:'#radar',search,pathname:'/'},URL,URLSearchParams,setTimeout:()=>1,clearTimeout(){},fetch:async(url,opts)=>{requests.push({url,opts});return {ok:true,json:async()=>url.endsWith('/start')?{url:'https://accounts.google.com/o/oauth2/v2/auth?state=fake'}:url.endsWith('/access-denied')?{email:status.claimEmail}:status};}});
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
  general:mode!=='personal'?{email:adminEmail,gmail:true,drive:true}:null,
  personal:mode!=='general'?{email:adminEmail,gmail:true,drive:false}:null
 };
 const h=ui({configured:true,mode,connections,modules:mode==='both'?adminModules:['bi-seed']});await settle();
 assert.equal(h.get('#main').hidden,false);
 assert.equal(h.get('#main').innerHTML.includes('Módulo indisponível'),mode!=='both');
 assert.ok(h.get('#navigation').innerHTML.includes('#inspetores-monitores'));
 for(const type of ['general','personal']){
  assert.equal(h.get('#email-'+type+'-status').textContent.includes('NÃO conectado'),!connections[type]);
  assert.equal(h.get('[data-disconnect-email="'+type+'"]').hidden,!connections[type]);
 }
 if(connections.personal)assert.ok(h.get('#email-personal-status').textContent.includes('Drive: não autorizado'));
 for(const [route,type] of [['institucionais','general'],['pessoais','personal'],['demandas','personal']]){
  h.context.location.hash='#'+route;h.window.listeners.hashchange();
  assert.equal(h.get('#main').hidden,false);
  assert.equal(h.get('#main').innerHTML.includes('board'),mode==='both');
 }
});
test('Geral indica a conta exclusiva de Marcos',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null}});await settle();
 assert.equal(h.connect[0].disabled,false);assert.equal(h.connect[1].disabled,false);
 h.connect[0].listeners.click();
 assert.ok(h.get('#email-connection-description').textContent.includes(adminEmail));
 await h.get('#email-connection-continue').listeners.click();
 assert.equal(JSON.parse(h.requests.at(-1).opts.body).type,'general');
 assert.ok(!h.get('#email-connection-feedback').textContent.includes('configurado'));
});
test('configuração ausente mantém ambas indisponíveis sem simular conexão',async()=>{
 const h=ui();await settle();
 assert.ok(h.connect.every(button=>button.disabled));assert.equal(h.get('#main').hidden,false);
 h.context.location.hash='#bi-seed';h.window.listeners.hashchange();
 assert.ok(h.get('#main').innerHTML.includes('indicadores/resumos do BI'));
});
test('sem identificação, hashes diretos não abrem módulos restritos',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null},modules:[]});await settle();
 for(const route of ['inicio','radar','analise-faltas','institucionais','pessoais','inspetores-monitores','configuracoes']){
  h.context.location.hash='#'+route;h.window.listeners.hashchange();
  assert.ok(h.get('#main').innerHTML.includes('Módulo indisponível'));
  assert.ok(h.get('#navigation').innerHTML.includes('href="#bi-seed"'));
  assert.equal((h.get('#navigation').innerHTML.match(/<a /g)||[]).length,8);
 }
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

test('diálogo separa marcadores da Pessoal e da Geral',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null}});await settle();
 h.connect[1].listeners.click();assert.equal(h.get('#email-connection-labels').hidden,false);
 h.connect[0].listeners.click();assert.equal(h.get('#email-connection-labels').hidden,true);
 assert.ok(fs.readFileSync('index.html','utf8').includes('GE_MINHAS'));
});
for(const [labels,expected] of [['ready','labels prontas (4/4)'],['missing','labels incompletas'],['permission_required','autorize o gerenciamento'],['unavailable','não foi possível verificar']])test('situação real das labels: '+labels,async()=>{
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

test('status GERAL mostra exatamente quais marcadores estão faltando',async()=>{
 const h=ui({configured:true,connections:{general:{email:'school@example.com',gmail:true,drive:true,manageInstitutional:true,labels:'missing',labelDetails:{missing:['Arquivadas']}},personal:null}});await settle();
 assert.ok(h.get('#email-general-status').textContent.includes('Faltam marcadores: Arquivadas'));
 assert.ok(!h.get('#email-general-status').textContent.includes('revise a autorização'));
});


test('Manutenção recebe somente a conexão Geral e informa seu escopo no diálogo',async()=>{
 const general={email:adminEmail,driveMetadata:true},personal={email:adminEmail,drive:true};
 const h=ui({configured:true,connections:{general,personal},modules:adminModules}),received=[];
 h.window.FarolMaintenance={connectionChanged:value=>received.push(value),mount:()=>received.push('mounted'),unmount(){}};
 await settle();assert.equal(received.at(-1),general);
 h.context.location.hash='#manutencao-sistema';h.window.listeners.hashchange();
 assert.ok(h.get('#main').innerHTML.includes('maintenance-board'));assert.ok(received.includes('mounted'));
 h.connect[0].listeners.click();assert.equal(h.get('#email-drive-metadata').hidden,false);
 h.connect[1].listeners.click();assert.equal(h.get('#email-drive-metadata').hidden,true);
});

test('menu posiciona Inspetores antes de Radar e monta módulo de alunos',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null},temporary:{id:'u',name:'Sandra'},modules:['inspetores-monitores','radar','bi-seed']});await settle();
 const nav=h.get('#navigation').innerHTML;assert.ok(nav.indexOf('href="#inspetores-monitores"')<nav.indexOf('href="#radar"'));
 let mounted=false;h.window.FarolStudents={unmount(){},mount(){mounted=true;}};
 h.context.location.hash='#inspetores-monitores';h.window.listeners.hashchange();assert.equal(mounted,true);assert.ok(h.get('#main').innerHTML.includes('students-board'));
});

test('conta negada mostra mensagem e WhatsApp com e-mail verificado, sem abrir conversa automaticamente',async()=>{
 const denied='denied+test@example.com';const h=ui({configured:true,connections:{general:null,personal:null},claimEmail:denied},'?connection=access_denied&email=forged@example.com');await settle();
 assert.equal(h.get('#access-denied-dialog').open,true);assert.equal(h.get('#access-denied-email').textContent,denied);
 const link=new URL(h.get('#access-denied-support').href);assert.equal(link.origin,'https://wa.me');assert.equal(link.pathname,'/5543999525060');assert.equal(link.searchParams.get('text'),'Preciso de ajuda para acessar o FarolGE. O e-mail da tentativa foi '+denied);assert.equal(h.window.destination,undefined);
 assert.ok(fs.readFileSync('index.html','utf8').includes('Usuários cadastrados podem se identificar pela Conexão temporária.'));
 assert.ok(fs.readFileSync('index.html','utf8').includes('id="access-denied-cancel"'));assert.ok(!h.requests.some(r=>r.url.includes('wa.me')));
 h.get('#access-denied-dialog').close();const count=h.requests.length;assert.equal(h.get('#access-denied-dialog').open,false);assert.equal(h.requests.length,count);
});
test('retirada de permissão limpa somente a conexão negada e ignora respostas de uma conta anterior',async()=>{
 const status={configured:true,connections:{general:{email:'school@example.com',gmail:true},personal:{email:'personal@example.com',gmail:true}}};
 const h=ui(status);await settle();const cleared=[];h.window.FarolOverview={connectionChanged:(type,value)=>cleared.push({type,value})};
 h.window.FarolAccessDenied({error:'access_denied',type:'general',email:'old@example.com'});assert.equal(h.get('#access-denied-dialog').open,undefined);
 h.window.FarolAccessDenied({error:'access_denied',type:'general',email:'school@example.com'});assert.equal(h.get('#access-denied-dialog').open,true);assert.deepEqual(cleared,[{type:'general',value:null}]);assert.ok(h.get('#email-personal-status').textContent.includes('personal@example.com'));
});


test('módulo de alunos anterior em cache não bloqueia conexões Google',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null}},'',{FarolStudents:{connectionChanged(){},unmount(){}}});
 await settle();
 for(const button of h.connect){
  assert.equal(button.disabled,false);
  button.listeners.click();
  await h.get('#email-connection-continue').listeners.click();
  assert.ok(h.window.destination.startsWith('https://accounts.google.com/'));
 }
});


test('Radar abre análise de faltas mantendo menu Radar selecionado e propaga somente a Geral',async()=>{
 const received=[],mounted=[];const app={unmount(){},mount(el){mounted.push(el);},connectionChanged(value){received.push(value);}};
 const h=ui({configured:true,connections:{general:null,personal:null},school:{email:adminEmail},temporary:{id:'u',name:'Sandra'},modules:['inspetores-monitores','radar','bi-seed']},'',{FarolAttendanceAnalysis:app});await settle();
 assert.ok(h.get('#main').innerHTML.includes('href="#analise-faltas"'));assert.equal(received.at(-1).email,adminEmail);
 h.context.location.hash='#analise-faltas';h.window.listeners.hashchange();assert.ok(h.get('#main').innerHTML.includes('attendance-analysis-board'));assert.equal(mounted.length,1);assert.equal(h.get('#breadcrumb-title').textContent,'Radar / Análise de faltas');
});

test('Conexão temporária verifica a senha ao selecionar e permite criar e alterar senha',async()=>{
 const nodes=new Map(),requests=[];
 const node=()=>{
  const item={value:'',hidden:false,textContent:'',open:false,options:[],listeners:{},
   addEventListener(name,fn){this.listeners[name]=fn;},append(option){this.options.push(option);},
   replaceChildren(){this.options=[];this.value='';},showModal(){this.open=true;},focus(){}
  };
  item.close=()=>{item.open=false;item.listeners.close?.();};
  return item;
 };
 const get=name=>{if(!nodes.has(name))nodes.set(name,node());return nodes.get(name);};
 get('form').reset=()=>{
  for(const name of ['password','confirmation','current'])get(name).value='';
  get('show-password').checked=false;
 };
 const togglePassword=checked=>{
  get('show-password').checked=checked;
  get('show-password').listeners.change();
 };
 const window={reloaded:0,FarolRefreshConnections(){this.reloaded++;},FarolAuthorizedUsers:{refreshes:0,refresh(){this.refreshes++;}}};
 const profile={id:'12345678-1234-4234-8234-123456789abc',name:'Adriana'};
 let hasPassword=false,canCreatePassword=false,activationConflict=false;
 const fetch=async(url,opts)=>{
  requests.push({url,opts});
  if(activationConflict&&url.endsWith('/temporary-activate'))return {ok:false,json:async()=>({error:'temporary_password_already_set'})};
  const result=url.endsWith('/temporary-users')?{users:[profile]}:url.includes('/temporary-user?')?{...profile,hasPassword,canCreatePassword}:url.endsWith('/temporary-activate')?{passwordSaved:true}:{signedIn:true};
  return {ok:true,json:async()=>result};
 };
 const context=vm.createContext({window,URLSearchParams,fetch,document:{querySelector:s=>get(s.replace('#temporary-','')),createElement:node}});
 vm.runInContext(fs.readFileSync('temporary-access.js','utf8'),context);
 window.FarolTemporaryAccess.update(null,true);
 get('open').listeners.click();await settle();
 assert.equal(get('users').options[0].textContent,'Adriana');
 get('users').value=profile.id;
 await get('choose').listeners.click();
 assert.equal(get('title').textContent,'Primeiro acesso');
 assert.equal(get('form').hidden,true);
 assert.equal(get('feedback').textContent,'O cadastro ainda está sem senha.');
 canCreatePassword=true;
 await get('choose').listeners.click();
 assert.equal(get('title').textContent,'Criar senha');
 assert.equal(get('password').minLength,6);
 assert.equal(get('confirm-field').hidden,false);
 window.FarolTemporaryAccess.enroll(profile);
 assert.match(get('feedback').textContent,/confirmado/);
 get('password').value='uma senha longa de teste';
 const assertMismatch=async()=>{
  const before=requests.length;
  get('confirmation').value='uma senha diferente';
  await get('form').listeners.submit({preventDefault(){}});
  assert.equal(requests.length,before);
  assert.equal(get('feedback').textContent,'As duas senhas precisam ser iguais.');
  get('confirmation').value=get('password').value;
  get('confirmation').listeners.input();
  assert.equal(get('feedback').textContent,'');
 };
 await assertMismatch();
 assert.equal(get('password').type,'password');
 togglePassword(true);
 assert.equal(get('password').type,'text');
 assert.equal(get('confirmation').type,'text');
 assert.equal(get('password').value,'uma senha longa de teste');
 await get('form').listeners.submit({preventDefault(){}});
 assert.ok(requests.at(-1).url.endsWith('/temporary-activate'));
 assert.equal(JSON.parse(requests.at(-1).opts.body).id,profile.id);
 assert.equal(get('password').value,'');
 assert.equal(get('password').type,'password');
 assert.equal(get('show-password').checked,false);
 assert.equal(window.reloaded,0);
 assert.equal(window.FarolAuthorizedUsers.refreshes,1);
 assert.match(get('status').textContent,/Senha cadastrada/);
 activationConflict=true;
 window.FarolTemporaryAccess.enroll(profile);
 get('password').value='uma senha longa de teste';
 get('confirmation').value=get('password').value;
 await get('form').listeners.submit({preventDefault(){}});
 assert.equal(get('dialog').open,false);
 assert.equal(window.FarolAuthorizedUsers.refreshes,2);
 assert.match(get('status').textContent,/senha já está cadastrada/);
 hasPassword=true;
 get('open').listeners.click();await settle();get('users').value=profile.id;
 await get('choose').listeners.click();
 assert.equal(get('title').textContent,'Entrar');
 assert.equal(get('confirm-field').hidden,true);
 togglePassword(true);
 assert.equal(get('password').type,'text');
 assert.equal(get('change').hidden,true);
 window.FarolTemporaryAccess.update(profile,true);
 assert.equal(get('change').hidden,false);
 get('change').listeners.click();
 assert.equal(get('confirmation-label').textContent,'Confirme a nova senha');
 assert.equal(get('current-field').hidden,false);
 assert.equal(get('password').minLength,6);
 assert.equal(get('current').type,'password');
 togglePassword(true);
 assert.equal(get('current').type,'text');
 togglePassword(false);
 assert.equal(get('current').type,'password');
 get('current').value='uma senha longa de teste';
 assert.equal(get('password-match').textContent,'');
 get('password').value='outra senha longa de teste';
 get('password').listeners.input();
 assert.equal(get('password-match').textContent,'Senhas DIFERENTES');
 assert.match(get('password-match').className,/is-different/);
 await assertMismatch();
 assert.equal(get('password-match').textContent,'Senhas IGUAIS');
 assert.match(get('password-match').className,/is-equal/);
 get('password').value+='!';
 get('password').listeners.input();
 assert.equal(get('password-match').textContent,'Senhas DIFERENTES');
 get('confirmation').value=get('password').value;
 get('confirmation').listeners.input();
 assert.equal(get('password-match').textContent,'Senhas IGUAIS');
 await get('form').listeners.submit({preventDefault(){}});
 assert.ok(requests.at(-1).url.endsWith('/temporary-password'));
 assert.ok(Object.hasOwn(JSON.parse(requests.at(-1).opts.body),'currentPassword'));
});


test('Visão GERAL exige clique no menu e permissão ativa',async()=>{
 const status={configured:true,connections:{general:null,personal:null},modules:['inicio','bi-seed'],temporary:{id:'adriana',name:'Adriana'}};
 const h=ui(status);await settle();
 h.context.location.hash='';h.window.listeners.hashchange();
 assert.ok(!h.get('#main').innerHTML.includes('overview-board'));
 h.context.location.hash='#inicio';h.window.listeners.hashchange();
 assert.ok(!h.get('#main').innerHTML.includes('overview-board'));
 const click=()=>h.get('#navigation').listeners.click({target:{closest:()=>({})}});
 click();
 assert.ok(h.get('#main').innerHTML.includes('overview-board'));
 status.modules=['bi-seed'];
 await h.window.FarolRefreshConnections();
 assert.ok(h.get('#main').innerHTML.includes('Módulo indisponível'));
 click();
 assert.ok(!h.get('#main').innerHTML.includes('overview-board'));
});

test('Configurações temporárias exibem apenas os acessos do próprio cadastro',async()=>{
 const received=[];
 const h=ui({configured:true,connections:{general:null,personal:null},modules:['configuracoes','radar'],
  temporary:{id:'temp-user',name:'Pessoa fictícia'}},'',{
  FarolAuthorizedUsers:{mount(){received.push('mount');},unmount(){},connectionChanged(){}}
 });
 await settle();
 h.context.location.hash='#configuracoes';h.window.listeners.hashchange();
 const panel=h.get('#authorized-users-board').innerHTML;
 assert.ok(panel.includes('Meus acessos'));
 assert.ok(panel.includes('Radar — Habilitado'));
 assert.ok(panel.includes('Visão GERAL — Não habilitado'));
 assert.deepEqual(received,[]);
});
