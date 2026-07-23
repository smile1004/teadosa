
const data={
  land:{label:'토지형',total:'7,600,000원 ~ 9,800,000원',services:[
    ['발전사업허가','500,000 ~ 800,000원',''],['개발행위허가','4,000,000 ~ 5,000,000원','토목설계 포함'],['사업자등록증 신청','150,000 ~ 200,000원','세무서 신고'],['한전 PPA 접수','300,000 ~ 500,000원',''],['공사계획신고','1,500,000 ~ 1,700,000원','전기감리 포함'],['사용전검사 신청','200,000 ~ 300,000원','한국전기안전공사'],['사업개시신고','150,000 ~ 200,000원','발전사업 개시 신고'],['에너지관리공단 설비신청','300,000 ~ 400,000원','RPS 설비확인 신청'],['장기계약 신청','500,000 ~ 700,000원','20년 고정가격계약 입찰 대행']
  ],packages:[['BASIC 기본형','A-1, A-2, A-3','4,185,000 ~ 5,400,000원'],['STANDARD 완료형','A-1, A-2, A-3, A-4, A-5, A-6','5,984,000 ~ 7,656,000원'],['PREMIUM 프리미엄형','A-1, A-2, A-3, A-4, A-5, A-6, A-7, A-8, A-9','6,460,000 ~ 8,330,000원']]},
  building:{label:'건물형',total:'8,100,000원 ~ 10,800,000원',services:[
    ['발전사업허가','500,000 ~ 800,000원',''],['개발행위허가','1,500,000 ~ 2,000,000원','건축물 상부, 도면 있는 경우'],['개발행위허가','3,000,000 ~ 4,000,000원','건축물 상부, 도면 없는 경우 / 실측 포함'],['사업자등록증 신청','150,000 ~ 200,000원','세무서 신고'],['한전 PPA 접수','300,000 ~ 500,000원',''],['공사계획신고','1,500,000 ~ 1,700,000원','전기감리 포함'],['사용전검사 신청','200,000 ~ 300,000원','한국전기안전공사'],['사업개시신고','150,000 ~ 200,000원','발전사업 개시 신고'],['에너지관리공단 설비신청','300,000 ~ 400,000원','RPS 설비확인 신청'],['장기계약 신청','500,000 ~ 700,000원','20년 고정가격계약 입찰 대행']
  ],packages:[['BASIC 기본형','A-1, A-2, A-3, A-4','4,635,000 ~ 6,300,000원'],['STANDARD 완료형','A-1, A-2, A-3, A-4, A-5, A-6, A-7','6,424,000 ~ 8,536,000원'],['PREMIUM 프리미엄형','A-1, A-2, A-3, A-4, A-5, A-6, A-7, A-8, A-9','6,885,000 ~ 9,180,000원']]}
};
function render(type){
  document.getElementById('summaryType').textContent=data[type].label;
  document.getElementById('totalPrice').textContent=data[type].total;
  document.getElementById('serviceList').innerHTML=data[type].services.map((s,i)=>`<article class="service-card"><div class="service-title"><span class="check">✓</span><div><span class="service-code">A-${i+1}</span>${s[0]}${s[2]?`<span class="sub">${s[2]}</span>`:''}</div></div><div class="price">${s[1]}</div><button class="apply-btn" onclick="showToast('A-${i+1} ${s[0]} 신청으로 연결됩니다.')">신청하기</button></article>`).join('');
  document.getElementById('packageTable').innerHTML=`<thead><tr><th>${data[type].label} 패키지</th><th>항목</th><th>가격</th></tr></thead><tbody>${data[type].packages.map(p=>`<tr><td>${p[0]}</td><td>${p[1]}</td><td><div class="package-price-cell"><span>${p[2]}</span><button class="package-apply-btn" onclick="showToast('${p[0]} 패키지 신청으로 연결됩니다.')">신청하기</button></div></td></tr>`).join('')}</tbody>`;
}
document.querySelectorAll('.type-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');render(btn.dataset.type)}));
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
render('land');

