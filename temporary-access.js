'use strict';
window.FarolTemporaryAccess=(()=>{
  const get=name=>document.querySelector('#temporary-'+name);
  const dialog=get('dialog'),form=get('form');
  const errors={
    temporary_confirmation_required:'Peça a Marcos para confirmar seu primeiro acesso presencialmente em Configurações.',
    temporary_invalid_credentials:'Não foi possível confirmar o acesso. Confira a senha e tente novamente.',
    temporary_rate_limit:'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.',
    temporary_password_length:'Use uma senha com pelo menos 15 caracteres.',
    temporary_password_confirmation:'As duas senhas precisam ser iguais.',
    login_required:'A conexão temporária terminou. Identifique-se novamente.',
    invalid_temporary_user:'Usuário indisponível. Atualize a lista em Voltar e selecione novamente.',
    access_setup_required:'O cadastro temporário ainda precisa ser preparado no Supabase.',
    unavailable:'Não foi possível concluir. Tente novamente.'
  };
  let user=null,selected=null,mode='',requestId=0,next=null,busy=false;

  async function api(action,body){
    const response=await fetch('/api/google/'+action,{
      credentials:'same-origin',cache:'no-store',
      ...(body?{method:'POST',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify(body)}:{})
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'unavailable');
    return result;
  }
  function setBusy(value){
    busy=value;
    for(const name of ['submit','back','close','more','choose'])get(name).disabled=value;
  }
  function message(text){get('feedback').textContent=text;}
  function updatePasswordVisibility(){
    const type=get('show-password').checked?'text':'password';
    for(const name of ['current','password','confirmation'])get(name).type=type;
  }
  function resetPasswordForm(){
    form.reset();
    updatePasswordVisibility();
  }
  function update(value,configured){
    user=value;
    get('open').disabled=!configured;
    get('open').hidden=Boolean(user);
    get('change').hidden=!user;
    get('exit').hidden=!user;
    get('identity').textContent=user?.name||'';
  }
  function showForm(action,profile,confirmed=false){
    selected=profile;
    mode=action;
    resetPasswordForm();
    const create=action==='activate',change=action==='password';
    get('title').textContent=create?'Criar senha':change?'Alterar senha':'Confirmar identidade';
    get('person').textContent=profile.name;
    get('person').hidden=false;
    get('list-section').hidden=true;
    form.hidden=false;
    get('current-field').hidden=!change;
    get('current').required=change;
    get('confirm-field').hidden=!create&&!change;
    get('confirmation').required=create||change;
    get('password-label').textContent=change?'Nova senha':'Senha';
    get('password').autocomplete=create||change?'new-password':'current-password';
    get('password').minLength=create||change?15:1;
    get('submit').textContent=create?'Criar senha':change?'Salvar senha':'Entrar';
    get('back').hidden=change;
    message(create?(confirmed?'Primeiro acesso confirmado. Escolha uma senha com pelo menos 15 caracteres.':'Para criar sua senha, Marcos precisa confirmar seu primeiro acesso presencialmente.'):change?'Use pelo menos 15 caracteres na nova senha.':'');
    if(!dialog.open)dialog.showModal();
    (change?get('current'):get('password')).focus();
  }
  async function loadUsers(more=false){
    const ticket=++requestId;
    setBusy(true);message('Carregando usuários…');
    try {
      const query=more?'?'+new URLSearchParams({pageToken:next}):'';
      const page=await api('temporary-users'+query);
      if(ticket!==requestId)return;
      for(const row of page.users){
        const option=document.createElement('option');
        option.value=row.id;option.textContent=row.name;
        get('users').append(option);
      }
      next=page.nextPageToken;
      get('more').hidden=!next;
      message(get('users').options.length?'':'Nenhum usuário cadastrado.');
    } catch(error){if(ticket===requestId)message(errors[error.message]||errors.unavailable);}
    finally{
      if(ticket===requestId){
        setBusy(false);
        get('choose').disabled=!get('users').value;
      }
    }
  }
  function showUsers(){
    mode='';selected=null;next=null;resetPasswordForm();
    get('title').textContent='Quem é você?';
    get('person').hidden=true;
    get('list-section').hidden=false;
    get('users').replaceChildren();
    get('more').hidden=true;
    form.hidden=true;
    if(!dialog.open)dialog.showModal();
    loadUsers();
  }
  function enroll(profile){
    showForm('activate',profile,true);
  }
  get('open').addEventListener('click',showUsers);
  get('show-password').addEventListener('change',updatePasswordVisibility);
  get('back').addEventListener('click',showUsers);
  get('more').addEventListener('click',()=>loadUsers(true));
  get('users').addEventListener('change',()=>{get('choose').disabled=busy||!get('users').value;});
  get('choose').addEventListener('click',async()=>{
    const id=get('users').value;
    if(!id||busy)return;
    const ticket=++requestId;
    setBusy(true);message('Verificando cadastro…');
    try{
      const profile=await api('temporary-user?'+new URLSearchParams({id}));
      if(ticket===requestId)showForm(profile.hasPassword?'login':'activate',profile);
    }catch(error){if(ticket===requestId)message(errors[error.message]||errors.unavailable);}
    finally{if(ticket===requestId)setBusy(false);}
  });
  get('change').addEventListener('click',()=>{if(user)showForm('password',user);});
  get('exit').addEventListener('click',async()=>{
    get('exit').disabled=true;
    try{
      await api('temporary-logout',{});
      get('status').textContent='Conexão temporária encerrada.';
      await window.FarolRefreshConnections?.();
    }catch{get('status').textContent=errors.unavailable;}
    finally{get('exit').disabled=false;}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||!selected)return;
    const body={password:get('password').value};
    if(mode!=='password')body.id=selected.id;
    if(mode!=='login')body.confirmation=get('confirmation').value;
    if(mode==='password')body.currentPassword=get('current').value;
    setBusy(true);message('Confirmando…');
    try{
      await api('temporary-'+mode,body);
      get('status').textContent=mode==='password'?'Senha atualizada.':'Conexão temporária ativa.';
      dialog.close();
      await window.FarolRefreshConnections?.();
    }catch(error){
      message(errors[error.message]||errors.unavailable);
      if(error.message==='login_required')window.FarolRefreshConnections?.();
    }finally{setBusy(false);}
  });
  get('close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{requestId++;resetPasswordForm();setBusy(false);});
  return {update,enroll};
})();
