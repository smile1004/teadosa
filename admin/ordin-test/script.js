const form=document.getElementById('ordin-form');
const listStatus=document.getElementById('list-status');
let page=1,total=0,conditions=null,busy=false;
const prev=document.getElementById('prev'),next=document.getElementById('next');
function paging(){prev.disabled=busy||page<=1;next.disabled=busy||page*20>=total;document.getElementById('page-label').textContent=`${page}페이지`;}
async function request(input){
  const response=await fetch('/api/admin/ordin-test',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(input)});
  const result=await response.json();document.getElementById('ordin-raw').textContent=JSON.stringify(result,null,2);
  if(!response.ok) throw Error(result.message||'조회하지 못했습니다.');
  return result;
}
async function search(targetPage){
  if(busy)return;busy=true;paging();document.getElementById('search-button').disabled=true;
  const rows=document.getElementById('ordin-rows');rows.replaceChildren();document.getElementById('detail-section').hidden=true;listStatus.textContent='조례 검색 중…';
  try{const result=await request({...conditions,page:targetPage});page=result.page;total=result.total;listStatus.textContent=result.message;
    for(const row of result.rows){const card=document.createElement('article');card.className='ordin-card';const title=document.createElement('h3');title.textContent=row.자치법규명||'제목 미제공';const meta=document.createElement('p');meta.textContent=`${row.지자체기관명||''} · 시행일 ${row.시행일자||'미제공'} · 공포일 ${row.공포일자||'미제공'}`;const button=document.createElement('button');button.textContent='본문 보기';button.disabled=!row.자치법규ID;button.addEventListener('click',()=>detail(row,button));card.append(title,meta,button);rows.append(card);}
  }catch(error){total=0;listStatus.textContent=error.message||'조회 서버에 연결하지 못했습니다.';}finally{busy=false;document.getElementById('search-button').disabled=false;paging();}
}
function renderFields(value,parent,path=''){
  if(value===null||value===undefined)return;
  if(typeof value==='object'){for(const [key,item] of Object.entries(value))renderFields(item,parent,Array.isArray(value)?path:`${path?path+' / ':''}${key}`);return;}
  const block=document.createElement('div');block.className='body-field';const label=document.createElement('strong');label.textContent=path;const text=document.createElement('div');text.textContent=String(value);block.append(label,text);parent.append(block);
}
const SOLAR_KEYWORDS=['태양광','발전시설','발전설비','신재생에너지','재생에너지'];
const PERMIT_KEYWORDS=['개발행위허가'];
function findSolarArticles(detail){
  const list=detail?.조문?.조;
  if(!Array.isArray(list))return[];
  return list.filter(a=>{
    const text=(a.조내용||'')+' '+(a.조제목||'');
    return SOLAR_KEYWORDS.some(k=>text.includes(k))&&PERMIT_KEYWORDS.some(k=>text.includes(k));
  });
}
function renderSolarHighlight(detail,parent){
  const box=document.createElement('div');
  box.style.cssText='border:2px solid #2f7d32;border-radius:8px;padding:14px;margin-bottom:18px;background:#f3f9f3;';
  const h=document.createElement('h4');h.style.cssText='margin:0 0 10px;color:#2f7d32;';
  const matched=findSolarArticles(detail);
  h.textContent=matched.length?`🔆 태양광 발전시설 개발행위허가 조항 (${matched.length}건)`:'🔆 태양광 발전시설 개발행위허가 조항';
  box.append(h);
  if(matched.length){
    for(const a of matched){
      const block=document.createElement('div');block.style.cssText='margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #d7e6d8;';
      const title=document.createElement('strong');title.textContent=a.조제목||'(제목 없음)';
      const body=document.createElement('div');body.style.cssText='white-space:pre-wrap;margin-top:6px;line-height:1.6;';body.textContent=a.조내용||'';
      block.append(title,body);box.append(block);
    }
  }else{
    const p=document.createElement('p');p.style.margin='0';p.textContent='이 조례에서는 태양광 발전시설 개발행위허가 관련 조항을 찾지 못했습니다.';
    box.append(p);
  }
  parent.append(box);
}
async function detail(row,button){button.disabled=true;const section=document.getElementById('detail-section');section.hidden=false;document.getElementById('detail-title').textContent=row.자치법규명;const status=document.getElementById('detail-status');status.textContent='본문 조회 중…';const content=document.getElementById('detail-content');content.replaceChildren();section.scrollIntoView({behavior:'smooth'});
  try{const result=await request({mode:'detail',id:String(row.자치법규ID)});status.textContent=result.message;
    renderSolarHighlight(result.detail,content);
    const full=document.createElement('details');const summary=document.createElement('summary');summary.textContent='전체 조문 보기';full.append(summary);renderFields(result.detail,full);content.append(full);
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
}
form.addEventListener('submit',event=>{event.preventDefault();if(busy)return;conditions={...Object.fromEntries(new FormData(form)),search:'2'};search(1);});prev.addEventListener('click',()=>search(page-1));next.addEventListener('click',()=>search(page+1));
