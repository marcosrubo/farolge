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
  let root=null,mailbox=null,identity=null,dispose=null;

  async function request(action,options){
    const response=await fetch('/api/google/'+action,{cache:'no-store',credentials:'same-origin',...options});
    const result=await response.json();
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
    root.innerHTML=`
      <div class="active-search">
        <a class="button" href="#radar">Voltar ao Radar</a>
        <h1>Registrar busca ativa</h1>
        <form class="active-search-form">
          <fieldset>
            <label for="active-search-filter">Buscar aluno por nome ou CGM</label>
            <input id="active-search-filter" type="search" autocomplete="off" disabled>
            <label for="active-search-student">Aluno</label>
            <select id="active-search-student" name="studentId" required disabled><option value="">Selecione um aluno</option></select>
            <p data-student-status role="status"></p>
            <button class="button" type="button" data-retry hidden>Tentar carregar alunos</button>
            <div class="active-search-dates">
              <label>Data da busca<input name="searchDate" type="date" required></label>
              <label>Hora da busca<input name="searchTime" type="time" required></label>
            </div>
            <div class="active-search-action">
              <label for="active-search-action">Ação</label>
              <button class="button" type="button" data-dictate aria-describedby="active-search-voice-status">Falar</button>
            </div>
            <textarea id="active-search-action" name="actionText" rows="5" maxlength="5000" required></textarea>
            <p id="active-search-voice-status" role="status"></p>
          </fieldset>
          <p data-author></p>
          <div class="button-row"><button class="button primary" type="submit" disabled>Salvar registro</button></div>
          <p data-submit-status role="status"></p>
        </form>
      </div>`;
    const form=root.querySelector('form'),fields=form.querySelector('fieldset');
    const {studentId:student,searchDate:date,searchTime:time,actionText:field}=form.elements;
    const filter=form.querySelector('input[type="search"]'),save=form.querySelector('button[type="submit"]');
    const listStatus=form.querySelector('[data-student-status]'),feedback=form.querySelector('[data-submit-status]');
    const authorLabel=form.querySelector('[data-author]'),retry=form.querySelector('[data-retry]');
    const dictation=setupDictation(form.querySelector('[data-dictate]'),form.querySelector('#active-search-voice-status'),field);
    const controller=new AbortController();
    const {signal}=controller;
    dispose=()=>{controller.abort();dictation.dispose();};
    const source=mailbox;
    let students=[],author=null,pending=null,saving=false;

    function defaultDates(){
      const {year,month,day,hour,minute}=Object.fromEntries(format.formatToParts(new Date()).map(({type,value})=>[type,value]));
      date.value=`${year}-${month}-${day}`;
      time.value=`${hour}:${minute}`;
    }
    function showStudents(){
      const term=fold(filter.value.trim()),selected=student.value;
      const matches=students.filter(item=>item.search.includes(term)||item.id===selected);
      student.replaceChildren(new Option('Selecione um aluno',''),...matches.map(item=>new Option(item.label,item.id)));
      student.value=selected;
      listStatus.textContent=matches.length?'':students.length?'Nenhum aluno encontrado.':'Nenhum aluno cadastrado.';
    }
    async function load(){
      if(!source){listStatus.textContent='Aguardando acesso ao cadastro de alunos da escola.';return;}
      listStatus.textContent='Carregando alunos…';
      retry.hidden=true;
      try{
        const result=await request('active-search-students?'+new URLSearchParams({mailbox:source}),{signal});
        if(signal.aborted)return;
        if(result.mailbox!==source||!Array.isArray(result.students))throw new Error('account_changed');
        author=result.author;
        authorLabel.textContent=author?'Registrando como '+author:errors.active_search_author_required;
        const showSchool=new Set(result.students.map(item=>item.school)).size>1;
        students=result.students.map(item=>({
          ...item,search:fold(item.name+' '+item.cgm),
          label:[item.name,'CGM '+item.cgm,item.className,showSchool?item.school:null].filter(Boolean).join(' — ')
        })).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR',{sensitivity:'base'}));
        filter.disabled=student.disabled=!students.length;
        save.disabled=!author||!students.length;
        showStudents();
      }catch(error){
        if(signal.aborted)return;
        listStatus.textContent=errors[error.message]||'Não foi possível carregar os alunos.';
        retry.hidden=false;
      }
    }

    filter.addEventListener('input',showStudents);
    filter.addEventListener('keydown',event=>{if(event.key==='Enter')event.preventDefault();});
    retry.addEventListener('click',load);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!source||!author||saving||!form.reportValidity())return;
      if(dictation.active){
        feedback.textContent='Encerre o ditado e revise o texto antes de salvar.';
        return;
      }
      const text=field.value.trim();
      if(!text){feedback.textContent='Descreva a ação de busca ativa.';field.focus();return;}
      pending??={type:'general',mailbox:source,authorMailbox:author,id:crypto.randomUUID(),
        studentId:student.value,searchDate:date.value,searchTime:time.value,text};
      saving=fields.disabled=save.disabled=true;
      feedback.textContent='Salvando registro…';
      try{
        const result=await request('active-search-register',{
          method:'POST',signal,headers:{'Content-Type':'application/json','X-Farol-Request':'1'},
          body:JSON.stringify(pending)
        });
        if(signal.aborted)return;
        if(!result.saved||result.id!==pending.id)throw new Error('unconfirmed');
        pending=null;
        form.reset();
        defaultDates();
        showStudents();
        feedback.textContent='Busca ativa registrada.';
      }catch(error){
        if(signal.aborted)return;
        const message=errors[error.message];
        if(message)pending=null;
        feedback.textContent=message||'A gravação ainda não foi confirmada. Use Tentar novamente para conferir o mesmo envio.';
      }finally{
        if(!signal.aborted){
          saving=save.disabled=false;
          fields.disabled=Boolean(pending);
          save.textContent=pending?'Tentar novamente':'Salvar registro';
        }
      }
    });
    defaultDates();
    load();
  }

  window.FarolActiveSearch={
    mount(element){root=element;render();},
    unmount(){dispose?.();dispose=root=null;},
    connectionChanged(email,accessIdentity){
      if(email===mailbox&&identity===accessIdentity)return;
      mailbox=email;
      identity=accessIdentity;
      if(root)render();
    }
  };
})();
