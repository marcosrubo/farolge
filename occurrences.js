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
    unavailable:'Não foi possível consultar as ocorrências. Tente atualizar.'
  };
  const accessErrors=new Set(['login_required','module_forbidden','admin_required','access_denied','account_changed','school_unavailable']);

  function create({id,action,mobileCards=false}){
    let root=null,connection=null,viewer=null,items=[],next=null,busy=false,error='',loaded=false,version=0;
    const element=part=>root.querySelector('#'+id+'-'+part);

    function markup(){
      const refresh=`<button type="button" class="button overview-refresh" id="${id}-refresh">Atualizar ocorrências</button>`;
      return `<section class="overview-group overview-occurrences" aria-labelledby="${id}-title">
        <div class="overview-heading"><h2 id="${id}-title">Ocorrências dos alunos</h2></div>
        <p id="${id}-identity" class="overview-identity"></p>
        <p class="demand-footnote">Mais recentes primeiro. Horário de Brasília.</p>
        ${mobileCards?refresh:''}
        <p id="${id}-status" class="overview-status" role="status"></p>
        <div class="overview-occurrences-scroll" role="region" aria-label="Lista de ocorrências dos alunos" tabindex="0">
          <table><thead><tr><th scope="col">Data</th><th scope="col">Hora</th><th scope="col">Aluno</th><th scope="col">Turma</th><th scope="col">Ocorrência</th><th scope="col">Registrado por</th></tr></thead><tbody id="${id}-rows"></tbody></table>
        </div>
        ${mobileCards?`<ul id="${id}-cards" class="inspector-occurrence-cards" role="list" aria-label="Lista de ocorrências dos alunos"></ul>`:''}
        <div class="button-row">${mobileCards?'':refresh}<button type="button" class="button overview-refresh" id="${id}-more" hidden>Carregar mais</button></div>
      </section>`;
    }

    function clear(){
      version++;items=[];next=null;busy=false;error='';loaded=false;
    }

    function draw(){
      if(!root)return;
      element('identity').textContent=connection?.email||'Conta GERAL não conectada';
      element('status').textContent=!connection?'Os dados de ocorrências da escola estão indisponíveis.':busy?'Consultando ocorrências…':error?(messages[error]||messages.unavailable)+(loaded?' A lista anterior foi mantida.':''):loaded&&!items.length?'Nenhuma ocorrência registrada.':'';
      const records=items.map(item=>({
        date:escape(item.date.split('-').reverse().join('/')),time:escape(item.time.slice(0,8)),
        student:escape(item.student),className:escape(item.className),text:escape(item.text),
        author:escape(item.authorName||'Não informado')
      }));
      element('rows').innerHTML=records.map(({date,time,student,className,text,author})=>`<tr><td>${date}</td><td>${time}</td><td>${student}</td><td>${className}</td><td class="occurrence-text">${text}</td><td>${author}</td></tr>`).join('');
      if(mobileCards){
        element('cards').innerHTML=records.map(({date,time,student,className,text,author})=>`<li>
          <p class="inspector-occurrence-date">${date} · ${time}</p>
          <h3>${student}</h3><p class="inspector-occurrence-class">${className}</p>
          <p class="occurrence-text">${text}</p>
          <p class="inspector-occurrence-author">Registrado por: ${author}</p>
        </li>`).join('');
      }
      element('refresh').disabled=busy||!connection;
      element('more').hidden=!next;
      element('more').disabled=busy||Boolean(error);
    }

    async function load(more=false){
      if(!root||!connection||busy||(more&&!next))return;
      const ticket=++version,mailbox=connection.email;
      busy=true;error='';draw();
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
      }catch(failure){
        if(ticket===version){
          error=failure.message;
          if(accessErrors.has(error)){items=[];next=null;loaded=false;}
        }
      }finally{
        if(ticket===version){busy=false;draw();}
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
      draw();load();
    }

    function unmount(){clear();draw();root=null;}

    return {markup,mount,unmount,connectionChanged,load};
  }

  return {create};
})();
