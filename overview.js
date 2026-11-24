'use strict';
window.FarolOverview=(()=>{
  const groups={general:{title:'E-mails da ESCOLA',labels:[['INBOX','Caixa de Entrada'],['GE_Classificadas','Classificadas'],['GE_Arquivadas','Arquivadas']]},personal:{title:'E-mails PESSOAIS',labels:[['GE_ME DEVEM','ME DEVEM'],['GE_MINHAS','MINHAS'],['GE_DEVO','DEVO'],['INBOX','Caixa de Entrada'],['GE_Despachadas','Despachadas']]}};
  const types=Object.keys(groups),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const occurrences=window.FarolOccurrences?.create({id:'overview-occurrences',action:'occurrences'});
  const number=new Intl.NumberFormat('pt-BR');
  let autoEnabled=true,autoTimer=null;
  function stopAuto(){if(autoTimer!==null){clearInterval(autoTimer);autoTimer=null;}}
  function drawAuto(){if(root)root.querySelector('#overview-auto-status').textContent=!autoEnabled?'Atualização automática desativada.':document.hidden?'Atualização automática pausada enquanto a aba estiver oculta.':'Atualização automática ativada: totais e ocorrências mais recentes a cada minuto.';}
  function refreshAuto(){
    if(!root||!autoEnabled||document.hidden)return;
    for(const type of types)load(type);
    occurrences?.load();
  }
  function scheduleAuto(){stopAuto();drawAuto();if(root&&autoEnabled&&!document.hidden)autoTimer=setInterval(refreshAuto,60000);}
  function visibilityChanged(){scheduleAuto();if(!document.hidden)refreshAuto();}
  let root=null,states=Object.fromEntries(types.map(type=>[type,{connection:null,items:[],busy:false,error:'',version:0}]));
  function clear(type){const s=states[type];s.version++;s.items=[];s.busy=false;s.error='';}
  function draw(type){
    if(!root)return;
    const s=states[type],group=groups[type],connected=s.connection?.gmail;
    root.querySelector('#overview-identity-'+type).textContent=s.connection?.email||'Conta '+(type==='general'?'GERAL':'PESSOAL')+' não conectada';
    const messages={login_required:'A consulta ao Gmail precisa ser verificada.',missing_scope:'A consulta ao Gmail precisa de autorização de Marcos.',account_changed:'A conta mudou. Atualize os totais.',unavailable:'Não foi possível consultar os totais. Tente atualizar.'};
    root.querySelector('#overview-status-'+type).textContent=s.busy?'Atualizando totais…':s.error?(messages[s.error]||messages.unavailable)+(s.items.length?' Dados anteriores mantidos.':''):!connected?'A consulta ao Gmail desta conexão está indisponível.':'';
    root.querySelector('#overview-cards-'+type).innerHTML=group.labels.map(([name,title])=>{
      const item=s.items.find(item=>item.name===name),ready=connected&&item?.status==='ready'&&Number.isSafeInteger(item.total)&&item.total>=0;
      const status=ready?'mensagens':s.busy?'Consultando':!connected?'Sem conexão':s.error?'Indisponível':item?.status==='missing'?'Marcador ausente':item?.status==='unavailable'?'Indisponível':ready?'mensagens':'Aguardando consulta';
      return `<div class="overview-row"><dt>${escape(title)}:</dt><dd><strong${name==='INBOX'&&ready?' class="overview-inbox-total"':''} aria-label="${escape(title+': '+(ready?number.format(item.total)+' mensagens':status))}">${ready?number.format(item.total):'—'}</strong>${ready?'':`<span class="overview-row-status">${escape(status)}</span>`}</dd></div>`;
    }).join('');
    root.querySelector('#overview-refresh-'+type).disabled=s.busy||!connected;
  }
  async function load(type){
    const s=states[type];if(!root||!s.connection?.gmail||s.busy)return;
    const ticket=++s.version,mailbox=s.connection.email;s.busy=true;s.error='';draw(type);
    try{
      const params=new URLSearchParams({type,mailbox});
      const response=await fetch('/api/google/overview?'+params,{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();window.FarolAccessDenied?.(result);if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==s.version||!root)return;
      if(result.mailbox!==mailbox||result.type!==type||!Array.isArray(result.items))throw new Error('account_changed');
      s.items=result.items;
    }catch(error){if(ticket===s.version){s.error=error.message;if(['login_required','account_changed','missing_scope'].includes(s.error))s.items=[];}}
    finally{if(ticket===s.version){s.busy=false;draw(type);}}
  }
  function connectionChanged(type,value,school=value){
    if(!groups[type])return;
    if(type==='general')occurrences?.connectionChanged(school);
    const s=states[type],changed=s.connection?.email!==value?.email||s.connection?.gmail!==value?.gmail;s.connection=value;
    if(changed){clear(type);draw(type);if(root&&value?.gmail)load(type);}
  }
  function mount(element){
    root=element;
    root.innerHTML=`<h1>Visão GERAL</h1><p class="demand-intro">Acompanhe os totais de mensagens da Escola e Pessoal e as ocorrências dos alunos.</p><div class="overview-auto"><label><input type="checkbox" id="overview-auto-refresh"> Atualizar automaticamente a cada 1 minuto</label><p class="overview-status" id="overview-auto-status" role="status"></p></div><div class="overview-groups">${types.map(type=>`<section class="overview-group" aria-labelledby="overview-title-${type}"><div class="overview-heading"><h2 id="overview-title-${type}">${groups[type].title}</h2></div><p class="overview-identity" id="overview-identity-${type}"></p><dl class="overview-totals" id="overview-cards-${type}"></dl><p class="overview-status" role="status" id="overview-status-${type}"></p><button class="button overview-refresh" id="overview-refresh-${type}">Atualizar totais</button></section>`).join('')}${occurrences?.markup()||''}</div><p class="demand-footnote">Os números são totais de mensagens por marcador, incluindo lidas e não lidas e todas as páginas. Uma mensagem pode aparecer em vários marcadores; os totais não devem ser somados. Marcadores ausentes e falhas de consulta não são apresentados como zero.</p><p class="demand-footnote">Em desenvolvimento: acompanhamento de alunos e índices do BI da SEED.</p>`;
    root.querySelector('#overview-auto-refresh').checked=autoEnabled;
    root.querySelector('#overview-auto-refresh').addEventListener('change',()=>{autoEnabled=root.querySelector('#overview-auto-refresh').checked;scheduleAuto();refreshAuto();});
    document.addEventListener('visibilitychange',visibilityChanged);scheduleAuto();
    occurrences?.mount(root);
    for(const type of types){clear(type);root.querySelector('#overview-refresh-'+type).addEventListener('click',()=>load(type));draw(type);if(states[type].connection?.gmail)load(type);}
  }
  function unmount(){stopAuto();document.removeEventListener('visibilitychange',visibilityChanged);occurrences?.unmount();for(const type of types)clear(type);root=null;}
  return {mount,unmount,connectionChanged};
})();
