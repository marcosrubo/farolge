'use strict';
window.FarolStudents=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatSeries=value=>String(value??'').replace(/[º°]/g,'o').replace(/ª/g,'a');
  const fold=value=>formatSeries(value).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu,'');
  const messages={author_required:'Identifique quem vai registrar a ocorrência.',author_changed:'A identidade mudou. Feche e abra a ocorrência novamente.',author_profile_required:'Cadastre o Nome da pessoa em EmailsAutorizados antes de registrar.',storage_access_denied:'O Supabase recusou o acesso do servidor às tabelas. Confira a configuração no projeto FarolGE.',student_schema_invalid:'A estrutura de Alunos/Ocorrencias é incompatível. Confira database/students.sql no projeto FarolGE.',storage_unavailable:'Não foi possível comunicar com o Supabase. Tente atualizar os alunos.',setup_required:'Execute database/students.sql no Supabase do FAROL GE para preparar Alunos e Ocorrencias.',login_required:'Identifique-se novamente para consultar os alunos.',account_changed:'A conta mudou. Atualize a lista.',invalid_occurrence:'Confira o texto da ocorrência (até 5.000 caracteres).',student_missing:'O aluno não foi encontrado nesta conta. Atualize a lista.',conflict:'Este registro já foi enviado com outros dados. Feche e abra uma nova ocorrência.',unavailable:'Não foi possível concluir. Tente novamente.'};
  let root=null,connection=null,personal=null,actorVersion=0,students=[],version=0,busy=false,saving=false,selected=null,submission=null;
  const occurrences=window.FarolOccurrences?.create({id:'inspector-occurrences',action:'inspector-occurrences',mobileCards:true,deleteAction:'occurrence-delete',editAction:'occurrence-edit'});
  let personalMailbox=null;
  let activeTab='register';
  const canRecord=()=>Boolean(!connection?.occurrencesOnly&&(personal?.id||personal?.email)&&personal?.name);
  function syncOccurrences(){
    const viewer=(personal?.id||personal?.email||personalMailbox)?JSON.stringify([personal?.id,personal?.email,personalMailbox]):null;
    occurrences?.connectionChanged(viewer?connection:null,viewer);
  }
  function close(){const dialog=root?.querySelector('#student-dialog');if(dialog?.open)dialog.close();selected=null;submission=null;saving=false;}
  function drawActor(){
    if(!root)return;
    root.querySelector('#student-actor').textContent=canRecord()?'Registrado por: '+personal.name+(personal.email?' ('+personal.email+')':''):'Identifique quem vai registrar a ocorrência.';
    root.querySelector('#student-save').disabled=saving||!canRecord();
  }
  function personalConnectionChanged(value,mailbox=null){
    const changed=personal?.id!==value?.id||personal?.email!==value?.email||personal?.name!==value?.name||personalMailbox!==mailbox;
    personal=value;personalMailbox=mailbox;
    if(changed){actorVersion++;close();drawActor();syncOccurrences();}
  }
  function list(){
    if(!root)return;
    const query=fold(root.querySelector('#student-search').value.trim());
    root.querySelector('#student-list').innerHTML=students
      .filter(s=>fold([s.Nome,s.Serie,s.Turma,s.Turno,s.CGM].join(' ')).includes(query))
      .map(s=>`<li><button type="button" class="student-row" data-student="${escape(s.id)}"><span>${escape(s.Nome)} · CGM ${escape(s.CGM)}</span><span class="student-class">${escape(formatSeries(s.Serie))} · ${escape(s.Turma)} · ${escape(s.Turno)}</span></button></li>`).join('');
  }
  async function load(){
    if(!root||!connection||connection.occurrencesOnly||busy||activeTab!=='register')return;
    const ticket=++version,mailbox=connection.email;busy=true;
    root.querySelector('#student-refresh').disabled=true;root.querySelector('#student-status').textContent='Consultando alunos…';
    try{
      const response=await fetch('/api/google/students?'+new URLSearchParams({mailbox}),{credentials:'same-origin',cache:'no-store'}),result=await response.json();window.FarolAccessDenied?.(result);
      if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||!Array.isArray(result.students))throw new Error('account_changed');
      students=result.students;list();root.querySelector('#student-status').textContent=students.length?'':'Nenhum aluno cadastrado. Use Carga de Alunos na Manutenção do Sistema.';
    }catch(error){if(ticket===version&&root){students=[];close();list();root.querySelector('#student-status').textContent=messages[error.message]||messages.unavailable;}}
    finally{if(ticket===version&&root){busy=false;root.querySelector('#student-refresh').disabled=!connection;}}
  }
  function open(id){
    if(!root||!connection||saving)return;
    selected=students.find(s=>s.id===id);if(!selected)return;
    submission=crypto.randomUUID();
    root.querySelector('#student-dialog-title').textContent=selected.Nome;
    root.querySelector('#student-dialog-class').textContent=selected.Serie+' · Turma '+selected.Turma+' · '+selected.Turno;
    root.querySelector('#student-school').textContent=selected.Escola;
    root.querySelector('#student-occurrence').value='';root.querySelector('#student-feedback').textContent='';
    drawActor();root.querySelector('#student-cancel').disabled=false;
    root.querySelector('#student-dialog').showModal();root.querySelector('#student-occurrence').focus();
  }
  async function save(event){
    event.preventDefault();if(!root||!selected||!connection||!canRecord()||saving)return;
    const ticket=version,authorTicket=actorVersion,mailbox=connection.email;
    const author=personal.email?{authorMailbox:personal.email}:{authorId:personal.id};
    saving=true;root.querySelector('#student-save').disabled=true;root.querySelector('#student-cancel').disabled=true;
    root.querySelector('#student-feedback').textContent='Salvando ocorrência…';
    try{
      const response=await fetch('/api/google/occurrence',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify({type:'general',mailbox,...author,id:submission,studentId:selected.id,ocorrencia:root.querySelector('#student-occurrence').value})});
      const result=await response.json();window.FarolAccessDenied?.(result);if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==version||authorTicket!==actorVersion||!root)return;
      if(result.mailbox!==mailbox||!result.saved)throw new Error('account_changed');
      const date=result.date.split('-').reverse().join('/');close();root.querySelector('#student-status').textContent=`Ocorrência registrada em ${date} às ${result.time} (Brasília).`;
    }catch(error){if(ticket===version&&authorTicket===actorVersion&&root)root.querySelector('#student-feedback').textContent=messages[error.message]||messages.unavailable;}
    finally{if(ticket===version&&authorTicket===actorVersion&&root){saving=false;drawActor();root.querySelector('#student-cancel').disabled=false;}}
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email||connection?.occurrencesOnly!==value?.occurrencesOnly;
    connection=value;
    if(!changed)return;
    version++;students=[];busy=false;close();
    if(root){
      syncTabs();drawActor();list();
      root.querySelector('#student-refresh').disabled=!connection||Boolean(connection.occurrencesOnly);
      root.querySelector('#student-status').textContent=connection?'':'Os dados da escola estão indisponíveis.';
      if(connection)load();
    }
    syncOccurrences();
  }
  function syncTabs(){
    const consultOnly=Boolean(connection?.occurrencesOnly);
    root.querySelector('#inspector-tab-register').hidden=consultOnly;
    if(consultOnly)selectTab('consult');
  }
  function selectTab(tab,moveFocus=false){
    if(tab===activeTab||(tab==='register'&&connection?.occurrencesOnly))return;
    activeTab=tab;
    for(const name of ['register','consult']){
      const selected=name===tab;
      const button=root.querySelector('#inspector-tab-'+name);
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
      root.querySelector('#inspector-panel-'+name).hidden=!selected;
    }
    if(moveFocus)root.querySelector('#inspector-tab-'+tab).focus();
    const panel=root.querySelector('#inspector-panel-consult');
    if(tab==='consult'){
      panel.innerHTML=occurrences?.markup()||'';
      occurrences?.mount(panel);
    }else{
      occurrences?.unmount();
      panel.innerHTML='';
      if(!students.length)load();
    }
  }
  function mount(element){
    root=element;students=[];busy=false;activeTab='register';
    root.innerHTML=`<h1>Inspetores/Monitores</h1>
      <div class="inspector-tabs" role="tablist" aria-label="Ocorrências">
        <button type="button" id="inspector-tab-register" role="tab" aria-selected="true" aria-controls="inspector-panel-register">REGISTRAR</button>
        <button type="button" id="inspector-tab-consult" role="tab" aria-selected="false" aria-controls="inspector-panel-consult" tabindex="-1">CONSULTAR</button>
      </div>
      <section class="panel" id="inspector-panel-register" role="tabpanel" aria-labelledby="inspector-tab-register" tabindex="0"><p class="demand-intro">Selecione um aluno para registrar uma ocorrência.</p><label class="student-search-label" for="student-search">Buscar aluno, CGM, série, turma ou turno</label><input class="form-control" type="search" id="student-search"><p id="student-status" class="overview-status" role="status"></p><ul id="student-list" class="student-list"></ul><button type="button" class="button" id="student-refresh">Atualizar alunos</button></section>
      <section id="inspector-panel-consult" role="tabpanel" aria-labelledby="inspector-tab-consult" tabindex="0" hidden></section>
      <dialog id="student-dialog" aria-labelledby="student-dialog-title"><h2 id="student-dialog-title"></h2><p id="student-dialog-class"></p><form id="student-form"><p id="student-school" class="demand-intro"></p><p id="student-actor" class="demand-intro"></p><label class="field">Ocorrência<textarea id="student-occurrence" class="form-control" required maxlength="5000" rows="6"></textarea></label><p class="demand-footnote">A data e a hora serão registradas no momento do salvamento, pelo horário de Brasília.</p><p id="student-feedback" role="status"></p><div class="button-row"><button type="submit" id="student-save" class="button primary">Salvar ocorrência</button><button type="button" id="student-cancel" class="button">Cancelar</button></div></form></dialog>`;
    for(const name of ['register','consult']){
      const button=root.querySelector('#inspector-tab-'+name);
      button.addEventListener('click',()=>selectTab(name));
      button.addEventListener('keydown',event=>{
        const destinations={Home:'register',End:'consult',ArrowLeft:name==='register'?'consult':'register',ArrowRight:name==='register'?'consult':'register'};
        const destination=destinations[event.key];
        if(!destination)return;
        event.preventDefault();selectTab(destination,true);
      });
    }
    root.querySelector('#student-search').addEventListener('input',list);
    root.querySelector('#student-list').addEventListener('click',event=>{const button=event.target.closest('[data-student]');if(button)open(button.dataset.student);});
    root.querySelector('#student-form').addEventListener('submit',save);
    root.querySelector('#student-cancel').addEventListener('click',close);
    root.querySelector('#student-dialog').addEventListener('cancel',event=>{if(saving)event.preventDefault();});
    root.querySelector('#student-dialog').addEventListener('close',()=>{selected=null;submission=null;});
    root.querySelector('#student-refresh').addEventListener('click',load);
    root.querySelector('#student-refresh').disabled=!connection||Boolean(connection.occurrencesOnly);
    root.querySelector('#student-status').textContent=connection?'':'Os dados da escola estão indisponíveis.';
    drawActor();syncTabs();if(connection)load();
  }
  function unmount(){version++;occurrences?.unmount();close();students=[];busy=false;root=null;}
  return {mount,unmount,connectionChanged,personalConnectionChanged};
})();
