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
      const t=document.createElement('strong');t.textContent=a.조제목||'(제목 없음)';
      const body=document.createElement('div');body.style.cssText='white-space:pre-wrap;margin-top:6px;line-height:1.6;';body.textContent=a.조내용||'';
      block.append(t,body);card.append(block);
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
