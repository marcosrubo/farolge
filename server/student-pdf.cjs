'use strict';
const path=require('node:path');
const {pathToFileURL}=require('node:url');
async function loadPdfEngine(){
  try{
    const canvas=require('@napi-rs/canvas');
    for(const name of ['DOMMatrix','ImageData','Path2D'])if(!globalThis[name])globalThis[name]=canvas[name];
    const engine=await import('pdfjs-dist/legacy/build/pdf.mjs');
    engine.GlobalWorkerOptions.workerSrc=pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
    return engine;
  }catch{throw Object.assign(new Error('pdf_runtime_unavailable'),{status:503});}
}
const fail=message=>{throw Object.assign(new Error(message),{status:422});};
const clean=value=>String(value||'').replace(/\s+/gu,' ').trim();
function pdfDate(value){
  const m=/^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:([Z+-])(\d{2})?'?(\d{2})?'?)?$/.exec(value||'');
  if(!m)return null;
  const zone=!m[7]||m[7]==='Z'?'Z':`${m[7]}${m[8]||'00'}:${m[9]||'00'}`;
  const iso=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${zone}`;
  return Number.isNaN(Date.parse(iso))?null:iso;
}
function groupLines(items){
  const lines=[];
  for(const item of items.filter(i=>i.str?.trim()).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])){
    const y=item.transform[5];let line=lines.find(l=>Math.abs(l.y-y)<2);
    if(!line){line={y,items:[]};lines.push(line);}line.items.push({text:clean(item.str),x:item.transform[4]});
  }
  return lines.map(line=>({...line,items:line.items.sort((a,b)=>a.x-b.x),text:clean(line.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' '))}));
}
function studentParser(){
  let escola=null,totalRows=0;const students=new Map();
  function addPage(lines,onStudent){
    const title=lines.find(l=>l.text==='RELAÇÃO DE ALUNOS POR TURMA');
    if(title){
      const schoolLine=lines.find(l=>l.y>title.y&&l.items.some(i=>i.x>500&&/^\d{4}$/.test(i.text))&&l.items.some(i=>i.x<100&&i.text.length>3));
      if(!schoolLine)fail('pdf_layout');
      escola=clean(schoolLine.items.filter(i=>i.x<500).map(i=>i.text).join(' '));
    }
    const context=lines.find(l=>l.text.startsWith('Curso:'));
    const match=/Seriação:\s*(.*?)\s+Turno:\s*(.*?)\s+Turma:\s*(\S+)\s*$/.exec(context?.text||'');
    const header=lines.find(l=>l.items.some(i=>i.text==='CGM')&&l.items.some(i=>i.text==='Nome do Estudante'));
    if(!escola||!match||!header)fail('pdf_layout');
    const cgmX=header.items.find(i=>i.text==='CGM').x,nameX=header.items.find(i=>i.text==='Nome do Estudante').x;
    const dateX=header.items.find(i=>i.text==='Data de')?.x;
    if(!dateX||!(cgmX<nameX&&nameX<dateX))fail('pdf_layout');
    let count=0;
    for(const line of lines.filter(l=>l.y<header.y-3)){
      const ordinal=line.items.filter(i=>i.x<cgmX-1).map(i=>i.text).join('');
      const CGM=clean(line.items.filter(i=>i.x>=cgmX-1&&i.x<nameX-1).map(i=>i.text).join(''));
      if(!ordinal&&!/^\d{1,20}$/.test(CGM))continue;
      if(ordinal&&(!/^\d+$/.test(ordinal)||Number(ordinal)!==count+1))fail('pdf_layout');
      const Nome=clean(line.items.filter(i=>i.x>=nameX-1&&i.x<dateX-8).map(i=>i.text).join(' '));
      if(!/^\d{1,20}$/.test(CGM)||!Nome||Nome.length>200||!/[\p{L}]/u.test(Nome)||/\d/u.test(Nome))fail('pdf_layout');
      const student={Escola:escola,CGM,Nome,Serie:clean(match[1]),Turma:clean(match[3]),Turno:clean(match[2])};
      if(Object.values(student).some(v=>!v||v.length>200))fail('pdf_layout');
      const key=JSON.stringify([student.Escola,CGM,student.Serie,student.Turma,student.Turno]);
      if(students.has(key)&&students.get(key).Nome!==Nome)fail('pdf_layout');
      students.set(key,student);count++;totalRows++;
      if(totalRows>10000)fail('listing_limit');
      onStudent?.(student);
    }
    if(!count)fail('pdf_layout');
  }
  function finish(){
    if(!students.size)fail('pdf_layout');
    return {students:[...students.values()],totalRows};
  }
  return {addPage,finish};
}
function parsePages(pages){
  const parser=studentParser();
  for(const page of pages)parser.addPage(page);
  return parser.finish();
}
async function readStudentPdf(bytes,{loadEngine=loadPdfEngine,signal,onPage}={}){
  if(bytes.length>10*1024*1024)fail('file_too_large');
  if(Buffer.from(bytes).subarray(0,5).toString()!=='%PDF-')fail('unsupported_file');
  const {getDocument}=await loadEngine();
  signal?.throwIfAborted();
  let task;
  try{task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,verbosity:0,useSystemFonts:true,disableFontFace:true,standardFontDataUrl:path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts')+path.sep});}catch{throw Object.assign(new Error('pdf_runtime_unavailable'),{status:503});}
  let cleanup;
  const destroy=()=>cleanup??=Promise.resolve().then(()=>task.destroy()).catch(()=>{});
  signal?.addEventListener('abort',destroy,{once:true});
  try{
    const pdf=await task.promise;
    if(pdf.numPages>100)fail('file_too_large');
    const parser=studentParser();
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i),{items}=await page.getTextContent();
      signal?.throwIfAborted();
      if(items.length>20000)fail('file_too_large');
      const rows=[];
      parser.addPage(groupLines(items),onPage&&(({Turno,Serie,Turma,CGM,Nome})=>rows.push({Turno,Serie,Turma,CGM,Nome})));
      page.cleanup();
      if(onPage)await onPage(rows);
      signal?.throwIfAborted();
    }
    const info=(await pdf.getMetadata()).info;
    return {...parser.finish(),generatedAt:pdfDate(info?.CreationDate)};
  }catch(error){
    signal?.throwIfAborted();
    if(error.status)throw error;
    // Inspect runtime signatures only; never return/log raw PDF.js errors.
    if(/worker|module|DOMMatrix|native binding/i.test(String(error.message||'')))throw Object.assign(new Error('pdf_runtime_unavailable'),{status:503});
    fail('pdf_layout');
  }
  finally{signal?.removeEventListener('abort',destroy);await destroy();}
}
module.exports={readStudentPdf,parsePages,groupLines,pdfDate,loadPdfEngine};
