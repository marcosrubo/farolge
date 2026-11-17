'use strict';
const {loadPdfEngine,groupLines}=require('./student-pdf.cjs');
const fail=(code='attendance_layout')=>{throw Object.assign(new Error(code),{status:422});};
function filePeriod(name){
  const m=/^(\d{4})_(\d{2})_(\d{2})(\d{2})_(\d{2})(\d{2})_(Manha|Tarde)\.pdf$/i.exec(name||'');
  if(!m)fail('attendance_filename');
  const year=Number(m[1]),month=Number(m[2]),start=Number(m[3]),end=Number(m[5]);
  const max=new Date(Date.UTC(year,month,0)).getUTCDate();
  if(year<2000||year>2199||month<1||month>12||Number(m[4])!==month||Number(m[6])!==month||start<1||end<start||end>max||end-start>6)fail('attendance_filename');
  return {year,month,start,end,period:m[7].toLowerCase()==='manha'?'Manhã':'Tarde'};
}
function parseAttendancePages(pages,name){
  const period=filePeriod(name),records=new Map();let school=null,studentRows=0;
  for(const lines of pages){
    const first=!school;if(first&&!lines.some(l=>l.text==='RELATÓRIO DE FREQUÊNCIA'))fail();
    const header=lines.find(l=>l.items.some(i=>i.text==='TURMA (C.G.M.)'));
    const nameX=header?.items.find(i=>i.text==='NOME DO ALUNO (DATA DE NASCIMENTO)')?.x;
    const shift=lines.find(l=>l.y>header?.y&&l.items.some(i=>i.x<nameX&&i.text===period.period));
    if(!header||!nameX||first&&!shift)fail();
    const schoolLine=lines.filter(l=>l.y>shift?.y&&l.items.some(i=>i.x===header.items[0].x)).at(-1);
    const Escola=shift?schoolLine?.items.filter(i=>i.x<nameX).map(i=>i.text).join(' ').trim():school;
    if(!Escola||Escola.length>200||school&&school!==Escola)fail();school=Escola;
    const daysLine=lines.find(l=>Math.abs(l.y-header.y)<8&&l.items.filter(i=>/^\d{2}$/.test(i.text)&&i.x>nameX).length);
    const days=daysLine?.items.filter(i=>/^\d{2}$/.test(i.text)&&i.x>nameX).sort((a,b)=>a.x-b.x);
    const totalX=lines.find(l=>l.items.some(i=>i.text==='Falta'))?.items.find(i=>i.text==='Falta')?.x;
    const endX=daysLine?.items.find(i=>i.text==='Dias')?.x;
    if(!days?.length||!endX||!totalX||days.some((d,i)=>Number(d.text)<period.start||Number(d.text)>period.end||i&&Number(d.text)<=Number(days[i-1].text)))fail();
    const cgms=lines.flatMap(l=>l.y<header.y-10?l.items.filter(i=>i.x<nameX&&/\(\d{1,20}\)$/.test(i.text)).map(i=>({CGM:/\((\d{1,20})\)$/.exec(i.text)[1],y:l.y})):[]);
    const totals=lines.filter(l=>l.y<header.y-10).flatMap(l=>l.items).filter(i=>i.x>=totalX-3&&i.x<totalX+15&&/^\d+$/.test(i.text));
    if(!cgms.length||totals.length!==cgms.length)fail();
    let pageCells=0;
    for(const row of cgms){
      const totalLine=lines.find(l=>l.y>=row.y-1&&l.y<row.y+16&&l.items.some(i=>i.x>=totalX-3&&i.x<totalX+15&&/^\d{1,4}$/.test(i.text)));
      if(!totalLine)fail();
      const band=lines.filter(l=>Math.abs(l.y-totalLine.y)<3).flatMap(l=>l.items);
      const values=days.map((day,i)=>{
        const cells=band.filter(item=>item.x>=day.x-3&&item.x<(days[i+1]?.x||endX)-3);
        if(cells.length>1||cells.some(c=>!/^\d{1,3}$/.test(c.text)))fail();
        return cells.length?Number(cells[0].text):0;
      });
      const total=band.filter(i=>i.x>=totalX-3&&i.x<totalX+15);
      if(total.length!==1||!/^\d{1,4}$/.test(total[0].text)||Number(total[0].text)!==values.reduce((a,b)=>a+b,0))fail();
      pageCells+=band.filter(i=>i.x>=days[0].x-3&&i.x<endX-3).length;
      days.forEach((day,i)=>{
        const data=`${period.year}-${String(period.month).padStart(2,'0')}-${day.text}`;
        const value={Escola,CGM:row.CGM,data,faltas:values[i]},key=JSON.stringify([Escola,row.CGM,data]);
        value.faltas+=records.get(key)?.faltas||0;
        if(value.faltas>9999)fail();records.set(key,value);
      });studentRows++;
    }
    const allCells=lines.filter(l=>l.y<header.y-10&&l.y>cgms.at(-1).y-3).flatMap(l=>l.items).filter(i=>i.x>=days[0].x-3&&i.x<endX-3);
    if(allCells.length!==pageCells||records.size>20000)fail();
  }
  if(!records.size)fail();return {records:[...records.values()],Escola:school,studentRows};
}
async function readAttendancePdf(bytes,name,{loadEngine=loadPdfEngine}={}){
  filePeriod(name);
  if(bytes.length>10*1024*1024)fail('file_too_large');
  if(Buffer.from(bytes).subarray(0,5).toString()!=='%PDF-')fail('unsupported_file');
  const {getDocument}=await loadEngine();let task;
  try{
    task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,verbosity:0,useSystemFonts:true,disableFontFace:true});
    const pdf=await task.promise;if(pdf.numPages>100)fail('file_too_large');
    const pages=[];
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n),viewport=page.getViewport({scale:1}),{items}=await page.getTextContent();
      if(items.length>20000)fail('file_too_large');
      pages.push(groupLines(items.map(item=>{const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);return {...item,transform:[0,0,0,0,x,-y]};})));page.cleanup();
    }
    return parseAttendancePages(pages,name);
  }catch(error){if(error.status)throw error;fail();}
  finally{try{await task?.destroy();}catch{}}
}
module.exports={filePeriod,parseAttendancePages,readAttendancePdf};
