'use strict';
window.FarolStudentImport=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const messages={folder_missing:'Não foi encontrado FarolGE/ListaAlunos acessível à conta GERAL.',folder_ambiguous:'Há pastas duplicadas em FarolGE/ListaAlunos. Confira o caminho.',missing_scope:'Use Geral → Revisar autorização para permitir a leitura dos PDFs.',setup_required:'Execute database/students.sql no Supabase exclusivo FAROL GE.',login_required:'Conecte novamente a conta GERAL.',file_changed:'O arquivo mudou. Atualize a lista antes de carregar.',account_changed:'A conta ou pasta mudou. Atualize a lista.',pdf_layout:'O PDF não corresponde ao modelo Relação de Alunos por Turma, tem dados incompletos ou não contém texto legível. Nenhum aluno deste arquivo foi gravado.',file_outside_folder:'O arquivo não está mais em FarolGE/ListaAlunos.',unsupported_file:'Selecione um relatório PDF.',file_too_large:'O relatório excede o limite de 10 MB, 100 páginas ou 10.000 linhas.',drive_policy:'A política da organização impediu a consulta.',pdf_runtime_unavailable:'O leitor de PDF não iniciou no servidor. Verifique as dependências da publicação na Vercel.',storage_unavailable:'Falha de comunicação com o Supabase durante a carga. Confira os alunos em Inspetores/Monitores antes de tentar novamente.',storage_access_denied:'O Supabase recusou o acesso do servidor. Confira as permissões das tabelas Alunos e Ocorrencias e da função farol_load_students.',student_schema_invalid:'O Supabase recusou a carga por incompatibilidade na estrutura das tabelas. Confira a execução integral de database/students.sql no projeto FarolGE.',import_unconfirmed:'O Supabase respondeu, mas a quantidade gravada não foi confirmada. Confira os alunos em Inspetores/Monitores.',import_folder_failed:'A consulta ao caminho FarolGE/ListaAlunos falhou. Atualize os arquivos.',import_metadata_failed:'Não foi possível confirmar os dados ou a versão do PDF no Drive. Atualize os arquivos.',import_download_failed:'Não foi possível baixar o PDF completo do Drive. Nenhum aluno desta tentativa foi enviado ao Supabase.',import_server_unavailable:'O servidor não devolveu uma resposta válida da carga. Confira os alunos em Inspetores/Monitores e a publicação na Vercel.',import_timeout:'A carga excedeu o tempo de resposta do servidor. Confira os alunos em Inspetores/Monitores antes de tentar novamente.',network_error:'A conexão foi interrompida durante a carga. Confira os alunos em Inspetores/Monitores antes de tentar novamente.',unavailable:'Não foi possível concluir. Tente atualizar a lista.'};
  const time=value=>{if(!value||Number.isNaN(Date.parse(value)))return 'não informada';return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium',timeZone:'America/Sao_Paulo'}).format(new Date(value))+' (Brasília)';};
  let root=null,connection=null,files=[],folder=null,next=null,version=0,busy=false,loadingId=null,error='',feedback='',loaded=false,generated=new Map();
  let preview=null;
  const dialog=()=>root.querySelector('#student-import-dialog');
  function dismissPreview(){
    preview?.controller.abort();
    preview=null;
    if(root){
      if(dialog().open)dialog().close();
      root.querySelector('#student-import-rows').innerHTML='';
    }
  }
  function clear(){dismissPreview();version++;files=[];folder=null;next=null;busy=false;loadingId=null;error='';feedback='';loaded=false;generated=new Map();}
  function draw(){
    if(!root)return;
    root.querySelector('#student-import-status').textContent=busy?(loadingId?'Carga de alunos em andamento…':'Consultando arquivos…'):!connection?'Conecte a conta GERAL da escola.':!connection.driveMetadata?messages.missing_scope:error?(messages[error]||messages.unavailable)+(loaded?' A lista anterior foi mantida.':''):feedback||(loaded&&!files.length?'A pasta ListaAlunos está vazia.':'');
    root.querySelector('#student-import-list').innerHTML=files.map(file=>{
      const pdf=file.mimeType==='application/pdf'&&/\.pdf$/i.test(file.name);
      const date=generated.has(file.id)?time(generated.get(file.id)):file.generatedAt?time(file.generatedAt):file.generationStatus==='permission_required'?'autorize a leitura de PDFs':file.generationStatus==='unavailable'?'não foi possível consultar':'não identificada nos metadados disponíveis';
      return `<li class="student-import-row"><div><strong>${escape(file.name)}</strong><small>Gerado em: ${escape(date)}</small><small>Criado no Drive: ${escape(time(file.createdTime))}</small>${!pdf?'<small>A carga aceita relatórios PDF no modelo Relação de Alunos por Turma.</small>':''}</div><button type="button" class="button" aria-haspopup="dialog" data-load-students="${escape(file.id)}" ${busy||error||!pdf||!connection?.driveRead||!file.version?'disabled':''}>${loadingId===file.id?'Carregando…':'Carregar'}</button></li>`;
    }).join('');
    root.querySelector('#student-import-scope').hidden=!connection||connection.driveRead;
    root.querySelector('#student-import-refresh').disabled=busy||!connection?.driveMetadata;
    root.querySelector('#student-import-more').hidden=!next;
    root.querySelector('#student-import-more').disabled=busy||Boolean(error);
  }
  async function load(more=false){
    if(!root||!connection?.driveMetadata||busy)return;
    const ticket=++version,mailbox=connection.email;busy=true;error='';feedback='';draw();
    try{
      const params=new URLSearchParams({mailbox,...(more?{pageToken:next,folder:folder.id}:{})});
      const response=await fetch('/api/google/student-files?'+params,{credentials:'same-origin',cache:'no-store'}),result=await response.json();window.FarolAccessDenied?.(result);
      if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||!Array.isArray(result.files)||!result.folder?.id||(more&&result.folder.id!==folder.id))throw new Error('account_changed');
      files=more?[...new Map([...files,...result.files].map(f=>[f.id,f])).values()]:result.files;
      if(!more)generated=new Map();
      folder=result.folder;next=result.nextPageToken;loaded=true;
    }catch(e){if(ticket===version){error=e.message;if(['account_changed','login_required','missing_scope'].includes(error)){files=[];loaded=false;next=null;}}}
    finally{if(ticket===version){busy=false;draw();}}
  }
  function post(body,signal){
    return fetch('/api/google/student-import',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Farol-Request':'1'},body:JSON.stringify(body),signal});
  }
  function checkResult(response,result){
    window.FarolAccessDenied?.(result);
    if(!response.ok||result?.error)throw new Error(result?.error||([502,504].includes(response.status)?'import_timeout':'import_server_unavailable'));
    return result;
  }
  async function jsonResult(response){
    let result;
    try{result=await response.json();}catch{throw new Error([502,504].includes(response.status)?'import_timeout':'import_server_unavailable');}
    return checkResult(response,result);
  }
  function verifySummary(result,body){
    if(result?.mailbox!==body.mailbox||result?.fileId!==body.fileId||!Number.isSafeInteger(result.count)||result.count<1||
      !Number.isSafeInteger(result.rows)||result.rows<result.count)throw new Error('account_changed');
  }
  function finish(message,errorCode){
    const id=loadingId;
    dismissPreview();busy=false;loadingId=null;feedback=message;
    if(['file_changed','account_changed','login_required'].includes(errorCode))error=errorCode;
    draw();
    const button=root.querySelector('[data-load-students="'+id+'"]');
    if(button&&!button.disabled)button.focus();
    else root.querySelector('#student-import-refresh').focus();
  }
  function reportFailure(e){
    const reading=!preview.saving;
    const interrupted=['import_timeout','import_server_unavailable','import_download_failed'].includes(e.message)||!messages[e.message];
    const message=reading&&interrupted
      ?'Não foi possível concluir a leitura do PDF. Nenhum aluno desta tentativa foi gravado.'
      :messages[e.message]||(e instanceof TypeError?messages.network_error:messages.import_server_unavailable);
    finish(message,e.message);
  }
  async function readPreview(response,current){
    if(!response.ok||!response.headers?.get('content-type')?.startsWith('application/x-ndjson')){
      await jsonResult(response);
      throw new Error('import_server_unavailable');
    }
    const fields=['Turno','Serie','Turma','CGM','Nome'],decoder=new TextDecoder();
    const reader=response.body.getReader();
    let buffer='',summary=null;
    try{
      while(preview===current){
        const {done,value}=await reader.read();
        if(preview!==current)break;
        if(done){
          if(buffer||!summary)throw new Error('import_server_unavailable');
          return summary;
        }
        buffer+=decoder.decode(value,{stream:true});
        const lines=buffer.split('\n');
        buffer=lines.pop();
        for(const line of lines){
          const event=checkResult(response,JSON.parse(line));
          if(preview!==current)return;
          if(summary)throw new Error('import_server_unavailable');
          if(event.preview){summary=event.preview;continue;}
          if(!Array.isArray(event.rows)||event.rows.some(row=>fields.some(field=>typeof row?.[field]!=='string')))throw new Error('import_server_unavailable');
          current.rows+=event.rows.length;
          const rows=root.querySelector('#student-import-rows'),table=root.querySelector('#student-import-table');
          const follow=table.scrollHeight-table.scrollTop-table.clientHeight<=4;
          rows.insertAdjacentHTML('beforeend',event.rows.map(row=>'<tr>'+fields.map(field=>'<td>'+escape(row[field])+'</td>').join('')+'</tr>').join(''));
          if(follow)table.scrollTop=table.scrollHeight;
          root.querySelector('#student-import-progress').textContent=current.rows+' linhas lidas do PDF.';
        }
      }
    }finally{reader.releaseLock();}
  }
  async function importFile(id){
    if(!root||!connection?.driveRead||busy||error)return;
    const file=files.find(f=>f.id===id);if(!file||!file.version||file.mimeType!=='application/pdf'||!/\.pdf$/i.test(file.name))return;
    const current={body:{type:'general',mailbox:connection.email,fileId:id,version:file.version,folder:folder.id},controller:new AbortController(),rows:0,ready:false,saving:false};
    preview=current;busy=true;loadingId=id;feedback='';draw();
    root.querySelector('#student-import-filename').textContent=file.name;
    root.querySelector('#student-import-progress').textContent='Abrindo o PDF…';
    root.querySelector('#student-import-save').hidden=true;
    root.querySelector('#student-import-save').disabled=false;
    root.querySelector('#student-import-stop').disabled=false;
    dialog().showModal();
    try{
      const response=await post({...current.body,preview:true},current.controller.signal);
      if(preview!==current)return;
      const result=await readPreview(response,current);
      if(preview!==current)return;
      verifySummary(result,current.body);
      if(result.rows!==current.rows)throw new Error('import_server_unavailable');
      current.ready=true;
      root.querySelector('#student-import-progress').textContent=result.rows+' linhas lidas. Confirme para gravar '+result.count+' vínculos.';
      root.querySelector('#student-import-save').hidden=false;
    }catch(e){if(preview===current)reportFailure(e);}
  }
  function stop(){
    if(preview&&!preview.saving)finish('Carga interrompida. Nenhum aluno desta tentativa foi gravado.');
  }
  async function save(){
    const current=preview;
    if(!current?.ready||current.saving)return;
    current.saving=true;
    root.querySelector('#student-import-save').disabled=true;
    root.querySelector('#student-import-stop').disabled=true;
    const progress=root.querySelector('#student-import-progress');
    progress.textContent='Conferindo o PDF e gravando os alunos…';
    progress.focus();
    try{
      const result=await jsonResult(await post(current.body));
      if(preview!==current)return;
      verifySummary(result,current.body);
      generated.set(result.fileId,result.generatedAt);
      finish('Carga concluída: '+result.count+' vínculos de alunos inseridos ou atualizados ('+result.rows+' linhas lidas).');
    }catch(e){if(preview===current)reportFailure(e);}
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email||connection?.driveMetadata!==value?.driveMetadata||connection?.driveRead!==value?.driveRead;connection=value;
    if(changed){clear();draw();if(root&&connection?.driveMetadata)load();}
  }
  function mount(element){
    clear();root=element;root.innerHTML='<h2 id="student-import-title">Carga de Alunos</h2><p class="demand-intro">Relatórios PDF de FarolGE/ListaAlunos acessíveis à conta GERAL, inclusive em Compartilhados comigo. Clique em Carregar para ler o PDF e conferir os alunos antes de gravar.</p><p class="demand-footnote">Modelo: Relação de Alunos por Turma do Sistema Escola. São carregados Escola, CGM, Nome, Série, Turma e Turno. Vínculos distintos são preservados; a carga não apaga alunos nem ocorrências.</p><p class="demand-footnote">A data de criação no Drive pode ser diferente da geração do relatório. A geração é consultada nos metadados do PDF; quando não puder ser identificada, será sinalizada.</p><p id="student-import-scope" class="overview-status" hidden>Use Geral → Revisar autorização e permita a leitura dos arquivos do Drive para habilitar Carregar.</p><p id="student-import-status" class="overview-status" role="status"></p><ul id="student-import-list" class="student-list"></ul><div class="button-row"><button type="button" class="button" id="student-import-refresh">Atualizar arquivos</button><button type="button" class="button" id="student-import-more" hidden>Carregar mais arquivos</button></div>';
    root.insertAdjacentHTML('beforeend',`
      <dialog id="student-import-dialog" aria-labelledby="student-import-dialog-title" aria-describedby="student-import-filename">
        <h2 id="student-import-dialog-title">Carga de Alunos</h2>
        <p id="student-import-filename"></p>
        <p id="student-import-progress" role="status" tabindex="-1"></p>
        <div id="student-import-table" class="table-wrap" tabindex="0" role="region" aria-label="Linhas lidas do PDF">
          <table aria-label="Alunos do relatório"><thead><tr>
            <th scope="col">Turno</th><th scope="col">Série</th><th scope="col">Turma</th><th scope="col">CGM</th><th scope="col">Nome</th>
          </tr></thead><tbody id="student-import-rows"></tbody></table>
        </div>
        <div class="button-row">
          <button type="button" class="button" id="student-import-stop" autofocus>Parar</button>
          <button type="button" class="button primary" id="student-import-save" hidden>Confirmar carga</button>
        </div>
      </dialog>`);
    dialog().addEventListener('cancel',event=>{event.preventDefault();stop();});
    root.querySelector('#student-import-stop').addEventListener('click',stop);
    root.querySelector('#student-import-save').addEventListener('click',save);
    root.querySelector('#student-import-refresh').addEventListener('click',()=>load());
    root.querySelector('#student-import-more').addEventListener('click',()=>load(true));
    root.querySelector('#student-import-list').addEventListener('click',event=>{const button=event.target.closest('[data-load-students]');if(button)importFile(button.dataset.loadStudents);});
    draw();if(connection?.driveMetadata)load();
  }
  function unmount(){clear();root=null;}
  return {mount,unmount,connectionChanged};
})();
