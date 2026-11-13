'use strict';
window.FarolInstitutional=(()=>{
  const titles=['Caixa de entrada','Classificadas','Arquivadas'];
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const displayDate=value=>value.split('-').reverse().join('/');
  const received=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
  const errors={login_required:'Conecte novamente a conta GERAL.',missing_scope:'Use GERAL → Revisar autorização para permitir a consulta ao Gmail.',institutional_scope:'Use GERAL → Revisar autorização para permitir classificação e arquivamento.',labels_missing:'Use GERAL → Revisar autorização para preparar Classificadas e Arquivadas.',setup_required:'Execute database/institutional-demands.sql no Supabase exclusivo FAROL GE para preparar os prazos.',account_changed:'A conta GERAL mudou. Atualize o quadro.',invalid_page:'Atualize o quadro para reiniciar a paginação.',conflict:'O prazo foi alterado em outra janela. Atualize o quadro antes de tentar novamente.',not_inbox:'A mensagem foi movida ou não está mais disponível para esta operação. Atualize o quadro.',invalid_institutional:'Informe uma data limite válida antes de classificar.',classification_unconfirmed:'O Gmail não confirmou a movimentação. Atualize o quadro antes de tentar novamente.',listing_limit:'Classificadas excede o limite de 10 mil mensagens. A ordenação completa não pôde ser feita.',unavailable:'Não foi possível concluir a operação. Se estava classificando, o prazo pode ter sido salvo. Atualize para conferir e tente novamente.'};
  let root=null,connection=null,columns=[],moving=false,feedback='',search='',epoch=0,drafts=new Map();
  function reset(){++epoch;columns=titles.map(()=>({items:[],nextPage:null,busy:false,loaded:false,error:''}));moving=false;feedback='';drafts=new Map();}
  function shown(index){
    const query=search.toLocaleLowerCase('pt-BR');
    return columns[index].items.filter(m=>!query||[m.subject,m.from,...m.activities.map(a=>a.evidence)].join(' ').toLocaleLowerCase('pt-BR').includes(query))
      .sort((a,b)=>index===1?(a.dueDate||'9999-12-31').localeCompare(b.dueDate||'9999-12-31')||a.id.localeCompare(b.id):b.date-a.date||a.id.localeCompare(b.id));
  }
  function card(m,index){
    const today=day(),due=m.dueDate;
    const status=due?(due<today?'Prazo vencido · ':due===today?'Vence hoje · ':'Até ')+displayDate(due):index===1?'Sem prazo salvo no FAROL':'Sem data limite definida';
    const disabled=moving||columns.some(c=>c.busy)||!connection?.manageInstitutional||columns[index].missingLabels;
    const suggestions=m.activities.filter(a=>a.evidence);
    return `<article class="demand-card institutional-card ${m.unread?'is-unread':''}"><div class="institutional-card-content"><span class="deadline ${!due?'none':due<today?'late':due===today?'today':''}">${escape(status)}</span><h3>${escape(m.subject)}</h3><p class="demand-person">${escape(m.from)}</p><p class="demand-card-meta">${escape(received(m.date))}${m.unread?' · Não lida':''}</p>${suggestions.length?`<details><summary>Atividades e possíveis prazos</summary>${suggestions.map(a=>`<blockquote class="institutional-evidence">${escape(a.evidence)}</blockquote><p class="demand-footnote">${a.dueDate?'Possível prazo: '+escape(displayDate(a.dueDate))+'. ':''}${escape(a.review||'Confira o trecho antes de definir a data limite.')}</p>`).join('')}</details>`:'<p class="demand-footnote">Prazo não identificado no texto.</p>'}${m.limitedText?'<p class="demand-footnote">Texto indisponível ou limitado. Confira o conteúdo e os anexos no Gmail.</p>':''}<a href="https://mail.google.com/mail/u/?authuser=${encodeURIComponent(connection.email)}#all/${encodeURIComponent(m.threadId)}" target="_blank" rel="noopener noreferrer">Abrir no Gmail</a></div>${index===0?`<form class="institutional-classify" data-classify-form="${escape(m.id)}"><label>Data limite para execução<input type="date" required min="1900-01-01" max="9999-12-31" data-due="${escape(m.id)}" aria-label="Data limite para ${escape(m.subject)}" value="${escape(drafts.get(m.id)??m.dueDate??'')}" ${disabled?'disabled':''}></label><button class="button" ${disabled?'disabled':''}>Classificar</button></form>`:''}${index<2?`<div class="demand-card-bottom"><button class="button" type="button" data-archive="${escape(m.id)}" ${disabled?'disabled':''}>Arquivar</button></div>`:''}</article>`;
  }
  function draw(){
    if(!root)return;
    root.querySelector('#institutional-feedback').textContent=feedback||(!connection?.gmail?'Conecte a conta GERAL para consultar os e-mails.':!connection.manageInstitutional?'Para classificar e arquivar, use GERAL → Revisar autorização.':'');
    root.querySelector('#institutional-refresh').disabled=moving||columns.some(c=>c.busy)||!connection?.gmail;
    columns.forEach((state,index)=>{
      const items=shown(index);
      root.querySelector('#institutional-count-'+index).textContent=String(items.length);
      root.querySelector('#institutional-status-'+index).textContent=state.busy?'Carregando…':state.error?(errors[state.error]||errors.unavailable):state.missingLabels?errors.labels_missing:state.loaded?state.items.length+' e-mails carregados':'';
      const list=root.querySelector('#institutional-list-'+index);
      list.innerHTML=items.map(m=>card(m,index)).join('')||(state.loaded?'<p class="demand-empty">Nenhum e-mail nesta seleção.</p>':'');
      list.querySelectorAll('[data-due]').forEach(input=>input.addEventListener('input',()=>drafts.set(input.dataset.due,input.value)));
      list.querySelectorAll('[data-classify-form]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const id=form.dataset.classifyForm;const input=form.querySelector('[data-due]');if(!input.reportValidity())return;move(id,index,'classify',input.value);}));
      list.querySelectorAll('[data-archive]').forEach(button=>button.addEventListener('click',()=>move(button.dataset.archive,index,'archive')));
      const more=root.querySelector('#institutional-more-'+index);more.hidden=!state.nextPage;more.disabled=moving||state.busy||!connection?.gmail;
    });
  }
  async function load(index,append=false){
    if(!root||!connection?.gmail||columns[index].busy)return;
    const ticket=epoch,mailbox=connection.email,state=columns[index];state.busy=true;state.error='';
    if(!append){state.items=[];state.nextPage=null;state.loaded=false;}draw();
    try{
      const params=new URLSearchParams({mailbox,column:index});if(append&&state.nextPage)params.set('page',state.nextPage);
      const response=await fetch('/api/google/institutional?'+params,{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==epoch)return;if(result.mailbox!==mailbox||result.column!==index)throw new Error('account_changed');
      state.items=[...new Map([...state.items,...result.items].map(item=>[item.id,item])).values()];
      state.nextPage=result.nextPage;state.loaded=true;state.missingLabels=result.missingLabels;
    }catch(cause){if(ticket===epoch)state.error=cause.message;}
    finally{if(ticket===epoch){state.busy=false;draw();}}
  }
  async function refresh(){if(moving||columns.some(c=>c.busy))return;await Promise.all(columns.map((_,i)=>load(i)));}
  async function move(id,index,operation,dueDate){
    if(moving||columns.some(c=>c.busy)||!connection?.manageInstitutional)return;
    const message=columns[index].items.find(m=>m.id===id);if(!message)return;
    const ticket=epoch,mailbox=connection.email;moving=true;feedback=operation==='classify'?'Salvando prazo e classificando…':'Arquivando…';draw();
    try{
      const body={type:'general',mailbox,messageId:id,operation,...(operation==='classify'?{dueDate,version:message.version}:{})};
      const response=await fetch('/api/google/institutional-move',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify(body)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==epoch)return;if(result.mailbox!==mailbox||result.messageId!==id||result.operation!==operation)throw new Error('account_changed');
      feedback=operation==='classify'?'Data limite salva. E-mail movido para Classificadas.':'E-mail movido para Arquivadas.';drafts.delete(id);
      // Clear source rows immediately after confirmed success, even if refresh fails.
      for(const state of columns)state.items=state.items.filter(m=>m.id!==id);
      moving=false;await refresh();
    }catch(cause){if(ticket===epoch)feedback=errors[cause.message]||errors.unavailable;}
    finally{if(ticket===epoch){moving=false;draw();}}
  }
  function mount(element){
    root=element;search='';reset();
    root.innerHTML=`<div class="demand-toolbar"><label>Buscar nos e-mails carregados<input id="institutional-search" type="search" placeholder="Assunto, remetente ou trecho"></label><button class="button" id="institutional-refresh">Atualizar quadro</button></div><p class="demand-footnote">Defina uma data limite e clique em Classificar para mover da entrada para Classificadas. Os prazos encontrados no texto são sugestões e não são salvos automaticamente. Arquivar move somente a mensagem escolhida para Arquivadas. As ações preservam os demais marcadores e o estado de leitura.</p><p class="demand-footnote">Entrada e Arquivadas: mensagens mais recentes primeiro. Classificadas: data limite mais antiga primeiro, com ordenação de todas as mensagens do marcador antes da paginação; mensagens sem prazo salvo aparecem ao final. Páginas de 20 mensagens. Busca e contagens consideram os e-mails carregados. Calendário de Brasília.</p><p id="institutional-feedback" class="demand-notice" role="status"></p><div class="demand-columns institutional-columns">${titles.map((title,index)=>`<section class="demand-column"><h2>${title} <span id="institutional-count-${index}">0</span></h2><p class="demand-notice" role="status" id="institutional-status-${index}"></p><div class="demand-cards" id="institutional-list-${index}"></div><button class="button demand-more" id="institutional-more-${index}" hidden>Carregar mais</button></section>`).join('')}</div>`;
    root.querySelector('#institutional-refresh').addEventListener('click',refresh);
    titles.forEach((_,i)=>root.querySelector('#institutional-more-'+i).addEventListener('click',()=>load(i,true)));
    root.querySelector('#institutional-search').addEventListener('input',event=>{search=event.target.value;draw();});
    draw();if(connection?.gmail)refresh();
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email||connection?.gmail!==value?.gmail||connection?.manageInstitutional!==value?.manageInstitutional||connection?.labels!==value?.labels;
    connection=value;if(changed){reset();draw();if(root&&connection?.gmail)refresh();}
  }
  function unmount(){reset();root=null;}
  return {mount,unmount,connectionChanged};
})();
