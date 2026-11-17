'use strict';
window.FarolAttendanceAnalysis=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=date=>date.slice(8,10)+'/'+date.slice(5,7),full=date=>label(date)+'/'+date.slice(0,4);
  const messages={invalid_period:'Informe um período válido de até 366 dias.',analysis_limit:'Há muitos dados para exibir de uma vez. Selecione um período menor.',attendance_setup_required:'Prepare as tabelas de faltas com database/attendance.sql no Supabase do FAROL GE.',setup_required:'Prepare o cadastro de alunos com database/students.sql.',login_required:'Conecte novamente a conta GERAL.',account_changed:'A conta mudou. Atualize a análise.',storage_access_denied:'O Supabase recusou a consulta. Confira as permissões do backend.',unavailable:'Não foi possível atualizar a análise. Tente novamente.'};
  let root=null,connection=null,data=null,busy=false,error='',version=0,selectedClasses=new Set();
  function clear(){version++;data=null;busy=false;error='';selectedClasses.clear();}
  function drawClasses(){
    if(!root)return;
    const classes=[...new Set((data?.items||[]).flatMap(row=>row.classes))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    selectedClasses=new Set([...selectedClasses].filter(c=>classes.includes(c)));
    root.querySelector('#attendance-classes').innerHTML=classes.length?classes.map(c=>`<label class="attendance-class-choice"><input type="checkbox" data-attendance-class value="${escape(c)}" ${selectedClasses.has(c)?'checked':''}><span>${escape(c)}</span></label>`).join(''):'<p class="overview-status">Nenhuma turma disponível nos dados consultados.</p>';
  }
  function draw(){
    if(!root)return;
    root.querySelector('#attendance-identity').textContent=connection?.email||'Conta GERAL não conectada';
    root.querySelector('#attendance-status').textContent=!connection?'Conecte a conta GERAL para analisar as faltas carregadas.':busy?'Consultando faltas…':error?(messages[error]||messages.unavailable)+(data?' Dados anteriores mantidos.':''):data&&!data.items.length?'Nenhum aluno ou registro encontrado. Carregue os relatórios na Manutenção do Sistema.':'';
    root.querySelector('#attendance-update').disabled=busy||!connection;
    const query=root.querySelector('#attendance-search').value.trim().toLocaleLowerCase('pt-BR');
    const rows=(data?.items||[]).filter(row=>(row.name+' '+row.cgm).toLocaleLowerCase('pt-BR').includes(query)&&(!selectedClasses.size||row.classes.some(c=>selectedClasses.has(c))));
    root.querySelector('#attendance-class-selection').textContent=selectedClasses.size?`${selectedClasses.size} turma(s) selecionada(s)`:'Todas as turmas — marque uma ou mais para filtrar.';
    root.querySelector('#attendance-all-classes').disabled=!selectedClasses.size;
    root.querySelector('#attendance-summary').textContent=data?`${full(data.start)} a ${full(data.end)} · ${rows.length} alunos · ${rows.reduce((sum,row)=>sum+row.total,0)} faltas nos registros carregados`:'';
    root.querySelector('#attendance-head').innerHTML=data?`<tr><th scope="col" class="attendance-name">Aluno</th><th scope="col" class="attendance-cgm">CGM</th><th scope="col" class="attendance-class">Turma(s)</th>${data.dates.map(date=>`<th scope="col" title="${full(date)}">${label(date)}</th>`).join('')}<th scope="col" class="attendance-total">TOTAL</th></tr>`:'';
    root.querySelector('#attendance-rows').innerHTML=rows.map(row=>`<tr><th scope="row" class="attendance-name">${escape(row.name)}<small>${escape(row.school)}</small></th><td class="attendance-cgm">${escape(row.cgm)}</td><td class="attendance-class">${row.classes.map(escape).join('<br>')||'Não cadastrada'}</td>${data.dates.map(date=>{const value=row.counts[date];return `<td class="${value>0?'attendance-has-absences':value===0?'attendance-zero':'attendance-missing'}" title="${full(date)}: ${value===undefined?'sem registro carregado':value+' faltas'}">${value===undefined?'?':value===0?'—':value}</td>`;}).join('')}<td class="attendance-total">${Object.keys(row.counts).length?row.total:'?'}</td></tr>`).join('');
  }
  async function load(event){
    event?.preventDefault();if(!root||!connection||busy)return;
    const start=root.querySelector('#attendance-start').value,end=root.querySelector('#attendance-end').value;
    const length=(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000+1;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(length)||length<1||length>366){error='invalid_period';draw();return;}
    const ticket=++version,mailbox=connection.email;busy=true;error='';draw();
    try{
      const response=await fetch('/api/google/attendance-analysis?'+new URLSearchParams({mailbox,start,end}),{credentials:'same-origin',cache:'no-store'}),result=await response.json();window.FarolAccessDenied?.(result);
      if(!response.ok)throw new Error(result.error||'unavailable');if(ticket!==version||!root)return;
      if(result.mailbox!==mailbox||result.start!==start||result.end!==end||!Array.isArray(result.dates)||!Array.isArray(result.items))throw new Error('account_changed');
      data=result;
      drawClasses();
    }catch(e){if(ticket===version){error=e.message;if(['login_required','account_changed'].includes(error)){data=null;selectedClasses.clear();drawClasses();}}}
    finally{if(ticket===version){busy=false;draw();}}
  }
  function connectionChanged(value){const changed=connection?.email!==value?.email;connection=value;if(changed){clear();if(root){root.querySelector('#attendance-search').value='';selectedClasses.clear();drawClasses();draw();if(connection)load();}}}
  function mount(element){
    root=element;clear();root.innerHTML=`<div class="attendance-title"><h1>Análise de faltas</h1><a class="button" href="#radar">Voltar ao Radar</a></div><section class="panel"><p class="demand-intro">Quantidade de faltas por aula em cada dia. Alunos ordenados pelo total decrescente; empates em ordem alfabética.</p><p id="attendance-identity" class="overview-identity"></p><form id="attendance-period" class="attendance-filters"><label class="field">Data inicial<input type="date" class="form-control" id="attendance-start" required></label><label class="field">Data final<input type="date" class="form-control" id="attendance-end" required></label><button class="button primary" type="submit" id="attendance-update">Atualizar análise</button></form><div class="attendance-filters"><label class="field">Buscar aluno ou CGM<input type="search" class="form-control" id="attendance-search"></label><fieldset class="attendance-class-filter"><legend>Turmas</legend><p id="attendance-class-selection" class="overview-status" aria-live="polite"></p><div id="attendance-classes" class="attendance-class-checklist"></div><button type="button" class="button" id="attendance-all-classes">Ver todas as turmas</button></fieldset></div><p id="attendance-status" class="overview-status" role="status"></p><p id="attendance-summary" class="demand-intro"></p><p class="demand-footnote">Legenda: número = faltas por aula; — = zero registrado; ? = sem registro carregado. TOTAL soma somente os registros carregados. Datas sem registros não comprovam presença. Turmas vêm do cadastro de alunos. Use a rolagem horizontal para percorrer os dias.</p><div class="attendance-scroll" tabindex="0" role="region" aria-label="Faltas diárias por aluno, com rolagem horizontal e vertical"><table class="attendance-matrix"><thead id="attendance-head"></thead><tbody id="attendance-rows"></tbody></table></div></section>`;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    root.querySelector('#attendance-end').value=today;root.querySelector('#attendance-start').value=new Date(Date.parse(today+'T00:00:00Z')-29*86400000).toISOString().slice(0,10);
    root.querySelector('#attendance-period').addEventListener('submit',load);
    root.querySelector('#attendance-search').addEventListener('input',draw);
    root.querySelector('#attendance-classes').addEventListener('change',event=>{const input=event.target;if(!input.matches('[data-attendance-class]'))return;if(input.checked)selectedClasses.add(input.value);else selectedClasses.delete(input.value);draw();});
    root.querySelector('#attendance-all-classes').addEventListener('click',()=>{selectedClasses.clear();drawClasses();draw();});
    drawClasses();draw();if(connection)load();
  }
  function unmount(){clear();root=null;}
  return {mount,unmount,connectionChanged};
})();
