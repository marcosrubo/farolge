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
  const route=location.hash.slice(1)==='demandas'?'pessoais':location.hash.slice(1);
  const selected=modules.find(item=>item.id===route)||modules[0];
  document.title='FAROL GE · '+selected.label;
  document.querySelector('#breadcrumb-title').textContent=selected.label;
  document.querySelector('#navigation').innerHTML=modules.map((item,index)=>`${item.id==='configuracoes'?'<div class="nav-divider"></div>':''}<a class="nav-link ${item.id===selected.id?'active':''}" href="#${item.id}" ${item.id===selected.id?'aria-current="page"':''}>${icon(item.icon)}<span>${item.label}</span>${index>0&&index<5?'<span class="nav-number">0'+index+'</span>':''}</a>`).join('');
  const main=document.querySelector('#main');
  main.classList.toggle('radar-workspace',selected.id==='radar');
  main.innerHTML=selected.id==='radar'?renderRadar():renderDevelopment(selected.id);
}
function setupEmailConnections(){
  const dialog=document.querySelector('#email-connection-dialog');
  document.querySelectorAll('[data-connect-email]').forEach(button=>{
    button.addEventListener('click',()=>{
      const isGeneral=button.dataset.connectEmail==='general';
      document.querySelector('#email-connection-title').textContent=isGeneral?'Conectar e-mail institucional geral':'Conectar e-mail pessoal institucional';
      document.querySelector('#email-connection-description').textContent=isGeneral
        ?'Esta conexão será usada para consultar as Demandas INSTITUCIONAIS na caixa geral do colégio.'
        :'Esta conexão será usada para consultar suas Demandas PESSOAIS na sua caixa institucional individual.';
      dialog.showModal();
    });
  });
}

window.addEventListener('hashchange',()=>{
  render();
  document.querySelector('#main').focus({preventScroll:true});
  window.scrollTo(0,0);
});
updateSchool();
setupEmailConnections();
render();
