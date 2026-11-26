'use strict';

const ADMIN_EMAIL='marcos.rubo@gmail.com';
const MODULES=['inicio','inspetores-monitores','radar','institucionais','pessoais','bi-seed','arquivo-morto','manutencao-sistema','configuracoes'];
const overviewNames=new Set(['adriana','vanusa']);
const radarNames=new Set([...overviewNames,'sandra','jeisiani','giovana','luciani']);
const settingsActions=new Set(['authorized-emails','authorized-email','temporary-confirm','temporary-reset-password']);
const actionModules=new Map([
  ['students','inspetores-monitores'],['occurrence','inspetores-monitores'],['inspector-occurrences','inspetores-monitores'],
  ['occurrence-delete','inspetores-monitores'],
  ['overview','inicio'],['occurrences','inicio'],['attendance-analysis','radar'],
  ...['maintenance','student-files','student-import','attendance-files','attendance-import'].map(action=>[action,'manutencao-sistema']),
  ...['institutional','institutional-move','institutional-labels'].map(action=>[action,'institucionais']),
  ...['board','thread','demand','inbox','classified','classify','personal-archive','archived','personal-restore'].map(action=>[action,'pessoais']),
  ['personal-archive-next','arquivo-morto'],
  ...[...settingsActions].map(action=>[action,'configuracoes'])
]);

function modulesFor(profile,connections={}){
  if(profile){
    if(Array.isArray(profile.permissions))return MODULES.filter(id=>profile.permissions.includes(id));
    const name=profile.Nome?.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
    return ['inspetores-monitores','bi-seed',...(overviewNames.has(name)?['inicio']:[]),...(radarNames.has(name)?['radar']:[])];
  }
  return connections.general?.email===ADMIN_EMAIL&&connections.personal?.email===ADMIN_EMAIL?MODULES:['bi-seed'];
}

module.exports={ADMIN_EMAIL,MODULES,actionModules,settingsActions,modulesFor};
