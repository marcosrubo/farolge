'use strict';
window.FarolAuthorizedUsers=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const messages={access_setup_required:'Prepare EmailsAutorizados no Supabase do FAROL GE.',authorized_write_denied:'Execute database/access-management-authors.sql no Supabase do FAROL GE para habilitar a administração.',access_unavailable:'Não foi possível consultar o cadastro. Tente atualizar.',email_exists:'Este e-mail já está cadastrado.',invalid_authorized_email:'Preencha Escola, Nome e um e-mail válido.',login_required:'Conecte novamente a conta GERAL.',account_changed:'A conta GERAL mudou. Atualize o cadastro.',unavailable:'Não foi possível concluir. Atualize o cadastro para conferir o resultado.'};
  let root=null,connection=null,rows=[],next=null,busy=false,error='',feedback='',version=0,selected=null;
  function close(){const dialog=root?.querySelector('#authorized-delete-dialog');if(dialog?.open)dialog.close();selected=null;}
  function clear(){version++;close();rows=[];next=null;busy=false;error='';feedback='';}
  function draw(){
    if(!root)return;
    root.querySelector('#authorized-identity').textContent=connection?.email||'Conta GERAL não conectada';
    root.querySelector('#authorized-status').textContent=!connection?'Conecte uma conta GERAL autorizada para administrar os e-mails.':busy?'Processando cadastro…':error?(messages[error]||messages.unavailable):feedback;
    root.querySelector('#authorized-rows').innerHTML=rows.map(row=>`<tr><td>${escape(row.Escola)}</td><td>${escape(row.Nome)}</td><td>${escape(row.email)}</td><td><button type="button" class="button" data-exclude-email="${escape(row.email)}" ${busy||!connection?'disabled':''}>EXCLUIR</button></td></tr>`).join('');
    root.querySelector('#authorized-include').disabled=busy||!connection;
    root.querySelector('#authorized-refresh').disabled=busy||!connection;
    root.querySelector('#authorized-more').hidden=!next;root.querySelector('#authorized-more').disabled=busy||Boolean(error);
    root.querySelector('#authorized-delete-confirm').disabled=busy;
    root.querySelector('#authorized-delete-cancel').disabled=busy;
  }
  async function load(more=false){
    if(!root||!connection||busy)return;
    const ticket=++version,mailbox=connection.email;busy=true;error='';draw();
    try{
      const response=await fetch('/api/google/authorized-emails?'+new URLSearchParams({mailbox,...(more?{pageToken:next}:{})}),{credentials:'same-origin',cache:'no-store'}),result=await response.json();window.FarolAccessDenied?.(result);
      if(!response.ok)throw new Error(result.error||'unavailable');if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||!Array.isArray(result.users))throw new Error('account_changed');
      rows=more?[...new Map([...rows,...result.users].map(row=>[row.email,row])).values()]:result.users;next=result.nextPageToken||null;
      if(!rows.length&&!feedback)feedback='Nenhum e-mail cadastrado.';
    }catch(e){if(ticket===version)error=e.message;}
    finally{if(ticket===version){busy=false;draw();}}
  }
  async function mutate(operation,email){
    if(!root||!connection||busy)return;
    const ticket=version,mailbox=connection.email;
    const body={type:'general',mailbox,operation,email,...(operation==='include'?{nome:root.querySelector('#authorized-name').value,escola:root.querySelector('#authorized-school').value}:{})};
    busy=true;error='';feedback='';draw();let saved=false;
    try{
      const response=await fetch('/api/google/authorized-email',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify(body)}),result=await response.json();window.FarolAccessDenied?.(result);
      if(!response.ok)throw new Error(result.error||'unavailable');if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||!result.saved||result.operation!==operation)throw new Error('account_changed');
      saved=true;feedback=operation==='include'?'E-mail incluído.':'E-mail excluído do cadastro.';close();
      if(operation==='include'){root.querySelector('#authorized-name').value='';root.querySelector('#authorized-email').value='';}
    }catch(e){if(ticket===version)error=e.message;}
    finally{if(ticket===version){busy=false;draw();}}
    if(saved&&ticket===version){await window.FarolRefreshConnections?.();if(root&&ticket===version)load();}
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email;connection=value;
    if(changed){clear();if(root){root.querySelector('#authorized-name').value='';root.querySelector('#authorized-email').value='';draw();if(connection)load();}}
  }
  function mount(element){
    root=element;clear();root.innerHTML=`<h1>Configurações</h1><section class="panel" aria-labelledby="authorized-title"><h2 id="authorized-title">Cadastro de E-mails usuários do aplicativo</h2><p class="demand-intro">Contas Gerais autorizadas podem incluir e excluir e-mails da lista de acesso ao FAROL GE.</p><p id="authorized-identity" class="overview-identity"></p><form id="authorized-form" class="authorized-form"><label class="field">Escola<input class="form-control" id="authorized-school" required maxlength="200"></label><label class="field">Nome<input class="form-control" id="authorized-name" required maxlength="200"></label><label class="field">E-mail<input class="form-control" id="authorized-email" type="email" required maxlength="254"></label><button type="submit" class="button primary" id="authorized-include">INCLUIR</button></form><p id="authorized-status" class="overview-status" role="status"></p><div class="table-wrap"><table><thead><tr><th scope="col">Escola</th><th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">Ações</th></tr></thead><tbody id="authorized-rows"></tbody></table></div><p class="demand-footnote">marcos.rubo@gmail.com mantém a liberação fixa no código. Excluir esse cadastro não remove a exceção.</p><div class="button-row"><button type="button" class="button" id="authorized-refresh">Atualizar cadastro</button><button type="button" class="button" id="authorized-more" hidden>Carregar mais</button></div></section><dialog id="authorized-delete-dialog" aria-labelledby="authorized-delete-title"><h2 id="authorized-delete-title">Excluir e-mail</h2><p id="authorized-delete-email"></p><p>A exclusão retira a liberação de acesso deste e-mail e preserva os dados e ocorrências já registrados.</p><div class="button-row"><button type="button" class="button primary" id="authorized-delete-confirm">EXCLUIR</button><button type="button" class="button" id="authorized-delete-cancel">Cancelar</button></div></dialog>`;
    root.querySelector('#authorized-school').value=window.FAROL_CONFIG?.schoolName||'';
    root.querySelector('#authorized-form').addEventListener('submit',event=>{event.preventDefault();mutate('include',root.querySelector('#authorized-email').value);});
    root.querySelector('#authorized-refresh').addEventListener('click',()=>load());root.querySelector('#authorized-more').addEventListener('click',()=>load(true));
    root.querySelector('#authorized-rows').addEventListener('click',event=>{const button=event.target.closest('[data-exclude-email]');if(!button||busy)return;selected=rows.find(row=>row.email===button.dataset.excludeEmail);if(selected){root.querySelector('#authorized-delete-email').textContent=selected.email;root.querySelector('#authorized-delete-dialog').showModal();}});
    root.querySelector('#authorized-delete-confirm').addEventListener('click',()=>{if(selected)mutate('exclude',selected.email);});root.querySelector('#authorized-delete-cancel').addEventListener('click',close);
    root.querySelector('#authorized-delete-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});draw();if(connection)load();
  }
  function unmount(){clear();root=null;}
  return {mount,unmount,connectionChanged};
})();
