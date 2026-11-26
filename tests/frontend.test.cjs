const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const adminEmail='marcos.rubo@gmail.com';
const adminModules=['inicio','radar','inspetores-monitores','bi-seed','manutencao-sistema','configuracoes','institucionais','pessoais','arquivo-morto'];
function ui(status={configured:false,connections:{general:null,personal:null}},search='',modules={}){
 const nodes=new Map();
 const make=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,classList:{toggle(){}},listeners:{},focus(){document.activeElement=this;},contains(node){return node===this;},addEventListener(name,fn){this.listeners[name]=fn;},showModal(){this.open=true;},close(){this.open=false;}});
 const get=selector=>{if(!nodes.has(selector))nodes.set(selector,make());return nodes.get(selector);};
 const connect=['general','personal'].map(type=>Object.assign(get(`[data-connect-email="${type}"]`),{dataset:{connectEmail:type}}));
 const disconnect=['general','personal'].map(type=>Object.assign(get(`[data-disconnect-email="${type}"]`),{dataset:{disconnectEmail:type}}));
 const requests=[],timers=new Map();
 let nextTimer=0;
 const window={FAROL_CONFIG:{schoolName:'Escola',schoolInitials:'E'},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},location:{assign(url){window.destination=url;}},history:{replaceState(){}},scrollTo(){}};
 Object.assign(window,modules);
 const document={querySelector:get,querySelectorAll:s=>s==='[data-connect-email]'?connect:s==='[data-disconnect-email]'?disconnect:[]};
 const context=vm.createContext({window,document,location:{hash:'#radar',search,pathname:'/'},URL,URLSearchParams,setTimeout:(callback,delay)=>{timers.set(++nextTimer,{callback,delay});return nextTimer;},clearTimeout:id=>timers.delete(id),fetch:async(url,opts)=>{requests.push({url,opts});if(url.endsWith('/status')&&typeof status==='function')return status();return {ok:true,json:async()=>url.endsWith('/start')?{url:'https://accounts.google.com/o/oauth2/v2/auth?state=fake'}:url.endsWith('/access-denied')?{email:status.claimEmail}:status};}});
 vm.runInContext(fs.readFileSync('app.js','utf8'),context);
 return {get,connect,disconnect,requests,window,context,timers};
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
test('Geral indica contas institucionais e a conta de Marcos',async()=>{
 const h=ui({configured:true,connections:{general:null,personal:null}});await settle();
 assert.equal(h.connect[0].disabled,false);assert.equal(h.connect[1].disabled,false);
 h.connect[0].listeners.click();
 assert.ok(h.get('#email-connection-description').textContent.includes(adminEmail));
 assert.ok(h.get('#email-connection-description').textContent.includes('@escola.pr.gov.br'));
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
 for(const route of ['inicio','radar','analise-faltas','busca-ativa','institucionais','pessoais','inspetores-monitores','configuracoes']){
  h.context.location.hash='#'+route;h.window.listeners.hashchange();
  assert.match(h.get('#main').innerHTML,/<section class="development-content module-unavailable"[^>]*><h1[^>]*>[^<]+<\/h1><h2>Módulo indisponível/);
  assert.ok(h.get('#navigation').innerHTML.includes('href="#bi-seed"'));
  assert.equal((h.get('#navigation').innerHTML.match(/<a /g)||[]).length,9);
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
for(const [labels,expected] of [['ready','Marcadores prontos'],['missing','Marcadores incompletos'],['permission_required','Autorize o gerenciamento'],['unavailable','Não foi possível verificar']])test('situação real das labels: '+labels,async()=>{
 const h=ui({configured:true,connections:{personal:{email:'person@gmail.com',gmail:true,drive:true,labels}}});await settle();
 assert.ok(h.get('#email-personal-status').textContent.includes(expected));
});

test('diálogo GERAL explica marcadores e alcance da escrita antes do consentimento',async()=>{
 const h=ui({configured:true,connections:{general:{email:'school@example.com',gmail:true,drive:true,manageInstitutional:true,labels:'ready'},personal:null}});await settle();
 h.connect[0].listeners.click();assert.equal(h.get('#email-general-labels').hidden,false);assert.equal(h.get('#email-connection-labels').hidden,true);
 assert.ok(h.get('#email-general-status').textContent.includes('Marcadores prontos'));
 assert.ok(h.get('#email-general-status').textContent.includes('Classificação: autorizada'));
 h.connect[1].listeners.click();assert.equal(h.get('#email-general-labels').hidden,true);assert.equal(h.get('#email-connection-labels').hidden,false);
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.includes('verificamos GE_Anuais e GE_ArquivoMorto_Geral e criamos os que faltarem'));
 assert.ok(html.includes('A conexão Pessoal verifica GE_ArquivoMorto_Pessoal'));
 assert.ok(html.includes('guarda o prazo ou as observações e o e-mail da conta GERAL de forma criptografada'));
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

test('ao reabrir, uma falha transitória é seguida de nova verificação da sessão temporária',async()=>{
 const temporary={id:'u',name:'Pessoa fictícia',expiresAt:Date.now()+20000};
 const status={configured:true,connections:{general:null,personal:null},temporary,modules:['radar','bi-seed']};
 const applied=[];
 let fail=true;
 const h=ui(()=>({ok:!fail,json:async()=>fail?{error:'unavailable'}:status}),'',
  {FarolTemporaryAccess:{update:(user,configured)=>applied.push({user,configured})}});
 await settle();
 assert.deepEqual(applied.at(-1),{user:null,configured:false});
 assert.match(h.get('#temporary-status').textContent,/verificar/);
 assert.equal(h.requests.length,1);
 const retry=[...h.timers.values()].find(timer=>timer.delay===1500);
 assert.ok(retry);
 fail=false;
 retry.callback();await settle();
 assert.deepEqual(applied.at(-1),{user:temporary,configured:true});
 assert.equal(h.requests.length,2);
 assert.equal(h.get('#temporary-status').textContent,'');
 assert.ok(h.requests.every(request=>request.url.endsWith('/status')&&request.opts.method==='GET'&&request.opts.credentials==='same-origin'));
 await h.window.listeners.online();
 h.window.listeners.pageshow({persisted:false});
 assert.equal(h.requests.length,3);
 h.window.listeners.pageshow({persisted:true});await settle();
 assert.equal(h.requests.length,4);
 assert.deepEqual(applied.at(-1),{user:temporary,configured:true});
});

test('validade longa da Conexão temporária não excede o limite do temporizador do navegador',async()=>{
 const temporary={id:'u',name:'Monitor fictício',expiresAt:Date.now()+365*86400000};
 const h=ui({configured:true,connections:{general:null,personal:null},temporary,modules:['radar','bi-seed']});
 await settle();
 const timer=[...h.timers.values()].at(-1);
 assert.equal(timer.delay,2**31-1);
 timer.callback();await settle();
 assert.equal(h.requests.length,1);
 assert.equal([...h.timers.values()].at(-1).delay,2**31-1);
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
  const result=url.endsWith('/temporary-users')?{users:[profile]}:url.includes('/temporary-user?')?{...profile,hasPassword,canCreatePassword}:['/temporary-activate','/temporary-reset-password'].some(action=>url.endsWith(action))?{passwordSaved:true}:{signedIn:true};
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
 assert.equal(get('password-label').textContent,'Nova senha (mínimo de 6 caracteres)');
 assert.equal(get('confirmation-label').textContent,'Confirme a nova senha (mínimo de 6 caracteres)');
 assert.equal(get('current-field').hidden,false);
 assert.equal(get('password').minLength,6);
 assert.equal(get('current').type,'password');
 togglePassword(true);
 assert.equal(get('current').type,'text');
 togglePassword(false);
 assert.equal(get('current').type,'password');
 get('current').value='uma senha longa de teste';
 assert.equal(get('password-match').textContent,'');
 assert.equal(get('password-length').textContent,'');
 get('password').value='😀😀😀😀😀';
 get('password').listeners.input();
 assert.equal(get('password-length').textContent,'senha inválida');
 assert.match(get('password-length').className,/is-different/);
 get('password').value='outra senha longa de teste';
 get('password').listeners.input();
 assert.equal(get('password-match').textContent,'Senhas DIFERENTES');
 assert.match(get('password-match').className,/is-different/);
 assert.equal(get('password-length').textContent,'senha válida');
 assert.match(get('password-length').className,/is-equal/);
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

 window.FarolTemporaryAccess.resetPassword(profile);
 assert.equal(get('title').textContent,'Resetar senha');
 assert.equal(get('current-field').hidden,true);
 get('password').value='456789';
 await assertMismatch();
 await get('form').listeners.submit({preventDefault(){}});
 assert.ok(requests.at(-1).url.endsWith('/temporary-reset-password'));
 assert.deepEqual(JSON.parse(requests.at(-1).opts.body),{type:'general',id:profile.id,password:'456789',confirmation:'456789'});
 assert.equal(get('status').textContent,'Senha redefinida.');
});


test('Visão GERAL exige clique no menu e permissão ativa',async()=>{
 const status={configured:true,connections:{general:null,personal:null},modules:['inicio','bi-seed'],temporary:{id:'adriana',name:'Adriana'}};
 const h=ui(status);await settle();
 h.context.location.hash='';h.window.listeners.hashchange();
 assert.ok(!h.get('#main').innerHTML.includes('overview-board'));
 h.context.location.hash='#inicio';h.window.listeners.hashchange();
 assert.match(h.get('#main').innerHTML,/<section class="development-content"[^>]*><h1[^>]*>Meu espaço/);
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

test('Configurações abre o cadastro com a permissão da conexão temporária e sem Geral',async()=>{
 const received=[];
 const status={configured:true,connections:{general:null,personal:null},modules:['configuracoes','radar'],
  temporary:{id:'temp-user',name:'Pessoa fictícia'}};
 const h=ui(status,'',{
  FarolAuthorizedUsers:{mount(){received.push('mount');},unmount(){},connectionChanged(value){received.push(value);}}
 });
 await settle();
 assert.equal(received.at(-1).email,'temp-user');
 assert.equal(received.at(-1).name,'Pessoa fictícia');
 h.context.location.hash='#configuracoes';h.window.listeners.hashchange();
 assert.equal(received.at(-1),'mount');
 status.modules=['radar'];
 await h.window.FarolRefreshConnections();
 assert.equal(received.at(-1),null);
 assert.match(h.get('#main').innerHTML,/Módulo indisponível/);
});

test('Pessoal institucional aplica o cadastro e entrega a própria caixa ao módulo Pessoal',async()=>{
 const email='professora@escola.pr.gov.br',account={email,gmail:true,labels:'ready'};
 const received={personal:[],actor:[],settings:[]};
 const h=ui({configured:true,mode:'personal',connections:{general:null,personal:account},modules:['pessoais','inspetores-monitores','configuracoes'],
  institutionalUser:{id:'cadastro-1',name:'Docente cadastrada',email},school:{email:adminEmail},
  sharedConnections:{general:null,personal:account}},'',{
  FarolDemands:{connectionChanged:value=>received.personal.push(value),unmount(){}},
  FarolAuthorizedUsers:{mount(){received.settings.push('mount');},unmount(){},connectionChanged(value){received.settings.push(value);}},
  FarolStudents:{connectionChanged(){},personalConnectionChanged:value=>received.actor.push(value),unmount(){}}
 });
 await settle();
 assert.equal(received.personal.at(-1).email,email);
 assert.equal(received.actor.at(-1).email,email);
 assert.equal(received.actor.at(-1).name,'Docente cadastrada');
 assert.match(h.get('#email-personal-status').textContent,/Docente cadastrada/);
 assert.equal(h.connect[1].hidden,false);
 h.context.location.hash='#configuracoes';h.window.listeners.hashchange();
 assert.equal(received.settings.at(-2).email,email);
 assert.equal(received.settings.at(-1),'mount');
});

test('menu atualiza permissões e abre Demandas INSTITUCIONAIS com a Geral cadastrada',async()=>{
 const email='geral@escola.pr.gov.br',general={email,gmail:true,manageInstitutional:true},received=[];
 const status={configured:true,connections:{general,personal:null},modules:[],generalUser:{id:'colegio',email,name:'Colégio'}};
 const h=ui(status,'',{FarolInstitutional:{mount(){},unmount(){},connectionChanged:value=>received.push(value)}});
 await settle();
 status.modules=['institucionais'];status.institutionalConnection=general;
 h.context.location.hash='#institucionais';h.window.listeners.hashchange();
 await settle();
 assert.ok(h.get('#main').innerHTML.includes('institutional-board'));
 assert.equal(received.at(-1).email,email);
 status.modules=[];delete status.institutionalConnection;
 h.get('#navigation').listeners.click({target:{closest:selector=>selector==='a[href^="#"]'?{getAttribute:()=> '#institucionais'}:null}});
 await settle();
 assert.ok(h.get('#main').innerHTML.includes('Módulo indisponível'));
 assert.ok(h.get('#main').innerHTML.includes('Esta opção não está habilitada para o seu acesso.'));
 assert.equal(received.at(-1),null);
});

test('Visão GERAL usa conexões ativas nos quadros de e-mail e a fonte escolar nas ocorrências',async()=>{
 const general={email:'geral@escola.pr.gov.br',gmail:true},personal={email:adminEmail,gmail:true},school={email:adminEmail};
 const calls=[];
 const status={configured:true,modules:['inicio'],connections:{general,personal},generalUser:{id:'escola',email:general.email,name:'Geral do colégio'},
  school,sharedConnections:{general:personal,personal}};
 const h=ui(status,'',{FarolOverview:{mount(){},unmount(){},connectionChanged:(type,account,source)=>calls.push({type,account,source})}});
 await settle();
 assert.deepEqual(calls.at(-2),{type:'general',account:general,source:school});
 assert.deepEqual(calls.at(-1),{type:'personal',account:personal,source:school});
 status.connections.general=null;
 status.errors={general:'unavailable'};
 await h.window.FarolRefreshConnections();
 assert.deepEqual(calls.at(-2),{type:'general',account:null,source:school});
 assert.deepEqual(calls.at(-1),{type:'personal',account:personal,source:school});
});


test('Arquivo Morto fica abaixo do divisor, acima da Manutenção, e Cancelar volta para a rota anterior',async()=>{
 let leave;
 const archive={mount(_element,back){leave=back;h.get('#archive-inbox-back').focus();},unmount(){},connectionChanged(){}};
 const h=ui({configured:true,connections:{},modules:['arquivo-morto','radar']},'',{FarolArchiveInbox:archive});
 await settle();
 const navigation=h.get('#navigation').innerHTML;
 assert.deepEqual([...navigation.matchAll(/class="nav-divider"|href="#([^"]+)"/g)].map(match=>match[1]||'divisor').slice(-5),
  ['bi-seed','divisor','arquivo-morto','manutencao-sistema','configuracoes']);
 const cancel=h.get('#archive-inbox-back');
 h.get('#main').contains=node=>node===cancel;
 h.context.location.hash='#arquivo-morto';
 h.window.listeners.hashchange({oldURL:'https://farol.invalid/#radar'});
 assert.match(h.get('#main').innerHTML,/archive-inbox-board/);
 assert.equal(h.context.document.activeElement,cancel);
 leave();
 assert.equal(h.context.location.hash,'#radar');
});

test('Busca ATIVA tem Registrar no fluxograma e abre o formulário como subtela do Radar',async()=>{
 const connections={general:{email:adminEmail},personal:{email:adminEmail}};
 const mounts=[];
 const h=ui({configured:true,connections,modules:adminModules},'',{
  FarolActiveSearch:{unmount(){},connectionChanged(){},mount(element){mounts.push(element);}}
 });
 await settle();
 assert.match(h.get('#main').innerHTML,/Busca ATIVA<\/strong>.*href="#busca-ativa">Registrar/);
 h.context.location.hash='#busca-ativa';
 h.window.listeners.hashchange();
 assert.equal(h.get('#breadcrumb-title').textContent,'Radar / Busca ATIVA');
 assert.match(h.get('#navigation').innerHTML,/class="nav-link active" href="#radar"/);
 assert.deepEqual(mounts,[h.get('#active-search-board')]);
});

for(const mode of ['local','padrão sem pacote local','padrão via WebKit','teclado']){
test('Busca Ativa preserva o fluxo de registro com ditado '+mode,async()=>{
 const nodes=new Map(),requests=[],window={};
 const get=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{
   value:'',maxLength:5000,listeners:{},
   addEventListener(name,handler){this.listeners[name]=handler;},
   setAttribute(name,value){this[name]=value;},
   removeEventListener(name){delete this.listeners[name];},
   focus(){},
   showModal(){this.open=true;},
   close(){this.open=false;},
   setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);}
  });
  return nodes.get(selector);
 };
 const form=get('form'),dialog=get('#active-search-dialog');
 dialog.querySelector=get;
 form.elements=Object.fromEntries(['searchDate','searchTime','actionText'].map(name=>[name,get(name)]));
 form.querySelector=get;
 form.reportValidity=()=>true;
 let session;
 class StandardRecognition{
  start(){session=this;this.onstart();}
  stop(){this.onend();}
  abort(){}
 }
 if(mode==='padrão via WebKit')window.webkitSpeechRecognition=StandardRecognition;
 else if(mode!=='teclado'){
  window.SpeechRecognition=class extends StandardRecognition{
   static async available({langs,processLocally}){
    assert.equal(langs.join(),'pt-BR');
    assert.equal(processLocally,true);
    return mode==='local'?'available':'downloadable';
   }
   get processLocally(){return this.local??false;}
   set processLocally(value){this.local=value;}
  };
 }
 const author='docente@escola.pr.gov.br',id='12345678-1234-4234-8234-123456789abc';
 class FixedDate extends Date{constructor(){super('2026-11-27T01:35:30Z');}}
 const context=vm.createContext({
  window,Date:FixedDate,Intl,URLSearchParams,AbortController,crypto:{randomUUID:()=>id},
  Option:class{constructor(text,value){this.text=text;this.value=value;}},
  async fetch(url,options){
   requests.push({url,options});
   const result=options.method==='POST'?{saved:true,id,date:'2026-11-26',time:'22:35:30'}:{mailbox:adminEmail,author,students:[
    {id:'1',name:'Ágata',cgm:'00123',serie:'8º Ano',turma:'B',turno:'Tarde',className:'8º Ano · B · Tarde',school:'Escola Fictícia'},
    {id:'2',name:'Bruno',cgm:'00234',serie:'1ª Série',turma:'A',turno:'Manhã',className:'1ª Série · A · Manhã',school:'Escola Fictícia'}
   ]};
   return {ok:true,json:async()=>result};
  }
 });
 vm.runInContext(fs.readFileSync('student-list.js','utf8'),context);
 vm.runInContext(fs.readFileSync('active-search.js','utf8'),context);
 window.FarolActiveSearch.connectionChanged(adminEmail,author);
 window.FarolActiveSearch.mount({querySelector:get});
 await settle();
 const list=get('#active-search-list'),filter=get('#active-search-filter');
 assert.equal(get('#active-search-tab-register')['aria-selected'],'true');
 assert.equal(get('#active-search-panel-consult').hidden,true);
 assert.equal(dialog.open,undefined);
 assert.match(list.innerHTML,/Ágata · CGM 00123 · 8oB<\/span><span class="student-class">Tarde/);
 assert.match(list.innerHTML,/Bruno · CGM 00234 · 1aA<\/span><span class="student-class">Manhã/);
 for(const value of ['1a','1ª','1aA','1ªA']){
  filter.value=value;filter.listeners.input();
  assert.match(list.innerHTML,/Bruno/);assert.doesNotMatch(list.innerHTML,/Ágata/);
 }
 for(const value of ['8o','8º','8ob','8ºB','00123','agata']){
  filter.value=value;filter.listeners.input();
  assert.match(list.innerHTML,/Ágata/);assert.doesNotMatch(list.innerHTML,/Bruno/);
 }
 const trigger={dataset:{student:'1'},focus(){}};
 list.listeners.click({target:{closest:()=>trigger}});
 assert.equal(dialog.open,true);
 const {searchDate,searchTime,actionText}=form.elements;
 assert.equal(searchDate.value,'2026-11-26');
 assert.equal(searchTime.value,'22:35');
 searchTime.value='14:30';
 actionText.value='Tentativa pela manhã.';
 const speak=get('[data-dictate]');
 const voiceStatus=get('#active-search-voice-status');
 if(mode==='teclado'){
  assert.equal(speak.disabled,true);
  assert.match(voiceStatus.textContent,/microfone do teclado/);
  actionText.value+=' Contato à tarde.';
 }else{
  assert.notEqual(speak.disabled,true);
  assert.match(voiceStatus.textContent,/serviço externo/);
  await speak.listeners.click();
  assert.equal(Boolean(session.processLocally),mode==='local');
  assert.equal(session.lang,'pt-BR');
  const final=Object.assign([{transcript:'Contato à tarde.'}],{isFinal:true});
  session.onresult({resultIndex:0,results:[final]});
  await form.listeners.submit({preventDefault(){}});
  assert.equal(requests.length,1);
  await speak.listeners.click();
 }
 assert.equal(actionText.value,'Tentativa pela manhã. Contato à tarde.');
 actionText.value+=' Retorno combinado.';
 await form.listeners.submit({preventDefault(){}});
 const saved=JSON.parse(requests[1].options.body);
 assert.equal(saved.studentId,'1');
 assert.equal(saved.searchTime,'14:30');
 assert.equal(saved.text,'Tentativa pela manhã. Contato à tarde. Retorno combinado.');
 assert.equal(dialog.open,false);
 assert.match(get('[data-student-status]').textContent,/Busca ativa registrada em 26\/11\/2026/);
});
}

test('Pessoal de Marcos tem atalho para consultar buscas sem abrir os demais recursos do Radar',async()=>{
 const calls=[];
 const h=ui({configured:true,connections:{general:null,personal:{email:adminEmail}},
  modules:['bi-seed','inspetores-monitores'],activeSearchConsultOnly:true},'',{
  FarolActiveSearch:{mount(){},unmount(){},connectionChanged(...args){calls.push(args);}}
 });
 await settle();
 assert.match(h.get('#main').innerHTML,/Módulo indisponível/);
 assert.match(h.get('#main').innerHTML,/href="#busca-ativa">Consultar buscas ativas/);
 h.context.location.hash='#busca-ativa';
 h.window.listeners.hashchange();
 assert.match(h.get('#main').innerHTML,/active-search-board/);
 assert.equal(calls.at(-1)[0],adminEmail);
 assert.equal(calls.at(-1)[2],true);
 h.context.location.hash='#analise-faltas';
 h.window.listeners.hashchange();
 assert.match(h.get('#main').innerHTML,/Módulo indisponível/);
});
