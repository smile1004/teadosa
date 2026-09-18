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
let addressMode = 'road';
let searchVersion = 0;
let selectedCoords = null;
let selectedCoordsPromise = null;

function geocodeAddress(query) {
  if (!query || !window.kakao?.maps?.load) return Promise.resolve(null);
  return new Promise(resolve => {
    window.kakao.maps.load(() => {
      new window.kakao.maps.services.Geocoder().addressSearch(query, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK && data[0]) resolve({ lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) });
        else resolve(null);
      });
    });
  });
}
const modeBar = document.createElement('div'); modeBar.className = 'address-modes';
const roadTab = document.createElement('button'); roadTab.type = 'button'; roadTab.textContent = '도로명 검색';
const parcelTab = document.createElement('button'); parcelTab.type = 'button'; parcelTab.textContent = '지번 검색';
modeBar.append(roadTab, parcelTab); searchFields.before(modeBar);
const roadPanel = document.createElement('div'); roadPanel.className = 'road-search-panel';
const switchParcel = document.createElement('button'); switchParcel.type = 'button'; switchParcel.className = 'switch-parcel';
switchParcel.textContent = '도로명주소가 검색되지 않나요? 지번으로 검색';
searchFields.before(roadPanel, switchParcel);
function changeAddressMode(mode) {
  addressMode = mode; searchVersion++;
  roadTab.setAttribute('aria-pressed', String(mode === 'road'));
  parcelTab.setAttribute('aria-pressed', String(mode === 'parcel'));
  roadPanel.hidden = switchParcel.hidden = mode !== 'road';
  searchFields.hidden = mode !== 'parcel';
  document.getElementById('land-results').replaceChildren(); addressStatus.textContent = '';
  if (mode === 'parcel') { addressQuery.placeholder = '예: 완주군 이서면 용서리 571, 고산리 산335'; addressQuery.focus(); return; }
  const Postcode = window.daum?.Postcode || window.kakao?.Postcode;
  if (!Postcode) { addressStatus.textContent = '도로명 검색을 불러오지 못했습니다. 지번 검색을 이용하거나 새로고침해 주세요.'; return; }
  const version = searchVersion; roadPanel.replaceChildren();
  new Postcode({width:'100%',height:'100%',onsearch(data) {
    if (version !== searchVersion) return;
    if (!data.count) addressStatus.textContent = '도로명 검색 결과가 없습니다. 위 지번 검색으로 전환해 주세요.';
  },oncomplete(data) {
    if (version !== searchVersion) return;
    const code = String(data.bcode || '');
    if (!/^\d{10}$/.test(code)) { addressStatus.textContent = '지역코드를 확인하지 못했습니다. 지번 검색을 이용해 주세요.'; return; }
    const lot = (data.jibunAddress || '').match(/(?:^|\s)(산\s*)?(\d+(?:-\d+)?)\s*$/);
    const values = {metroCd:code.slice(0,2),cityCd:code.slice(2,5),addrLidong:data.bname1 || data.bname,addrLi:data.bname1 ? (data.bname2 || data.bname) : '',addrJibun:lot ? (lot[1]?'산':'')+lot[2] : '',substCd:''};
    for (const [name,value] of Object.entries(values)) form.elements.namedItem(name).value = value || '';
    document.getElementById('selected-address').value = (data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress) || data.address;
    document.getElementById('rows').replaceChildren(); document.getElementById('raw').textContent = '아직 조회하지 않았습니다.';
    document.getElementById('status').textContent = '주소가 선택됐습니다. 입력된 지번을 포함해 조회합니다.';
    selectedCoords = null;
    selectedCoordsPromise = geocodeAddress(data.roadAddress || data.jibunAddress || data.address).then(coords => { selectedCoords = coords; return coords; });
    searchDialog.close();
  }}).embed(roadPanel);
}
roadTab.addEventListener('click',()=>changeAddressMode('road'));
parcelTab.addEventListener('click',()=>changeAddressMode('parcel'));
switchParcel.addEventListener('click',()=>changeAddressMode('parcel'));
openSearch.addEventListener('click', () => { searchDialog.showModal(); changeAddressMode('road'); });
searchDialog.addEventListener('close',()=>{searchVersion++;});
document.getElementById('address-search').textContent = '검색';
addressQuery.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); document.getElementById('address-search').click(); }
});
document.getElementById('address-search').addEventListener('click', () => {
  const query = addressQuery.value.trim();
  if (!query) { addressStatus.textContent = '위 주소 검색어 칸에 도로명주소 또는 토지 지번을 입력해 주세요.'; addressQuery.focus(); return; }
  searchParcel(query);
});async function searchParcel(query) {
  const version = ++searchVersion;
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
    if (version !== searchVersion || addressMode !== 'parcel') return;
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
        selectedCoords = { lat: parseFloat(row.y), lng: parseFloat(row.x) };
        selectedCoordsPromise = null;
        addressStatus.textContent = '토지 지번과 법정동 코드를 입력했습니다. 한전 API 조회를 눌러 주세요.';
        results.replaceChildren();
        searchDialog.close();
      });
      results.appendChild(choose);
    }
  } catch {
    if (version !== searchVersion) return;
    addressStatus.textContent = '지도 주소 검색에 연결하지 못했습니다. 카카오 지도 API의 허용 도메인 및 연결 상태를 확인해 주세요.';
  } finally { button.disabled = false; }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(form));
  runKepcoCascade(input);
});

function extractAddressKeywords(input) {
  const selected = document.getElementById('selected-address').value || '';
  const known = [input.addrLidong, input.addrLi].filter(Boolean).join('|');
  const rest = known ? selected.split(new RegExp(known)).pop() : selected;
  return (rest.match(/[가-힣]{2,}/g) || [])
    .map(word => word.replace(/(로|길|대로|번길)$/, ''))
    .filter(word => word.length >= 2);
}

function isLikelyMatch(dlNm, keywords) {
  const name = String(dlNm || '').replace(/#.*$/, '').trim();
  if (!name || !keywords.length) return false;
  return keywords.some(k => k.startsWith(name.slice(0, 2)) || name.startsWith(k.slice(0, 2)));
}

function addTierBanner(text) {
  const tbody = document.getElementById('rows');
  const tr = document.createElement('tr'); tr.className = 'tier-banner';
  const td = document.createElement('td'); td.colSpan = 6; td.textContent = '▸ ' + text;
  tr.appendChild(td); tbody.appendChild(tr);
}

function fmtKw(v) {
  return v === null || v === undefined || v === '' ? '미제공' : `${v}kW`;
}

function appendTreeRow(tbody, label, pwr, jsPwr, vol, level, likely) {
  const tr = document.createElement('tr');
  tr.className = `tree-lvl${level}` + (likely ? ' likely-match' : '');
  for (const text of [label, fmtKw(pwr), fmtKw(jsPwr), fmtKw(vol)]) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
}

const NEARBY_RADIUS_KM = 15;
const NEARBY_MAX = 6;
let substationCoords = null;
async function loadSubstationCoords() {
  if (!substationCoords) {
    substationCoords = await fetch('/admin/kepco-test/substations.json').then(r => r.ok ? r.json() : []).catch(() => []);
  }
  return substationCoords;
}

function haversineKm(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

let substMap, substMarkers = [], substOverlays = [];
function ensureSubstMap() {
  if (substMap) return substMap;
  substMap = new kakao.maps.Map(document.getElementById('subst-map'), { center: new kakao.maps.LatLng(35.905, 127.10), level: 10 });
  return substMap;
}
function clearSubstMarkers() {
  substMarkers.forEach(m => m.setMap(null)); substMarkers = [];
  substOverlays.forEach(o => o.setMap(null)); substOverlays = [];
}
function addLabeledMarker(pos, labelHtml, estimated) {
  const marker = new kakao.maps.Marker({ position: pos, map: substMap, opacity: estimated ? 0.55 : 1 });
  const border = estimated ? '1px dashed #d88422' : '1px solid #cddbcf';
  const overlay = new kakao.maps.CustomOverlay({
    position: pos, yAnchor: 1.5, zIndex: 2,
    content: `<div style="padding:4px 8px;background:#fff;border:${border};border-radius:6px;font-size:12px;line-height:1.5;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.18)">${labelHtml}</div>`
  });
  overlay.setMap(substMap);
  substMarkers.push(marker); substOverlays.push(overlay);
}

function estimatedPosition(center, index, total) {
  const angle = (2 * Math.PI * index) / Math.max(total, 1);
  const radiusKm = 0.18;
  const dLat = (radiusKm / 111) * Math.cos(angle);
  const dLng = (radiusKm / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

function findCapacityMatch(name, resultSubstations) {
  if (!resultSubstations.has(name)) return null;
  return { entry: resultSubstations.get(name) };
}

function renderSubstBlock(name, distanceText, match, extraLine) {
  const lines = [`변전소: ${name}`];
  if (distanceText) lines.push(`거리: ${distanceText}`);
  if (extraLine) lines.push(extraLine);
  if (!match) { lines.push('여유용량: 이번 조회 결과에 없음'); return lines.join('<br>'); }
  const { entry } = match;
  const detail = entry.likelyLine || (entry.lines.length === 1 ? entry.lines[0] : null);
  if (detail) {
    lines.push(`변압기 번호: ${detail.mtrNo}`);
    lines.push(`배전선로: ${detail.dlNm}`);
    lines.push(`변압기 여유용량: ${detail.vol2}kW`);
    lines.push(`선로 여유용량: ${detail.vol3}kW`);
  } else {
    lines.push(`변전소 여유용량: ${entry.vol1}kW`);
    lines.push(`배전선로 ${entry.lines.length}개 — 표를 확인해 주세요`);
  }
  return lines.join('<br>');
}

async function updateSubstationMap(resultSubstations) {
  const section = document.getElementById('map-section');
  const list = document.getElementById('nearby-list');
  const coords = await loadSubstationCoords();

  let nearby = coords.map(s => ({ name: s.name, lat: s.lat, lng: s.lng, match: findCapacityMatch(s.name, resultSubstations), distanceKm: selectedCoords ? haversineKm(selectedCoords, s) : null }));
  nearby = selectedCoords
    ? nearby.filter(n => n.distanceKm <= NEARBY_RADIUS_KM).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, NEARBY_MAX)
    : nearby.filter(n => n.match);

  const matchedNames = new Set(nearby.filter(n => n.match).map(n => n.name));
  const missingNames = [...resultSubstations.keys()].filter(n => !matchedNames.has(n));
  const missing = selectedCoords ? missingNames.map((name, i) => {
    const pos = estimatedPosition(selectedCoords, i, missingNames.length);
    return { name, lat: pos.lat, lng: pos.lng, match: { entry: resultSubstations.get(name) }, distanceKm: null, estimated: true };
  }) : [];

  if (!nearby.length && !missing.length && !selectedCoords) { section.hidden = true; return; }
  if (!window.kakao?.maps?.load) { section.hidden = true; return; }
  section.hidden = false;

  list.replaceChildren();
  if (!nearby.length && !missing.length) {
    const li = document.createElement('li');
    li.textContent = `반경 ${NEARBY_RADIUS_KM}km 내에 좌표가 확보된 변전소가 없습니다.`;
    list.appendChild(li);
  } else if (missingNames.length && !selectedCoords) {
    const li = document.createElement('li');
    li.textContent = `이번 조회의 실제 변전소(${missingNames.join(', ')})는 좌표 데이터가 없어 지도에 표시할 수 없습니다. 아래는 참고용 인근 변전소 위치이며, 실제 연결 변전소가 아닙니다. 정확한 값은 표를 확인해 주세요.`;
    list.appendChild(li);
  }
  for (const n of missing) {
    const li = document.createElement('li');
    li.innerHTML = renderSubstBlock(n.name, null, n.match, '위치: 추정(정확한 좌표 없음, 조회 주소 인근에 표시)');
    list.appendChild(li);
  }
  for (const n of nearby) {
    const li = document.createElement('li');
    const distText = n.distanceKm !== null ? `${n.distanceKm.toFixed(1)}km` : null;
    li.innerHTML = renderSubstBlock(n.name, distText, n.match);
    list.appendChild(li);
  }

  window.kakao.maps.load(() => {
    ensureSubstMap(); clearSubstMarkers();
    const bounds = new kakao.maps.LatLngBounds();
    if (selectedCoords) {
      const pos = new kakao.maps.LatLng(selectedCoords.lat, selectedCoords.lng);
      addLabeledMarker(pos, '검색한 주소');
      bounds.extend(pos);
    }
    for (const n of missing) {
      const pos = new kakao.maps.LatLng(n.lat, n.lng);
      addLabeledMarker(pos, renderSubstBlock(n.name, null, n.match, '위치: 추정'), true);
      bounds.extend(pos);
    }
    for (const n of nearby) {
      const pos = new kakao.maps.LatLng(n.lat, n.lng);
      const distText = n.distanceKm !== null ? `${n.distanceKm.toFixed(1)}km` : null;
      addLabeledMarker(pos, renderSubstBlock(n.name, distText, n.match), false);
      bounds.extend(pos);
    }
    if (substMarkers.length) {
      substMap.setBounds(bounds, 80, 80, 80, 80);
      substMap.setLevel(substMap.getLevel() + 1);
    }
  });
}

let resultSubstations = new Map();

async function runKepcoCascade(input) {
  document.getElementById('rows').replaceChildren();
  document.getElementById('raw').textContent = '';
  resultSubstations = new Map();
  const hasJibun = !!String(input.addrJibun || '').trim();
  const hasSubst = !!String(input.substCd || '').trim();
  const hasLi = !!String(input.addrLi || '').trim();

  let result = await runKepco(input, !hasJibun && !hasSubst);
  if (hasJibun && !hasSubst && !(result && result.rows && result.rows.length)) {
    const keywords = extractAddressKeywords(input);
    addTierBanner(`지번(${input.addrJibun}) 완전일치 결과 없음 → 리 단위로 자동 재조회 결과값입니다.`);
    const liInput = { ...input, addrJibun: '' };
    result = await runKepco(liInput, true, { keywords });
    if (hasLi && !(result && result.rows && result.rows.length)) {
      addTierBanner(`${input.addrLi} 범위에도 결과 없음 → 읍·면·동 전체로 자동 재조회 결과값입니다.`);
      const dongInput = { ...liInput, addrLi: '' };
      await runKepco(dongInput, true, { keywords });
    }
  }
  if (selectedCoordsPromise) await selectedCoordsPromise;
  updateSubstationMap(resultSubstations);
}

async function runKepco(input, regional, opts = {}) {
  const button = document.getElementById('query-button');
  const status = document.getElementById('status');
  const tbody = document.getElementById('rows');
  const raw = document.getElementById('raw');
  if (button.disabled) return null;
  const keywords = opts.keywords || [];

  button.disabled = true; status.textContent = '한전 API 조회 중…';
  try {
    const response = await fetch('/api/admin/kepco-test', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input) });
    const result = await response.json();
    let message = result.message || '응답을 확인해 주세요.';
    if (result.elapsedMs !== undefined) message += ` (${result.elapsedMs}ms)`;
    status.textContent = message;
    const rawEntry = JSON.stringify({...result,queryScope:regional?'지역 범위 (지번 제외)':'입력 조건',requestConditions:input}, null, 2);
    raw.textContent = raw.textContent ? raw.textContent + '\n\n' + rawEntry : rawEntry;
    for (const row of result.rows || []) {
      const likely = isLikelyMatch(row.dlNm, keywords);
      if (row.substNm) {
        const entry = resultSubstations.get(row.substNm) || { vol1: row.vol1, lines: [], likelyLine: null };
        entry.vol1 = row.vol1;
        const line = { mtrNo: row.mtrNo, dlNm: row.dlNm, vol2: row.vol2, vol3: row.vol3 };
        entry.lines.push(line);
        if (likely) entry.likelyLine = line;
        resultSubstations.set(row.substNm, entry);
      }
      const tr = document.createElement('tr');
      if (likely) tr.className = 'likely-match';
      for (const field of ['substNm','mtrNo','dlNm','vol1','vol2','vol3']) {
        const td = document.createElement('td');
        let text = row[field] === null || row[field] === undefined || row[field] === '' ? '미제공' : String(row[field]);
        if (field === 'dlNm' && likely) text += ' ★ 주소 키워드 일치 추정';
        td.textContent = text; tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    return result;
  } catch { status.textContent = '조회 서버에 연결할 수 없습니다. 정적 미리보기에서는 API가 작동하지 않습니다.'; return null; }
  finally { button.disabled = false; }
}

const capacityForm = document.getElementById('capacity-form');
capacityForm.addEventListener('submit', event => {
  event.preventDefault();
  runCapacitySearch(Object.fromEntries(new FormData(capacityForm)));
});

async function runCapacitySearch(input) {
  const button = document.getElementById('capacity-search-button');
  const status = document.getElementById('capacity-status');
  const tbody = document.getElementById('capacity-rows');
  if (button.disabled) return;
  const threshold = Number(input.csThreshold) || 0;
  if (!input.csMetroCd || !input.csCityCd || !input.csAddrLidong) {
    status.textContent = '시도코드·시군구코드·읍면동을 모두 입력해 주세요.';
    return;
  }

  button.disabled = true; tbody.replaceChildren(); status.textContent = '조회 중…';
  try {
    const response = await fetch('/api/admin/kepco-test', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ metroCd: input.csMetroCd, cityCd: input.csCityCd, addrLidong: input.csAddrLidong, addrLi: '', addrJibun: '', substCd: '' }) });
    const result = await response.json();
    if (!(result.rows || []).length) {
      status.textContent = result.message || '조회된 데이터가 없습니다.';
      return;
    }
    const rows = result.rows.filter(row => (row.vol1 || 0) >= threshold);
    const substNames = new Set(rows.map(row => row.substNm));
    status.textContent = rows.length
      ? `변전소 ${substNames.size}개 · 기준: 여유용량 ${threshold}kW 이상`
      : `기준(여유용량 ${threshold}kW 이상)을 만족하는 변전소가 없습니다.`;

    const substations = new Map();
    for (const row of rows) {
      const substKey = row.substNm ?? '미제공';
      let subst = substations.get(substKey);
      if (!subst) { subst = { substPwr: row.substPwr, jsSubstPwr: row.jsSubstPwr, vol1: row.vol1, transformers: new Map() }; substations.set(substKey, subst); }
      const mtrKey = row.mtrNo ?? '미제공';
      let mtr = subst.transformers.get(mtrKey);
      if (!mtr) { mtr = { mtrPwr: row.mtrPwr, jsMtrPwr: row.jsMtrPwr, vol2: row.vol2, lines: [] }; subst.transformers.set(mtrKey, mtr); }
      mtr.lines.push({ dlNm: row.dlNm, dlPwr: row.dlPwr, jsDlPwr: row.jsDlPwr, vol3: row.vol3 });
    }
    for (const [substNm, subst] of substations) {
      appendTreeRow(tbody, substNm, subst.substPwr, subst.jsSubstPwr, subst.vol1, 0);
      for (const [mtrNo, mtr] of subst.transformers) {
        appendTreeRow(tbody, `주변압기 #${mtrNo}`, mtr.mtrPwr, mtr.jsMtrPwr, mtr.vol2, 1);
        for (const line of mtr.lines) appendTreeRow(tbody, line.dlNm ?? '미제공', line.dlPwr, line.jsDlPwr, line.vol3, 2);
      }
    }
  } catch { status.textContent = '조회 서버에 연결할 수 없습니다. 정적 미리보기에서는 API가 작동하지 않습니다.'; }
  finally { button.disabled = false; }
}
