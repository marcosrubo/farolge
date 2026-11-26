const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function harness(){
 let focused;
 const make=()=>({listeners:{},children:[],textContent:'',focus(){focused=this;},close(){this.open=false;this.listeners.close?.();},showModal(){this.open=true;},
  addEventListener(event,callback){this.listeners[event]=callback;},
  append(...children){this.children.push(...children);},prepend(child){this.children.unshift(child);}
 });
 const nodes=new Map(),requests=[];
 const element={innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,make());return nodes.get(selector);}};
 const window={addEventListener(){}};
 const fetch=(url,options)=>new Promise(resolve=>requests.push({url,options,respond(data){resolve({ok:true,json:async()=>data});}}));
 vm.runInNewContext(fs.readFileSync('archive-inbox.js','utf8'),{window,document:{createElement:make},fetch});
 const api=window.FarolArchiveInbox,mailbox='person@escola.pr.gov.br';
 let left=0;
 api.connectionChanged({email:mailbox,gmail:true,classify:true});
 api.mount(element,()=>left++);
 const get=id=>element.querySelector('#archive-inbox-'+id);
 return {api,element,get,requests,mailbox,click:id=>get(id).listeners.click(),left:()=>left,focused:()=>focused};
}

test('duas confirmações precedem qualquer movimentação e Cancelar na segunda mantém a primeira tela',()=>{
 const h=harness();
 assert.match(h.element.innerHTML,/MOVERÁ TODOS OS SEUS E-MAILS/);
 assert.match(h.element.innerHTML,/<mark[^>]*>MOVER TODAS AS MENSAGENS DA CAIXA DE ENTRADA PARA O ARQUIVO MORTO\?<\/mark>/);
 assert.equal(h.focused(),h.get('back'));
 h.click('review');
 assert.equal(h.get('confirmation').open,true);
 assert.equal(h.focused(),h.get('dismiss'));
 assert.equal(h.requests.length,0);
 h.click('dismiss');
 assert.equal(h.get('confirmation').open,false);
 assert.equal(h.focused(),h.get('back'));
 assert.equal(h.requests.length,0);
 h.click('back');
 assert.equal(h.left(),1);
});

test('o acompanhamento lista os quatro campos e Cancelar impede o envio da próxima mensagem',async()=>{
 const h=harness();
 h.click('review');
 const run=h.click('start');
 assert.equal(h.requests.length,1);
 assert.equal(h.requests[0].url,'/api/google/personal-archive-next');
 assert.deepEqual(JSON.parse(h.requests[0].options.body),{type:'personal',mailbox:h.mailbox});
 const item={from:'Pessoa <pessoa@example.com>',to:h.mailbox,date:1794300000000,subject:'Assunto <b>literal</b>'};
 h.requests[0].respond({mailbox:h.mailbox,status:'moved',messageId:'a',item});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.requests.length,2);
 const [row]=h.get('messages').children;
 assert.deepEqual(row.children[0].children.map(node=>node.textContent).filter((_,index)=>index%2===0),['Remetente:','Destinatário:','Data:','Assunto:']);
 assert.equal(row.children[0].children.at(-1).textContent,item.subject);
 h.click('stop');
 assert.match(h.get('status').textContent,/Cancelamento solicitado/);
 h.requests[1].respond({mailbox:h.mailbox,status:'moved',messageId:'b',item});
 await run;
 assert.equal(h.requests.length,2);
 assert.equal(h.get('status').textContent,'Processo cancelado.');
 assert.match(h.get('count').textContent,/2$/);
});

test('trocar de conta invalida a confirmação pendente e interrompe a fila',async()=>{
 const h=harness();
 h.click('review');
 const run=h.click('start');
 h.api.connectionChanged({email:'outra@escola.pr.gov.br',gmail:true,classify:true});
 h.requests[0].respond({mailbox:h.mailbox,status:'moved',messageId:'a',item:{subject:'Mensagem da conta anterior'}});
 await run;
 assert.equal(h.requests.length,1);
 assert.match(h.get('account').textContent,/outra@escola\.pr\.gov\.br/);
 assert.equal(h.get('messages').children.length,0);
});
