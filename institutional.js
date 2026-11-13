'use strict';
window.FarolInstitutional=(()=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const displayDate=value=>value.split('-').reverse().join('/');
  const received=value=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
  const errors={login_required:'Conecte novamente a conta GERAL para consultar a caixa de entrada.',missing_scope:'Use GERAL → Revisar autorização para permitir a consulta ao Gmail.',account_changed:'A conta GERAL mudou. Atualize a lista.',invalid_page:'A paginação expirou. Atualize a lista.',unavailable:'Não foi possível consultar os e-mails. Tente atualizar a lista.'};
  let root=null,connection=null,items=[],nextPage=null,busy=false,loaded=false,error='',search='',epoch=0;
  function rows(){
    const query=search.toLocaleLowerCase('pt-BR');
    return items.flatMap(message=>message.activities.map((activity,index)=>({...activity,message,index})))
      .filter(row=>!query||[row.activity,row.evidence,row.message.subject,row.message.from].join(' ').toLocaleLowerCase('pt-BR').includes(query))
      .sort((a,b)=>(a.dueDate||'9999-12-31').localeCompare(b.dueDate||'9999-12-31')||b.message.date-a.message.date||a.index-b.index);
  }
  function draw(){
    if(!root)return;
    const list=rows(),today=day();
    root.querySelector('#institutional-count').textContent=`${items.length} e-mails carregados · ${list.length} itens exibidos`;
    root.querySelector('#institutional-feedback').textContent=busy?'Consultando e identificando os prazos…':error?(errors[error]||errors.unavailable):!connection?.gmail?'Conecte a conta GERAL com consulta ao Gmail para ver os e-mails.':loaded?'Lista ordenada por prazo: vencidos primeiro, depois próximos vencimentos e itens sem prazo identificado.':'';
    root.querySelector('#institutional-list').innerHTML=list.map(row=>{
      const m=row.message,due=row.dueDate;
      const status=!due?'Prazo não identificado':due<today?'Prazo vencido · '+displayDate(due):due===today?'Vence hoje · '+displayDate(due):'Até '+displayDate(due);
      return `<article class="inbox-message ${m.unread?'is-unread':''}"><div class="inbox-message-main"><span class="deadline ${!due?'none':due<today?'late':due===today?'today':''}">${escape(status)}</span><h2 class="institutional-activity">${escape(row.activity)}</h2><p><strong>${escape(m.subject)}</strong></p><p>${escape(m.from)} · Recebido em ${escape(received(m.date))}${m.unread?' · Não lida':''}</p>${row.evidence?`<details><summary>Conferir trecho do e-mail</summary><blockquote class="institutional-evidence">${escape(row.evidence)}</blockquote></details>`:''}${row.review?`<p class="demand-footnote">Conferência: ${escape(row.review)}</p>`:''}${m.limitedText?'<p class="demand-footnote">Texto indisponível ou limitado. Abra o Gmail para conferir o conteúdo e eventuais anexos.</p>':''}<a href="https://mail.google.com/mail/u/?authuser=${encodeURIComponent(connection.email)}#all/${encodeURIComponent(m.threadId)}" target="_blank" rel="noopener noreferrer">Abrir e-mail no Gmail</a></div></article>`;
    }).join('')||(loaded?'<p class="demand-empty">Nenhum e-mail nesta seleção.</p>':'');
    root.querySelector('#institutional-refresh').disabled=busy||!connection?.gmail;
    const more=root.querySelector('#institutional-more');more.hidden=!nextPage;more.disabled=busy||!connection?.gmail;
  }
  async function load(append=false){
    if(!root||!connection?.gmail||busy)return;
    const ticket=++epoch,mailbox=connection.email;busy=true;error='';
    if(!append){items=[];nextPage=null;loaded=false;}
    draw();
    try{
      const params=new URLSearchParams({mailbox});if(append&&nextPage)params.set('page',nextPage);
      const response=await fetch('/api/google/institutional?'+params,{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'unavailable');
      if(ticket!==epoch)return;if(result.mailbox!==mailbox)throw new Error('account_changed');
      const combined=[...items,...result.items];items=[...new Map(combined.map(item=>[item.id,item])).values()];
      nextPage=result.nextPage;loaded=true;
    }catch(cause){if(ticket===epoch)error=cause.message;}
    finally{if(ticket===epoch){busy=false;draw();}}
  }
  function reset(){++epoch;items=[];nextPage=null;busy=false;loaded=false;error='';}
  function mount(element){
    root=element;search='';reset();
    root.innerHTML='<div class="inbox-heading"><h2>Prazos da caixa de entrada GERAL</h2><button class="button" id="institutional-refresh">Atualizar e-mails</button></div><p class="demand-footnote">Identificação automática por regras de texto, sujeita a conferência. Datas completas e expressões “hoje” e “amanhã” são reconhecidas quando associadas a prazo; datas incompletas, alterações e múltiplas datas no mesmo trecho pedem conferência. Cada trecho com prazo pode gerar um item. Mensagens sem prazo claro também aparecem.</p><p class="demand-footnote">Páginas de 20 e-mails. A ordenação e a busca consideram somente os e-mails carregados; carregue mais para ampliar a relação. Calendário de Brasília. Não consulta anexos nem links. Ler aqui preserva os marcadores e o estado de leitura.</p><label class="inbox-search">Buscar nos e-mails carregados<input id="institutional-search" type="search" placeholder="Atividade, assunto, remetente ou trecho"></label><p id="institutional-count" class="demand-footnote"></p><p id="institutional-feedback" class="demand-notice" role="status"></p><div id="institutional-list"></div><button class="button demand-more" id="institutional-more" hidden>Carregar mais e-mails</button>';
    root.querySelector('#institutional-refresh').addEventListener('click',()=>load());
    root.querySelector('#institutional-more').addEventListener('click',()=>load(true));
    root.querySelector('#institutional-search').addEventListener('input',event=>{search=event.target.value;draw();});
    draw();if(connection?.gmail)load();
  }
  function connectionChanged(value){
    const changed=connection?.email!==value?.email||connection?.gmail!==value?.gmail;
    connection=value;if(changed){reset();draw();if(root&&connection?.gmail)load();}
  }
  function unmount(){reset();root=null;}
  return {mount,unmount,connectionChanged};
})();
