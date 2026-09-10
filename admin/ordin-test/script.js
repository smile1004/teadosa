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
function formatArticleNumber(codeArr){
  const code=String(codeArr?.[0]||'').padStart(6,'0');
  const artNum=Number.parseInt(code.slice(0,4),10);
  const branch=Number.parseInt(code.slice(4,6),10);
  if(!Number.isFinite(artNum)||artNum<=0)return'';
  return branch>0?`제${artNum}조의${branch}`:`제${artNum}조`;
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
      const a=document.createElement('a');a.href=found.별표첨부파일명;
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
  text=text.replace(/^제\d+조(?:의\d+)?\([^)]*\)\s*/,'');
  text=text.replace(/([\u2460-\u2473])/g,'\n$1');
  const placeholders=[];
  text=text.replace(/[<\[][^<>\[\]]*[>\]]/g,(m)=>{placeholders.push(m);return `\u0000${placeholders.length-1}\u0000`;});
  text=text.replace(/(?<![\d.])(\d{1,2})\.(?!\d)/g,'\n$1.');
  text=text.replace(/\u0000(\d+)\u0000/g,(_,i)=>placeholders[Number(i)]);
  return text.split('\n').map(s=>s.trim()).filter(Boolean);
}
function renderArticleBody(text,container){
  const lines=formatArticleText(text);
  for(const line of lines){
    const div=document.createElement('div');
    div.style.marginTop='4px';
    if(/^\d{1,2}\./.test(line))div.style.marginLeft='16px';
    div.textContent=line;
    container.append(div);
  }
}
async function search(region,keyword,org,sborg){
  if(busy)return;busy=true;document.getElementById('search-button').disabled=true;
  rows.replaceChildren();listStatus.textContent='도시계획 조례 검색 중…';
  try{
    const conditions={query:`${region} 계획`,search:'1',page:'1'};
    if(org)conditions.org=org;
    if(sborg)conditions.sborg=sborg;
    const result=await request(conditions);
    const candidates=(result.rows||[]).filter(r=>isPlanningOrdinance(r.자치법규명));
    if(!candidates.length){
      listStatus.textContent=`"${region}"의 도시계획/군계획 조례를 찾지 못했습니다. (전체 검색결과 ${result.rows?.length||0}건 중 일치 없음)`;
      return;
    }
    listStatus.textContent=`${candidates.length}건 확인 중…`;
    for(const row of candidates.slice(0,5)){await renderOrdinance(row,keyword);}
    listStatus.textContent=`${Math.min(candidates.length,5)}건 확인 완료`;
  }catch(error){listStatus.textContent=error.message||'조회 서버에 연결하지 못했습니다.';}
  finally{busy=false;document.getElementById('search-button').disabled=false;}
}
async function renderOrdinance(row,keyword){
  const card=document.createElement('article');card.className='ordin-card';
  const title=document.createElement('h3');title.textContent=row.자치법규명||'제목 미제공';
  const meta=document.createElement('p');meta.textContent=`${row.지자체기관명||''} · 시행일 ${row.시행일자||'미제공'} · 공포일 ${row.공포일자||'미제공'}`;
  card.append(title,meta);
  const status=document.createElement('p');status.textContent='관련 조항 확인 중…';card.append(status);
  rows.append(card);
  try{
    const result=await request({mode:'detail',id:String(row.자치법규ID)});
    const matched=findMatchingArticles(result.detail,keyword);
    status.remove();
    if(!matched.length){const p=document.createElement('p');p.textContent=`"${keyword}" 관련 조항을 찾지 못했습니다.`;card.append(p);return;}
    for(const a of matched){
      const block=document.createElement('div');block.style.cssText='margin-top:10px;padding:12px;border:2px solid #2f7d32;border-radius:8px;background:#f3f9f3;';
      const artNo=formatArticleNumber(a.조문번호);
      const t=document.createElement('strong');t.textContent=artNo?`${artNo} ${a.조제목||''}`:(a.조제목||'(제목 없음)');
      const body=document.createElement('div');body.style.cssText='margin-top:6px;line-height:1.6;';
      renderArticleBody(a.조내용||'',body);
      block.append(t,body);
      renderAttachmentLinks(result.detail,a.조내용,block);
      card.append(block);
    }
  }catch(error){status.textContent=error.message||'본문을 조회하지 못했습니다.';}
}
form.addEventListener('submit',event=>{
  event.preventDefault();if(busy)return;
  const data=Object.fromEntries(new FormData(form));
  const region=String(data.region||'').trim();
  const keyword=String(data.keyword||'').trim();
  if(!region||!keyword)return;
  search(region,keyword,data.org,data.sborg);
});
