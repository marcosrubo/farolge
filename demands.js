'use strict';
window.FarolDemands=(()=>{
  const titles=['1-ME DEVEM','2-MINHAS','3-DEVO'];
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day=value=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;};
  const date=value=>value?value.split('-').reverse().join('/'):'Sem prazo';
  const dateTime=value=>value?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'';
  function deadline(demand,today=day(new Date())){
    if(demand?.completed)return {text:'Concluída',kind:'done'};
    if(!demand?.dueDate)return {text:'Sem prazo',kind:'none'};
    const days=Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(demand.dueDate+'T12:00:00Z'))/86400000);
    return days>0?{text:`Atrasado há ${days} ${days===1?'dia':'dias'}`,kind:'late'}:days===0?{text:'Vence hoje',kind:'today'}:{text:'Vence em '+date(demand.dueDate),kind:'future'};
  }
  const errors={login_required:'Conecte a conta Pessoal para consultar suas demandas.',missing_scope:'Revise a autorização da conta Pessoal e permita a consulta ao Gmail.',setup_required:'O armazenamento de prazos ainda precisa ser preparado no Supabase. Consulte as instruções de publicação.',account_changed:'A conta Pessoal mudou. Atualize o quadro antes de continuar.',conflict:'Esta demanda foi alterada em outra janela. Feche e abra a conversa novamente antes de salvar.',not_found:'O e-mail ou a conversa não está mais disponível. Atualize a lista.',classify_scope:'Para classificar, use Pessoal → Revisar autorização e conceda a permissão de modificar o Gmail.',labels_missing:'Um marcador está ausente. Use Pessoal → Revisar autorização para prepará-lo.',not_inbox:'Esta mensagem saiu da Caixa de entrada. Atualize a lista.',classification_unconfirmed:'Não foi possível confirmar a classificação. Atualize a Caixa de entrada antes de tentar novamente.',invalid_demand:'Confira o prazo e os dados da demanda.',unavailable:'Não foi possível consultar ou salvar os dados. Tente novamente.'};
  let inbox={items:[],loaded:false,busy:false},inboxSearch='';
  let root=null,connection,epoch=0,columns=[],busy=false,active=null,detailVersion=0,search='',unread=false,view='pending',sort='recent',tab=0;
  const dialog=()=>document.querySelector('#demand-dialog');
  function clearDetails(){
    ++detailVersion;active=null;
    const panel=dialog();if(panel?.open)panel.close();
    const content=document.querySelector('#demand-detail');if(content)content.textContent='';
  }
  function reset(){++epoch;busy=false;inbox={items:[],loaded:false,busy:false};columns=titles.map(()=>({items:[],loaded:false,nextPage:null,error:null}));clearDetails();}
  async function api(action,params,body){
    const response=await fetch('/api/google/'+action+(params?'?'+new URLSearchParams(params):''),{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json','X-Farol-Request':'1'}:{},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'unavailable');return result;
  }
  function card(item){
    const fromSelf=(item.from.match(/[^\s<>;,"]+@[^\s<>;,"]+/g)||[]).some(address=>address.toLowerCase()===connection.email.toLowerCase());
    const person=fromSelf?'Para: '+(item.to||'destinatário não informado'):'De: '+(item.from||'remetente não informado');
    const due=deadline(item.demand);
    return `<article class="demand-card ${item.unread?'is-unread':''}"><button class="demand-card-open" data-thread="${escape(item.id)}" aria-label="Abrir conversa: ${escape(item.subject)}"><span class="demand-person">${escape(person)}</span><strong>${escape(item.subject)}</strong><span class="demand-snippet">${escape(item.snippet)}</span><span class="demand-card-meta">${escape(dateTime(item.date))} · ${item.messageCount} ${item.messageCount===1?'mensagem':'mensagens'}${item.unread?' · Não lida':''}</span></button><div class="demand-card-bottom"><span class="deadline ${due.kind}">${escape(due.text)}</span><button class="demand-deadline-button" data-thread="${escape(item.id)}">${item.demand?.dueDate?'Editar prazo':'Definir prazo'}</button></div>${item.demand?.responsible?`<p class="demand-responsible">Responsável: ${escape(item.demand.responsible)}</p>`:''}${item.labels.length>1?'<p class="demand-responsible">Também em: '+item.labels.filter(name=>name!==titles[item.column]).map(escape).join(', ')+'</p>':''}</article>`;
  }
  function list(items){
    return items.filter(item=>(!search || [item.subject,item.from,item.to,item.snippet,item.demand?.responsible].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) && (!unread||item.unread) && (view==='all'||Boolean(item.demand?.completed)===(view==='done'))).sort((a,b)=>sort==='oldest'?a.date-b.date:sort==='deadline'?((a.demand?.dueDate||'9999-12-31').localeCompare(b.demand?.dueDate||'9999-12-31')||b.date-a.date):b.date-a.date);
  }
  function drawColumns(){
    if(!root)return;
    const target=root.querySelector('#demand-columns');if(!target)return;
    target.innerHTML=columns.map((column,index)=>{
      const items=list(column.items);
      return `<section class="demand-column ${index===tab?'mobile-active':''}" aria-labelledby="demand-column-${index}"><h2 id="demand-column-${index}">${titles[index]} <span>${column.loaded?items.length:'—'}</span></h2><div class="demand-cards">${column.error?`<p class="demand-empty" role="status">${escape(errors[column.error]||errors.unavailable)}</p>`:!column.loaded?'<p class="demand-empty">'+(busy?'Carregando conversas…':'Conecte a conta Pessoal para consultar os e-mails deste marcador.')+'</p>':column.missingLabel?'<p class="demand-empty">Marcador ausente. Use Revisar autorização na conexão Pessoal para criá-lo.</p>':items.length?items.map(item=>card({...item,column:index})).join(''):'<p class="demand-empty">Nenhuma conversa nesta seleção.</p>'}</div>${column.nextPage?`<button class="button demand-more" data-more="${index}" ${busy||inbox.busy?'disabled':''}>Carregar mais</button>`:''}</section>`;
    }).join('');
    root.querySelectorAll('[data-thread]').forEach(button=>button.addEventListener('click',()=>open(button.dataset.thread)));
    root.querySelectorAll('[data-more]').forEach(button=>button.addEventListener('click',()=>load(Number(button.dataset.more),true)));
  }
  function drawInbox(){
    if(!root)return;
    const target=root.querySelector('#inbox-list');if(!target)return;
    const items=inbox.items.filter(item=>!inboxSearch||[item.subject,item.from,item.to,item.snippet].join(' ').toLocaleLowerCase('pt-BR').includes(inboxSearch.toLocaleLowerCase('pt-BR')));
    root.querySelector('#inbox-count').textContent=inbox.loaded?`${items.length} exibidos / ${inbox.items.length} carregados`:'';
    root.querySelector('#inbox-permission').textContent=connection?.gmail && inbox.loaded && !inbox.canClassify?errors.classify_scope:inbox.missingLabels?errors.labels_missing:'';
    target.innerHTML=!inbox.loaded?`<p class="demand-empty">${inbox.busy?'Carregando Caixa de entrada…':inbox.error?escape(errors[inbox.error]||errors.unavailable):'Conecte a conta Pessoal para consultar sua Caixa de entrada.'}</p>`:items.length?items.map(item=>`<article class="inbox-message ${item.unread?'is-unread':''}"><div class="inbox-message-main"><a class="inbox-subject" href="https://mail.google.com/mail/u/?authuser=${encodeURIComponent(connection.email)}#all/${encodeURIComponent(item.threadId)}" target="_blank" rel="noopener noreferrer">${escape(item.subject)} <span>(abrir no Gmail)</span></a><p>${escape(item.from)} · ${escape(dateTime(item.date))}${item.unread?' · Não lida':''}</p><p class="demand-snippet">${escape(item.snippet)}</p><p class="inbox-labels">${item.labels.length?'Etiquetas: '+item.labels.map(escape).join(' · '):'Sem etiqueta de classificação do FAROL'}</p></div><div class="inbox-actions" aria-label="Classificar mensagem">${titles.map((title,column)=>`<button class="button" data-classify="${column}" data-message="${escape(item.id)}" ${inbox.busy||busy||!inbox.canClassify||inbox.missingLabels||item.labels.includes(title)?'disabled':''}>${escape(title)}${item.labels.includes(title)?' ✓':''}</button>`).join('')}</div></article>`).join(''):'<p class="demand-empty">Nenhum e-mail nesta seleção da Caixa de entrada.</p>';
    root.querySelector('#inbox-more').hidden=!inbox.nextPage;
    root.querySelector('#inbox-more').disabled=inbox.busy;
    root.querySelector('#inbox-refresh').disabled=inbox.busy||!connection?.gmail;
    root.querySelector('#demand-refresh').disabled=inbox.busy;
    root.querySelectorAll('[data-classify]').forEach(button=>button.addEventListener('click',()=>classify(button.dataset.message,Number(button.dataset.classify))));
  }
  async function loadInbox(append=false){
    if(!root||!connection?.gmail||inbox.busy)return;
    const ticket=epoch,mailbox=connection.email;inbox.busy=true;inbox.error=null;drawInbox();
    try {
      const result=await api('inbox',{mailbox,...(append?{page:inbox.nextPage}:{})});
      if(ticket!==epoch||!root)return;if(result.mailbox!==mailbox)throw new Error('account_changed');
      const combined=[...(append?inbox.items:[]),...result.items];
      inbox={...inbox,loaded:true,items:[...new Map(combined.map(item=>[item.id,item])).values()],nextPage:result.nextPage,canClassify:result.canClassify===true,missingLabels:result.missingLabels};
      root.querySelector('#inbox-feedback').textContent='Caixa de entrada atualizada. Mensagens já classificadas continuam nesta lista.';
    } catch(error){if(ticket===epoch){inbox.error=error.message;root.querySelector('#inbox-feedback').textContent=errors[error.message]||errors.unavailable;}}
    finally {if(ticket===epoch){inbox.busy=false;drawInbox();}}
  }
  async function classify(messageId,column){
    if(!root||!connection?.gmail||inbox.busy||busy||!inbox.canClassify)return;
    const ticket=epoch,mailbox=connection.email;inbox.busy=true;drawInbox();drawColumns();root.querySelector('#inbox-feedback').textContent='Aplicando etiqueta…';
    let applied=false;
    try {
      const result=await api('classify',null,{type:'personal',mailbox,messageId,column});
      if(ticket!==epoch||!root)return;if(result.mailbox!==mailbox)throw new Error('account_changed');
      applied=true;inbox.items=inbox.items.map(item=>item.id===messageId?result.item:item);
      if(!result.inInbox)inbox.items=inbox.items.filter(item=>item.id!==messageId);
      root.querySelector('#inbox-feedback').textContent=result.inInbox?`Etiqueta ${titles[column]} aplicada. A mensagem permanece na Caixa de entrada.`:'Etiqueta aplicada. A mensagem saiu da Caixa de entrada em outra operação; atualize a lista.';
      // Fetch the labeled conversation so even an older message appears immediately above.
      const detail=await api('thread',{mailbox,id:result.item.threadId,summary:'1'});
      if(ticket!==epoch||!root)return;if(detail.mailbox!==mailbox)throw new Error('account_changed');
      const {messages,...card}=detail.thread;
      for(let index=0;index<3;index++)if(card.labels.includes(titles[index])){
        columns[index].loaded=true;columns[index].error=null;columns[index].missingLabel=false;
        const existing=columns[index].items.findIndex(item=>item.id===card.id);
        if(existing<0)columns[index].items.push(card);else {
          const current=columns[index].items[existing];
          columns[index].items[existing]={...card,demand:(current.demand?.version||0)>(card.demand?.version||0)?current.demand:card.demand};
        }
      }
      drawColumns();
    } catch(error){if(ticket===epoch){
      if(error.message==='classify_scope'||error.message==='missing_scope')inbox.canClassify=false;
      root.querySelector('#inbox-feedback').textContent=applied?'Etiqueta aplicada no Gmail. Não foi possível atualizar as colunas; clique em Atualizar.':errors[error.message]||errors.unavailable;
    }} finally {if(ticket===epoch){inbox.busy=false;drawInbox();drawColumns();}}
  }
  function shell(){
    if(!root)return;
    root.innerHTML=`<div class="demand-toolbar"><label>Buscar nas conversas carregadas<input id="demand-search" type="search" placeholder="Assunto, pessoa ou trecho" value="${escape(search)}"></label><label>Situação<select id="demand-view"><option value="pending">Pendentes</option><option value="done">Concluídas</option><option value="all">Todas</option></select></label><label>Ordenar<select id="demand-sort"><option value="recent">Mais recentes</option><option value="oldest">Mais antigas</option><option value="deadline">Prazo mais próximo</option></select></label><label class="demand-check"><input id="demand-unread" type="checkbox" ${unread?'checked':''}> Somente não lidas</label><button class="button" id="demand-refresh">Atualizar</button></div><p class="demand-notice" id="demand-notice" role="status"></p><div class="demand-mobile-tabs" role="group" aria-label="Escolher coluna">${titles.map((title,i)=>`<button class="button" data-tab="${i}" aria-pressed="${tab===i}">${title}</button>`).join('')}</div><div class="demand-columns" id="demand-columns"></div><p class="demand-footnote">Até 20 conversas por carregamento em cada coluna. Busca, filtros, contagem e ordenação consideram as conversas carregadas. Ler aqui não marca o e-mail como lido. Os prazos seguem o calendário de Brasília.</p><section class="inbox-panel" aria-labelledby="inbox-title"><div class="inbox-heading"><h2 id="inbox-title">Caixa de entrada <span id="inbox-count"></span></h2><button class="button" id="inbox-refresh">Atualizar Caixa de entrada</button></div><p class="demand-footnote">Todos os e-mails da Caixa de entrada da conta Pessoal, em páginas de 20 mensagens. Cada botão adiciona a etiqueta à mensagem escolhida e mantém as demais etiquetas, a indicação de não lida e a Caixa de entrada. A conversa aparecerá na coluna correspondente.</p><p class="demand-notice" id="inbox-permission"></p><label class="inbox-search">Buscar nos e-mails carregados<input id="inbox-search" type="search" placeholder="Assunto, remetente ou trecho" value="${escape(inboxSearch)}"></label><p id="inbox-feedback" class="demand-notice" role="status"></p><div id="inbox-list"></div><button class="button demand-more" id="inbox-more" hidden>Carregar mais e-mails</button></section>`;
    root.querySelector('#demand-search').addEventListener('input',event=>{search=event.target.value;drawColumns();});
    for(const [id,set,value] of [['demand-view',v=>view=v,view],['demand-sort',v=>sort=v,sort]]){const select=root.querySelector('#'+id);select.value=value;select.addEventListener('change',event=>{set(event.target.value);drawColumns();});}
    root.querySelector('#demand-unread').addEventListener('change',event=>{unread=event.target.checked;drawColumns();});
    root.querySelector('#demand-refresh').addEventListener('click',()=>refresh());
    root.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{tab=Number(button.dataset.tab);root.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));drawColumns();}));
    root.querySelector('#inbox-search').addEventListener('input',event=>{inboxSearch=event.target.value;drawInbox();});
    root.querySelector('#inbox-refresh').addEventListener('click',()=>loadInbox());
    root.querySelector('#inbox-more').addEventListener('click',()=>loadInbox(true));
    drawColumns();drawInbox();
  }
  function notice(text){if(root)root.querySelector('#demand-notice').textContent=text;}
  async function load(index,append=false){
    if(!connection?.gmail||!root||busy||inbox.busy)return;
    const ticket=epoch,mailbox=connection.email;busy=true;drawColumns();drawInbox();
    try {
      const result=await api('board',{mailbox,column:index,...(append?{page:columns[index].nextPage}:{})});
      if(ticket!==epoch||!root)return;
      if(result.mailbox!==mailbox)throw new Error('account_changed');
      const combined=[...(append?columns[index].items:[]),...result.items];
      columns[index]={loaded:true,items:[...new Map(combined.map(item=>[item.id,item])).values()],nextPage:result.nextPage,missingLabel:result.missingLabel};
    } catch(error){if(ticket===epoch){columns[index].error=error.message;notice(errors[error.message]||errors.unavailable);}}
    finally {if(ticket===epoch){busy=false;drawColumns();drawInbox();}}
  }
  async function refresh(){
    reset();shell();
    if(!connection?.gmail){notice(connection===undefined?'Verificando a conexão Pessoal…':errors[connection?'missing_scope':'login_required']);return;}
    const ticket=epoch;notice('Consultando '+connection.email+'…');
    for(let index=0;index<3;index++){if(ticket!==epoch||!root)return;await load(index);}
    if(ticket!==epoch||!root)return;
    await loadInbox();
    if(ticket===epoch && !columns.some(c=>c.error))notice('Conta Pessoal: '+connection.email+'. Classifique os e-mails na Caixa de entrada abaixo. Definir prazo aqui não avisa o destinatário.');
  }
  function historyHtml(events){
    return events?.length?`<details class="demand-history"><summary>Histórico de alterações (${events.length})</summary><ol>${[...events].reverse().map(event=>`<li>${escape(dateTime(event.at))} — prazo: ${escape(date(event.before?.dueDate))} → ${escape(date(event.after.dueDate))}; situação: ${event.before?.completed?'concluída':'pendente'} → ${event.after.completed?'concluída':'pendente'}; responsável: ${escape(event.before?.responsible||'não informado')} → ${escape(event.after.responsible||'não informado')}.</li>`).join('')}</ol></details>`:'';
  }
  function detailHtml(thread){
    const demand=thread.demand;
    return `<h2 id="demand-dialog-title">${escape(thread.subject)}</h2><p>${escape(connection.email)} · ${thread.messages.length} mensagens</p><form id="demand-form"><div class="demand-fields"><label>Data limite<input id="demand-date" type="date" min="1900-01-01" max="9999-12-31" value="${escape(demand?.dueDate||'')}"></label><label>Responsável pelo trabalho<input id="demand-responsible" maxlength="200" value="${escape(demand?.responsible||'')}" placeholder="Nome ou e-mail"></label><label class="demand-check"><input id="demand-completed" type="checkbox" ${demand?.completed?'checked':''}> Trabalho concluído</label></div><p class="demand-footnote">Deixe a data vazia para remover o prazo. A conclusão é manual e não altera o Gmail. O prazo deve ser comunicado à pessoa no próprio e-mail.</p><button class="button primary" id="demand-save">Salvar acompanhamento</button><p role="status" id="demand-save-status"></p></form>${historyHtml(demand?.history)}<h3>Conversa</h3>${thread.messages.map(message=>`<article class="demand-message"><strong>${escape(message.from)}</strong><p>Para: ${escape(message.to)} · ${escape(dateTime(message.date))}</p><pre>${escape(message.text)}</pre>${message.previewOnly?'<p class="demand-footnote">Prévia: esta mensagem não tem texto simples disponível. Abra no Gmail para ver o conteúdo completo.</p>':''}</article>`).join('')}<a class="button" href="https://mail.google.com/mail/u/?authuser=${encodeURIComponent(connection.email)}#all/${encodeURIComponent(thread.id)}" target="_blank" rel="noopener noreferrer">Abrir no Gmail (outra aba)</a>`;
  }
  async function open(id){
    clearDetails();const ticket=epoch,detail=++detailVersion,mailbox=connection?.email;if(!mailbox)return;
    const panel=dialog(),content=document.querySelector('#demand-detail');content.innerHTML='<h2 id="demand-dialog-title">Carregando conversa…</h2>';panel.showModal();
    try {
      const result=await api('thread',{id,mailbox});if(ticket!==epoch||detail!==detailVersion||!panel.open)return;
      if(result.mailbox!==mailbox)throw new Error('account_changed');active=result.thread;content.innerHTML=detailHtml(active);
      content.querySelector('#demand-form').addEventListener('submit',save);
      content.querySelector('#demand-date').focus();
    } catch(error){if(ticket===epoch&&detail===detailVersion)content.innerHTML='<h2 id="demand-dialog-title">Conversa indisponível</h2><p role="status">'+escape(errors[error.message]||errors.unavailable)+'</p>';}
  }
  async function save(event){
    event.preventDefault();if(!active)return;
    const thread=active,mailbox=connection.email,ticket=epoch,detail=detailVersion;
    const content=document.querySelector('#demand-detail'),button=content.querySelector('#demand-save'),status=content.querySelector('#demand-save-status');
    button.disabled=true;status.textContent='Salvando…';
    try {
      const result=await api('demand',null,{type:'personal',mailbox,threadId:thread.id,version:thread.demand?.version||0,dueDate:content.querySelector('#demand-date').value||null,responsible:content.querySelector('#demand-responsible').value,completed:content.querySelector('#demand-completed').checked});
      if(ticket!==epoch||detail!==detailVersion)return;if(result.mailbox!==mailbox)throw new Error('account_changed');
      thread.demand=result.demand;for(const column of columns)for(const item of column.items)if(item.id===thread.id)item.demand=result.demand;
      drawColumns();content.innerHTML=detailHtml(thread);content.querySelector('#demand-form').addEventListener('submit',save);content.querySelector('#demand-save-status').textContent='Acompanhamento salvo. Nenhum e-mail foi alterado ou enviado.';
    } catch(error){if(ticket===epoch&&detail===detailVersion){status.textContent=errors[error.message]||errors.unavailable;button.disabled=error.message==='conflict'||error.message==='account_changed';}}
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email || connection?.gmail!==value?.gmail || connection?.classify!==value?.classify;
    connection=value;if(changed){reset();if(root)refresh();}
  }
  function mount(element){root=element;inboxSearch='';search='';unread=false;view='pending';sort='recent';tab=0;refresh();}
  function unmount(){reset();root=null;}
  return {mount,unmount,connectionChanged,escape,deadline,day,list};
})();
