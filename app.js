'use strict';
// Estrutura de navegação. Os conteúdos serão definidos com a equipe da escola.
const config = {...window.FAROL_CONFIG};
const icons = {
  inicio:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  demandas:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7"/><circle cx="12" cy="12" r="1"/>',
  indicadores:'<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/>',
  configuracoes:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>'
};
const modules = [
  {id:'inicio',icon:'inicio',label:'Visão GERAL'},
  {id:'radar',icon:'radar',label:'Radar'},
  {id:'institucionais',icon:'demandas',label:'Demandas INSTITUCIONAIS'},
  {id:'pessoais',icon:'demandas',label:'Demandas PESSOAIS'},
  {id:'bi-seed',icon:'indicadores',label:'BI SEED'},
  {id:'configuracoes',icon:'configuracoes',label:'Configurações'}
];
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
        <li class="radar-node"><strong>Relação diária de FALTAS</strong></li>
      </ul>
    </div>
  </section>`;
}

function renderDevelopment(id){
  const descriptions={
    inicio:'Nesta tela serão mostrados indicadores gerais de',
    'bi-seed':'Aqui serão apresentados os indicadores/resumos do BI para que possa ter uma visão simplificada da situação da escola.',
    institucionais:'Nesta tela serão disponibilizados os recursos de organização das demandas do colégio a partir do e-mail institucional geral LDA....@escola.pr.gov.br.',
    pessoais:'Nesta tela serão disponibilizados os recursos de organização das demandas pessoais de quem estiver conectado (diretora, secretária, pedagogas e quem mais utilizar o sistema) a partir do e-mail pessoal institucional fulano.ciclano....@escola.pr.gov.br.',
    configuracoes:'Aqui serão disponibilizados os recursos para conexão com o e-mail institucional geral, pessoal institucional e demais dados de configuração/parametrização do sistema.'
  };
  if(!Object.hasOwn(descriptions,id))return '';
  const indicators=[
    'Acompanhamento de Alunos',
    'Resumo das Demandas INSTITUCIONAIS da escola',
    'Resumo das Demandas PESSOAIS de quem estiver conectado',
    'Índices do BI da SEED'
  ];
  return `<section class="development-content" aria-labelledby="development-title">
    <h1 id="development-title">em Desenvolvimento</h1>
    <p>${descriptions[id]}</p>
    ${id==='inicio'?`<ul>${indicators.map(item=>`<li>${item}</li>`).join('')}</ul>`:''}
  </section>`;
}

function render(){
  window.FarolDemands?.unmount();
  window.FarolInstitutional?.unmount();
  const route=location.hash.slice(1)==='demandas'?'pessoais':location.hash.slice(1);
  const selected=modules.find(item=>item.id===route)||modules[0];
  document.title='FAROL GE · '+selected.label;
  document.querySelector('#breadcrumb-title').textContent=selected.label;
  document.querySelector('#navigation').innerHTML=modules.map((item,index)=>`${item.id==='configuracoes'?'<div class="nav-divider"></div>':''}<a class="nav-link ${item.id===selected.id?'active':''}" href="#${item.id}" ${item.id===selected.id?'aria-current="page"':''}>${icon(item.icon)}<span>${item.label}</span>${index>0&&index<5?'<span class="nav-number">0'+index+'</span>':''}</a>`).join('');
  const main=document.querySelector('#main');
  main.classList.toggle('radar-workspace',selected.id==='radar');
  main.innerHTML=selected.id==='pessoais'?`<section class="demands-workspace"><h1>Demandas PESSOAIS</h1><p class="demand-intro">Acompanhe o que espera de outras pessoas, suas pendências e seus compromissos. Os e-mails são organizados pelos três marcadores da conta Pessoal; cada conversa tem prazo e conclusão compartilhados, com responsável por categoria. Ao classificar, a mensagem sai da entrada e fica em 9-Classificado e nas categorias escolhidas.</p><div id="demands-board"></div></section>`:selected.id==='institucionais'?`<section class="demands-workspace"><h1>Demandas INSTITUCIONAIS</h1><p class="demand-intro">Organize as mensagens da conta GERAL em Caixa de entrada, Classificadas e Arquivadas. Para classificar uma mensagem, confirme sua data limite de execução.</p><div id="institutional-board"></div></section>`:selected.id==='radar'?renderRadar():renderDevelopment(selected.id);
  if(selected.id==='institucionais')window.FarolInstitutional?.mount(document.querySelector('#institutional-board'));
  if(selected.id==='pessoais')window.FarolDemands?.mount(document.querySelector('#demands-board'));
}
const connectionMessages={
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
  let configured=false;
  let selectedType='personal';
  let statusVersion=0;
  const types=['general','personal'];
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
      ?'Escolha sua conta no Google e autorize Gmail e Drive. Você pode revisar as permissões na página do Google.'
      :connectionMessages.not_configured;
    continueButton.hidden=!configured;
  }
  async function refresh(){
    const version=++statusVersion;
    try {
      const result=await api('status');
      if(version!==statusVersion)return;
      configured=result.configured===true;
      window.FarolDemands?.connectionChanged(configured?result.connections?.personal||null:null);
      window.FarolInstitutional?.connectionChanged(configured?result.connections?.general||null:null);
      for(const type of types){
        const connection=result.connections?.[type];
        const email=connection?.email;
        const connected=Boolean(configured && typeof email==='string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
        const status=document.querySelector('#email-'+type+'-status');
        status.textContent=connected?`${email} · Gmail: ${connection.gmail?'autorizado':'não autorizado'} · Drive: ${connection.drive?'autorizado':'não autorizado'}`:(result.errors?.[type]==='unavailable'?'Conexão não verificada':'NÃO conectado');
        if(connected) {
          const labelMessages={ready:type==='personal'?'labels prontas (3/3)':'Classificadas e Arquivadas prontas',missing:'labels incompletas — revise a autorização',permission_required:'labels: autorize o gerenciamento de marcadores',unavailable:'labels: não foi possível verificar — revise a autorização'};
          status.textContent+=' · '+(labelMessages[connection.labels]||labelMessages.permission_required);
          status.textContent+=' · Classificação: '+((type==='personal'?connection.classify:connection.manageInstitutional)?'autorizada':'revisar autorização');
        }
        status.classList.toggle('is-connected',connected);
        const button=document.querySelector('[data-connect-email="'+type+'"]');
        button.textContent=connected?'Revisar autorização':'Conectar';
        button.hidden=false;
        button.disabled=!configured;
        document.querySelector('[data-disconnect-email="'+type+'"]').hidden=!connected;
      }
      showAvailability();
    } catch {
      if(version!==statusVersion)return;
      configured=false;
      window.FarolDemands?.connectionChanged(null);
      window.FarolInstitutional?.connectionChanged(null);
      for(const type of types){
        const status=document.querySelector('#email-'+type+'-status');
        status.textContent='Conexão não verificada';
        status.classList.toggle('is-connected',false);
        document.querySelector('[data-disconnect-email="'+type+'"]').hidden=true;
        document.querySelector('[data-connect-email="'+type+'"]').disabled=true;
      }
      availability.textContent=connectionMessages.unavailable;
      continueButton.hidden=true;
    }
  }
  function openConnection(type){
    selectedType=type;
    const isGeneral=type==='general';
    document.querySelector('#email-connection-labels').hidden=isGeneral;
    document.querySelector('#email-general-labels').hidden=!isGeneral;
    document.querySelector('#email-connection-title').textContent=isGeneral?'Conectar conta geral da escola':'Conectar conta pessoal';
    document.querySelector('#email-connection-description').innerHTML=isGeneral
      ?'Escolha no Google a conta geral da sua escola. Esta conexão será usada para integração entre o <strong>Farol GE</strong> e a conta INSTITUCIONAL do colégio.'
      :'Esta conexão será usada para integração entre o <strong>Farol GE</strong> e a conta Google da pessoa que estiver utilizando a aplicação.';
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
        if(button.dataset.disconnectEmail==='personal')window.FarolDemands?.connectionChanged(null);
        if(button.dataset.disconnectEmail==='general')window.FarolInstitutional?.connectionChanged(null);
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
    params.delete('connection');
    params.delete('mailbox');
    window.history.replaceState(null,'',location.pathname+(params.size?'?'+params.toString():'')+location.hash);
  }
  window.addEventListener('focus',refresh);
  refresh();
}

window.addEventListener('hashchange',()=>{
  render();
  document.querySelector('#main').focus({preventScroll:true});
  window.scrollTo(0,0);
});
updateSchool();
setupEmailConnections();
render();
