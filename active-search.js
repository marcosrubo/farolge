(() => {
  const format=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  });
  const fold=value=>value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu,'');
  const errors={
    account_changed:'A conexão mudou. Volte ao Radar e abra o formulário novamente.',
    author_changed:'A conta institucional mudou. Volte ao Radar e abra o formulário novamente.',
    module_forbidden:'O acesso ao Radar precisa estar habilitado.',
    active_search_author_required:'Para salvar, conecte uma conta @escola.pr.gov.br com acesso ao Radar.',
    student_missing:'O aluno selecionado não está mais disponível neste cadastro.',
    invalid_active_search:'Confira o aluno, a data, a hora e o texto da ação.',
    setup_required:'A preparação da Busca Ativa no Supabase está pendente.',
    school_unavailable:'O cadastro de alunos da escola está indisponível.',
    conflict:'Este envio já está vinculado a outro registro. Reabra o formulário para fazer um novo registro.'
  };
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const records=window.FarolOccurrences?.create({
    id:'active-search-records',action:'active-search-records',mobileCards:true,
    deleteAction:'active-search-delete',editAction:'active-search-edit',
    presentation:{
      singular:'busca ativa',plural:'buscas ativas',title:'Buscas ativas registradas',
      textLabel:'Ação',editLabel:'Ação',editField:'text',editedMessage:'Ação alterada.',showActivityTime:true,
      migrationMessage:'Alterar e Excluir ficam disponíveis após a atualização de Busca Ativa no Supabase.',
      errorMessages:{
        setup_required:errors.setup_required,
        login_required:'Identifique-se novamente para consultar as buscas ativas.',
        module_forbidden:'A consulta de buscas ativas não está habilitada para o seu acesso.',
        account_changed:'A conta mudou. Atualize a lista de buscas ativas.',
        school_unavailable:'Os dados de buscas ativas da escola estão indisponíveis.',
        storage_access_denied:'O Supabase recusou o acesso às buscas ativas.',
        invalid_page:'Atualize as buscas ativas para reiniciar a consulta.',
        invalid_occurrence:'Informe uma ação de até 5.000 caracteres.',
        invalid_active_search:'Confira o texto da ação.',
        active_search_missing:'A busca ativa já não está disponível.',
        active_search_edit_forbidden:'Só quem registrou a busca ou Marcos na conta Pessoal pode alterá-la.',
        unavailable:'Não foi possível consultar as buscas ativas. Tente atualizar.'
      }
    }
  });
  let root=null,mailbox=null,identity=null,consultOnly=false,dispose=null;

  async function request(action,options){
    const response=await fetch('/api/google/'+action,{cache:'no-store',credentials:'same-origin',...options});
    const result=await response.json();
    if(options.signal?.aborted)throw options.signal.reason;
    if(!response.ok){
      window.FarolAccessDenied?.(result);
      throw new Error(result.error);
    }
    return result;
  }

  function setupDictation(button,feedback,field){
    const Recognition=[window.SpeechRecognition,window.webkitSpeechRecognition].find(api=>
      typeof api?.available==='function'&&'processLocally' in api.prototype);
    const options={langs:['pt-BR'],processLocally:true};
    let recognition=null,disposed=false,busy=false,needsInstall=false;
    const hint=message=>{feedback.textContent=message;};
    if(!Recognition){
      button.disabled=true;
      hint('O ditado no dispositivo está indisponível neste navegador. Você pode digitar a ação.');
    }

    function start(){
      const session=new Recognition();
      session.lang='pt-BR';
      session.processLocally=true;
      session.continuous=true;
      recognition=session;
      let failed=false,received=false,limitReached=false;
      button.textContent='Parar de falar';
      hint('Ativando o microfone…');
      session.onstart=()=>{if(recognition===session)hint('Ouvindo…');};
      session.onresult=event=>{
        if(recognition!==session||limitReached)return;
        for(let i=event.resultIndex;i<event.results.length;i++){
          if(!event.results[i].isFinal)continue;
          const phrase=event.results[i][0].transcript.trim();
          if(!phrase)continue;
          const separator=field.value&&!/\s$/.test(field.value)?' ':'';
          const available=field.maxLength-field.value.length-separator.length;
          if(available<=0){
            limitReached=true;
          }else{
            const segment=phrase.slice(0,available).replace(/[\uD800-\uDBFF]$/u,'');
            field.setRangeText(separator+segment,field.value.length,field.value.length,'preserve');
            received=true;
            limitReached=segment.length<phrase.length||field.value.length===field.maxLength;
          }
          if(limitReached){
            session.stop();
            break;
          }
        }
      };
      session.onerror=event=>{
        if(recognition!==session)return;
        failed=true;
        hint({
          'not-allowed':'O acesso ao microfone não foi liberado.',
          'audio-capture':'O navegador não encontrou um microfone disponível.',
          'no-speech':'Nenhuma fala foi detectada. Clique em Falar para tentar novamente.',
          'language-not-supported':'O ditado local em português não está disponível neste dispositivo.'
        }[event.error]||'O ditado foi interrompido. Você pode tentar novamente ou digitar a ação.');
      };
      session.onend=()=>{
        if(recognition!==session)return;
        recognition=null;
        button.textContent='Falar';
        button.disabled=false;
        if(limitReached)hint('A ação atingiu o limite de 5.000 caracteres.');
        else if(!failed)hint(received?'Revise o texto transcrito antes de salvar.':'Nenhuma fala foi transcrita.');
      };
      try{session.start();}
      catch{
        recognition=null;
        button.textContent='Falar';
        hint('Não foi possível ativar o ditado. Você pode tentar novamente ou digitar a ação.');
      }
    }

    button.addEventListener('click',async()=>{
      if(!Recognition||busy)return;
      if(recognition){
        button.disabled=true;
        recognition.stop();
        return;
      }
      busy=true;
      button.disabled=true;
      try{
        if(needsInstall){
          hint('Preparando o ditado em português…');
          if(await Recognition.install(options)){
            needsInstall=false;
            button.textContent='Falar';
            hint('Ditado disponível. Clique em Falar para começar.');
          }else hint('Não foi possível baixar o pacote de português. Você pode digitar a ação.');
          return;
        }
        const availability=await Recognition.available(options);
        if(disposed)return;
        if(availability==='available')start();
        else if(availability==='downloadable'&&typeof Recognition.install==='function'){
          needsInstall=true;
          button.textContent='Baixar português';
          hint('Baixe o pacote de português do navegador para usar o ditado no dispositivo.');
        }else if(availability==='downloading')hint('O pacote de português está sendo baixado. Tente novamente em instantes.');
        else hint('O ditado local em português está indisponível neste dispositivo. Você pode digitar a ação.');
      }catch{
        hint('Não foi possível preparar o ditado em português. Você pode digitar a ação.');
      }finally{
        busy=false;
        button.disabled=false;
      }
    });
    return {
      get active(){return busy||Boolean(recognition);},
      dispose(){
        disposed=true;
        const session=recognition;
        recognition=null;
        session?.abort();
      }
    };
  }

  function render(){
    dispose?.();
    if(!root)return;
    const source=mailbox,controller=new AbortController(),{signal}=controller;
    let tab=consultOnly?'consult':'register',students=[],author=null,loading=false,closeForm=null;
    root.innerHTML=`
      <a class="button active-search-back" href="#radar">Voltar ao Radar</a>
      <h1>Busca Ativa</h1>
      <div class="inspector-tabs" role="tablist" aria-label="Busca Ativa">
        <button type="button" id="active-search-tab-register" role="tab" aria-controls="active-search-panel-register"${consultOnly?' hidden':''}>REGISTRAR</button>
        <button type="button" id="active-search-tab-consult" role="tab" aria-controls="active-search-panel-consult">CONSULTAR</button>
      </div>
      <section class="panel" id="active-search-panel-register" role="tabpanel" aria-labelledby="active-search-tab-register" tabindex="0">
        <p class="demand-intro">Selecione um aluno para registrar uma busca ativa.</p>
        <label class="student-search-label" for="active-search-filter">Buscar aluno, CGM ou turma</label>
        <input class="form-control" id="active-search-filter" type="search" autocomplete="off" disabled>
        <p class="overview-status" data-student-status role="status"></p>
        <ul id="active-search-list" class="student-list"></ul>
        <button class="button" type="button" data-retry>Atualizar alunos</button>
      </section>
      <section id="active-search-panel-consult" role="tabpanel" aria-labelledby="active-search-tab-consult" tabindex="0" hidden></section>
      <dialog id="active-search-dialog" aria-labelledby="active-search-student-name"></dialog>`;
    const find=selector=>root.querySelector(selector);
    const filter=find('#active-search-filter'),list=find('#active-search-list'),dialog=find('#active-search-dialog');
    const listStatus=find('[data-student-status]'),retry=find('[data-retry]');
    const panel=name=>find('#active-search-panel-'+name),tabButton=name=>find('#active-search-tab-'+name);
    dispose=()=>{controller.abort();closeForm?.();records?.unmount();};

    function showStudents(){
      const term=fold(filter.value.trim());
      const matches=students.filter(item=>item.search.includes(term));
      list.innerHTML=matches.map(item=>`<li><button type="button" class="student-row" data-student="${escape(item.id)}"><span>${escape(item.name)}</span><span class="student-class">${escape(item.className)}</span></button></li>`).join('');
      listStatus.textContent=matches.length?'':students.length?'Nenhum aluno encontrado.':'Nenhum aluno cadastrado.';
    }

    async function load(){
      if(!source||loading||tab!=='register')return;
      loading=retry.disabled=true;
      listStatus.textContent='Consultando alunos…';
      try{
        const result=await request('active-search-students?'+new URLSearchParams({mailbox:source}),{signal});
        if(signal.aborted)return;
        if(result.mailbox!==source||!Array.isArray(result.students))throw new Error('account_changed');
        author=result.author;
        students=result.students.map(item=>({...item,search:fold([item.name,item.cgm,item.className].join(' '))}))
          .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'})
            ||a.className.localeCompare(b.className,'pt-BR')||a.cgm.localeCompare(b.cgm));
        filter.disabled=!students.length;
        showStudents();
      }catch(error){
        if(signal.aborted)return;
        listStatus.textContent=errors[error.message]||'Não foi possível consultar os alunos.';
      }finally{
        if(!signal.aborted)loading=retry.disabled=false;
      }
    }

    function openForm(student,trigger){
      if(closeForm||!source||tab!=='register')return;
      const registeredAuthor=author;
      dialog.innerHTML=`
        <h2 id="active-search-student-name">${escape(student.name)}</h2>
        <p>${escape(student.className)}</p>
        <form class="active-search-form">
          <p class="demand-intro">${escape(student.school)}</p>
          <p class="demand-intro">${registeredAuthor?'Registrado por: '+escape(registeredAuthor):errors.active_search_author_required}</p>
          <fieldset>
            <div class="active-search-dates">
              <label>Data da busca<input name="searchDate" type="date" required></label>
              <label>Hora da busca<input name="searchTime" type="time" required></label>
            </div>
            <div class="active-search-action">
              <label for="active-search-action">Ação</label>
              <button class="button" type="button" data-dictate aria-describedby="active-search-voice-status">Falar</button>
            </div>
            <textarea id="active-search-action" name="actionText" rows="6" maxlength="5000" required></textarea>
            <p id="active-search-voice-status" class="demand-footnote" role="status"></p>
          </fieldset>
          <p data-submit-status role="status"></p>
          <div class="button-row">
            <button class="button primary" type="submit"${registeredAuthor?'':' disabled'}>Salvar registro</button>
            <button class="button" type="button" data-cancel>Cancelar</button>
          </div>
        </form>`;
      const form=dialog.querySelector('form'),fields=form.querySelector('fieldset');
      const {searchDate:date,searchTime:time,actionText:field}=form.elements;
      const save=form.querySelector('button[type="submit"]'),cancel=form.querySelector('[data-cancel]');
      const feedback=form.querySelector('[data-submit-status]');
      const dictation=setupDictation(form.querySelector('[data-dictate]'),form.querySelector('#active-search-voice-status'),field);
      const {year,month,day,hour,minute}=Object.fromEntries(format.formatToParts(new Date()).map(({type,value})=>[type,value]));
      date.value=`${year}-${month}-${day}`;
      time.value=`${hour}:${minute}`;
      let saving=false,pending=null;
      function close(){
        dialog.removeEventListener('cancel',cancelDialog);
        dictation.dispose();
        closeForm=null;
        if(dialog.open)dialog.close();
        dialog.innerHTML='';
        if(!signal.aborted)trigger.focus();
      }
      function cancelDialog(event){
        event.preventDefault();
        if(!saving)close();
      }
      closeForm=close;
      dialog.addEventListener('cancel',cancelDialog);
      cancel.addEventListener('click',close);
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        if(!registeredAuthor||saving||!form.reportValidity())return;
        if(dictation.active){feedback.textContent='Encerre o ditado e revise o texto antes de salvar.';return;}
        const text=field.value.trim();
        if(!text){feedback.textContent='Descreva a ação de busca ativa.';field.focus();return;}
        pending??={type:'general',mailbox:source,authorMailbox:registeredAuthor,id:crypto.randomUUID(),
          studentId:student.id,searchDate:date.value,searchTime:time.value,text};
        saving=fields.disabled=save.disabled=cancel.disabled=true;
        feedback.textContent='Salvando registro…';
        try{
          const result=await request('active-search-register',{
            method:'POST',signal,headers:{'Content-Type':'application/json','X-Farol-Request':'1'},
            body:JSON.stringify(pending)
          });
          if(signal.aborted)return;
          if(!result.saved||result.id!==pending.id||typeof result.date!=='string'||typeof result.time!=='string'){
            throw new Error('unconfirmed');
          }
          close();
          listStatus.textContent=`Busca ativa registrada em ${result.date.split('-').reverse().join('/')} às ${result.time} (Brasília).`;
        }catch(error){
          if(signal.aborted)return;
          const message=errors[error.message];
          if(message)pending=null;
          feedback.textContent=message||'A gravação ainda não foi confirmada. Use Tentar novamente para conferir o mesmo envio.';
        }finally{
          if(!signal.aborted&&closeForm===close){
            saving=save.disabled=cancel.disabled=false;
            fields.disabled=Boolean(pending);
            save.textContent=pending?'Tentar novamente':'Salvar registro';
          }
        }
      });
      dialog.showModal();
      field.focus();
    }

    function drawTabs(){
      for(const name of ['register','consult']){
        const current=name===tab;
        tabButton(name).setAttribute('aria-selected',String(current));
        tabButton(name).tabIndex=current?0:-1;
        panel(name).hidden=!current;
      }
      if(tab==='consult'){
        panel('consult').innerHTML=records?.markup()||'';
        records?.mount(panel('consult'));
      }else if(!students.length){
        load();
      }
    }

    function selectTab(name,focus=false){
      if(name===tab||(consultOnly&&name==='register'))return;
      if(tab==='consult'){
        records?.unmount();
        panel('consult').innerHTML='';
      }
      tab=name;
      drawTabs();
      if(focus)tabButton(name).focus();
    }

    for(const name of ['register','consult']){
      tabButton(name).addEventListener('click',()=>selectTab(name));
      tabButton(name).addEventListener('keydown',event=>{
        const other=name==='register'?'consult':'register';
        const destination={Home:'register',End:'consult',ArrowLeft:other,ArrowRight:other}[event.key];
        if(destination){event.preventDefault();selectTab(destination,true);}
      });
    }
    filter.addEventListener('input',showStudents);
    retry.addEventListener('click',load);
    list.addEventListener('click',event=>{
      const trigger=event.target.closest('[data-student]');
      const student=students.find(item=>item.id===trigger?.dataset.student);
      if(student)openForm(student,trigger);
    });
    retry.disabled=!source;
    if(!source)listStatus.textContent='Os dados da escola estão indisponíveis.';
    drawTabs();
  }

  window.FarolActiveSearch={
    mount(element){root=element;render();},
    unmount(){dispose?.();dispose=root=null;},
    connectionChanged(email,accessIdentity,restricted=false){
      if(email===mailbox&&identity===accessIdentity&&consultOnly===restricted)return;
      dispose?.();
      dispose=null;
      mailbox=email;
      identity=accessIdentity;
      consultOnly=restricted;
      records?.connectionChanged(email?{email}:null,accessIdentity);
      if(root)render();
    }
  };
})();
