'use strict';
window.FarolInstitutional=(()=>{
  const titles=['Caixa de Entrada','Classificadas','Arquivadas','Anuais','Arquivo Morto'];
  const annualColumn=3;
  const archiveColumn=4;
  const columnOrder=[0,1,annualColumn,2];
  const allLists=[...columnOrder,archiveColumn];
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const displayDate=value=>value.split('-').reverse().join('/');
  const received=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
  const errors={gmail_rate_limit:'O Google limitou temporariamente as consultas. Aguarde e use Atualizar quadro.',gmail_domain_policy:'A organização bloqueou o acesso do aplicativo ao Gmail. Consulte a administração da conta.',login_required:'Conecte novamente a conta GERAL.',missing_scope:'Use GERAL → Revisar autorização para permitir a consulta ao Gmail.',institutional_scope:'Use GERAL → Revisar autorização para movimentar as demandas.',archive_label_missing:'Use Preparar marcadores para criar GE_ArquivoMorto_Geral.',labels_missing:'Clique em Preparar marcadores para verificar e criar os ausentes GE_Classificadas, GE_Anuais e GE_Arquivadas.',setup_required:'Execute database/institutional-demands.sql no Supabase exclusivo FAROL GE para preparar os registros institucionais.',account_changed:'A conta GERAL mudou. Atualize o quadro.',invalid_page:'Atualize o quadro para reiniciar a paginação.',conflict:'O registro foi alterado em outra janela. Atualize o quadro antes de tentar novamente.',not_inbox:'A mensagem foi movida ou não está mais disponível para esta operação. Atualize o quadro.',invalid_institutional:'Confira a data limite ou as observações antes de confirmar.',classification_unconfirmed:'O Gmail não confirmou a movimentação. Atualize o quadro antes de tentar novamente.',listing_limit:'Classificadas excede o limite de 10 mil mensagens. A ordenação completa não pôde ser feita.',unavailable:'Não foi possível concluir a operação. O prazo ou as observações podem ter sido salvos antes da movimentação. Atualize para conferir e tente novamente.'};
  let root=null,connection=null,columns=[],moving=false,feedback='',search='',epoch=0,drafts=new Map(),annualDrafts=new Map(),annualMessageId=null;
  function reset(){
    ++epoch;
    const dialog=root?.querySelector('#institutional-annual-dialog');
    if(dialog){
      if(dialog.open)dialog.close();
      const subject=root.querySelector('#institutional-annual-subject');
      const notes=root.querySelector('#institutional-annual-notes');
      if(subject)subject.textContent='';
      if(notes)notes.value='';
    }
    annualMessageId=null;
    columns=titles.map(()=>({items:[],nextPage:null,busy:false,loaded:false,error:''}));
    moving=false;feedback='';drafts=new Map();annualDrafts=new Map();
  }
  function shown(index){
    const query=search.toLocaleLowerCase('pt-BR');
    return columns[index].items.filter(m=>!query||[m.subject,m.from,m.observations,...m.activities.map(a=>a.evidence)].join(' ').toLocaleLowerCase('pt-BR').includes(query))
      .sort((a,b)=>index===1?(a.dueDate||'9999-12-31').localeCompare(b.dueDate||'9999-12-31')||a.id.localeCompare(b.id):b.date-a.date||a.id.localeCompare(b.id));
  }
  function card(m,index){
    const today=day(),due=m.dueDate;
    const status=due?(due<today?'Prazo vencido · ':due===today?'Vence hoje · ':'Até ')+displayDate(due):index===1?'Sem prazo salvo no FAROL':'Sem data limite definida';
    const disabled=moving||columns.some(c=>c.busy)||!connection?.manageInstitutional||columns[index].missingLabels||Boolean(columns[index].error);
    const suggestions=m.activities.filter(a=>a.evidence);
    const notes=m.observations?`<details open><summary>Observações da demanda anual</summary><p class="institutional-observations">${escape(m.observations)}</p></details>`:'';
    const annualDisabled=disabled||columns[annualColumn].missingLabels;
    const archiveDisabled=moving||columns.some(c=>c.busy)||!connection?.manageInstitutional||Boolean(columns[index].error);
    const archiveAction=index===archiveColumn
      ?`<button class="button" type="button" data-restore="${escape(m.id)}" ${archiveDisabled?'disabled':''}>Voltar p/ Cx Entrada</button>`
      :`<button class="button" type="button" data-dead-archive="${escape(m.id)}" ${archiveDisabled?'disabled':''}>Arquivo Morto</button>`;
    return `<article class="demand-card institutional-card ${m.unread?'is-unread':''}"><div class="institutional-card-content"><span class="deadline ${!due?'none':due<today?'late':due===today?'today':''}">${escape(status)}</span><h3>${escape(m.subject)}</h3><p class="demand-person">${escape(m.from)}</p><p class="demand-card-meta">${escape(received(m.date))}${m.unread?' · Não lida':''}</p>${suggestions.length?`<details><summary>Atividades e possíveis prazos</summary>${suggestions.map(a=>`<blockquote class="institutional-evidence">${escape(a.evidence)}</blockquote><p class="demand-footnote">${a.dueDate?'Possível prazo: '+escape(displayDate(a.dueDate))+'. ':''}${escape(a.review||'Confira o trecho antes de definir a data limite.')}</p>`).join('')}</details>`:'<p class="demand-footnote">Prazo não identificado no texto.</p>'}${m.limitedText?'<p class="demand-footnote">Texto indisponível ou limitado. Confira o conteúdo e os anexos no Gmail.</p>':''}${notes}<a href="https://mail.google.com/mail/u/?authuser=${encodeURIComponent(connection.email)}#all/${encodeURIComponent(m.threadId)}" target="_blank" rel="noopener noreferrer">Abrir no Gmail</a></div>${index===0?`<form class="institutional-classify" data-classify-form="${escape(m.id)}"><label>Data limite para execução<input type="date" required min="1900-01-01" max="9999-12-31" data-due="${escape(m.id)}" aria-label="Data limite para ${escape(m.subject)}" value="${escape(drafts.get(m.id)??m.dueDate??'')}" ${disabled?'disabled':''}></label><button class="button" ${disabled?'disabled':''}>Classificar</button></form>`:''}<div class="demand-card-bottom">${index===0?`<label class="institutional-annual-check"><input type="checkbox" data-annual="${escape(m.id)}" ${annualDisabled?'disabled':''}> Demanda ANUAL</label>`:''}${index!==2&&index!==archiveColumn?`<button class="button" type="button" data-archive="${escape(m.id)}" ${disabled?'disabled':''}>Arquivar</button>`:''}${archiveAction}</div></article>`;
  }
  function draw(){
    if(!root)return;
    root.querySelector('#institutional-feedback').textContent=feedback||(!connection?.gmail?'Conecte a conta GERAL para consultar os e-mails.':!connection.manageInstitutional?'Para movimentar demandas, use GERAL → Revisar autorização.':'');
    root.querySelector('#institutional-refresh').disabled=moving||columns.some(c=>c.busy)||!connection?.gmail;
    const prepare=root.querySelector('#institutional-prepare');
    prepare.hidden=!connection?.gmail||!connection.manageInstitutional||(connection.labels==='ready'&&!columns.some(c=>c.missingLabels||c.archiveMissing));
    prepare.disabled=moving||columns.some(c=>c.busy);
    columns.forEach((state,index)=>{
      const items=shown(index);
      root.querySelector('#institutional-count-'+index).textContent=state.loaded?String(items.length):'—';
      root.querySelector('#institutional-status-'+index).textContent=state.busy?'Carregando…':state.error?(errors[state.error]||errors.unavailable)+(state.loaded?' A lista anterior foi mantida; atualize antes de continuar.':''):index===archiveColumn&&state.archiveMissing?errors.archive_label_missing:state.missingLabels?errors.labels_missing:state.loaded?state.items.length+' e-mails carregados':'';
      const list=root.querySelector('#institutional-list-'+index);
      list.innerHTML=items.map(m=>card(m,index)).join('')||(state.loaded?'<p class="demand-empty">Nenhum e-mail nesta seleção.</p>':'');
      list.querySelectorAll('[data-due]').forEach(input=>input.addEventListener('input',()=>drafts.set(input.dataset.due,input.value)));
      list.querySelectorAll('[data-classify-form]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const id=form.dataset.classifyForm;const input=form.querySelector('[data-due]');if(!input.reportValidity())return;move(id,index,'classify',input.value);}));
      list.querySelectorAll('[data-annual]').forEach(input=>input.addEventListener('change',()=>{
        if(!input.checked)return;
        input.checked=false;
        const message=state.items.find(m=>m.id===input.dataset.annual);
        if(!message)return;
        annualMessageId=message.id;
        root.querySelector('#institutional-annual-subject').textContent=message.subject;
        const notes=root.querySelector('#institutional-annual-notes');
        notes.value=annualDrafts.get(message.id)??message.observations??'';
        notes.setCustomValidity('');
        root.querySelector('#institutional-annual-dialog').showModal();
      }));
      list.querySelectorAll('[data-archive]').forEach(button=>button.addEventListener('click',()=>move(button.dataset.archive,index,'archive')));
      list.querySelectorAll('[data-dead-archive]').forEach(button=>button.addEventListener('click',()=>move(button.dataset.deadArchive,index,'dead-archive')));
      list.querySelectorAll('[data-restore]').forEach(button=>button.addEventListener('click',()=>move(button.dataset.restore,index,'restore')));
      const more=root.querySelector('#institutional-more-'+index);more.hidden=!state.nextPage;more.disabled=moving||state.busy||!connection?.gmail||Boolean(state.error);
    });
  }
  async function load(index,append=false){
    if(!root||!connection?.gmail||columns[index].busy)return;
    const ticket=epoch,mailbox=connection.email,state=columns[index];state.busy=true;state.error='';
    draw();
    try{
      const params=new URLSearchParams({mailbox,column:index});if(append&&state.nextPage)params.set('page',state.nextPage);
      const response=await fetch('/api/google/institutional?'+params,{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();window.FarolAccessDenied?.(result);if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==epoch)return;if(result.mailbox!==mailbox||result.column!==index)throw new Error('account_changed');
      state.items=[...new Map([...(append?state.items:[]),...result.items].map(item=>[item.id,item])).values()];
      state.nextPage=result.nextPage;state.loaded=true;state.missingLabels=result.missingLabels;state.archiveMissing=result.archiveMissing;
    }catch(cause){if(ticket===epoch){
      if(cause.message==='account_changed'||cause.message==='login_required'){reset();connection=null;draw();return;}
      state.error=cause.message;
    }}
    finally{if(ticket===epoch){state.busy=false;draw();}}
  }
  async function prepareLabels(){
    if(moving||columns.some(c=>c.busy)||!connection?.manageInstitutional)return;
    const ticket=epoch,mailbox=connection.email;moving=true;feedback='Verificando e preparando os marcadores institucionais…';draw();
    try{
      const response=await fetch('/api/google/institutional-labels',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify({type:'general',mailbox})});
      const result=await response.json();window.FarolAccessDenied?.(result);if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==epoch)return;if(result.mailbox!==mailbox)throw new Error('account_changed');
      if(result.labels!=='ready'){
        const reasons={permission_denied:'O Google recusou a criação. Revise a autorização da GERAL.',name_rejected:'O Google recusou um nome de marcador. Confira no Gmail os marcadores indicados.',provider_unavailable:'Não foi possível confirmar os marcadores no Google. Tente novamente.'};
        feedback=(reasons[result.labelDetails?.reason]||'Os marcadores ainda não foram confirmados.')+(result.labelDetails?.missing?.length?' Faltam confirmar: '+result.labelDetails.missing.join(', ')+'.':'');
        return;
      }
      connection={...connection,labels:'ready',labelDetails:result.labelDetails};moving=false;
      feedback='Marcadores institucionais confirmados. Atualizando o quadro…';await refresh();
      if(ticket===epoch){feedback='Marcadores institucionais prontos.';window.dispatchEvent(new Event('farol-connections-refresh'));}
    }catch(cause){if(ticket===epoch)feedback=errors[cause.message]||errors.unavailable;}
    finally{if(ticket===epoch){moving=false;draw();}}
  }
  async function refresh(indices=allLists,serial=false){
    if(moving||columns.some(c=>c.busy))return;
    const ticket=epoch;
    if(serial){for(const index of indices){if(ticket!==epoch||!root)return;await load(index);}}
    else await Promise.all(indices.map(index=>load(index)));
  }
  async function move(id,index,operation,value){
    if(moving||columns.some(c=>c.busy)||!connection?.manageInstitutional||columns[index].error)return;
    const message=columns[index].items.find(m=>m.id===id);if(!message)return;
    const deadArchive=operation==='dead-archive',restoring=operation==='restore';
    const ticket=epoch,mailbox=connection.email;moving=true;feedback=restoring?'Voltando para a Caixa de Entrada…':deadArchive?'Movendo para o Arquivo Morto…':operation==='classify'?'Salvando prazo e classificando…':operation==='annual'?'Salvando observações e movendo para Anuais…':'Arquivando…';draw();
    try{
      const body={type:'general',mailbox,messageId:id,operation,...(operation==='classify'?{dueDate:value,version:message.version}:operation==='annual'?{observations:value,version:message.version}:{})};
      const response=await fetch('/api/google/institutional-move',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify(body)});
      const result=await response.json();window.FarolAccessDenied?.(result);if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==epoch)return;if(result.mailbox!==mailbox||result.messageId!==id||result.operation!==operation)throw new Error('account_changed');
      feedback=restoring?'Mensagem voltou para a Caixa de Entrada.':deadArchive?'Mensagem movida para o Arquivo Morto.':operation==='classify'?'Data limite salva. E-mail movido para Classificadas.':operation==='annual'?'Observações salvas. Demanda movida para Anuais.':'Demanda movida para Arquivadas.';drafts.delete(id);annualDrafts.delete(id);
      // Clear source rows immediately after confirmed success, even if refresh fails.
      for(const state of columns)state.items=state.items.filter(m=>m.id!==id);
      const target=restoring?0:deadArchive?archiveColumn:operation==='classify'?1:operation==='annual'?annualColumn:2;
      columns[target].items.push({...message,dueDate:result.demand?.dueDate||message.dueDate,observations:result.demand?.observations||message.observations,version:result.demand?.version||message.version});
      columns[target].loaded=true;columns[target].missingLabels=false;
      if(deadArchive)columns[target].archiveMissing=false;
      moving=false;draw();await refresh(deadArchive?allLists:[...new Set([index,target])],true);
      if(ticket===epoch&&columns.some(state=>state.error))feedback+=' A movimentação foi confirmada, mas uma lista não pôde ser atualizada; os dados anteriores foram mantidos.';
    }catch(cause){if(ticket===epoch){
      if(cause.message==='archive_label_missing')columns[index].archiveMissing=true;
      feedback=(cause.message!=='unavailable'&&errors[cause.message])||(restoring||deadArchive?'Não foi possível confirmar a movimentação. Atualize o quadro para conferir.':errors.unavailable);
    }}
    finally{if(ticket===epoch){moving=false;draw();}}
  }
  function mount(element){
    root=element;search='';reset();
    root.innerHTML=`<div class="demand-toolbar"><label>Buscar nos e-mails carregados<input id="institutional-search" type="search" placeholder="Assunto, remetente, trecho ou observação"></label><button class="button" id="institutional-refresh">Atualizar quadro</button><button class="button" id="institutional-prepare" hidden>Preparar marcadores</button></div><p class="demand-footnote">Defina uma data limite e clique em Classificar para mover da entrada para Classificadas. Marque Demanda ANUAL e informe as observações antes de mover para Anuais. Os prazos encontrados no texto são sugestões e não são salvos automaticamente. Arquivar move a mensagem para Arquivadas. Arquivo Morto move a mensagem para a lista abaixo das quatro colunas. As movimentações mantêm o acompanhamento salvo e o estado de leitura.</p><p class="demand-footnote">Entrada, Anuais, Arquivadas e Arquivo Morto: mensagens mais recentes primeiro. Classificadas: data limite mais antiga primeiro, com ordenação de todas as mensagens do marcador antes da paginação; mensagens sem prazo salvo aparecem ao final. Páginas de 20 mensagens. Busca e contagens consideram os e-mails carregados. Calendário de Brasília.</p><p id="institutional-feedback" class="demand-notice" role="status"></p><div class="demand-columns institutional-columns">${columnOrder.map(index=>`<section class="demand-column"><h2>${titles[index]} <span id="institutional-count-${index}">0</span></h2><p class="demand-notice" role="status" id="institutional-status-${index}"></p><div class="demand-cards" id="institutional-list-${index}"></div><button class="button demand-more" id="institutional-more-${index}" hidden>Carregar mais</button></section>`).join('')}</div>
      <section class="inbox-panel" aria-labelledby="institutional-archive-title">
        <div class="inbox-heading"><h2 id="institutional-archive-title">Arquivo Morto <span id="institutional-count-${archiveColumn}">—</span></h2></div>
        <p class="demand-notice" role="status" id="institutional-status-${archiveColumn}"></p>
        <div class="demand-cards" id="institutional-list-${archiveColumn}"></div>
        <button class="button demand-more" id="institutional-more-${archiveColumn}" hidden>Carregar mais</button>
      </section>
      <dialog id="institutional-annual-dialog" aria-labelledby="institutional-annual-title">
        <h2 id="institutional-annual-title">Demanda ANUAL</h2>
        <p id="institutional-annual-subject"></p>
        <form id="institutional-annual-form">
          <label for="institutional-annual-notes">Observações e procedimentos</label>
          <textarea id="institutional-annual-notes" rows="7" maxlength="4000" required autofocus></textarea>
          <div class="button-row">
            <button type="button" class="button" id="institutional-annual-cancel">Cancelar</button>
            <button type="submit" class="button primary">Salvar e mover para Anuais</button>
          </div>
        </form>
      </dialog>`;
    const dialog=root.querySelector('#institutional-annual-dialog');
    const notes=root.querySelector('#institutional-annual-notes');
    root.querySelector('#institutional-annual-cancel').addEventListener('click',()=>dialog.close());
    notes.addEventListener('input',()=>notes.setCustomValidity(''));
    root.querySelector('#institutional-annual-form').addEventListener('submit',event=>{
      event.preventDefault();
      const value=notes.value.trim();
      if(!value){
        notes.setCustomValidity('Informe as observações da demanda anual.');
        notes.reportValidity();
        return;
      }
      const id=annualMessageId;
      if(!id)return;
      annualMessageId=null;
      annualDrafts.set(id,value);
      dialog.close();
      move(id,0,'annual',value);
    });
    root.querySelector('#institutional-refresh').addEventListener('click',()=>refresh());
    root.querySelector('#institutional-prepare').addEventListener('click',prepareLabels);
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
