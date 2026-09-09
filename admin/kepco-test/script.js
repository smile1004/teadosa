const form = document.getElementById('query-form');
const addressStatus = document.getElementById('address-status');

const addressQuery = document.getElementById('address-query');
const searchDialog = document.createElement('dialog');
searchDialog.id = 'address-dialog';
searchDialog.setAttribute('aria-labelledby', 'address-dialog-title');
const dialogTitle = document.createElement('h2');
dialogTitle.id = 'address-dialog-title';
dialogTitle.textContent = '토지·도로명 주소 검색';
const closeSearch = document.createElement('button');
closeSearch.type = 'button'; closeSearch.className = 'dialog-close';
closeSearch.textContent = '닫기';
closeSearch.addEventListener('click', () => searchDialog.close());
const searchFields = document.querySelector('.address-search');
const openSearch = document.createElement('button');
openSearch.type = 'button'; openSearch.id = 'open-address-search';
openSearch.textContent = '주소 검색창 열기';
searchFields.before(openSearch);
searchDialog.append(dialogTitle, closeSearch, searchFields, addressStatus, document.getElementById('land-results'));
document.body.append(searchDialog);
openSearch.addEventListener('click', () => { searchDialog.showModal(); addressQuery.focus(); });
document.getElementById('address-search').textContent = '검색';
addressQuery.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); document.getElementById('address-search').click(); }
});
document.getElementById('address-search').addEventListener('click', () => {
  const query = addressQuery.value.trim();
  if (!query) { addressStatus.textContent = '위 주소 검색어 칸에 도로명주소 또는 토지 지번을 입력해 주세요.'; addressQuery.focus(); return; }
  searchParcel(query);
});async function searchParcel(query) {
  const results = document.getElementById('land-results');
  results.replaceChildren();

  addressStatus.textContent = '토지·도로명 주소 검색 중…';
  const button = document.getElementById('address-search');
  button.disabled = true;
  try {
    const rows = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 12000);
      if (!window.kakao?.maps?.load) { clearTimeout(timer); reject(new Error('sdk')); return; }
      window.kakao.maps.load(() => {
        new window.kakao.maps.services.Geocoder().addressSearch(query, (data, status) => {
          clearTimeout(timer);
          if (status === window.kakao.maps.services.Status.OK) resolve(data);
          else if (status === window.kakao.maps.services.Status.ZERO_RESULT) resolve([]);
          else reject(new Error('query'));
        }, { analyze_type: 'exact', size: 30 });
      });
    });
    const parcels = rows.filter(row => row.address?.b_code && row.address?.main_address_no);
    addressStatus.textContent = parcels.length ? '검색된 지번주소를 선택해 주세요.' : '지번 검색 결과가 없습니다. 시군구·읍면동·리·번지를 확인해 주세요.';
    for (const row of parcels) {
      const a = row.address;
      const choose = document.createElement('button');
      choose.type = 'button'; choose.className = 'parcel-choice'; choose.textContent = a.address_name + '  · 이 주소 선택';
      choose.addEventListener('click', () => {
        const locality = a.region_3depth_name.trim().split(/\s+/);
        const values = { metroCd: a.b_code.slice(0,2), cityCd: a.b_code.slice(2,5), addrLidong: locality[0], addrLi: locality.slice(1).join(' '), addrJibun: (a.mountain_yn === 'Y' ? '산' : '') + a.main_address_no + (a.sub_address_no && a.sub_address_no !== '0' ? '-' + a.sub_address_no : ''), substCd: '' };
        for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
        document.getElementById('selected-address').value = a.address_name;
        document.getElementById('rows').replaceChildren();
        document.getElementById('raw').textContent = '아직 조회하지 않았습니다.';
        document.getElementById('status').textContent = '선택한 주소로 조회해 주세요.';
        addressStatus.textContent = '토지 지번과 법정동 코드를 입력했습니다. 한전 API 조회를 눌러 주세요.';
        results.replaceChildren();
        searchDialog.close();
      });
      results.appendChild(choose);
    }
  } catch {
    addressStatus.textContent = '지도 주소 검색에 연결하지 못했습니다. 카카오 지도 API의 허용 도메인 및 연결 상태를 확인해 주세요.';
  } finally { button.disabled = false; }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(form));
  delete input.addrJibun;
  runKepco(input, !String(input.substCd || '').trim());
});
async function runKepco(input, regional) {
  const button = document.getElementById('query-button');
  const status = document.getElementById('status');
  const tbody = document.getElementById('rows');
  const raw = document.getElementById('raw');
  if (button.disabled) return;
  const scope = [input.addrLidong,input.addrLi].filter(Boolean).join(' ');


  button.disabled = true; tbody.replaceChildren(); raw.textContent = ''; status.textContent = '한전 API 조회 중…';
  try {
    const response = await fetch('/api/admin/kepco-test', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input) });
    const result = await response.json();
    status.textContent = (result.message || '응답을 확인해 주세요.');
    if (result.upstreamStatus === 404) status.textContent = '주소 입력은 완료됐지만 한전 API가 해당 조회 조건에 404 NotFound를 반환했습니다. 주소 검색 오류나 여유용량 0을 뜻하지 않습니다.';

    if (regional) status.textContent = `[${scope} 범위 조회 · 지번 제외] ${result.message || '응답을 확인해 주세요.'} 이 결과는 선택한 필지의 연결 선로를 확정하지 않습니다.`;
    if (result.elapsedMs !== undefined) status.textContent += ` (${result.elapsedMs}ms)`;
    raw.textContent = JSON.stringify({...result,queryScope:regional?'지역 범위 (지번 제외)':'입력 조건',requestConditions:input}, null, 2);
    for (const row of result.rows || []) {
      const tr = document.createElement('tr');
      for (const field of ['substNm','mtrNo','dlNm','vol1','vol2','vol3']) {
        const td = document.createElement('td');
        td.textContent = row[field] === null || row[field] === undefined || row[field] === '' ? '미제공' : String(row[field]); tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  } catch { status.textContent = '조회 서버에 연결할 수 없습니다. 정적 미리보기에서는 API가 작동하지 않습니다.'; }
  finally { button.disabled = false; }
}
