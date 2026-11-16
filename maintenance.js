'use strict';
window.FarolMaintenance=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const messages={login_required:'Conecte novamente a conta GERAL.',missing_scope:'Use Geral → Revisar autorização para permitir a consulta dos nomes no Drive.',account_changed:'A conta ou a pasta mudou. Atualize a lista.',folder_missing:'Não foi encontrado o caminho FarolGE/FaltasSemanais no Drive da conta GERAL. Confira a pasta FarolGE e a subpasta FaltasSemanais.',folder_ambiguous:'Há pastas duplicadas no caminho FarolGE/FaltasSemanais. Confira se existe apenas uma FarolGE e uma FaltasSemanais diretamente dentro dela.',drive_incomplete:'O Google não concluiu a pesquisa. Tente atualizar.',drive_policy:'A política da organização impediu a consulta ao Drive.',unavailable:'Não foi possível consultar os arquivos. Tente atualizar.'};
  let root=null,connection=null,files=[],folder=null,next=null,busy=false,error='',loaded=false,version=0;
  function clear(){version++;files=[];folder=null;next=null;busy=false;error='';loaded=false;}
  function draw(){
    if(!root)return;
    root.querySelector('#maintenance-identity').textContent=connection?.email||'Conta GERAL não conectada';
    root.querySelector('#maintenance-status').textContent=busy?'Consultando arquivos…':!connection?'Conecte a conta GERAL da escola para consultar a pasta FarolGE/FaltasSemanais.':!connection.driveMetadata?messages.missing_scope:error?(messages[error]||messages.unavailable)+(loaded?' A lista anterior foi mantida.':''):loaded&&!files.length?'A pasta FarolGE/FaltasSemanais não contém arquivos.':'';
    root.querySelector('#maintenance-files').innerHTML=files.map(file=>`<li>${escape(file.name)}</li>`).join('');
    root.querySelector('#maintenance-refresh').disabled=busy||!connection?.driveMetadata;
    root.querySelector('#maintenance-more').hidden=!next;
    root.querySelector('#maintenance-more').disabled=busy||Boolean(error);
  }
  async function load(more=false){
    if(!root||!connection?.driveMetadata||busy)return;
    const ticket=++version,mailbox=connection.email;
    busy=true;error='';draw();
    try{
      const params=new URLSearchParams({mailbox,...(more?{pageToken:next,folder:folder.id}:{})});
      const response=await fetch('/api/google/maintenance?'+params,{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||!Array.isArray(result.files)||!result.folder?.id||(more&&result.folder.id!==folder.id))throw new Error('account_changed');
      files=more?[...new Map([...files,...result.files].map(file=>[file.id,file])).values()]:result.files;
      folder=result.folder;next=result.nextPageToken;loaded=true;
    }catch(e){
      if(ticket===version){
        error=e.message;
        if(['login_required','account_changed','missing_scope'].includes(error)){files=[];loaded=false;next=null;}
      }
    }finally{if(ticket===version){busy=false;draw();}}
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email||connection?.driveMetadata!==value?.driveMetadata;
    connection=value;
    if(changed){clear();draw();if(root&&connection?.driveMetadata)load();}
  }
  function mount(element){
    root=element;clear();
    root.innerHTML='<h1>Manutenção do Sistema</h1><section class="panel" aria-labelledby="maintenance-title"><h2 id="maintenance-title">Arquivos da pasta FarolGE/FaltasSemanais</h2><p class="demand-intro">Arquivos diretamente na pasta FarolGE/FaltasSemanais do Drive da conta GERAL da escola, em ordem alfabética.</p><p id="maintenance-identity" class="overview-identity"></p><p id="maintenance-status" class="overview-status" role="status"></p><ul id="maintenance-files" class="maintenance-files"></ul><div class="button-row"><button type="button" class="button" id="maintenance-refresh">Atualizar lista</button><button type="button" class="button" id="maintenance-more" hidden>Carregar mais</button></div></section>';
    root.querySelector('#maintenance-refresh').addEventListener('click',()=>load());
    root.querySelector('#maintenance-more').addEventListener('click',()=>load(true));
    draw();if(connection?.driveMetadata)load();
  }
  function unmount(){clear();root=null;}
  return {mount,unmount,connectionChanged};
})();
