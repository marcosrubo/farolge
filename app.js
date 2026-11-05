'use strict';
// Protótipo com dados inventados. Não consulta contas nem sistemas externos.
const config = {...window.FAROL_CONFIG};
const icons = {
  inicio:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  demandas:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  agenda:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
  frequencia:'<path d="M4 20V10m6 10V4m6 16v-7m5 7H2"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7"/><circle cx="12" cy="12" r="1"/>',
  configuracoes:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.inicio}</svg>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const modules = [
  {id:'inicio',label:'Visão GERAL',title:'Um olhar para toda a escola.',description:'As informações que importam, reunidas para o próximo passo.'},
  {id:'institucionais',icon:'demandas',label:'Demandas INSTITUCIONAIS',title:'Demandas INSTITUCIONAIS',description:'Pendências e retornos da caixa geral da escola.'},
  {id:'pessoais',icon:'demandas',label:'Demandas PESSOAIS',title:'Demandas PESSOAIS',description:'Suas pendências e retornos na caixa individual institucional.'},
  {id:'radar',label:'Radar',title:'Acompanhar para acolher.',description:'Situações que precisam de atenção e ações que aproximam a escola dos estudantes.'},
  {id:'bi-seed',icon:'frequencia',label:'BI SEED',title:'BI SEED',description:'Espaço reservado para a área de indicadores.'},
  {id:'configuracoes',label:'Configurações',title:'Uma plataforma, a sua escola.',description:'Identidade e organização que podem acompanhar cada instituição.'},
  // Mantém as telas existentes acessíveis pelos resumos da visão geral.
  {id:'agenda',icon:'agenda',nav:false,label:'Agenda institucional',title:'Tempo para se organizar.',description:'Prazos e compromissos da escola, com responsáveis e próximos passos.'},
  {id:'frequencia',icon:'frequencia',nav:false,label:'Frequência',title:'Presença que faz diferença.',description:'Um olhar atento às ausências para agir com antecedência.'}
];
const isDemandView = () => ['institucionais','pessoais'].includes(currentView);
const demands = [
  {id:'d1',box:'individual',column:'incoming',tag:'Pedagógico',title:'Plano de aulas do próximo mês',description:'Aguardando o planejamento para organizar as atividades da equipe.',person:'Ana · equipe pedagógica',date:'03 nov.',high:true},
  {id:'d2',box:'individual',column:'incoming',tag:'Secretaria',title:'Conferência das matrículas',description:'Retorno sobre a relação atualizada de estudantes por turma.',person:'Secretaria',date:'02 nov.'},
  {id:'d3',box:'individual',column:'personal',tag:'Organização',title:'Preparar a pauta da reunião',description:'Reunir os assuntos para o próximo encontro pedagógico.',person:'Minha pendência',date:'04 nov.',high:true},
  {id:'d4',box:'individual',column:'personal',tag:'Planejamento',title:'Revisar o calendário escolar',description:'Conferir as atividades de encerramento do semestre.',person:'Minha pendência',date:'03 nov.'},
  {id:'d5',box:'individual',column:'outgoing',tag:'Coordenação',title:'Enviar relatório de acompanhamento',description:'Consolidar as observações e compartilhar com a coordenação.',person:'Para Beatriz · coordenação',date:'03 nov.',high:true},
  {id:'d6',box:'individual',column:'outgoing',tag:'Projeto de leitura',title:'Dar retorno sobre a proposta',description:'Encaminhar sugestões para o projeto de leitura da equipe.',person:'Para Pedro · pedagógico',date:'02 nov.'},
  {id:'d7',box:'escola',column:'incoming',tag:'Infraestrutura',title:'Retorno sobre a manutenção',description:'Aguardando confirmação da visita técnica à biblioteca.',person:'Equipe de manutenção',date:'03 nov.',high:true},
  {id:'d8',box:'escola',column:'personal',tag:'Institucional',title:'Conferir o comunicado de avaliações',description:'Revisar as orientações recebidas no e-mail geral da escola.',person:'Equipe responsável',date:'04 nov.'},
  {id:'d9',box:'escola',column:'outgoing',tag:'Documentação',title:'Encaminhar documentação do semestre',description:'Reunir os documentos para responder à solicitação institucional.',person:'Para equipe regional',date:'03 nov.',high:true}
];
const appointments = [
  {id:'a1',day:'05',month:'NOV',title:'Enviar o levantamento de matrículas',person:'Secretaria',source:'Comunicado institucional · exemplo',status:'A confirmar',tone:'amber',description:'Prazo de exemplo identificado em um comunicado fictício. Na integração futura, uma pessoa deverá confirmar a data e o responsável antes de incluí-lo na agenda.'},
  {id:'a2',day:'06',month:'NOV',title:'Reunião de acompanhamento pedagógico',person:'Equipe pedagógica',source:'Planejamento interno · exemplo',status:'Confirmado',tone:'',description:'Reunir os encaminhamentos das turmas e as ações da equipe para o próximo período.'},
  {id:'a3',day:'09',month:'NOV',title:'Revisar os registros de frequência',person:'Pedagógico',source:'Rotina da escola · exemplo',status:'Confirmado',tone:'',description:'Revisão dos registros fictícios para planejar os contatos de acompanhamento.'},
  {id:'a4',day:'12',month:'NOV',title:'Entregar o relatório do projeto de leitura',person:'Coordenação',source:'Comunicado institucional · exemplo',status:'A confirmar',tone:'amber',description:'Exemplo de compromisso que precisa de validação da equipe. Nenhum e-mail foi analisado.'}
];
const students = [
  {id:'e1',name:'Estudante A',initials:'EA',group:'7º ano A',absences:7,sequence:3,level:'Atenção prioritária',tone:'rose',action:'Conferir registros e planejar contato',owner:'Equipe pedagógica'},
  {id:'e2',name:'Estudante B',initials:'EB',group:'8º ano B',absences:5,sequence:2,level:'Em acompanhamento',tone:'amber',action:'Acompanhar retorno às aulas',owner:'Equipe pedagógica'},
  {id:'e3',name:'Estudante C',initials:'EC',group:'6º ano A',absences:4,sequence:1,level:'Em acompanhamento',tone:'amber',action:'Revisar registros com a turma',owner:'Secretaria'},
  {id:'e4',name:'Estudante D',initials:'ED',group:'9º ano A',absences:2,sequence:0,level:'Monitoramento',tone:'blue',action:'Observar os próximos registros',owner:'Equipe pedagógica'}
];
const cases = [
  {id:'r1',student:'Estudante A',group:'7º ano A',type:'Busca Ativa',status:'Contato planejado',tone:'amber',owner:'Equipe pedagógica',next:'Planejar contato com os responsáveis',date:'05 nov.',description:'Caso totalmente fictício para demonstrar a organização de providências. O protótipo não classifica riscos automaticamente nem realiza contatos.'},
  {id:'r2',student:'Estudante B',group:'8º ano B',type:'SERP',status:'Em acompanhamento',tone:'blue',owner:'Direção',next:'Revisar os encaminhamentos com a equipe',date:'06 nov.',description:'Registro fictício de acompanhamento. Não há consulta, envio ou integração com o SERP.'},
  {id:'r3',student:'Estudante C',group:'6º ano A',type:'Busca Ativa',status:'Retorno a acompanhar',tone:'',owner:'Equipe pedagógica',next:'Acompanhar a presença na próxima semana',date:'09 nov.',description:'Exemplo de acompanhamento após uma ação da equipe. Os dados não correspondem a estudantes reais.'},
  {id:'r4',student:'Estudante D',group:'9º ano A',type:'SINAN',status:'Revisão da equipe',tone:'rose',owner:'Direção',next:'Consultar o registro no ambiente autorizado',date:'06 nov.',description:'Exemplo de referência a um registro restrito, sem conteúdo de saúde ou relato pessoal. Não há integração, notificação ou acesso ao SINAN.'}
];
const columnNames = {incoming:'DEVEM PARA MIM',personal:'MINHAS PRÓPRIAS PENDÊNCIAS',outgoing:'DEVO PARA ALGUÉM'};
const columnDescriptions = {incoming:'Retornos que estou aguardando.',personal:'O que preciso organizar e resolver.',outgoing:'Entregas que dependem de mim.'};
let currentView = 'inicio';
let mailbox = 'individual';
let toastTimer;
const view = document.querySelector('#view');
const dialog = document.querySelector('#details');
const badge = (text,tone='') => `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
const detailsButton = (type,id,text='Ver detalhes') => `<button class="table-button" data-detail="${type}" data-id="${id}">${text}</button>`;

function openDialog(title,content){
  document.querySelector('#dialog-title').textContent=title;
  document.querySelector('#dialog-content').innerHTML=content;
  if(!dialog.open) dialog.showModal();
}
function metadata(pairs){return `<dl>${pairs.map(([name,value])=>`<dt>${escapeHtml(name)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>`;}
function showDetails(type,id){
  let item;
  let title;
  let content;
  if(type==='demand'){
    item=demands.find(row=>row.id===id); if(!item)return;
    title=item.title;
    content=`<p>${escapeHtml(item.description)}</p>${metadata([['Espaço',item.box==='individual'?'Demandas PESSOAIS':'Demandas INSTITUCIONAIS'],['Participante',item.person],['Marcador Gmail',config.gmailLabels[item.column]],['Data do exemplo',item.date+' de 2026'],['Prioridade ilustrativa',item.high?'Alta':'Normal']])}<p class="notice">O botão para abrir a conversa no Gmail estará disponível com a integração real. Não há e-mail associado a este exemplo.</p>`;
  }else if(type==='agenda'){
    item=appointments.find(row=>row.id===id); if(!item)return;
    title=item.title;
    content=`<p>${escapeHtml(item.description)}</p>${metadata([['Data do exemplo',item.day+' de novembro de 2026'],['Responsável',item.person],['Situação',item.status],['Origem',item.source]])}`;
  }else if(type==='student'){
    item=students.find(row=>row.id===id); if(!item)return;
    title=item.name+' · frequência';
    content=`${metadata([['Turma',item.group],['Faltas no período',item.absences],['Faltas consecutivas',item.sequence],['Responsável',item.owner],['Próxima ação',item.action]])}<p class="notice">Dados inventados de outubro de 2026. Os níveis de atenção são exemplos para apresentação, sem regra oficial ou avaliação automática.</p>`;
  }else{
    item=cases.find(row=>row.id===id); if(!item)return;
    title=item.student+' · '+item.type;
    content=`<p>${escapeHtml(item.description)}</p>${metadata([['Turma',item.group],['Situação',item.status],['Responsável',item.owner],['Próximo passo',item.next],['Data do exemplo',item.date+' de 2026']])}<p class="notice">Somente a equipe autorizada deverá acessar estes acompanhamentos na versão real. Este protótipo contém apenas exemplos públicos e fictícios.</p>`;
  }
  openDialog(title,content);
}

function agendaItem(item){return `<button class="list-item" data-detail="agenda" data-id="${item.id}"><span class="day-box"><b>${item.day}</b>${item.month}</span><span class="list-main"><strong>${item.title}</strong><small>${item.person} · ${item.source}</small></span>${badge(item.status,item.tone)}<span class="arrow" aria-hidden="true">↗</span></button>`;}
function overview(){
  const stats=[['pessoais','Demandas pessoais',demands.filter(d=>d.box==='individual').length,'2 entregas para outras pessoas',''],['agenda','Próximos compromissos',appointments.length,'2 datas aguardam confirmação','gold'],['frequencia','Frequência em atenção',students.filter(s=>s.absences>=4).length,'Registros ilustrativos de outubro','blue'],['radar','Acompanhamentos',cases.length,'4 próximos passos organizados','rose']];
  return `<section class="stats-grid" aria-label="Resumo dos módulos">${stats.map(([id,label,total,note,tone])=>`<button class="stat" data-nav="${id}"><span class="stat-top">${label}<span class="stat-icon ${tone}">${icon(id==='pessoais'?'demandas':id)}</span></span><div class="stat-number">${String(total).padStart(2,'0')}</div><span class="stat-note">${note}</span></button>`).join('')}</section>
  <div class="overview-grid"><div><section class="panel"><div class="section-heading"><div><h2>Os próximos passos da escola</h2><p>Organize hoje o que vem pela frente.</p></div><a href="#agenda">Ver agenda ↗</a></div>${appointments.slice(0,3).map(agendaItem).join('')}</section>
  <section class="panel"><div class="section-heading"><div><h2>Atenção que vira acompanhamento</h2><p>Estudantes fictícios com ações para a equipe.</p></div><a href="#radar">Abrir Radar ↗</a></div>${cases.slice(0,2).map(item=>`<div class="attention-row"><span class="initial">${item.student==='Estudante A'?'EA':'EB'}</span><div class="list-main"><strong>${item.student} <span style="color:#a1ab95;font-weight:400">· ${item.group}</span></strong><small>${item.next}</small></div>${badge(item.type,item.tone)}<button class="text-button" data-detail="case" data-id="${item.id}" aria-label="Ver acompanhamento de ${item.student}">↗</button></div>`).join('')}</section></div>
  <section class="panel"><div class="section-heading"><div><h2>Presença em perspectiva</h2><p>Faltas por semana · outubro de 2026</p></div>${badge('Exemplo')}</div><div class="chart" role="img" aria-label="Faltas fictícias: semana 1, 12; semana 2, 9; semana 3, 15; semana 4, 8. Referência de comparação fictícia: 10 faltas por semana.">${[12,9,15,8].map((value,index)=>`<div class="bar-group"><div class="bar" style="--bar:${value*6}px" title="${value} faltas"></div><div class="bar pale" style="--bar:60px" title="10 faltas de referência"></div><span>SEM ${index+1}</span></div>`).join('')}</div><div class="chart-key"><span><i></i>Faltas registradas</span><span><i class="pale"></i>Referência ilustrativa</span></div><p class="chart-description">O gráfico ajuda a apresentar a proposta de acompanhamento. Os valores são fictícios e não representam a escola.</p><div style="margin-top:17px"><a class="text-button" href="#frequencia">Consultar frequência →</a></div></section></div>
  <section><div class="section-heading"><h2>Uma escola conectada em cada frente</h2></div><div class="module-grid">${modules.filter(module=>module.nav!==false).slice(1,5).map((module,index)=>`<a class="module-card" href="#${module.id}"><span class="stat-icon ${['','gold','blue','rose'][index]}">${icon(module.icon||module.id)}</span><span><strong>${module.label}</strong><small>${['Caixa geral da escola','Caixa individual','Cuidar e acompanhar','Área em preparação'][index]}</small></span><span class="arrow">↗</span></a>`).join('')}</div></section>`;
}
function filterBar(placeholder,options){return `<div class="filters"><label class="search">${icon('search')}<input id="module-search" type="search" placeholder="${placeholder}" aria-label="${placeholder}"></label>${options||''}<span class="filter-count" id="filter-count" role="status"></span></div>`;}
function demandView(){return `<p class="mailbox-caption">${mailbox==='individual'?'Caixa individual institucional':'Caixa geral da escola'} · conexão de demonstração · nenhum e-mail acessado</p>${filterBar('Buscar assunto ou participante','<select id="module-filter" aria-label="Filtrar prioridade"><option value="all">Todas as prioridades</option><option value="high">Prioridade alta</option></select>')}<div class="board">${Object.keys(columnNames).map(column=>`<section class="column ${column}" aria-labelledby="title-${column}"><h2 id="title-${column}">${columnNames[column]}<span id="count-${column}">0</span></h2><p>${columnDescriptions[column]}</p><div id="cards-${column}"></div></section>`).join('')}</div><p class="notice">Marcadores definidos no Gmail: ${Object.values(config.gmailLabels).map(escapeHtml).join(' · ')}. Arquivadas ficam fora destas três colunas, como proposta inicial.</p>`;}
function refreshDemands(){
  const query=normalize(document.querySelector('#module-search').value);
  const high=document.querySelector('#module-filter').value==='high';
  const filtered=demands.filter(item=>item.box===mailbox&&(!high||item.high)&&normalize(item.title+' '+item.person+' '+item.description).includes(query));
  for(const column of Object.keys(columnNames)){
    const items=filtered.filter(item=>item.column===column);
    document.querySelector('#count-'+column).textContent=items.length;
    document.querySelector('#cards-'+column).innerHTML=items.map(item=>`<button class="demand-card" data-detail="demand" data-id="${item.id}"><span class="card-top">${badge(item.tag)}${item.high?badge('Alta prioridade','amber'):''}</span><h3>${item.title}</h3><p>${item.description}</p><span class="card-bottom"><span>${item.person}</span><span>${item.date}</span></span></button>`).join('')||'<p class="empty">Nenhuma demanda com estes filtros.</p>';
  }
  document.querySelector('#filter-count').textContent=filtered.length+' demandas de exemplo';
}
function tableView(){
  if(currentView==='agenda')return `${filterBar('Buscar compromisso ou responsável','<select id="module-filter" aria-label="Filtrar situação"><option value="all">Todas as situações</option><option value="A confirmar">A confirmar</option><option value="Confirmado">Confirmado</option></select>')}<div class="panel" id="table-content"></div><p class="notice">Na versão real, datas identificadas em e-mails deverão ser confirmadas pela equipe. A data de envio de um e-mail não equivale ao prazo de uma demanda.</p>`;
  if(currentView==='frequencia')return `${filterBar('Buscar estudante ou turma','<select id="module-filter" aria-label="Filtrar acompanhamento"><option value="all">Todos os acompanhamentos</option><option value="Atenção prioritária">Atenção prioritária</option><option value="Em acompanhamento">Em acompanhamento</option><option value="Monitoramento">Monitoramento</option></select>')}<div class="table-wrap" id="table-content"></div><p class="notice">Período fictício: outubro de 2026. As faltas e os níveis de atenção servem apenas à demonstração. Regras, origem dos registros e critérios de acompanhamento ainda serão definidos pela escola.</p>`;
  return `${filterBar('Buscar estudante ou responsável','<select id="module-filter" aria-label="Filtrar tipo de acompanhamento"><option value="all">Todos os tipos</option><option>Busca Ativa</option><option>SERP</option><option>SINAN</option></select>')}<div class="table-wrap" id="table-content"></div><p class="notice">Acompanhamentos totalmente fictícios. Não há integração com SERP, SINAN ou sistemas de Busca Ativa. O acesso real deverá respeitar as permissões da equipe responsável.</p>`;
}
function refreshTable(){
  const query=normalize(document.querySelector('#module-search').value);
  const filter=document.querySelector('#module-filter').value;
  let filtered;
  let html;
  if(currentView==='agenda'){
    filtered=appointments.filter(item=>(filter==='all'||item.status===filter)&&normalize(item.title+' '+item.person).includes(query));
    html=filtered.map(agendaItem).join('');
  }else if(currentView==='frequencia'){
    filtered=students.filter(item=>(filter==='all'||item.level===filter)&&normalize(item.name+' '+item.group).includes(query));
    html=`<table><caption>Estudantes fictícios · outubro de 2026</caption><thead><tr><th>ESTUDANTE / TURMA</th><th>FALTAS NO PERÍODO</th><th>CONSECUTIVAS</th><th>ACOMPANHAMENTO</th><th>PRÓXIMO PASSO</th><th>DETALHES</th></tr></thead><tbody>${filtered.map(item=>`<tr><td><strong>${item.name}</strong><br><small>${item.group}</small></td><td>${item.absences}</td><td>${item.sequence}</td><td>${badge(item.level,item.tone)}</td><td>${item.action}</td><td>${detailsButton('student',item.id)}</td></tr>`).join('')}</tbody></table>`;
  }else{
    filtered=cases.filter(item=>(filter==='all'||item.type===filter)&&normalize(item.student+' '+item.owner+' '+item.group).includes(query));
    html=`<table><caption>Encaminhamentos fictícios · sem registros reais</caption><thead><tr><th>ESTUDANTE / TURMA</th><th>TIPO</th><th>SITUAÇÃO</th><th>RESPONSÁVEL</th><th>PRÓXIMO PASSO</th><th>DETALHES</th></tr></thead><tbody>${filtered.map(item=>`<tr><td><strong>${item.student}</strong><br><small>${item.group}</small></td><td>${item.type}</td><td>${badge(item.status,item.tone)}</td><td>${item.owner}</td><td>${item.next}<br><small>${item.date}</small></td><td>${detailsButton('case',item.id)}</td></tr>`).join('')}</tbody></table>`;
  }
  document.querySelector('#table-content').innerHTML=filtered.length?html:'<p class="empty">Nenhum resultado com estes filtros.</p>';
  document.querySelector('#filter-count').textContent=filtered.length+' registros de exemplo';
}
function biSeedView(){return `<section class="panel"><div class="section-heading"><h2>BI SEED</h2>${badge('Em preparação','blue')}</div><p class="notice">Esta área foi incluída no menu. O conteúdo e a forma de acesso ao BI SEED ainda serão definidos com a escola. Nenhum sistema externo está conectado.</p></section>`;}
function settings(){return `<div class="settings-grid"><section class="panel"><h2>A identidade da sua escola</h2><form id="school-form"><label class="field">Nome da escola<input class="form-control" id="school-name" maxlength="80" required value="${escapeHtml(config.schoolName)}"></label><label class="field">Sigla ou iniciais<input class="form-control" id="school-initials" maxlength="4" required value="${escapeHtml(config.schoolInitials)}"></label><label class="field">Descrição da instituição<input class="form-control" id="school-subtitle" maxlength="100" value="${escapeHtml(config.schoolSubtitle)}"></label><div class="button-row"><button class="button primary" type="submit">Aplicar nesta demonstração</button><button class="button" type="button" id="reset-school">Restaurar exemplo</button></div><p>A mudança vale apenas para esta página. Ao recarregar, a configuração original retorna. Na publicação, a identidade inicial fica no arquivo config.js.</p></form></section><section class="panel"><h2>Conexões da escola</h2>${['Gmail individual','Gmail da escola','Drive e Google Planilhas'].map(name=>`<div class="connection-row"><div><strong>${name}</strong><small>Integração ainda não configurada</small></div>${badge('Não conectado')}</div>`).join('')}<p>O login da pessoa e as autorizações para cada conta serão independentes. Este protótipo não pede senha nem inicia autenticação.</p><button class="button" id="connection-info">Entender as conexões</button></section><section class="panel"><h2>Identidade da plataforma</h2><img class="settings-mark" src="arte/farol-ge-simbolo-quadrado.png" alt="Farol sobre um livro aberto"><p><strong>FAROL GE — Farol da Gestão Escolar</strong><br>Uma aplicação organizada por módulos, com identidade configurável para cada escola.</p><p>O símbolo do farol pertence à plataforma. O emblema da instituição é definido separadamente em config.js e aparece ao lado do nome da escola.</p></section><section class="panel"><h2>Organização do Gmail</h2><dl>${Object.entries(columnNames).map(([key,title])=>`<dt>${title}</dt><dd>${escapeHtml(config.gmailLabels[key])}</dd>`).join('')}<dt>ARQUIVADAS</dt><dd>${escapeHtml(config.gmailLabels.archived)}</dd></dl></section></div>`;}
function updateSchool(){
  document.querySelectorAll('[data-school]').forEach(element=>{element.textContent=config.schoolName;});
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
function toast(message){clearTimeout(toastTimer);const element=document.querySelector('#toast');element.textContent=message;element.hidden=false;toastTimer=setTimeout(()=>{element.hidden=true;},4500);}
function render(){
  const route=location.hash.slice(1)==='demandas'?'pessoais':location.hash.slice(1);
  const module=modules.find(item=>item.id===route)||modules[0];
  currentView=module.id;
  if(isDemandView())mailbox=currentView==='institucionais'?'escola':'individual';
  document.title='FAROL GE · '+module.label;
  document.querySelector('#breadcrumb-title').textContent=module.label;
  document.querySelector('#page-title').textContent=module.title;
  document.querySelector('#page-description').textContent=module.description;
  document.querySelector('#eyebrow').textContent=currentView==='inicio'?'CONECTAR, ACOMPANHAR, AGIR':'FAROL GE / '+module.label.toUpperCase();
  document.querySelector('#navigation').innerHTML=modules.filter(item=>item.nav!==false).map((item,index)=>`${item.id==='configuracoes'?'<div class="nav-divider"></div>':''}<a class="nav-link ${item.id===currentView?'active':''}" href="#${item.id}" ${item.id===currentView?'aria-current="page"':''}>${icon(item.icon||item.id)}<span>${item.label}</span>${index>0&&index<5?'<span class="nav-number">0'+index+'</span>':''}</a>`).join('');
  view.innerHTML=currentView==='inicio'?overview():isDemandView()?demandView():currentView==='configuracoes'?settings():currentView==='bi-seed'?biSeedView():tableView();
  updateSchool();
  if(isDemandView())refreshDemands();
  if(['agenda','frequencia','radar'].includes(currentView))refreshTable();
}
function about(){openDialog('Uma visão do que podemos construir.',`<p>O FAROL GE reúne gestão e acompanhamento escolar em uma aplicação, com módulos e identidade adaptáveis a outras escolas.</p><ul><li><strong>Demandas INSTITUCIONAIS:</strong> caixa geral da escola.</li><li><strong>Demandas PESSOAIS:</strong> caixa individual institucional.</li><li><strong>Radar:</strong> organização de providências e acompanhamentos.</li><li><strong>BI SEED:</strong> área reservada para definição do conteúdo.</li></ul><p class="notice">Tudo nesta demonstração é fictício. Não há login, contas conectadas, leitura de e-mails, análise automática, armazenamento no Drive ou alteração de sistemas externos. Recarregar a página restaura o exemplo.</p>`);}
document.querySelector('#about-button').addEventListener('click',about);
document.querySelector('#tour-button').addEventListener('click',()=>openDialog('Um roteiro para apresentar à equipe.',`<ol><li>Comece pela <strong>Visão GERAL</strong>, com as frentes de trabalho da escola.</li><li>Compare <strong>Demandas INSTITUCIONAIS</strong> com <strong>Demandas PESSOAIS</strong> pelo menu.</li><li>Em <strong>Radar</strong>, abra os detalhes dos exemplos de acompanhamento.</li><li>Mostre o espaço <strong>BI SEED</strong>, ainda em preparação.</li><li>Em <strong>Configurações</strong>, experimente o nome de outra escola para demonstrar a personalização.</li></ol><p class="notice">Os números e a data de referência são fixos para apresentação. Não são indicadores reais ou dados atualizados.</p>`));
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
document.querySelector('#done-dialog').addEventListener('click',()=>dialog.close());
view.addEventListener('click',event=>{
  const detail=event.target.closest('[data-detail]');if(detail){showDetails(detail.dataset.detail,detail.dataset.id);return;}
  const nav=event.target.closest('[data-nav]');if(nav){location.hash=nav.dataset.nav;return;}
  if(event.target.closest('#reset-school')){Object.assign(config,window.FAROL_CONFIG);render();toast('Identidade de exemplo restaurada.');}
  if(event.target.closest('#connection-info'))openDialog('Uma entrada, conexões independentes.',`<p>A pessoa entrará com sua conta Google. O acesso à caixa individual, ao e-mail da escola e aos arquivos do Drive dependerá de autorizações específicas.</p><p>Ter acesso ao portal não dará automaticamente acesso aos dados de outras pessoas ou da instituição.</p><p class="notice">As conexões reais ainda serão implementadas. Esta tela apenas apresenta a proposta.</p>`);
});
view.addEventListener('input',event=>{if(event.target.id==='module-search'){if(isDemandView())refreshDemands();else refreshTable();}});
view.addEventListener('change',event=>{if(event.target.id==='module-filter'){if(isDemandView())refreshDemands();else refreshTable();}});
view.addEventListener('submit',event=>{
  if(event.target.id!=='school-form')return;
  event.preventDefault();
  const name=document.querySelector('#school-name').value.trim();
  const initials=document.querySelector('#school-initials').value.trim();
  if(!name||!initials){toast('Preencha o nome e as iniciais da escola.');return;}
  config.schoolName=name;config.schoolInitials=initials;config.schoolSubtitle=document.querySelector('#school-subtitle').value.trim();
  updateSchool();toast('Identidade aplicada somente nesta demonstração.');
});
window.addEventListener('hashchange',()=>{render();document.querySelector('#main').focus({preventScroll:true});window.scrollTo(0,0);});
render();
