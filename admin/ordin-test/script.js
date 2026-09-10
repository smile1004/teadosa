const form=document.getElementById('ordin-form');
const listStatus=document.getElementById('list-status');
const rows=document.getElementById('ordin-rows');
let busy=false;
async function request(input){
  const response=await fetch('/api/admin/ordin-test',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(input)});
  const result=await response.json();document.getElementById('ordin-raw').textContent=JSON.stringify(result,null,2);
  if(!response.ok) throw Error(result.message||'조회하지 못했습니다.');
  return result;
}
function findMatchingArticles(detail,keyword){
  const list=detail?.조문?.조;
  if(!Array.isArray(list))return[];
  const terms=String(keyword||'').split(/\s+/).filter(Boolean);
  if(!terms.length)return[];
  return list.filter(a=>{
    const text=(a.조내용||'')+' '+(a.조제목||'');
    return terms.every(t=>text.includes(t));
  });
}
function isPlanningOrdinance(name){
  return /계획\s*조례$/.test(String(name||'').trim());
}
function extractAttachmentRefs(text){
  const nums=new Set();const re=/별표\s*(\d+)/g;let m;
  while((m=re.exec(String(text||'')))){nums.add(Number(m[1]));}
  return[...nums];
}
function getAttachmentUnits(detail){
  const units=detail?.별표?.별표단위;
  if(!units)return[];
  return Array.isArray(units)?units:[units];
}
function renderAttachmentLinks(detail,text,parent){
  const refs=extractAttachmentRefs(text);
  if(!refs.length)return;
  const units=getAttachmentUnits(detail);
  const box=document.createElement('div');box.style.cssText='margin-top:8px;padding:8px;background:#fff;border:1px dashed #9bbf9d;border-radius:6px;';
  for(const num of refs){
    const found=units.find(u=>Number(u.별표번호)===num);
    const line=document.createElement('div');line.style.marginBottom='4px';
    if(found&&found.별표첨부파일명){
      const a=document.createElement('a');a.href=found.별표첨부파일명;a.target='_blank';a.rel='noopener';
      a.textContent=`📎 별표 ${num}: ${found.별표제목||'첨부파일'} 다운로드 (${found.별표첨부파일구분||'파일'})`;
      line.append(a);
    }else{
      line.textContent=`⚠️ 별표 ${num}은 API 응답에 포함되어 있지 않습니다. law.go.kr(국가법령정보 자치법규)에서 직접 확인해 주세요.`;
    }
    box.append(line);
  }
  parent.append(box);
}
function formatArticleText(raw){
  let text=String(raw||'');
  text=text.replace(/([\u2460-\u2473])/g,'\n$1');
  const placeholders=[];
  text=text.replace(/[<\[][^<>\[\]]*[>\]]/g,(m)=>{placeholders.push(m);return `\u0000${placeholders.length-1}\u0000`;});
  text=text.replace(/(?<![\d.])(\d{1,2})\.(?!\d)/g,'\n$1.');
  text=text.replace(/\u0000(\d+)\u0000/g,(_,i)=>placeholders[Number(
