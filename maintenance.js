'use strict';
window.FarolMaintenance=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const messages={login_required:'Conecte novamente a conta GERAL.',missing_scope:'Use Geral → Revisar autorização para permitir a consulta dos nomes no Drive.',account_changed:'A conta ou a pasta mudou. Atualize a lista.',folder_missing:'Não foi encontrado o caminho FarolGE/FaltasSemanais no Drive da conta GERAL. Confira se a conta GERAL tem acesso à pasta FarolGE e à subpasta FaltasSemanais, inclusive em Compartilhados comigo.',folder_ambiguous:'Há pastas duplicadas no caminho FarolGE/FaltasSemanais. Confira se existe apenas uma FarolGE e uma FaltasSemanais diretamente dentro dela.',drive_incomplete:'O Google não concluiu a pesquisa. Tente atualizar.',drive_policy:'A política da organização impediu a consulta ao Drive.',unavailable:'Não foi possível consultar os arquivos. Tente atualizar.'};
  Object.assign(messages,{file_download_denied:'O Google Drive bloqueou o download deste arquivo.',attendance_setup_required:'Execute database/attendance.sql no Supabase do FAROL GE para preparar a carga de faltas.',attendance_layout:'O PDF não corresponde ao modelo de frequência ou contém valores inconsistentes. Nenhuma falta foi gravada.',attendance_filename:'Use AAAA_MM_DDMM_DDMM_Manha.pdf ou AAAA_MM_DDMM_DDMM_Tarde.pdf com datas válidas no mesmo mês.',file_changed:'O arquivo mudou. Atualize a lista antes de carregar.',file_outside_folder:'O arquivo não está mais na pasta FaltasSemanais.',file_too_large:'O limite é 10 MB e 100 páginas.',unsupported_file:'Selecione um relatório PDF.',pdf_runtime_unavailable:'O leitor de PDF está indisponível no servidor.',storage_access_denied:'O Supabase recusou a carga. Confira as permissões do backend.',storage_unavailable:'Não foi possível acessar o Supabase. Atualize a lista para conferir o resultado.',import_unconfirmed:'A confirmação da carga falhou. Atualize a lista para conferir o resultado.'});
  let feedback='',loadingId=null;
  let root=null,connection=null,files=[],folder=null,next=null,busy=false,error='',loaded=false,version=0;
  function clear(){version++;feedback='';loadingId=null;files=[];folder=null;next=null;busy=false;error='';loaded=false;}
  function fileRow(file){
    const pdf=file.mimeType==='application/pdf'&&/\.pdf$/i.test(file.name),valid=/^\d{4}_\d{2}_\d{4}_\d{4}_(Manha|Tarde)\.pdf$/i.test(file.name);
    const button=pdf?` <button type="button" class="button" data-load-attendance="${escape(file.id)}" ${busy||error||!connection?.driveRead||!file.version||!valid?'disabled':''}>${loadingId===file.id?'Carregando…':'Carregar'}</button>`:'';
    return `<li><span>${escape(file.name)}${file.loaded?' — Já carregado':''}</span>${button}</li>`;
  }
  function draw(){
    if(!root)return;
    root.querySelector('#maintenance-identity').textContent=connection?.email||'Conta GERAL não conectada';
    root.querySelector('#maintenance-status').textContent=busy?'Consultando arquivos…':!connection?'Conecte a conta GERAL da escola para consultar a pasta FarolGE/FaltasSemanais.':!connection.driveMetadata?messages.missing_scope:error?(messages[error]||messages.unavailable)+(loaded?' A lista anterior foi mantida.':''):loaded&&!files.length?'A pasta FarolGE/FaltasSemanais não contém arquivos.':'';
    root.querySelector('#maintenance-files').innerHTML=files.map(fileRow).join('');
    root.querySelector('#maintenance-refresh').disabled=busy||!connection?.driveMetadata;
    root.querySelector('#maintenance-more').hidden=!next;
    root.querySelector('#maintenance-more').disabled=busy||Boolean(error);
    const pdfs=files.filter(file=>/\.pdf$/i.test(file.name));
    root.querySelector('#rco-files').innerHTML=pdfs.map(fileRow).join('');
    const unavailable=busy||!connection?.driveMetadata||error||!loaded;
    root.querySelector('#rco-status').textContent=unavailable
      ?root.querySelector('#maintenance-status').textContent
      :(pdfs.length?'':next?'Nenhum PDF nas páginas carregadas.':'Nenhum arquivo PDF disponível nesta pasta.')+(next?' Há mais arquivos na pasta. Use Carregar mais para consultar os demais.':'');
    root.querySelector('#rco-feedback').textContent=feedback;
    root.querySelector('#rco-scope').hidden=!connection||Boolean(connection.driveRead);
    root.querySelector('#rco-refresh').disabled=busy||!connection?.driveMetadata;
    root.querySelector('#rco-more').hidden=!next;
    root.querySelector('#rco-more').disabled=busy||Boolean(error);
  }
  async function load(more=false){
    if(!root||!connection?.driveMetadata||busy)return;
    const ticket=++version,mailbox=connection.email;
    busy=true;error='';feedback='';draw();
    try{
      const params=new URLSearchParams({mailbox,...(more?{pageToken:next,folder:folder.id}:{})});
      const response=await fetch('/api/google/attendance-files?'+params,{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();window.FarolAccessDenied?.(result);
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
  async function importFile(id){
    if(!root||!connection?.driveRead||busy||error)return;
    const file=files.find(f=>f.id===id);if(!file?.version)return;
    const ticket=version,mailbox=connection.email;busy=true;loadingId=id;feedback='Carregando faltas…';draw();
    try{
      const response=await fetch('/api/google/attendance-import',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify({type:'general',mailbox,fileId:id,version:file.version,folder:folder.id})});
      const result=await response.json();window.FarolAccessDenied?.(result);
      if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||result.fileId!==id||result.loaded!==true||!Number.isSafeInteger(result.count)||result.count<1)throw new Error('account_changed');
      file.loaded=true;feedback=`Carga concluída: ${result.count} registros de aluno/data inseridos ou atualizados.`;
    }catch(e){if(ticket===version)feedback=messages[e.message]||'Não foi possível confirmar a carga. Atualize a lista para conferir o resultado antes de tentar novamente.';}
    finally{if(ticket===version){busy=false;loadingId=null;draw();}}
  }
  function connectionChanged(value){
    window.FarolStudentImport?.connectionChanged(value);
    const changed=connection?.email!==value?.email||connection?.driveMetadata!==value?.driveMetadata||connection?.driveRead!==value?.driveRead;
    connection=value;
    if(changed){clear();draw();if(root&&connection?.driveMetadata)load();}
  }
  function mount(element){
    root=element;clear();
    root.innerHTML='<h1>Manutenção do Sistema</h1><section class="panel" aria-labelledby="maintenance-title"><h2 id="maintenance-title">Arquivos da pasta FarolGE/FaltasSemanais</h2><p class="demand-intro">Arquivos diretamente na pasta FarolGE/FaltasSemanais acessível à conta GERAL da escola, inclusive em Compartilhados comigo, em ordem alfabética.</p><p id="maintenance-identity" class="overview-identity"></p><p id="maintenance-status" class="overview-status" role="status"></p><ul id="maintenance-files" class="maintenance-files"></ul><div class="button-row"><button type="button" class="button" id="maintenance-refresh">Atualizar lista</button><button type="button" class="button" id="maintenance-more" hidden>Carregar mais</button></div></section>';
    root.innerHTML+=`<section class="panel rco-load" aria-labelledby="rco-title">
      <h2 id="rco-title">Carga de Faltas do RCO</h2>
      <p><strong>Orientações:</strong></p>
      <ol class="rco-instructions">
        <li>Acesse o sistema RCO e gere um relatório por período (manhã e tarde) e por semana.</li>
        <li>Renomeie os arquivos no formato <code>AAAA_MM_DDMM_DDMM_Periodo.PDF</code>, sendo:
          <dl class="rco-filename-guide">
            <div><dt>AAAA</dt><dd>ano</dd></div>
            <div><dt>MM</dt><dd>mês</dd></div>
            <div><dt>DD</dt><dd>dia</dd></div>
            <div><dt>Periodo</dt><dd>Manha/Tarde</dd></div>
          </dl>
        </li>
        <li>Copie os arquivos para o DRIVE do Colégio no diretório <strong>FarolGE/FaltasSemanais</strong>.</li>
        <li>Execute o processo de captura dos arquivos aqui no FarolGE.</li>
      </ol>
      <h3>Arquivos disponíveis para captura</h3>
      <p class="demand-intro">Arquivos PDF encontrados na pasta FarolGE/FaltasSemanais da conta GERAL.</p>
      <p id="rco-status" class="overview-status" role="status"></p>
      <p id="rco-scope" class="overview-status">Use Geral → Revisar autorização e permita a leitura dos arquivos do Drive para habilitar Carregar.</p><p id="rco-feedback" class="overview-status" role="status"></p><ul id="rco-files" class="maintenance-files"></ul>
      <div class="button-row"><button type="button" class="button" id="rco-refresh">Atualizar lista</button><button type="button" class="button" id="rco-more" hidden>Carregar mais</button></div>
      <p class="demand-footnote">A carga soma as linhas repetidas do aluno no dia dentro deste arquivo e substitui o valor salvo para Escola/CGM/data. Campos diários vazios valem zero. Arquivos já carregados podem ser carregados novamente. Apenas as datas presentes no relatório são atualizadas.</p>
    </section>`;
    root.innerHTML+='<section id="student-import-board" class="panel" aria-labelledby="student-import-title"></section>';
    window.FarolStudentImport?.mount(root.querySelector('#student-import-board'));
    for(const selector of ['#rco-files','#maintenance-files'])root.querySelector(selector).addEventListener('click',event=>{const button=event.target.closest('[data-load-attendance]');if(button)importFile(button.dataset.loadAttendance);});
    root.querySelector('#rco-refresh').addEventListener('click',()=>load());
    root.querySelector('#rco-more').addEventListener('click',()=>load(true));
    root.querySelector('#maintenance-refresh').addEventListener('click',()=>load());
    root.querySelector('#maintenance-more').addEventListener('click',()=>load(true));
    draw();if(connection?.driveMetadata)load();
  }
  function unmount(){window.FarolStudentImport?.unmount();clear();root=null;}
  return {mount,unmount,connectionChanged};
})();
