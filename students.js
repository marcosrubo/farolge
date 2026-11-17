'use strict';
window.FarolStudents=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const messages={setup_required:'Execute database/students.sql no Supabase do FAROL GE para preparar Alunos e Ocorrencias.',login_required:'Conecte novamente a conta GERAL.',account_changed:'A conta mudou. Atualize a lista.',invalid_occurrence:'Confira o texto da ocorrência (até 5.000 caracteres).',student_missing:'O aluno não foi encontrado nesta conta. Atualize a lista.',conflict:'Este registro já foi enviado com outros dados. Feche e abra uma nova ocorrência.',unavailable:'Não foi possível concluir. Tente novamente.'};
  let root=null,connection=null,students=[],version=0,busy=false,saving=false,selected=null,submission=null;
  function close(){const dialog=root?.querySelector('#student-dialog');if(dialog?.open)dialog.close();selected=null;submission=null;saving=false;}
  function list(){
    if(!root)return;
    const query=root.querySelector('#student-search').value.trim().toLocaleLowerCase('pt-BR');
    root.querySelector('#student-list').innerHTML=students.filter(s=>(s.Nome+' '+s.Serie+' '+s.Turma+' '+s.Turno+' '+s.CGM).toLocaleLowerCase('pt-BR').includes(query)).map(s=>`<li><button type="button" class="student-row" data-student="${escape(s.id)}"><span>${escape(s.Nome)}</span><span class="student-class">${escape(s.Serie)} · ${escape(s.Turma)} · ${escape(s.Turno)}</span></button></li>`).join('');
  }
  async function load(){
    if(!root||!connection||busy)return;
    const ticket=++version,mailbox=connection.email;busy=true;
    root.querySelector('#student-refresh').disabled=true;root.querySelector('#student-status').textContent='Consultando alunos…';
    try{
      const response=await fetch('/api/google/students?'+new URLSearchParams({mailbox}),{credentials:'same-origin',cache:'no-store'}),result=await response.json();
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
    root.querySelector('#student-save').disabled=false;root.querySelector('#student-cancel').disabled=false;
    root.querySelector('#student-dialog').showModal();root.querySelector('#student-occurrence').focus();
  }
  async function save(event){
    event.preventDefault();if(!root||!selected||!connection||saving)return;
    const ticket=version,mailbox=connection.email;
    saving=true;root.querySelector('#student-save').disabled=true;root.querySelector('#student-cancel').disabled=true;
    root.querySelector('#student-feedback').textContent='Salvando ocorrência…';
    try{
      const response=await fetch('/api/google/occurrence',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify({type:'general',mailbox,id:submission,studentId:selected.id,ocorrencia:root.querySelector('#student-occurrence').value})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||!result.saved)throw new Error('account_changed');
      const date=result.date.split('-').reverse().join('/');close();root.querySelector('#student-status').textContent=`Ocorrência registrada em ${date} às ${result.time} (Brasília).`;
    }catch(error){if(ticket===version&&root)root.querySelector('#student-feedback').textContent=messages[error.message]||messages.unavailable;}
    finally{if(ticket===version&&root){saving=false;root.querySelector('#student-save').disabled=false;root.querySelector('#student-cancel').disabled=false;}}
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email;connection=value;
    if(changed){version++;students=[];busy=false;close();if(root){list();root.querySelector('#student-refresh').disabled=!connection;root.querySelector('#student-status').textContent=connection?'':'Conecte a conta GERAL da escola para consultar alunos e registrar ocorrências.';if(connection)load();}}
  }
  function mount(element){
    root=element;students=[];busy=false;
    root.innerHTML=`<h1>Inspetores/Monitores</h1><section class="panel"><p class="demand-intro">Selecione um aluno para registrar uma ocorrência. Os alunos são apresentados em ordem alfabética, com a turma à direita.</p><label class="student-search-label" for="student-search">Buscar aluno, CGM ou turma</label><input class="form-control" type="search" id="student-search"><p id="student-status" class="overview-status" role="status"></p><ul id="student-list" class="student-list"></ul><button type="button" class="button" id="student-refresh">Atualizar alunos</button></section><dialog id="student-dialog" aria-labelledby="student-dialog-title"><h2 id="student-dialog-title"></h2><p id="student-dialog-class"></p><form id="student-form"><p id="student-school" class="demand-intro"></p><label class="field">Ocorrência<textarea id="student-occurrence" class="form-control" required maxlength="5000" rows="6"></textarea></label><p class="demand-footnote">A data e a hora serão registradas no momento do salvamento, pelo horário de Brasília.</p><p id="student-feedback" role="status"></p><div class="button-row"><button type="submit" id="student-save" class="button primary">Salvar ocorrência</button><button type="button" id="student-cancel" class="button">Cancelar</button></div></form></dialog>`;
    root.querySelector('#student-search').addEventListener('input',list);
    root.querySelector('#student-list').addEventListener('click',event=>{const button=event.target.closest('[data-student]');if(button)open(button.dataset.student);});
    root.querySelector('#student-form').addEventListener('submit',save);
    root.querySelector('#student-cancel').addEventListener('click',close);
    root.querySelector('#student-dialog').addEventListener('cancel',event=>{if(saving)event.preventDefault();});
    root.querySelector('#student-dialog').addEventListener('close',()=>{selected=null;submission=null;});
    root.querySelector('#student-refresh').addEventListener('click',load);
    root.querySelector('#student-refresh').disabled=!connection;
    root.querySelector('#student-status').textContent='Conecte a conta GERAL da escola para consultar alunos e registrar ocorrências.';
    if(connection)load();
  }
  function unmount(){version++;close();students=[];busy=false;root=null;}
  return {mount,unmount,connectionChanged};
})();
