'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {handleMaintenance}=require('../server/maintenance.cjs');
function backend(){
  const calls=[],state={folders:[{id:'folder-1',name:'FarolGE'}],subfolders:[{id:'folder-weekly',name:'FaltasSemanais'}],files:[{id:'file-1',name:'Ata'}]};
  const client={async request(options){
    calls.push(options);
    const url=new URL(options.url),q=url.searchParams.get('q');
    return {data:q.includes("name = 'FarolGE'")?{files:state.shared&&q.includes('owners')?[]:state.folders,...state.folderExtra}:q.includes("name = 'FaltasSemanais'")?{files:state.subfolders,...state.subfolderExtra}:{files:state.files,...state.fileExtra}};
  }};
  return {state,calls,run:(params={})=>handleMaintenance({url:new URL('https://farol.invalid/?'+new URLSearchParams({mailbox:'school@example.com',...params})),client,email:'school@example.com'})};
}
test('Drive resolve pasta acessível exata e lista apenas metadados diretos, sem escrita',async()=>{
  const h=backend();h.state.fileExtra={nextPageToken:'page-2'};
  const result=await h.run();assert.equal(result.files[0].name,'Ata');assert.equal(result.nextPageToken,'page-2');
  const folderQuery=new URL(h.calls[0].url).searchParams.get('q');
  assert.ok(folderQuery.includes("name = 'FarolGE'"));assert.ok(!folderQuery.includes('owners'));assert.ok(!folderQuery.includes('sharedWithMe'));
  const subfolderQuery=new URL(h.calls[1].url).searchParams.get('q');
  assert.ok(subfolderQuery.includes("name = 'FaltasSemanais'"));assert.ok(subfolderQuery.includes("'folder-1' in parents"));
  const params=new URL(h.calls[2].url).searchParams;
  assert.ok(params.get('q').includes("'folder-weekly' in parents"));assert.ok(params.get('q').includes("mimeType != 'application/vnd.google-apps.folder'"));
  assert.equal(params.get('orderBy'),'name');assert.equal(params.get('fields'),'nextPageToken,incompleteSearch,files(id,name)');
  assert.ok(h.calls.every(call=>call.method==='GET'&&!call.data));
  await h.run({pageToken:'page-2',folder:'folder-weekly'});
  assert.equal(new URL(h.calls.at(-1).url).searchParams.get('pageToken'),'page-2');
});
test('Drive lista FarolGE compartilhada com a Geral sem exigir propriedade ou localização no Meu Drive',async()=>{
  const h=backend();h.state.shared=true;
  h.state.folders=[{id:'shared-farol',name:'FarolGE'}];
  h.state.subfolders=[{id:'shared-weekly',name:'FaltasSemanais'}];
  h.state.files=[{id:'shared-file',name:'Teste'}];
  const result=await h.run();assert.deepEqual(result.files,[{id:'shared-file',name:'Teste'}]);
  assert.equal(result.folder.id,'shared-weekly');
  const queries=h.calls.map(call=>new URL(call.url).searchParams.get('q'));
  assert.ok(queries.every(q=>!q.includes('owners')&&!q.includes("'root' in parents")));
  assert.ok(queries[1].includes("'shared-farol' in parents"));
  assert.ok(queries[2].includes("'shared-weekly' in parents"));
  assert.ok(h.calls.every(call=>new URL(call.url).searchParams.get('corpora')==='user'));
});
test('Drive distingue ausência, duplicidade, pasta vazia e pesquisa incompleta',async()=>{
  const h=backend();h.state.folders=[];await assert.rejects(h.run(),{message:'folder_missing'});
  h.state.folders=[{id:'a',name:'FarolGE'},{id:'b',name:'FarolGE'}];await assert.rejects(h.run(),{message:'folder_ambiguous'});
  h.state.folders=[{id:'folder-1',name:'FarolGE'}];h.state.files=[];assert.deepEqual((await h.run()).files,[]);
  h.state.fileExtra={incompleteSearch:true};await assert.rejects(h.run(),{message:'drive_incomplete'});
});
test('Drive rejeita conta diferente, paginação em pasta trocada e resposta inválida',async()=>{
  const h=backend();await assert.rejects(h.run({mailbox:'other@example.com'}),{message:'account_changed'});assert.equal(h.calls.length,0);
  await assert.rejects(h.run({pageToken:'next',folder:'other-folder'}),{message:'account_changed'});
  h.state.folders=[{id:"bad'id",name:'FarolGE'}];await assert.rejects(h.run(),{message:'invalid_provider'});
});
test('Drive não lista arquivos da FarolGE se FaltasSemanais estiver ausente ou duplicada',async()=>{
  const h=backend();h.state.subfolders=[];
  await assert.rejects(h.run(),{message:'folder_missing'});assert.equal(h.calls.length,2);
  h.state.subfolders=[{id:'weekly-a',name:'FaltasSemanais'},{id:'weekly-b',name:'FaltasSemanais'}];
  await assert.rejects(h.run(),{message:'folder_ambiguous'});assert.equal(h.calls.length,4);
  h.state.subfolders=[{id:'weekly-new',name:'FaltasSemanais'}];
  await assert.rejects(h.run({pageToken:'next',folder:'folder-weekly'}),{message:'account_changed'});assert.equal(h.calls.length,6);
});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function frontend(){
  const nodes=new Map(),requests=[],window={};
  const get=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}});return nodes.get(id);};
  const root={innerHTML:'',querySelector:get};
  vm.runInNewContext(fs.readFileSync('maintenance.js','utf8'),{window,URLSearchParams,fetch:(url,opts)=>new Promise(resolve=>requests.push({url,opts,resolve}))});
  const respond=(index,body,ok=true)=>requests[index].resolve({ok,json:async()=>body});
  return {app:window.FarolMaintenance,root,get,requests,respond};
}
const connection={email:'school@example.com',driveMetadata:true};
const result={mailbox:connection.email,folder:{id:'folder-weekly',name:'FaltasSemanais'},files:[{id:'file-1',name:'<img src=x onerror=alert(1)>'}],nextPageToken:'next'};
test('Manutenção mantém explicação sem conexão e exige permissão de metadados',()=>{
  const h=frontend();h.app.mount(h.root);assert.ok(h.root.innerHTML.includes('FarolGE/FaltasSemanais'));assert.equal(h.requests.length,0);
  h.app.connectionChanged({email:connection.email,drive:true});assert.equal(h.requests.length,0);assert.ok(h.get('#maintenance-status').textContent.includes('Revisar autorização'));
});
test('Manutenção escapa nomes, pagina sem duplicação e preserva lista na falha',async()=>{
  const h=frontend();h.app.connectionChanged(connection);h.app.mount(h.root);h.respond(0,result);await settle();
  assert.ok(h.get('#maintenance-files').innerHTML.includes('&lt;img'));assert.ok(!h.get('#maintenance-files').innerHTML.includes('<img'));
  h.get('#maintenance-more').listeners.click();assert.ok(h.requests[1].url.includes('pageToken=next'));
  h.respond(1,{...result,files:[...result.files,{id:'file-2',name:'Relatório'}],nextPageToken:null});await settle();
  assert.equal((h.get('#maintenance-files').innerHTML.match(/<li>/g)||[]).length,2);
  h.get('#maintenance-refresh').listeners.click();h.respond(2,{error:'unavailable'},false);await settle();
  assert.ok(h.get('#maintenance-files').innerHTML.includes('Relatório'));assert.ok(h.get('#maintenance-status').textContent.includes('lista anterior'));
});
test('Manutenção limpa dados e invalida respostas na troca, desconexão e saída da tela',async()=>{
  const h=frontend();h.app.mount(h.root);h.app.connectionChanged(connection);
  h.app.connectionChanged({...connection,email:'new@example.com'});h.respond(0,result);await settle();assert.equal(h.get('#maintenance-files').innerHTML,'');
  h.app.connectionChanged(null);h.respond(1,{...result,mailbox:'new@example.com'});await settle();assert.equal(h.get('#maintenance-files').innerHTML,'');
  h.app.connectionChanged(connection);h.app.unmount();h.app.mount(h.root);h.respond(2,result);await settle();assert.equal(h.get('#maintenance-files').innerHTML,'');
});

test('quadro RCO aparece após os arquivos e mantém as quatro orientações sem conexão',()=>{
  const h=frontend();h.app.mount(h.root);
  assert.ok(h.root.innerHTML.indexOf('id="rco-title"')>h.root.innerHTML.indexOf('id="maintenance-title"'));
  for(const text of ['Orientações:','por período (manhã e tarde) e por semana','AAAA_MM_DDMM_DDMM_Periodo.PDF','Manha/Tarde','Copie os arquivos','Execute o processo de captura'])assert.ok(h.root.innerHTML.includes(text));
  assert.equal(h.requests.length,0);assert.equal(h.get('#rco-files').innerHTML,'');
  assert.ok(h.get('#rco-status').textContent.includes('Conecte a conta GERAL'));
  assert.ok(h.root.innerHTML.includes('Campos diários vazios valem zero'));
});
test('RCO lista somente PDFs carregados, pagina, preserva falha e limpa na desconexão',async()=>{
  const h=frontend();h.app.connectionChanged(connection);h.app.mount(h.root);
  h.respond(0,{...result,files:[{id:'text',name:'Teste'},{id:'csv',name:'faltas.csv'}]});await settle();
  assert.equal(h.get('#rco-files').innerHTML,'');assert.ok(h.get('#rco-status').textContent.includes('páginas carregadas'));
  assert.ok(!h.get('#rco-more').hidden);
  h.get('#rco-more').listeners.click();
  h.respond(1,{...result,files:[{id:'pdf',name:'2026_11_0911_1311_Manha.PDF'},{id:'escape',name:'<b>relatório</b>.pdf'}],nextPageToken:null});await settle();
  const html=h.get('#rco-files').innerHTML;
  assert.ok(html.includes('2026_11_0911_1311_Manha.PDF'));assert.ok(html.includes('&lt;b&gt;'));
  assert.ok(!html.includes('faltas.csv'));assert.ok(!html.includes('<b>'));assert.equal((html.match(/<li>/g)||[]).length,2);
  assert.equal(h.get('#rco-more').hidden,true);
  h.get('#rco-refresh').listeners.click();h.respond(2,{error:'unavailable'},false);await settle();
  assert.equal(h.get('#rco-files').innerHTML,html);assert.ok(h.get('#rco-status').textContent.includes('lista anterior'));
  h.get('#rco-refresh').listeners.click();h.respond(3,{...result,files:[],nextPageToken:null});await settle();
  assert.ok(h.get('#rco-status').textContent.includes('Nenhum arquivo PDF disponível'));
  h.app.connectionChanged(null);assert.equal(h.get('#rco-files').innerHTML,'');assert.ok(h.get('#rco-status').textContent.includes('Conecte'));
});


test('RCO carrega por ação explícita, impede POST duplicado e permite recarregar arquivo já carregado',async()=>{
 const h=frontend();h.app.connectionChanged({...connection,driveRead:true});h.app.mount(h.root);
 const file={id:'pdf',name:'2026_11_0811_1411_Manha.pdf',mimeType:'application/pdf',version:'7',loaded:true};
 h.respond(0,{...result,files:[file],nextPageToken:null});await settle();
 assert.ok(h.requests[0].url.includes('/attendance-files?'));
 assert.ok(h.get('#rco-files').innerHTML.includes('Já carregado'));
 assert.ok(!h.get('#rco-files').innerHTML.includes('disabled'));
 const event={target:{closest:()=>({dataset:{loadAttendance:'pdf'}})}};
 h.get('#rco-files').listeners.click(event);h.get('#maintenance-files').listeners.click(event);
 assert.equal(h.requests.length,2);assert.equal(h.requests[1].opts.method,'POST');
 assert.equal(h.requests[1].opts.headers['X-Farol-Request'],'1');
 assert.deepEqual(JSON.parse(h.requests[1].opts.body),{type:'general',mailbox:connection.email,fileId:'pdf',version:'7',folder:'folder-weekly'});
 h.respond(1,{mailbox:connection.email,fileId:'pdf',count:10,loaded:true});await settle();
 assert.ok(h.get('#rco-feedback').textContent.includes('10 registros'));
 h.get('#rco-files').listeners.click(event);assert.equal(h.requests.length,3);
 h.app.connectionChanged(null);h.respond(2,{mailbox:connection.email,fileId:'pdf',count:10,loaded:true});await settle();
 assert.equal(h.get('#rco-files').innerHTML,'');assert.equal(h.get('#rco-feedback').textContent,'');
});
test('RCO exige leitura de PDFs e mostra SQL ausente sem simular histórico vazio',async()=>{
 const h=frontend();h.app.connectionChanged(connection);h.app.mount(h.root);
 h.respond(0,{...result,files:[{id:'pdf',name:'2026_11_0811_1411_Manha.pdf',mimeType:'application/pdf',version:'7',loaded:false}],nextPageToken:null});await settle();
 assert.ok(h.get('#rco-files').innerHTML.includes('disabled'));assert.equal(h.get('#rco-scope').hidden,false);
 h.get('#rco-refresh').listeners.click();h.respond(1,{error:'attendance_setup_required'},false);await settle();
 assert.ok(h.get('#rco-status').textContent.includes('database/attendance.sql'));
 assert.ok(h.get('#rco-files').innerHTML.includes('disabled'));
});
