'use strict';
window.FarolTemporaryAccess=(()=>{
  const get=name=>document.querySelector('#temporary-'+name);
  const dialog=get('dialog'),form=get('form');
  const minimumPasswordLength=6;
  const meetsPasswordMinimum=value=>[...value].length>=minimumPasswordLength;
  const errors={
    access_unavailable:'Não foi possível verificar se há uma senha cadastrada. Tente novamente.',
    temporary_invalid_credentials:'Não foi possível confirmar o acesso. Confira a senha e tente novamente.',
    temporary_rate_limit:'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.',
    temporary_password_length:'Use uma senha com pelo menos 6 caracteres.',
    temporary_password_confirmation:'As duas senhas precisam ser iguais.',
    login_required:'A conexão temporária terminou. Identifique-se novamente.',
    admin_required:'Conecte Geral e Pessoal para resetar a senha.',
    temporary_reset_unavailable:'O cadastro ou a senha mudou. Atualize a lista e tente novamente.',
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
  const editingPassword=()=>mode==='password'||mode==='reset-password';
  function updatePasswordMatch(){
    const password=get('password').value,confirmation=get('confirmation').value;
    const active=editingPassword()&&Boolean(password||confirmation);
    const equal=password===confirmation;
    const status=get('password-match');
    status.className=active?(equal?'password-match is-equal':'password-match is-different'):'password-match';
    status.textContent=active?(equal?'Senhas IGUAIS':'Senhas DIFERENTES'):'';
  }
  function updatePasswordLength(){
    if(!editingPassword())return;
    const valid=meetsPasswordMinimum(get('password').value);
    const status=get('password-length');
    status.className=valid?'password-match is-equal':'password-match is-different';
    status.textContent=valid?'senha válida':'senha inválida';
  }
  function resetPasswordForm(){
    form.reset();
    updatePasswordVisibility();
    updatePasswordMatch();
    get('password-length').textContent='';
  }
  function update(value,configured){
    user=value;
    get('open').disabled=!configured;
    get('open').hidden=Boolean(user);
    get('change').hidden=!user;
    get('exit').hidden=!user;
    get('identity').textContent=user?.name||'';
  }
  function showForm(action,profile){
    selected=profile;
    mode=action;
    resetPasswordForm();
    const create=action==='activate',change=action==='password',reset=action==='reset-password';
    const newPassword=create||change||reset;
    get('title').textContent=create?'Criar senha':reset?'Resetar senha':change?'Alterar senha':'Entrar';
    get('person').textContent=profile.name;
    get('person').hidden=false;
    get('list-section').hidden=true;
    form.hidden=false;
    get('current-field').hidden=!change;
    get('current').required=change;
    get('confirm-field').hidden=!newPassword;
    get('confirmation').required=newPassword;
    get('password-label').textContent=editingPassword()?`Nova senha (mínimo de ${minimumPasswordLength} caracteres)`:'Senha';
    get('confirmation-label').textContent=editingPassword()?`Confirme a nova senha (mínimo de ${minimumPasswordLength} caracteres)`:'Confirme a senha';
    get('password').autocomplete=newPassword?'new-password':'current-password';
    get('password').minLength=newPassword?minimumPasswordLength:1;
    get('submit').textContent=create?'Criar senha':editingPassword()?'Salvar senha':'Entrar';
    get('back').hidden=editingPassword();
    message(create?`Primeiro acesso confirmado. Escolha uma senha com pelo menos ${minimumPasswordLength} caracteres.`:'');
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
    return loadUsers();
  }
  function firstAccessRequired(profile){
    selected=null;mode='';
    resetPasswordForm();
    get('title').textContent='Primeiro acesso';
    get('person').textContent=profile.name;
    get('person').hidden=false;
    get('list-section').hidden=false;
    form.hidden=true;
    message('O cadastro ainda está sem senha.');
  }
  function enroll(profile){showForm('activate',profile);}
  function resetPassword(profile){showForm('reset-password',profile);}
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
      if(ticket!==requestId)return;
      if(profile.hasPassword===true)showForm('login',profile);
      else if(profile.hasPassword!==false)message(errors.access_unavailable);
      else if(profile.canCreatePassword===true)showForm('activate',profile);
      else firstAccessRequired(profile);
    }catch(error){if(ticket===requestId)message(errors[error.message]||errors.unavailable);}
    finally{if(ticket===requestId)setBusy(false);}
  });
  get('change').addEventListener('click',()=>{if(user)showForm('password',user);});
  for(const name of ['password','confirmation']){
    get(name).addEventListener('input',()=>{
      if(name==='password')updatePasswordLength();
      updatePasswordMatch();
      if(get('feedback').textContent===errors.temporary_password_confirmation)message('');
    });
  }
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
    if(mode!=='login'){
      body.confirmation=get('confirmation').value;
      if(body.password!==body.confirmation){
        message(errors.temporary_password_confirmation);
        get('confirmation').focus();
        return;
      }
      if(!meetsPasswordMinimum(body.password)){
        message(errors.temporary_password_length);
        get('password').focus();
        return;
      }
    }
    if(mode==='password')body.currentPassword=get('current').value;
    if(mode==='reset-password')body.type='general';
    setBusy(true);message('Confirmando…');
    try{
      const result=await api('temporary-'+mode,body);
      if(mode==='activate'||mode==='reset-password'){
        if(result.passwordSaved!==true)throw new Error('unavailable');
        get('status').textContent=mode==='activate'?'Senha cadastrada.':'Senha redefinida.';
        dialog.close();
        await window.FarolAuthorizedUsers?.refresh?.();
        return;
      }
      if(result.signedIn!==true)throw new Error('unavailable');
      get('status').textContent=mode==='password'?'Senha atualizada.':'Conexão temporária ativa.';
      dialog.close();
      await window.FarolRefreshConnections?.();
    }catch(error){
      if(mode==='activate'&&error.message==='temporary_password_already_set'){
        get('status').textContent='A senha já está cadastrada.';
        dialog.close();
        await window.FarolAuthorizedUsers?.refresh?.();
      }else if(mode==='activate'&&error.message==='temporary_confirmation_required'){
        const profile=selected;
        await showUsers();
        if(dialog.open)firstAccessRequired(profile);
      }else{
        message(errors[error.message]||errors.unavailable);
      }
      if(error.message==='login_required')window.FarolRefreshConnections?.();
    }finally{setBusy(false);}
  });
  get('close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{requestId++;resetPasswordForm();setBusy(false);});
  return {update,enroll,resetPassword};
})();
