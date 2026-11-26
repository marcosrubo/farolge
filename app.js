'use strict';
// Estrutura de navegação. Os conteúdos serão definidos com a equipe da escola.
const config = {...window.FAROL_CONFIG};
const icons = {
  inicio:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  demandas:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7"/><circle cx="12" cy="12" r="1"/>',
  indicadores:'<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/>',
  equipe:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m3 10v-2a6 6 0 0 0-3-5"/>',
  arquivo:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9m-9 4h4"/>',
  manutencao:'<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4l-5 5a2.1 2.1 0 0 0 3 3l5-5a5 5 0 0 0 6.4-6.4l-3 3-3-3z"/>',
  configuracoes:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>'
};
const modules = [
  {id:'inicio',icon:'inicio',label:'Visão GERAL'},
  {id:'inspetores-monitores',icon:'equipe',label:'Inspetores/Monitores'},
  {id:'radar',icon:'radar',label:'Radar'},
  {id:'institucionais',icon:'demandas',label:'Demandas INSTITUCIONAIS'},
  {id:'pessoais',icon:'demandas',label:'Demandas PESSOAIS'},
  {id:'bi-seed',icon:'indicadores',label:'BI SEED'},
  {id:'arquivo-morto',icon:'arquivo',label:'Arquivo Morto'},
  {id:'manutencao-sistema',icon:'manutencao',label:'Manutenção do Sistema'},
  {id:'configuracoes',icon:'configuracoes',label:'Configurações'}
];
window.FarolMenuModules=modules;
let archiveReturnHash='';
let allowedModules=new Set(['bi-seed']),temporaryUser=null,moduleUserKey=null,overviewSelected=false;
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

function updateSchool(){
  const lines=config.schoolNameLines;
  const useLines=Array.isArray(lines)&&lines.join(' ')===config.schoolName;
  document.querySelectorAll('[data-school]').forEach(element=>{
    element.textContent=useLines?lines.join('\n'):config.schoolName;
    element.classList.toggle('school-name-lines',useLines);
  });
  const initials=document.querySelector('.school-block .school-avatar');
  const emblem=document.querySelector('.school-emblem');
  const subtitle=document.querySelector('.school-block small');
  initials.textContent=config.schoolInitials;
  initials.hidden=Boolean(config.schoolLogo);
  emblem.hidden=!config.schoolLogo;
  if(config.schoolLogo)emblem.src=config.schoolLogo;
  subtitle.textContent=config.schoolSubtitle;
  subtitle.hidden=!config.schoolSubtitle;
}

function renderRadar(){
  const sources=[
    ['RCO','Ocorrências registradas'],
    ['SINAN','Fichas emitidas pelas pedagogas'],
    ['SERP','Registros de acompanhamento'],
    ['ATAS','Reuniões e atendimentos'],
    ['Busca ATIVA','Registros de acompanhamento'],
    ['Alunos','CGM e NOME']
  ];
  return `<section class="radar-flow-scroll" aria-label="Fluxo do Radar: RCO, SINAN, SERP, ATAS, Busca ATIVA e Alunos alimentam ANÁLISES, que gera DOSSIÊ individual e Relação diária de FALTAS">
    <div class="radar-flow">
      <ul class="radar-sources">${sources.map(([title,description])=>`<li class="radar-node"><strong>${title}</strong><span>${description}</span></li>`).join('')}</ul>
      <div class="radar-merge" aria-hidden="true"></div>
      <div class="radar-analysis">ANÁLISES</div>
      <div class="radar-branch" aria-hidden="true"></div>
      <ul class="radar-outputs">
        <li class="radar-node"><strong>DOSSIÊ individual</strong></li>
        <li class="radar-node"><strong>Relação diária de FALTAS</strong><a class="button radar-attendance-analyze" href="#analise-faltas">Analisar</a></li>
      </ul>
    </div>
  </section>`;
}

function renderDevelopment(id){
  const descriptions={
    'bi-seed':'Aqui serão apresentados os indicadores/resumos do BI para que possa ter uma visão simplificada da situação da escola.',
    institucionais:'Nesta tela serão disponibilizados os recursos de organização das demandas do colégio a partir do e-mail institucional geral LDA....@escola.pr.gov.br.',
    pessoais:'Nesta tela serão disponibilizados os recursos de organização das demandas pessoais de quem estiver conectado (diretora, secretária, pedagogas e quem mais utilizar o sistema) a partir do e-mail pessoal institucional fulano.ciclano....@escola.pr.gov.br.',
    configuracoes:'Aqui serão disponibilizados os recursos para conexão com o e-mail institucional geral, pessoal institucional e demais dados de configuração/parametrização do sistema.'
  };
  if(!Object.hasOwn(descriptions,id))return '';
  return `<section class="development-content" aria-labelledby="development-title">
    <h1 id="development-title">em Desenvolvimento</h1>
    <p>${descriptions[id]}</p>
  </section>`;
}

function render(){
  window.FarolArchiveInbox?.unmount();
  window.FarolDemands?.unmount();
  window.FarolInstitutional?.unmount();
  window.FarolOverview?.unmount();
  window.FarolMaintenance?.unmount();
  window.FarolStudents?.unmount();
  window.FarolAuthorizedUsers?.unmount();
  window.FarolAttendanceAnalysis?.unmount();
  const route=location.hash.slice(1)==='demandas'?'pessoais':location.hash.slice(1);
  const analysis=route==='analise-faltas';
  const requested=modules.find(item=>item.id===(analysis?'radar':route));
  const enabled=requested&&allowedModules.has(requested.id);
  const waitingForOverview=enabled&&requested.id==='inicio'&&!overviewSelected;
  const selected=enabled&&!waitingForOverview?requested:!requested&&allowedModules.has('bi-seed')?modules.find(item=>item.id==='bi-seed'):null;
  const title=analysis?'Radar / Análise de faltas':(selected||requested)?.label||'Meu espaço';
  document.title='FAROL GE · '+title;
  document.querySelector('#breadcrumb-title').textContent=title;
  document.querySelector('#navigation').innerHTML=modules.map(item=>`${item.id==='arquivo-morto'?'<div class="nav-divider"></div>':''}<a class="nav-link ${item===selected?'active':''}" href="#${item.id}" ${item===selected?'aria-current="page"':''}>${icon(item.icon)}<span>${item.label}</span></a>`).join('');
  const main=document.querySelector('#main');
  if(!selected){
    main.classList.toggle('radar-workspace',false);
    main.innerHTML=requested&&!enabled
      ?`<section class="development-content module-unavailable" aria-labelledby="module-title"><h1 id="module-title">${title}</h1><h2>Módulo indisponível</h2><p>Esta opção não está habilitada para o seu acesso.</p></section>`
      :'<section class="development-content" aria-labelledby="module-title"><h1 id="module-title">Meu espaço</h1><p>Escolha uma opção no menu.</p></section>';
    return;
  }
  main.classList.toggle('radar-workspace',selected.id==='radar'&&!analysis);
  main.innerHTML=analysis?'<section id="attendance-analysis-board" class="demands-workspace"></section>':selected.id==='inicio'?'<section class="demands-workspace" id="overview-board"></section>':selected.id==='pessoais'?`<section class="demands-workspace"><h1>Demandas PESSOAIS</h1><p class="demand-intro">Acompanhe o que espera de outras pessoas, suas pendências e seus compromissos. Os e-mails são organizados pelos três marcadores da conta Pessoal; cada conversa tem prazo e conclusão compartilhados, com responsável por categoria. Ao classificar, a mensagem sai da entrada e fica em Despachadas e nas categorias escolhidas.</p><div id="demands-board"></div></section>`:selected.id==='institucionais'?`<section class="demands-workspace"><h1>Demandas INSTITUCIONAIS</h1><p class="demand-intro">Organize as mensagens da conta GERAL em Caixa de Entrada, Classificadas, Anuais e Arquivadas. Para classificar uma mensagem, confirme sua data limite de execução.</p><div id="institutional-board"></div></section>`:selected.id==='inspetores-monitores'?'<section id="students-board" class="demands-workspace"></section>':selected.id==='arquivo-morto'?'<section id="archive-inbox-board" class="demands-workspace"></section>':selected.id==='manutencao-sistema'?'<section id="maintenance-board" class="demands-workspace"></section>':selected.id==='configuracoes'?'<section id="authorized-users-board" class="demands-workspace"></section>':selected.id==='radar'?renderRadar():renderDevelopment(selected.id);
  if(analysis)window.FarolAttendanceAnalysis?.mount(document.querySelector('#attendance-analysis-board'));
  if(selected.id==='configuracoes')window.FarolAuthorizedUsers?.mount(document.querySelector('#authorized-users-board'));
  if(selected.id==='inspetores-monitores')window.FarolStudents?.mount(document.querySelector('#students-board'));
  if(selected.id==='arquivo-morto')window.FarolArchiveInbox?.mount(document.querySelector('#archive-inbox-board'),()=>{
    if(archiveReturnHash==='#inicio')overviewSelected=true;
    location.hash=archiveReturnHash;
  });
  if(selected.id==='manutencao-sistema')window.FarolMaintenance?.mount(document.querySelector('#maintenance-board'));
  if(selected.id==='inicio')window.FarolOverview?.mount(document.querySelector('#overview-board'));
  if(selected.id==='institucionais')window.FarolInstitutional?.mount(document.querySelector('#institutional-board'));
  if(selected.id==='pessoais')window.FarolDemands?.mount(document.querySelector('#demands-board'));
}
const connectionMessages={
  access_denied:'E-mail não autorizado a acessar o aplicativo FarolGE.',
  temporary_active:'Encerre a conexão temporária antes de conectar uma conta Google.',
  access_setup_required:'O controle de acesso precisa ser preparado no Supabase do FAROL GE.',
  access_unavailable:'Não foi possível verificar a autorização de acesso. Tente novamente mais tarde.',
  connected:'Conexão e permissões confirmadas pelo Google.',
  partial:'Conta conectada. Algumas permissões ou a preparação das labels precisam de atenção. Confira a situação da conexão e revise a autorização para tentar novamente.',
  login_required:'Conecte novamente esta conta Google para continuar.',
  cancelled:'Autorização cancelada. Nenhuma conexão foi substituída.',
  invalid_state:'A solicitação expirou ou não pertence a este navegador. Tente conectar novamente.',
  wrong_account:'Escolha a conta correta para esta conexão.',
  missing_scope:'É necessário autorizar a consulta ao Gmail para concluir a conexão.',
  failed:'Não foi possível concluir a conexão com o Google. Tente novamente.',
  unavailable:'O serviço de conexão está temporariamente indisponível.',
  not_configured:'A conexão Google ainda precisa ser configurada para este FAROL GE.'
};
function setupEmailConnections(){
  const dialog=document.querySelector('#email-connection-dialog');
  const availability=document.querySelector('#email-connection-availability');
  const continueButton=document.querySelector('#email-connection-continue');
  const feedback=document.querySelector('#email-connection-feedback');
  const temporaryStatus=document.querySelector('#temporary-status');
  const statusUnavailable='Não foi possível verificar a conexão. A sessão será consultada novamente quando a rede voltar.';
  let configured=false;
  let selectedType='personal';
  let statusVersion=0,temporaryExpiry=null;
  const types=['general','personal'];
  const deniedDialog=document.querySelector('#access-denied-dialog'),seenDenied=new Set(),activeEmails={general:null,personal:null};
  function showDenied(email){
    if(typeof email!=='string'||!(/^[^@\s]+@[^@\s]+\.[^@\s]+$/).test(email)||seenDenied.has(email))return;
    seenDenied.add(email);
    document.querySelector('#access-denied-email').textContent=email;
    document.querySelector('#access-denied-support').href='https://wa.me/5543999525060?text='+encodeURIComponent('Preciso de ajuda para acessar o FarolGE. O e-mail da tentativa foi '+email);
    if(dialog.open)dialog.close();
    if(!deniedDialog.open)deniedDialog.showModal();
  }
  function clearConnection(type){
    activeEmails[type]=null;
    if(type==='personal'){window.FarolArchiveInbox?.connectionChanged(null);window.FarolDemands?.connectionChanged(null);window.FarolStudents?.personalConnectionChanged?.(null);}
    else{window.FarolInstitutional?.connectionChanged(null);window.FarolMaintenance?.connectionChanged(null);window.FarolStudents?.connectionChanged?.(null);window.FarolAuthorizedUsers?.connectionChanged(null);window.FarolAttendanceAnalysis?.connectionChanged(null);}
    window.FarolOverview?.connectionChanged(type,null);
    document.querySelector('#email-'+type+'-status').textContent='Acesso não autorizado ou não verificado';
    document.querySelector('#email-'+type+'-status').classList.toggle('is-connected',false);
    document.querySelector('[data-disconnect-email="'+type+'"]').hidden=true;
    document.querySelector('[data-connect-email="'+type+'"]').textContent='Conectar';
  }
  function scheduleTemporaryExpiry(expiresAt){
    const remaining=expiresAt-Date.now()+250;
    const maxDelay=2**31-1;
    temporaryExpiry=setTimeout(remaining>maxDelay?()=>scheduleTemporaryExpiry(expiresAt):refresh,
      Math.min(maxDelay,Math.max(250,remaining)));
  }
  function updateAccess(result){
    const user=result?.temporary||null;
    const googleUsers=[result?.generalUser,result?.institutionalUser];
    const identityKey=user?'temporary:'+user.id:googleUsers.some(Boolean)
      ?'google:'+JSON.stringify(googleUsers.map(profile=>profile?[profile.id,profile.email]:null)):null;
    const next=new Set(Array.isArray(result?.modules)?result.modules:[]);
    if(!identityKey)next.add('bi-seed');
    if(identityKey!==moduleUserKey||!next.has('inicio'))overviewSelected=false;
    const changed=next.size!==allowedModules.size||[...next].some(id=>!allowedModules.has(id))||identityKey!==moduleUserKey;
    allowedModules=next;temporaryUser=user;moduleUserKey=identityKey;
    window.FarolTemporaryAccess?.update(user,configured);
    if(temporaryExpiry!==null)clearTimeout(temporaryExpiry);
    temporaryExpiry=null;
    if(user?.expiresAt)scheduleTemporaryExpiry(user.expiresAt);
    if(changed){
      window.FarolArchiveInbox?.connectionChanged(null);
      window.FarolDemands?.connectionChanged(null);
      window.FarolInstitutional?.connectionChanged(null);
      window.FarolMaintenance?.connectionChanged(null);
      window.FarolAuthorizedUsers?.connectionChanged(null);
      window.FarolStudents?.connectionChanged?.(null);
      window.FarolStudents?.personalConnectionChanged?.(null);
      window.FarolAttendanceAnalysis?.connectionChanged(null);
      for(const type of types)window.FarolOverview?.connectionChanged(type,null);
      render();
    }
  }
  window.FarolAccessDenied=result=>{
    if(result?.error==='access_denied'&&types.includes(result.type)&&activeEmails[result.type]===result.email){
      ++statusVersion;clearConnection(result.type);showDenied(result.email);refresh();
    }else if(['module_forbidden','admin_required','login_required'].includes(result?.error)){
      refresh();
    }
  };
  async function api(action,body){
    const response=await fetch('/api/google/'+action,{
      method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
      headers:body?{'Content-Type':'application/json','X-Farol-Request':'1'}:{},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'unavailable');
    return result;
  }
  function showAvailability(){
    availability.textContent=configured
      ?'No Google, escolha a conta que deseja conectar e confira as permissões de Gmail e Drive.'
      :connectionMessages.not_configured;
    continueButton.hidden=!configured;
  }
  const refresh=()=>refreshStatus(true);
  async function refreshStatus(retry){
    const version=++statusVersion;
    try {
      const result=await api('status');
      if(version!==statusVersion)return;
      configured=result.configured===true;
      if(temporaryStatus.textContent===statusUnavailable)temporaryStatus.textContent='';
      updateAccess(result);
      const registered=Boolean(result.temporary||result.generalUser||result.institutionalUser);
      const connections=registered?result.sharedConnections:result.connections;
      const school=result.school??(registered?null:connections?.general);
      const actor=result.temporary||(registered?result.occurrencesUser||result.institutionalUser
        :connections?.personal?{email:connections.personal.email,name:'Marcos Rubo'}:null);
      const access=(module,value)=>configured&&allowedModules.has(module)?value||null:null;
      for(const type of types)activeEmails[type]=configured?result.connections?.[type]?.email||null:null;
      window.FarolArchiveInbox?.connectionChanged(access('arquivo-morto',result.connections?.personal));
      window.FarolDemands?.connectionChanged(access('pessoais',connections?.personal));
      window.FarolInstitutional?.connectionChanged(access('institucionais',result.institutionalConnection||connections?.general));
      window.FarolMaintenance?.connectionChanged(access('manutencao-sistema',connections?.general));
      window.FarolStudents?.connectionChanged?.(access('inspetores-monitores',school));
      window.FarolStudents?.personalConnectionChanged?.(access('inspetores-monitores',actor),activeEmails.personal);
      const settings=result.temporary?{email:result.temporary.id,name:result.temporary.name}
        :result.settingsUser||result.institutionalUser||result.connections?.general;
      window.FarolAuthorizedUsers?.connectionChanged(access('configuracoes',settings));
      window.FarolAttendanceAnalysis?.connectionChanged(access('radar',school));
      for(const type of types){
        const mailbox=result.connections?.[type]||(result.errors?.[type]?null:connections?.[type]);
        window.FarolOverview?.connectionChanged(type,access('inicio',mailbox),access('inicio',school));
      }
      for(const type of types){
        const connection=result.connections?.[type];
        const email=connection?.email;
        const connected=Boolean(configured && typeof email==='string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
        const status=document.querySelector('#email-'+type+'-status');
        status.textContent=connected?`${email} · Gmail: ${connection.gmail?'autorizado':'não autorizado'} · Drive: ${connection.drive?'autorizado':'não autorizado'}`:(result.errors?.[type]==='access_denied'?'Acesso não autorizado':['unavailable','access_unavailable','access_setup_required'].includes(result.errors?.[type])?'Conexão não verificada':'NÃO conectado');
        if(connected&&type==='general')status.textContent+=' · Nomes no Drive: '+(connection.driveMetadata?'autorizado':'revisar autorização')+' · Leitura de PDFs: '+(connection.driveRead?'autorizada':'revisar autorização');
        if(connected) {
          const profile=type==='general'?result.generalUser:result.institutionalUser;
          if(profile)status.textContent+=' · '+profile.name;
          if(connection.labels==='pending_policy')status.textContent+=' · '+(profile?'Módulos conforme o cadastro':'E-mail sem cadastro de usuário');
          else{
            const labelMessages={ready:'Marcadores prontos',missing:'Marcadores incompletos — revise a autorização',permission_required:'Autorize o gerenciamento de marcadores',unavailable:'Não foi possível verificar os marcadores — revise a autorização'};
            status.textContent+=' · '+(type==='general'&&connection.labels==='missing'&&connection.labelDetails?.missing?.length?'Faltam marcadores: '+connection.labelDetails.missing.join(', '):(labelMessages[connection.labels]||labelMessages.permission_required));
            status.textContent+=' · Classificação: '+((type==='personal'?connection.classify:connection.manageInstitutional)?'autorizada':'revisar autorização');
          }
        }
        status.classList.toggle('is-connected',connected);
        const button=document.querySelector('[data-connect-email="'+type+'"]');
        button.textContent=connected?'Revisar autorização':'Conectar';
        button.hidden=Boolean(result.temporary);
        button.disabled=!configured||Boolean(result.temporary);
        document.querySelector('[data-disconnect-email="'+type+'"]').hidden=!connected;
      }
      for(const email of Object.values(result.denied||{}))showDenied(email);
      for(const type of types)if(['access_setup_required','access_unavailable'].includes(result.errors?.[type]))feedback.textContent=connectionMessages[result.errors[type]];
      showAvailability();
    } catch {
      if(version!==statusVersion)return;
      configured=false;
      updateAccess(null);
      window.FarolArchiveInbox?.connectionChanged(null);
      window.FarolDemands?.connectionChanged(null);
      window.FarolInstitutional?.connectionChanged(null);
      window.FarolMaintenance?.connectionChanged(null);
      window.FarolStudents?.connectionChanged?.(null);
      window.FarolStudents?.personalConnectionChanged?.(null);
      window.FarolAuthorizedUsers?.connectionChanged(null);window.FarolAttendanceAnalysis?.connectionChanged(null);
      for(const type of types)window.FarolOverview?.connectionChanged(type,null);
      for(const type of types){
        const status=document.querySelector('#email-'+type+'-status');
        status.textContent='Conexão não verificada';
        status.classList.toggle('is-connected',false);
        document.querySelector('[data-disconnect-email="'+type+'"]').hidden=true;
        document.querySelector('[data-connect-email="'+type+'"]').disabled=true;
      }
      availability.textContent=connectionMessages.unavailable;
      continueButton.hidden=true;
      temporaryStatus.textContent=statusUnavailable;
      if(retry)setTimeout(()=>{if(version===statusVersion)refreshStatus(false);},1500);
    }
  }
  function openConnection(type){
    if(temporaryUser)return;
    selectedType=type;
    const isGeneral=type==='general';
    document.querySelector('#email-connection-labels').hidden=isGeneral;
    document.querySelector('#email-general-labels').hidden=!isGeneral;
    document.querySelector('#email-drive-metadata').hidden=!isGeneral;
    document.querySelector('#email-connection-title').textContent=isGeneral?'Conectar conta geral da escola':'Conectar conta pessoal';
    document.querySelector('#email-connection-description').textContent='Use uma Conta Google institucional @escola.pr.gov.br ou marcos.rubo@gmail.com.';
    showAvailability();
    dialog.showModal();
  }
  document.querySelectorAll('[data-connect-email]').forEach(button=>{
    button.addEventListener('click',()=>openConnection(button.dataset.connectEmail));
  });
  continueButton.addEventListener('click',async()=>{
    continueButton.disabled=true;
    availability.textContent='Preparando a conexão com o Google…';
    try {
      const result=await api('start',{type:selectedType,route:location.hash.slice(1)});
      const target=new URL(result.url);
      if(target.origin!=='https://accounts.google.com' || target.pathname!=='/o/oauth2/v2/auth')throw new Error('failed');
      window.location.assign(target.href);
    } catch(error) {
      availability.textContent=connectionMessages[error.message]||connectionMessages.unavailable;
    } finally {continueButton.disabled=false;}
  });
  document.querySelectorAll('[data-disconnect-email]').forEach(button=>{
    button.addEventListener('click',async()=>{
      button.disabled=true;
      try {
        ++statusVersion;
        if(button.dataset.disconnectEmail==='personal'){
          window.FarolArchiveInbox?.connectionChanged(null);
          window.FarolDemands?.connectionChanged(null);
          window.FarolStudents?.personalConnectionChanged?.(null);
        }
        if(button.dataset.disconnectEmail==='general')window.FarolInstitutional?.connectionChanged(null);
        window.FarolOverview?.connectionChanged(button.dataset.disconnectEmail,null);
        await api('disconnect',{type:button.dataset.disconnectEmail});
        feedback.textContent='Autorização removida do FAROL GE para esta conta. A outra conexão foi preservada.';
        await refresh();
      } catch {feedback.textContent=connectionMessages.unavailable;}
      finally {button.disabled=false;}
    });
  });
  const params=new URLSearchParams(location.search);
  const result=params.get('connection');
  if(result){
    feedback.textContent=connectionMessages[result]||connectionMessages.failed;
    if(result==='access_denied')api('access-denied').then(denied=>showDenied(denied.email)).catch(()=>{feedback.textContent=connectionMessages.access_denied;});
    params.delete('connection');
    params.delete('mailbox');
    window.history.replaceState(null,'',location.pathname+(params.size?'?'+params.toString():'')+location.hash);
  }
  window.FarolRefreshConnections=refresh;
  window.addEventListener('farol-connections-refresh',refresh);
  window.addEventListener('focus',refresh);
  window.addEventListener('online',refresh);
  window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
  refresh();
}

document.querySelector('#navigation').addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[href^="#"]');
  if(!link)return;
  const overview=Boolean(event.target.closest('a[href="#inicio"]'))&&allowedModules.has('inicio');
  if(overview){
    overviewSelected=true;
    if(location.hash==='#inicio')render();
  }
  if(link.getAttribute?.('href')===location.hash)window.FarolRefreshConnections?.();
});
window.addEventListener('hashchange',event=>{
  if(location.hash==='#arquivo-morto'&&event?.oldURL){
    const previous=new URL(event.oldURL).hash;
    if(previous!=='#arquivo-morto')archiveReturnHash=previous;
  }
  if(location.hash!=='#inicio')overviewSelected=false;
  render();
  const main=document.querySelector('#main');
  if(!main.contains(document.activeElement))main.focus({preventScroll:true});
  window.scrollTo(0,0);
  window.FarolRefreshConnections?.();
});
updateSchool();
setupEmailConnections();
render();
