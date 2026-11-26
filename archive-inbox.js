'use strict';
window.FarolArchiveInbox=(()=>{
  const dateTime=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
  const errors={
    archive_label_missing:'Use Pessoal → Revisar autorização para preparar o marcador GE_ArquivoMorto_Pessoal.',
    classify_scope:'Use Pessoal → Revisar autorização para permitir a movimentação de mensagens.',
    missing_scope:'Use Pessoal → Revisar autorização para permitir o acesso ao Gmail.',
    login_required:'Conecte sua conta Pessoal antes de continuar.',
    module_forbidden:'A opção Arquivo Morto não está habilitada para o seu acesso.',
    admin_required:'A opção Arquivo Morto não está habilitada para o seu acesso.',
    account_changed:'A conta Pessoal mudou. Confira a conexão antes de iniciar novamente.',
    gmail_rate_limit:'O Gmail limitou o acesso. Confira a Caixa de Entrada antes de iniciar novamente.',
    gmail_domain_policy:'A organização bloqueou o acesso do FAROL ao Gmail.',
    inbox_changed:'A seleção da Caixa de Entrada mudou durante a movimentação. Confira o Gmail antes de iniciar novamente.'
  };
  let root=null,connection=null,leave=null,job=null;
  const get=id=>root.querySelector('#archive-inbox-'+id);
  const ready=()=>Boolean(connection?.email&&connection.gmail&&connection.classify);

  function mount(element,onCancel){
    root=element;leave=onCancel;
    draw();
  }
  function draw(){
    if(!root)return;
    root.innerHTML=`<h1>Arquivo Morto</h1>
      <section aria-label="Primeira confirmação" id="archive-inbox-first">
        <p class="demand-intro">Essa opção <strong>MOVERÁ TODOS OS SEUS E-MAILS</strong> da Caixa de entrada para o Arquivo Morto.</p>
        <p>Tem certeza que deseja fazer isso?</p>
        <p id="archive-inbox-account" role="status"></p>
        <p>O FAROL consulta a Caixa de Entrada ao longo da operação, até ela ficar vazia.</p>
        <div class="button-row">
          <button class="button primary" type="button" id="archive-inbox-back">Cancelar</button>
          <button class="button" type="button" id="archive-inbox-review" aria-haspopup="dialog">Confirmar, é isso mesmo que eu quero!</button>
        </div>
      </section>
      <dialog id="archive-inbox-confirmation" aria-labelledby="archive-inbox-question">
        <h2 id="archive-inbox-question">Você quer mesmo fazer isso?</h2>
        <p><mark class="archive-inbox-warning">MOVER TODAS AS MENSAGENS DA CAIXA DE ENTRADA PARA O ARQUIVO MORTO?</mark></p>
        <div class="button-row">
          <button class="button primary" type="button" id="archive-inbox-dismiss" autofocus>Cancelar</button>
          <button class="button" type="button" id="archive-inbox-start">Confirmar, REALMENTE é isso mesmo que eu quero!</button>
        </div>
      </dialog>
      <section id="archive-inbox-progress" aria-labelledby="archive-inbox-progress-title" hidden>
        <h2 id="archive-inbox-progress-title">Acompanhamento</h2>
        <p id="archive-inbox-status" role="status"></p>
        <p id="archive-inbox-count"></p>
        <button class="button" type="button" id="archive-inbox-stop">Cancelar</button>
        <button class="button" type="button" id="archive-inbox-close" hidden>Voltar</button>
        <ol id="archive-inbox-messages" class="archive-inbox-messages" aria-label="Mensagens movidas, da última à primeira"></ol>
      </section>`;
    get('account').textContent=ready()?'Conta Pessoal: '+connection.email
      :connection?.email?'Revise a autorização da conta Pessoal para movimentar as mensagens.'
      :'Conecte sua conta Pessoal para continuar.';
    const first=get('first'),back=get('back'),confirmation=get('confirmation'),dismiss=get('dismiss');
    back.addEventListener('click',leave);
    get('review').disabled=!ready();
    get('review').addEventListener('click',()=>{
      if(!ready()||job)return;
      confirmation.showModal();
      dismiss.focus({preventScroll:true});
    });
    dismiss.addEventListener('click',()=>confirmation.close());
    confirmation.addEventListener('close',()=>{
      if(root&&get('confirmation')===confirmation&&!confirmation.open&&!first.hidden)back.focus({preventScroll:true});
    });
    get('start').addEventListener('click',start);
    get('stop').addEventListener('click',cancel);
    get('close').addEventListener('click',leave);
    back.focus({preventScroll:true});
  }
  function cancel(){
    if(!job||job.cancelled)return;
    job.cancelled=true;
    get('stop').disabled=true;
    get('status').textContent='Cancelamento solicitado. Aguardando a confirmação da mensagem em andamento…';
  }
  function addMessage(item){
    const row=document.createElement('li'),details=document.createElement('dl');
    const fields=[
      ['Remetente:',item.from],
      ['Destinatário:',item.to],
      ['Data:',item.date?dateTime.format(new Date(item.date)):''],
      ['Assunto:',item.subject]
    ];
    for(const [label,value] of fields){
      const term=document.createElement('dt'),description=document.createElement('dd');
      term.textContent=label;
      description.textContent=value||'—';
      details.append(term,description);
    }
    row.append(details);
    get('messages').prepend(row);
  }
  async function start(){
    if(job||!ready()||!get('confirmation').open)return;
    const current={mailbox:connection.email,cancelled:false};
    job=current;
    get('confirmation').close();
    get('first').hidden=true;
    get('progress').hidden=false;
    get('stop').focus();
    get('status').textContent='Movendo as mensagens para o Arquivo Morto…';
    let moved=0,lastSkipped=null;
    const updateCount=()=>{get('count').textContent='Mensagens confirmadas no Arquivo Morto: '+moved;};
    updateCount();
    try{
      while(job===current&&!current.cancelled){
        const response=await fetch('/api/google/personal-archive-next',{
          method:'POST',credentials:'same-origin',cache:'no-store',
          headers:{'Content-Type':'application/json','X-Farol-Request':'1'},
          body:JSON.stringify({type:'personal',mailbox:current.mailbox})
        });
        const result=await response.json();
        if(job!==current)return;
        window.FarolAccessDenied?.(result);
        if(job!==current)return;
        if(!response.ok)throw new Error(result.error||'unavailable');
        if(result.mailbox!==current.mailbox)throw new Error('account_changed');
        if(result.status==='empty')break;
        if(result.status==='skipped'){
          if(lastSkipped===result.messageId)throw new Error('inbox_changed');
          lastSkipped=result.messageId;
          continue;
        }
        if(result.status!=='moved'||!result.item)throw new Error('unavailable');
        lastSkipped=null;
        moved++;
        addMessage(result.item);
        updateCount();
      }
      if(job===current)get('status').textContent=current.cancelled?'Processo cancelado.':'Concluído. O Gmail não retornou mais mensagens da Caixa de Entrada.';
    }catch(error){
      if(job===current){
        const message=errors[error.message]||'Confira a Caixa de Entrada e o Arquivo Morto. O Gmail pode ter concluído a última movimentação.';
        get('status').textContent=(current.cancelled?'Processo cancelado. ':'Processo interrompido. ')+message;
      }
    }finally{
      if(job===current){
        job=null;
        get('stop').hidden=true;
        get('close').hidden=false;
        get('close').focus();
      }
    }
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email||connection?.gmail!==value?.gmail||connection?.classify!==value?.classify;
    connection=value;
    if(changed&&root){
      job=null;
      if(get('confirmation').open)get('confirmation').close();
      draw();
    }
  }
  function unmount(){
    job=null;
    if(root&&get('confirmation').open)get('confirmation').close();
    root=null;leave=null;
  }
  window.addEventListener('pagehide',cancel);
  return {mount,unmount,connectionChanged};
})();
