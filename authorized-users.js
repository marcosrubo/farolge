'use strict';
window.FarolAuthorizedUsers=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const messages={
    access_setup_required:'Execute database/authorized-emails.sql no Supabase do FAROL GE para preparar o cadastro.',
    authorized_write_denied:'Confira as permissões de database/authorized-emails.sql no Supabase do FAROL GE.',
    access_unavailable:'Não foi possível consultar o cadastro. Tente atualizar.',
    email_exists:'Este e-mail já está cadastrado.',
    invalid_authorized_email:'Preencha Escola, Nome e Função. Se informar e-mail e ordem, use um endereço válido e um número inteiro positivo.',
    not_found:'Este cadastro não foi encontrado. Atualize a lista.',
    admin_required:'Conecte Geral e Pessoal com a conta de Marcos para administrar os cadastros.',
    temporary_activation_unavailable:'O cadastro já tem senha ou foi removido. Atualize a lista.',
    login_required:'Conecte novamente a conta GERAL.',
    account_changed:'A conta GERAL mudou. Atualize o cadastro.',
    unavailable:'Não foi possível concluir. Atualize o cadastro para conferir o resultado.'
  };
  const success={include:'Usuário incluído.',update:'Cadastro atualizado.',exclude:'Usuário excluído do cadastro.'};
  let root=null,connection=null,rows=[],next=null,busy=false,error='',feedback='',version=0,selected=null,editing=null;
  const field=name=>root.querySelector('#authorized-'+name);
  const permissions=()=>window.FarolMenuModules||[];
  function close(){
    const dialog=field('delete-dialog');
    if(dialog?.open)dialog.close();
    selected=null;
  }
  function fillForm(row=null){
    editing=row?.id||null;
    field('school').value=row?.Escola??window.FAROL_CONFIG?.schoolName??'';
    field('name').value=row?.Nome??'';
    field('function').value=row?.Funcao??'';
    field('email').value=row?.email??'';
    field('order').value=row?.Ordem??'';
    for(const item of permissions())field('permission-'+item.id).checked=row?.permissions?.includes(item.id)===true;
  }
  function clear(){version++;if(root)close();rows=[];next=null;busy=false;error='';feedback='';editing=null;}
  function draw(){
    if(!root)return;
    const disabled=busy||!connection;
    field('identity').textContent=connection?.email||'Conta GERAL não conectada';
    field('status').textContent=!connection?'Conecte Geral e Pessoal com a conta de Marcos para administrar os cadastros.':busy?'Processando cadastro…':error?(messages[error]||messages.unavailable):feedback||(!rows.length?'Nenhum usuário cadastrado.':'');
    field('rows').innerHTML=rows.map(row=>`<tr>
      <td>${escape(row.Escola)}</td><td>${escape(row.Nome)}</td><td>${escape(row.Funcao??'A preencher')}</td>
      <td>${escape(row.email??'—')}</td><td>${escape(row.Ordem??'—')}</td>
      <td><button type="button" class="button" data-authorized-action="edit" data-user-id="${escape(row.id)}" ${disabled?'disabled':''}>Editar</button>
      <button type="button" class="button" data-authorized-action="exclude" data-user-id="${escape(row.id)}" ${disabled?'disabled':''}>EXCLUIR</button>
      ${row.hasPassword?`<button type="button" class="button" data-authorized-action="reset" data-user-id="${escape(row.id)}" ${disabled?'disabled':''}>Resetar senha</button>`:''}
      ${row.Funcao&&!row.hasPassword?`<button type="button" class="button" data-authorized-action="enroll" data-user-id="${escape(row.id)}" ${disabled?'disabled':''}>Confirmar primeiro acesso</button>`:''}</td>
    </tr>`).join('');
    field('include').textContent=editing?'SALVAR':'INCLUIR';
    field('cancel-edit').hidden=!editing;
    for(const name of ['school','name','function','email','order','include','cancel-edit','refresh'])field(name).disabled=disabled;
    field('permissions').disabled=disabled;
    field('more').hidden=!next;
    field('more').disabled=busy||Boolean(error);
    field('delete-confirm').disabled=busy;
    field('delete-cancel').disabled=busy;
  }
  async function load(more=false){
    if(!root||!connection||busy)return;
    const ticket=++version,mailbox=connection.email;
    busy=true;error='';if(more)feedback='';draw();
    try{
      const query=new URLSearchParams({mailbox,...(more?{pageToken:next}:{})});
      const response=await fetch('/api/google/authorized-emails?'+query,{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();window.FarolAccessDenied?.(result);
      if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||!Array.isArray(result.users))throw new Error('account_changed');
      rows=more?[...new Map([...rows,...result.users].map(row=>[row.id,row])).values()]:result.users;
      next=result.nextPageToken||null;
    }catch(e){if(ticket===version)error=e.message;}
    finally{if(ticket===version){busy=false;draw();}}
  }
  async function mutate(operation,id){
    if(!root||!connection||busy)return;
    const ticket=version,mailbox=connection.email;
    const body={type:'general',mailbox,operation};
    if(id)body.id=id;
    if(operation!=='exclude'){
      const order=field('order').value;
      Object.assign(body,{
        escola:field('school').value,
        nome:field('name').value,
        funcao:field('function').value,
        email:field('email').value,
        ordem:order===''?null:Number(order),
        permissions:permissions().filter(item=>field('permission-'+item.id).checked).map(item=>item.id)
      });
    }
    busy=true;error='';feedback='';draw();let saved=false;
    try{
      const response=await fetch('/api/google/authorized-email',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify(body)});
      const result=await response.json();window.FarolAccessDenied?.(result);
      if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||!result.saved||result.operation!==operation)throw new Error('account_changed');
      saved=true;feedback=success[operation];close();
      if(operation!=='exclude'||editing===id){
        const school=field('school').value;
        fillForm();
        field('school').value=school;
      }
    }catch(e){if(ticket===version)error=e.message;}
    finally{if(ticket===version){busy=false;draw();}}
    if(saved&&ticket===version){
      await window.FarolRefreshConnections?.();
      if(root&&ticket===version)load();
    }
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email;
    connection=value;
    if(!changed)return;
    clear();
    if(root){
      fillForm();draw();
      if(connection)load();
    }
  }
  async function enroll(row){
    if(!window.confirm('Confirma a criação da primeira senha de '+row.Nome+'?'))return;
    const ticket=version;
    busy=true;error='';feedback='';draw();
    try {
      const response=await fetch('/api/google/temporary-confirm',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-Farol-Request':'1'},
        body:JSON.stringify({type:'general',id:row.id})
      });
      const result=await response.json();
      window.FarolAccessDenied?.(result);
      if(!response.ok||result.confirmed!==true)throw new Error(result.error||'unavailable');
      if(ticket===version)window.FarolTemporaryAccess?.enroll({id:row.id,name:row.Nome});
    }catch(e){if(ticket===version)error=e.message;}
    finally{if(ticket===version){busy=false;draw();}}
  }
  function mount(element){
    root=element;clear();
    root.innerHTML=`
      <h1>Configurações</h1>
      <section class="panel" aria-labelledby="authorized-title">
        <h2 id="authorized-title">Cadastro de usuários</h2>
        <p id="authorized-identity" class="overview-identity"></p>
        <form id="authorized-form" class="authorized-form">
          <label class="field">Escola<input class="form-control" id="authorized-school" required maxlength="200"></label>
          <label class="field">Nome<input class="form-control" id="authorized-name" required maxlength="200"></label>
          <label class="field">Função<input class="form-control" id="authorized-function" required maxlength="200"></label>
          <label class="field">E-mail (opcional)<input class="form-control" id="authorized-email" type="email" maxlength="254"></label>
          <label class="field">Ordem (opcional)<input class="form-control" id="authorized-order" type="number" min="1" max="2147483647" step="1" aria-describedby="authorized-order-help"></label>
          <fieldset id="authorized-permissions" class="attendance-class-filter authorized-permissions">
            <legend>Funcionalidades habilitadas</legend>
            <div class="attendance-class-checklist">${permissions().map(item=>`<label class="attendance-class-choice"><input type="checkbox" id="authorized-permission-${item.id}"> ${item.label}</label>`).join('')}</div>
          </fieldset>
          <button type="submit" class="button primary" id="authorized-include">INCLUIR</button>
          <button type="button" class="button" id="authorized-cancel-edit" hidden>Cancelar edição</button>
        </form>
        <p class="demand-footnote" id="authorized-order-help">O menor número aparece primeiro. Cadastros sem ordem ficam no final.</p>
        <p id="authorized-status" class="overview-status" role="status"></p>
        <div class="table-wrap"><table>
          <thead><tr><th scope="col">Escola</th><th scope="col">Nome</th><th scope="col">Função</th><th scope="col">E-mail</th><th scope="col">Ordem</th><th scope="col">Ações</th></tr></thead>
          <tbody id="authorized-rows"></tbody>
        </table></div>
        <div class="button-row"><button type="button" class="button" id="authorized-refresh">Atualizar cadastro</button><button type="button" class="button" id="authorized-more" hidden>Carregar mais</button></div>
      </section>
      <dialog id="authorized-delete-dialog" aria-labelledby="authorized-delete-title">
        <h2 id="authorized-delete-title">Excluir usuário</h2>
        <p id="authorized-delete-email"></p>
        <p id="authorized-delete-note"></p>
        <div class="button-row"><button type="button" class="button primary" id="authorized-delete-confirm">EXCLUIR</button><button type="button" class="button" id="authorized-delete-cancel">Cancelar</button></div>
      </dialog>`;
    fillForm();
    field('form').addEventListener('submit',event=>{event.preventDefault();mutate(editing?'update':'include',editing);});
    field('cancel-edit').addEventListener('click',()=>{fillForm();error='';feedback='';draw();});
    field('refresh').addEventListener('click',()=>{feedback='';load();});
    field('more').addEventListener('click',()=>load(true));
    field('rows').addEventListener('click',event=>{
      const button=event.target.closest('[data-authorized-action]');
      if(!button||busy||!connection)return;
      const row=rows.find(row=>row.id===button.dataset.userId);
      if(!row)return;
      if(button.dataset.authorizedAction==='enroll'){enroll(row);return;}
      if(button.dataset.authorizedAction==='reset'){
        window.FarolTemporaryAccess?.resetPassword?.({id:row.id,name:row.Nome});
        return;
      }
      if(button.dataset.authorizedAction==='edit'){
        fillForm(row);error='';feedback='';draw();field('school').focus();
        return;
      }
      selected=row;
      field('delete-email').textContent=row.email?`${row.Nome} (${row.email})`:row.Nome;
      field('delete-note').textContent='A exclusão encerra a conexão temporária deste cadastro e preserva as ocorrências já registradas.';
      field('delete-dialog').showModal();
    });
    field('delete-confirm').addEventListener('click',()=>{if(selected)mutate('exclude',selected.id);});
    field('delete-cancel').addEventListener('click',close);
    field('delete-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();else selected=null;});
    draw();if(connection)load();
  }
  function unmount(){clear();root=null;}
  return {mount,unmount,connectionChanged,refresh:()=>load()};
})();
