'use strict';

window.FarolOccurrences=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const messages={
    setup_required:'As tabelas de alunos e ocorrências ainda precisam ser preparadas no Supabase.',
    login_required:'Identifique-se novamente para consultar as ocorrências.',
    module_forbidden:'A consulta de ocorrências não está habilitada para o seu acesso.',
    account_changed:'A conta mudou. Atualize as ocorrências.',
    school_unavailable:'Os dados de ocorrências da escola estão indisponíveis.',
    storage_access_denied:'O Supabase recusou o acesso às ocorrências.',
    invalid_page:'Atualize as ocorrências para reiniciar a consulta.',
    invalid_occurrence:'Informe um texto de até 5.000 caracteres.',
    occurrence_missing:'A ocorrência já não está disponível.',
    occurrence_edit_forbidden:'Só quem registrou a ocorrência ou Marcos na conta Pessoal pode alterá-la.',
    conflict:'O texto mudou em outra sessão. Atualize a lista antes de alterar.',
    unavailable:'Não foi possível consultar as ocorrências. Tente atualizar.'
  };
  const accessErrors=new Set(['login_required','module_forbidden','admin_required','access_denied','account_changed','school_unavailable']);

  function create({id,action,mobileCards=false,deleteAction,editAction,presentation={}}){
    const {singular='ocorrência',plural='ocorrências',title='Ocorrências dos alunos',textLabel='Ocorrência',
      editLabel='Texto da ocorrência',editedMessage='Texto da ocorrência alterado.',editField='ocorrencia',showActivityTime=false,migrationMessage,errorMessages={}}=presentation;
    const notice={...messages,...errorMessages};
    const shortDate=value=>value.split('-').reverse().join('/');
    const shortTime=value=>value.slice(0,8);
    let root=null,connection=null,viewer=null,items=[],next=null,busy=false,error='',loaded=false,version=0;
    let canDelete=false,deleting=false,actionFeedback='',editing=null,savingEdit=false,editingUnavailable=false;
    const element=part=>root.querySelector('#'+id+'-'+part);

    function markup(){
      const refresh=`<button type="button" class="button overview-refresh" id="${id}-refresh">Atualizar ${plural}</button>`;
      return `<section class="overview-group overview-occurrences" aria-labelledby="${id}-title">
        <div class="overview-heading"><h2 id="${id}-title">${title}</h2></div>
        <p id="${id}-identity" class="overview-identity"></p>
        <p class="demand-footnote">Mais recentes primeiro. Horário de Brasília.</p>
        ${mobileCards?refresh:''}
        <p id="${id}-status" class="overview-status" role="status"></p>
        <div class="overview-occurrences-scroll" role="region" aria-label="${title}" tabindex="0">
          <table><thead><tr><th scope="col">${showActivityTime?'Data do registro':'Data'}</th><th scope="col">${showActivityTime?'Hora do registro':'Hora'}</th><th scope="col">Aluno</th><th scope="col">Turma</th>${showActivityTime?'<th scope="col">Data da busca</th><th scope="col">Hora da busca</th>':''}<th scope="col">${textLabel}</th><th scope="col">Registrado por</th>${deleteAction||editAction?`<th scope="col" id="${id}-actions" hidden>Ações</th>`:''}</tr></thead><tbody id="${id}-rows"></tbody></table>
        </div>
        ${mobileCards?`<ul id="${id}-cards" class="inspector-occurrence-cards" role="list" aria-label="${title}"></ul>`:''}
        <div class="button-row">${mobileCards?'':refresh}<button type="button" class="button overview-refresh" id="${id}-more" hidden>Carregar mais</button></div>
        ${editAction?`<dialog id="${id}-edit-dialog" aria-labelledby="${id}-edit-title">
          <h2 id="${id}-edit-title">Alterar ${singular}</h2>
          <p id="${id}-edit-student"></p>
          <form id="${id}-edit-form">
            <label class="field">${editLabel}<textarea id="${id}-edit-text" class="form-control" required maxlength="5000" rows="6"></textarea></label>
            <p id="${id}-edit-feedback" role="status"></p>
            <div class="button-row"><button type="submit" id="${id}-edit-save" class="button primary">Salvar alteração</button><button type="button" id="${id}-edit-cancel" class="button">Cancelar</button></div>
          </form>
        </dialog>`:''}
      </section>`;
    }

    function clear(){
      version++;items=[];next=null;busy=false;error='';loaded=false;
      canDelete=false;deleting=false;actionFeedback='';savingEdit=false;editingUnavailable=false;closeEdit();
    }

    function draw(){
      if(!root)return;
      element('identity').textContent=connection?.email||'Conta GERAL não conectada';
      let status=actionFeedback;
      if(!connection)status=`Os dados de ${plural} da escola estão indisponíveis.`;
      else if(busy)status=deleting?`Excluindo ${singular}…`:savingEdit?'Salvando alteração…':`Consultando ${plural}…`;
      else if(!status&&error)status=(notice[error]||notice.unavailable)+(loaded?' A lista anterior foi mantida.':'');
      else if(!status&&loaded&&!items.length&&!next)status=`Nenhuma ${singular} registrada.`;
      if(!busy&&!error&&editingUnavailable){
        status=[status,migrationMessage||`Alterar fica disponível após a atualização de ${plural} no Supabase.`].filter(Boolean).join(' ');
      }
      element('status').textContent=status;
      const hasActions=canDelete||Boolean(editAction&&items.some(item=>item.editVersion));
      if(deleteAction||editAction)element('actions').hidden=!hasActions;
      const records=items.map(item=>({
        id:escape(item.id),date:escape(shortDate(item.date)),time:escape(shortTime(item.time)),
        ...(showActivityTime?{searchDate:escape(shortDate(item.searchDate)),searchTime:escape(shortTime(item.searchTime))}:{}),
        student:escape(item.student),className:escape(item.className),text:escape(item.text),
        author:escape(item.authorName||'Não informado'),canEdit:Boolean(editAction&&item.editVersion)
      }));
      const deleteButton=({id,student,date,time})=>`<button type="button" class="button inspector-occurrence-delete" data-delete-occurrence="${id}" aria-label="Excluir ${singular} de ${student}, ${date} às ${time}"${busy?' disabled':''}>Excluir</button>`;
      const actions=record=>{
        const {id,student,date,time,canEdit}=record;
        const editButton=canEdit?`<button type="button" class="button inspector-occurrence-edit" data-edit-occurrence="${id}" aria-label="Alterar ${singular} de ${student}, ${date} às ${time}"${busy?' disabled':''}>Alterar</button>`:'';
        return editButton+(canDelete?deleteButton(record):'');
      };
      element('rows').innerHTML=records.map(record=>{
        const {date,time,student,className,text,author}=record;
        return `<tr><td>${date}</td><td>${time}</td><td>${student}</td><td>${className}</td>${showActivityTime?`<td>${record.searchDate}</td><td>${record.searchTime}</td>`:''}<td class="occurrence-text">${text}</td><td>${author}</td>${hasActions?`<td><div class="button-row">${actions(record)}</div></td>`:''}</tr>`;
      }).join('');
      if(mobileCards){
        element('cards').innerHTML=records.map(record=>{
          const {date,time,student,className,text,author,canEdit}=record;
          return `<li>
            <p class="inspector-occurrence-date">${showActivityTime?'Registro · ':''}${date} · ${time}</p>
            ${showActivityTime?`<p class="inspector-occurrence-date">Busca · ${record.searchDate} · ${record.searchTime}</p>`:''}
            <h3>${student}</h3><p class="inspector-occurrence-class">${className}</p>
            <p class="occurrence-text">${text}</p>
            <p class="inspector-occurrence-author">Registrado por: ${author}</p>
            ${canEdit||canDelete?`<div class="button-row">${actions(record)}</div>`:''}
          </li>`;
        }).join('');
      }
      element('refresh').disabled=busy||!connection;
      element('more').hidden=!next;
      element('more').disabled=busy||Boolean(error);
    }

    async function load(more=false){
      if(!root||!connection||busy||(more&&!next))return;
      const ticket=++version,mailbox=connection.email;
      busy=true;error='';actionFeedback='';draw();
      try{
        const params=new URLSearchParams({mailbox,...(more?{pageToken:next}:{})});
        const response=await fetch('/api/google/'+action+'?'+params,{credentials:'same-origin',cache:'no-store'});
        const result=await response.json();
        if(ticket!==version)return;
        window.FarolAccessDenied?.(result);
        if(!response.ok)throw new Error(result.error||'unavailable');
        if(ticket!==version)return;
        if(result.mailbox!==mailbox||!Array.isArray(result.items))throw new Error('account_changed');
        items=(more?[...new Map([...items,...result.items].map(item=>[item.id,item])).values()]:result.items)
          .sort((a,b)=>(b.date+'T'+b.time).localeCompare(a.date+'T'+a.time)||b.id.localeCompare(a.id));
        next=result.nextPageToken||null;loaded=true;
        editingUnavailable=Boolean(editAction&&result.editingUnavailable===true);
        if(editingUnavailable)for(const item of items)delete item.editVersion;
        canDelete=Boolean(deleteAction&&result.canDelete===true);
      }catch(failure){
        if(ticket===version){
          error=failure.message;
          if(accessErrors.has(error)){items=[];next=null;loaded=false;canDelete=false;}
        }
      }finally{
        if(ticket===version){busy=false;draw();}
      }
    }

    async function deleteOccurrence(event){
      if(!canDelete||!root||!connection||busy)return;
      const button=event.target.closest('[data-delete-occurrence]');
      const item=items.find(item=>item.id===button?.dataset.deleteOccurrence);
      if(!item)return;
      const date=item.date.split('-').reverse().join('/');
      if(!window.confirm(`Excluir definitivamente a ${singular} de ${item.student}, registrada em ${date} às ${item.time.slice(0,8)}?`))return;
      const ticket=++version,mailbox=connection.email;
      busy=true;deleting=true;actionFeedback='';draw();
      try{
        const response=await fetch('/api/google/'+deleteAction,{
          method:'POST',credentials:'same-origin',cache:'no-store',
          headers:{'Content-Type':'application/json','X-Farol-Request':'1'},
          body:JSON.stringify({type:'general',mailbox,id:item.id})
        });
        const result=await response.json();
        if(ticket!==version)return;
        window.FarolAccessDenied?.(result);
        if(!response.ok)throw new Error(result.error||'unavailable');
        if(ticket!==version)return;
        if(result.mailbox!==mailbox||result.id!==item.id||typeof result.deleted!=='boolean')throw new Error('unavailable');
        items=items.filter(entry=>entry.id!==item.id);
        actionFeedback=result.deleted?`${singular[0].toUpperCase()+singular.slice(1)} excluída.`:`A ${singular} já não está disponível.`;
      }catch(failure){
        if(ticket!==version)return;
        if(accessErrors.has(failure.message)){
          canDelete=false;
          actionFeedback=`O acesso para excluir ${plural} não está disponível. Atualize a lista.`;
        }else{
          actionFeedback='Não foi possível confirmar a exclusão. Atualize a lista para conferir.';
        }
      }finally{
        if(ticket===version){busy=false;deleting=false;draw();}
      }
    }

    function closeEdit(){
      editing=null;
      if(!root||!editAction)return;
      const dialog=element('edit-dialog');
      if(dialog.open)dialog.close();
      element('edit-text').value='';
      element('edit-student').textContent='';
      element('edit-feedback').textContent='';
    }

    function rowAction(event){
      const button=editAction&&event.target.closest('[data-edit-occurrence]');
      if(!button?.dataset.editOccurrence){
        if(deleteAction)deleteOccurrence(event);
        return;
      }
      if(!root||!connection||busy||editing)return;
      const item=items.find(item=>item.id===button.dataset.editOccurrence&&item.editVersion);
      if(!item)return;
      editing=item;
      element('edit-student').textContent=item.student;
      element('edit-text').value=item.text;
      element('edit-feedback').textContent='';
      element('edit-save').disabled=false;
      element('edit-cancel').disabled=false;
      element('edit-dialog').showModal();
      element('edit-text').focus();
    }

    async function saveEdit(event){
      event.preventDefault();
      if(!root||!connection||!editing||busy||element('edit-save').disabled)return;
      const text=element('edit-text').value.trim();
      if(!text||text.length>5000){
        element('edit-feedback').textContent=notice.invalid_occurrence;
        return;
      }
      const item=editing,ticket=++version,mailbox=connection.email;
      busy=true;savingEdit=true;actionFeedback='';
      element('edit-save').disabled=true;
      element('edit-cancel').disabled=true;
      element('edit-feedback').textContent='Salvando alteração…';
      let refreshRequired=false;
      try{
        const response=await fetch('/api/google/'+editAction,{
          method:'POST',credentials:'same-origin',cache:'no-store',
          headers:{'Content-Type':'application/json','X-Farol-Request':'1'},
          body:JSON.stringify({type:'general',mailbox,id:item.id,[editField]:text,editVersion:item.editVersion})
        });
        const result=await response.json();
        if(ticket!==version)return;
        window.FarolAccessDenied?.(result);
        if(ticket!==version)return;
        if(!response.ok)throw new Error(result.error||'unavailable');
        if(result.mailbox!==mailbox||result.id!==item.id||typeof result.text!=='string'||!result.editVersion)throw new Error('unavailable');
        items=items.map(entry=>entry.id===item.id?{...entry,text:result.text,editVersion:result.editVersion}:entry);
        closeEdit();
        actionFeedback=editedMessage;
      }catch(failure){
        if(ticket!==version)return;
        refreshRequired=accessErrors.has(failure.message)||['conflict','occurrence_missing','occurrence_edit_forbidden','active_search_missing','active_search_edit_forbidden'].includes(failure.message);
        if(refreshRequired)items=items.map(entry=>entry.id===item.id?{...entry,editVersion:null}:entry);
        element('edit-feedback').textContent=notice[failure.message]||'Não foi possível confirmar a alteração. Atualize a lista para conferir.';
      }finally{
        if(ticket===version){
          busy=false;savingEdit=false;
          element('edit-save').disabled=refreshRequired;
          element('edit-cancel').disabled=false;
          draw();
          if(!editing)element('refresh').focus();
        }
      }
    }

    function connectionChanged(value,viewerId=null){
      const changed=connection?.email!==value?.email||viewer!==viewerId;
      connection=value;viewer=viewerId;
      if(changed){clear();draw();load();}
    }

    function mount(elementRoot){
      root=elementRoot;
      element('refresh').addEventListener('click',()=>load());
      element('more').addEventListener('click',()=>load(true));
      if(deleteAction||editAction){
        element('rows').addEventListener('click',rowAction);
        if(mobileCards)element('cards').addEventListener('click',rowAction);
      }
      if(editAction){
        element('edit-form').addEventListener('submit',saveEdit);
        element('edit-cancel').addEventListener('click',closeEdit);
        element('edit-dialog').addEventListener('cancel',event=>{
          if(savingEdit)event.preventDefault();
          else closeEdit();
        });
      }
      draw();load();
    }

    function unmount(){clear();draw();root=null;}

    return {markup,mount,unmount,connectionChanged,load};
  }

  return {create};
})();
