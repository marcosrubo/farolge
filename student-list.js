'use strict';

window.FarolStudentList=(()=>{
  const formatSeries=value=>String(value??'').replace(/[º°]/g,'o').replace(/ª/g,'a');

  function fold(value){
    return formatSeries(value).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu,'');
  }

  function classCode(serie,turma){
    const series=formatSeries(serie).trim();
    const group=String(turma??'').trim();
    const ordinal=/^(\d+)\s*([oa])?(?:\s*(ano|s[ée]rie))?$/i.exec(series);
    if(!ordinal||!(ordinal[2]||ordinal[3])||!group)return [series,group].filter(Boolean).join(' · ');
    const [,number,suffix,unit]=ordinal;
    const letter=suffix?.toLowerCase()||(unit.toLowerCase()==='ano'?'o':'a');
    return number+letter+group.toLocaleUpperCase('pt-BR');
  }

  return {fold,classCode};
})();
