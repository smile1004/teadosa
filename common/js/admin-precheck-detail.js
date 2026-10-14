(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const state = { requestId: null, request: null, review: null, capacityImageDataUrl: '', capacityImageName: '' };
  const el = {};
  let calculateCapacity;
  let capacityFormulaText;
  let applicationArea;
  let services;
  let initializationStarted = false;

  window.addEventListener('teadosa:adminready', init, { once: true });
  // Authentication may finish while this script is still downloading.
  if (document.getElementById('admin-protected-content')?.hidden === false) init();

  async function init() {
    if (initializationStarted) return;
    initializationStarted = true;
    mapElements();
    try {
      ({ calculateCapacity, capacityFormulaText, applicationArea } = await import('/common/js/precheck-capacity.mjs?v=3'));
      services = await import('/common/js/precheck-services.mjs?v=4');
    } catch (error) {
      initializationStarted = false;
      showMessage('자동 계산 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.', true);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    state.requestId = Number.parseInt(params.get('id'), 10);

    if (!Number.isInteger(state.requestId) || state.requestId < 1) {
      showMessage('올바른 사전검토 신청번호가 아닙니다.', true);
      return;
    }

    bindEvents();
    await Promise.all([loadDetail(), loadPhrases()]);
    refreshV4();
  }

  function mapElements() {
    el.message = document.getElementById('detail-message');
    el.actionMessage = document.getElementById('review-action-message');
    el.basic = document.getElementById('request-basic-info');
    el.formData = document.getElementById('request-form-data');
    el.requestStatus = document.getElementById('request-status-badge');
    el.formVersion = document.getElementById('form-version-badge');
    el.supplementPanel = document.getElementById('admin-supplement-panel');
    el.supplementDate = document.getElementById('admin-supplement-date');
    el.supplementNote = document.getElementById('admin-supplement-note');
    el.publishStatus = document.getElementById('publish-status-badge');
    el.verdictInputs = document.querySelectorAll('input[name="installation-possible"]');
    el.expectedCapacity = document.getElementById('expected-capacity');
    el.capacityArea = document.getElementById('capacity-area');
    el.capacityCalculation = document.getElementById('capacity-calculation');
    el.moduleCount = document.getElementById('capacity-module-count');
    el.installedKw = document.getElementById('capacity-installed-kw');
    el.capacityBasis = document.getElementById('capacity-basis');
    el.capacityLayoutFile = document.getElementById('capacity-layout-file');
    el.capacityLayoutPreviewWrap = document.getElementById('capacity-layout-preview-wrap');
    el.capacityLayoutPreview = document.getElementById('capacity-layout-preview');
    el.removeCapacityLayout = document.getElementById('remove-capacity-layout');
    el.items = document.getElementById('review-items');
    el.overallOpinion = document.getElementById('overall-opinion');
    el.customerNotice = document.getElementById('customer-notice');
    el.internalMemo = document.getElementById('internal-memo');
    el.save = document.getElementById('save-review');
    el.publish = document.getElementById('publish-review');
    el.serviceList = document.getElementById('service-selection-list');
    el.packageList = document.getElementById('package-selection-list');
    el.serviceSummary = document.getElementById('service-selection-summary');
    el.serviceTypeInputs = document.querySelectorAll('input[name="service-type"]');
    el.serviceCheckAll = document.getElementById('service-check-all');
    el.serviceUncheckAll = document.getElementById('service-uncheck-all');
    el.packageSummary = document.getElementById('package-selection-summary');
    el.packageCheckAll = document.getElementById('package-check-all');
    el.packageUncheckAll = document.getElementById('package-uncheck-all');
  }

  function bindEvents() {
    el.capacityArea.addEventListener('input', updateCapacity);
    el.capacityArea.addEventListener('change', updateCapacity);
    el.save.addEventListener('click', function () { saveReview(false); });
    el.publish.addEventListener('click', function () {
      if (!window.confirm('검토결과를 저장하고 회원에게 공개하시겠습니까?')) return;
      saveReview(true);
    });
    if (el.capacityLayoutFile) el.capacityLayoutFile.addEventListener('change', handleCapacityImage);
    if (el.removeCapacityLayout) el.removeCapacityLayout.addEventListener('click', clearCapacityImage);
    el.serviceTypeInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state.serviceType = input.value;
        renderServiceSelection();
      });
    });
    el.serviceList.addEventListener('change', function (event) {
      const input = event.target.closest('input[type="checkbox"]');
      if (!input) return;
      const checked = state.serviceChecks[state.serviceType];
      if (input.checked) checked.add(input.value); else checked.delete(input.value);
      updateServiceSummary();
    });
    el.packageList.addEventListener('change', function (event) {
      const input = event.target.closest('input[type="checkbox"]');
      if (!input) return;
      const checked = state.packageChecks[state.serviceType];
      if (input.checked) checked.add(input.value); else checked.delete(input.value);
      updateServiceSummary();
    });
    el.serviceCheckAll.addEventListener('click', function () { setAllServices(true); });
    el.serviceUncheckAll.addEventListener('click', function () { setAllServices(false); });
    el.packageCheckAll.addEventListener('click', function () { setAllPackages(true); });
    el.packageUncheckAll.addEventListener('click', function () { setAllPackages(false); });
    bindV4Events();
  }

  async function loadDetail() {
    setBusy(true);
    showMessage('신청내역을 불러오고 있습니다.');

    try {
      const outcome = await auth.getAdminPrecheckDetail(state.requestId);
      const result = outcome.result || {};

      if (!outcome.response.ok || !result.success) {
        throw new Error(result.message || '신청내역을 불러오지 못했습니다.');
      }

      state.request = result.request;
      state.review = result.review;
      renderRequest();
      renderReview();
      showMessage('');
    } catch (error) {
      showMessage(error.message || '신청내역을 불러오지 못했습니다.', true);
    } finally {
      setBusy(false);
    }
  }

  function renderRequest() {
    const r = state.request || {};
    const formData = r.formData || {};
    const data = { ...formData, ...formData.site, memo: formData.request?.memo ?? formData.memo };

    el.requestStatus.textContent = statusLabel(r.status);
    el.requestStatus.className = 'precheck-detail-status status-' + (r.status || 'received');
    el.formVersion.textContent = r.formVersion || '기존 양식';

    const basicRows = [
      ['신청번호', r.requestNo || '-'],
      ['신청자', r.applicantName || '-'],
      ['연락처', formatPhone(r.phone)],
      ['이메일', r.email || '-'],
      ['회사명', r.companyName || '-'],
      ['설치주소', r.siteAddress || '-'],
      ['접수일', formatDateTime(r.submittedAt)]
    ];

    el.basic.innerHTML = basicRows.map(function (row) {
      return '<div><dt>' + escapeHtml(row[0]) + '</dt><dd>' + escapeHtml(row[1]) + '</dd></div>';
    }).join('');

    const rows = [
      ['사업지 유형', siteTypeLabel(data.siteType || r.siteType)],
      ['용도', purposeLabel(data.purpose || r.purpose)],
      ['설치 예정 용량', numberUnit(data.plannedCapacity, ' kW')],
      ['부지면적', numberUnit(data.siteArea, ' ㎡')],
      ['지목', data.landCategory || '-'],
      ['용도지역', data.zoningArea || '-'],
      ['소유관계', ownershipLabel(data.ownership)],
      ['추가 요청사항', data.memo || r.requestNote || '-']
    ];

    el.formData.innerHTML = rows.map(function (row) {
      return '<div class="precheck-form-row"><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>';
    }).join('');

    if (el.supplementPanel) {
      const hasSupplement = Boolean(r.supplementNote);
      el.supplementPanel.hidden = !hasSupplement;
      if (hasSupplement) {
        el.supplementDate.textContent = r.supplementRequestedAt
          ? '요청일 ' + formatDateTime(r.supplementRequestedAt)
          : '';
        el.supplementNote.textContent = r.supplementNote;
      }
    }
  }

  const DEFAULT_CUSTOMER_NOTICE = "1. 인허가 및 지자체 조례 검토\n• 본 검토는 검토 시점에 확인 가능한 지자체 도시계획 조례 및 관련 법령을 기준으로 작성되었습니다.\n• 실제 사업 진행 시 관계기관 협의, 개발행위 심의, 민원 발생 등에 따라 검토 결과가 변경될 수 있습니다.\n• 최종 허가 여부는 해당 행정기관의 심사 결과를 기준으로 결정됩니다.\n\n2. 한국전력 계통연계 검토\n• 본 검토는 한국전력에서 제공하는 계통정보와 검토 시점에 확인 가능한 자료를 기준으로 작성되었습니다.\n• 계통연계 가능 여부와 여유 용량은 다른 접수 건, 전력계통 운영 상황 및 설비계획 변경 등에 따라 실제 접수 시 변경될 수 있습니다.\n• 최종 계통연계 가능 여부 및 연계 조건은 한국전력의 계통연계 검토 결과를 기준으로 결정됩니다.";

  function renderReview() {
    const review = state.review || {};

    setVerdict(review.installationPossible || 'undetermined');
    el.expectedCapacity.value = review.expectedCapacity ?? '';
    const capacity = review.resultData?.capacityAssessment || {};
    el.capacityArea.value = capacity.areaM2 !== null && capacity.areaM2 !== undefined && capacity.areaM2 !== ''
      ? capacity.areaM2 : (applicationArea(state.request?.formData) ?? '');
    el.capacityBasis.value = capacity.basis || '';
    state.autoBasis = capacity.formulaText || '';
    updateCapacity();
    state.capacityImageDataUrl = validImageDataUrl(capacity.layoutImageDataUrl) ? capacity.layoutImageDataUrl : '';
    state.capacityImageName = capacity.layoutImageName || '';
    if (el.capacityLayoutFile) el.capacityLayoutFile.value = '';
    renderCapacityImagePreview();
    el.overallOpinion.value = review.overallOpinion || '';
    el.customerNotice.value = review.customerNotice || DEFAULT_CUSTOMER_NOTICE;
    el.internalMemo.value = review.internalMemo || '';

    el.publishStatus.textContent = review.publishedAt ? '회원 공개됨' : '미공개';
    el.publishStatus.className = 'admin-inline-badge' + (review.publishedAt ? ' published' : '');

    const savedItems = review.resultData?.items || [];
    const byId = {};
    savedItems.forEach(function (item) {
      byId[item.id] = item;
    });

    const detail = review.resultData?.detail || null;
    setFixedItem('ordinance', byId.ordinance || findByTitle(savedItems, '조례'), !detail);
    setFixedItem('grid', byId.grid || findByTitle(savedItems, '한전'), !detail);
    setFixedItem('site', byId.site || findByTitle(savedItems, '현장'), !detail);
    fillDetail(detail);

    // Unsaved types start fully checked so the admin only unchecks what is not possible.
    const saved = services.normalizeServiceSelection(review.resultData?.serviceSelection);
    const formData = state.request?.formData || {};
    state.serviceChecks = {};
    state.packageChecks = {};
    Object.keys(services.SERVICE_TYPES).forEach(function (type) {
      const own = saved && saved.type === type;
      state.serviceChecks[type] = new Set(own ? saved.services : services.SERVICE_TYPES[type].services);
      state.packageChecks[type] = new Set(own ? saved.packages : services.PACKAGE_KEYS);
    });
    state.serviceType = saved ? saved.type : services.defaultServiceType(formData.site?.siteType || formData.siteType || state.request?.siteType);
    renderServiceSelection();
  }

  function renderServiceSelection() {
    el.serviceTypeInputs.forEach(function (input) { input.checked = input.value === state.serviceType; });
    const checked = state.serviceChecks[state.serviceType];
    el.serviceList.innerHTML = services.servicesForType(state.serviceType).map(function (service) {
      return '<label class="service-selection-item">' +
        '<input type="checkbox" value="' + escapeAttr(service.key) + '"' + (checked.has(service.key) ? ' checked' : '') + '>' +
        '<span class="code">' + escapeHtml(service.code) + '</span>' +
        '<span><strong>' + escapeHtml(service.name) + '</strong>' + (service.note ? '<small>' + escapeHtml(service.note) + '</small>' : '') + '</span>' +
        '<span class="price">' + services.priceText(service) + '</span>' +
      '</label>';
    }).join('');
    const checkedPackages = state.packageChecks[state.serviceType];
    el.packageList.innerHTML = services.packagesForType(state.serviceType).map(function (pkg) {
      return '<label class="service-selection-item package">' +
        '<input type="checkbox" value="' + escapeAttr(pkg.key) + '"' + (checkedPackages.has(pkg.key) ? ' checked' : '') + '>' +
        '<span><strong class="package-name">' + escapeHtml(pkg.name) + '</strong><small>' + escapeHtml(pkg.codes.join(', ')) + '</small></span>' +
        '<span class="price">' + services.formatWon(pkg.min) + ' ~ ' + services.formatWon(pkg.max) + '원' +
          (pkg.unpriced.length ? '<small>' + escapeHtml(pkg.unpriced.map(function (x) { return x.name; }).join(', ')) + ' 별도 견적</small>' : '') + '</span>' +
      '</label>';
    }).join('');
    updateServiceSummary();
  }

  function setAllServices(checked) {
    state.serviceChecks[state.serviceType] = new Set(checked ? services.SERVICE_TYPES[state.serviceType].services : []);
    renderServiceSelection();
  }

  function setAllPackages(checked) {
    state.packageChecks[state.serviceType] = new Set(checked ? services.PACKAGE_KEYS : []);
    renderServiceSelection();
  }

  function updateServiceSummary() {
    const spec = services.SERVICE_TYPES[state.serviceType];
    el.serviceSummary.textContent = spec.label + ' · 신청 가능 ' + state.serviceChecks[state.serviceType].size + '개 / 전체 ' + spec.services.length + '개';
    el.packageSummary.textContent = spec.label + ' · 추천 패키지 ' + state.packageChecks[state.serviceType].size + '개 / 전체 ' + services.PACKAGE_KEYS.length + '개';
  }

  function collectServiceSelection() {
    return { type: state.serviceType, services: Array.from(state.serviceChecks[state.serviceType]), packages: Array.from(state.packageChecks[state.serviceType]) };
  }

  function findByTitle(items, keyword) {
    return items.find(function (item) {
      return String(item.title || '').includes(keyword);
    }) || null;
  }

  function setFixedItem(key, item, legacy) {
    const section = el.items.querySelector('[data-review-key="' + key + '"]');
    if (!section) return;
    section.querySelector('.review-item-status').value = item?.status || 'info';
    section.dataset.statusTouched = item?.status && item.status !== 'info' ? '1' : '';
    // Reviews saved before V4 only have free text; keep it visible and keep it when nothing new is entered.
    v4.legacy[key] = legacy ? (item?.content || '') : '';
    const note = section.querySelector('[data-legacy]');
    if (note) {
      note.hidden = !v4.legacy[key];
      note.textContent = v4.legacy[key] ? '이전 방식으로 입력된 내용 (새 항목을 입력하지 않으면 그대로 유지됩니다)\n' + v4.legacy[key] : '';
    }
  }

  function collectItems() {
    const specs = [
      ['ordinance', '조례 검토'],
      ['grid', '한전 계통연계 검토'],
      ['site', '현장조건 검토']
    ];

    const detail = collectDetail();
    const texts = { ordinance: ordinanceText(detail.ordinance), grid: gridText(detail.grid), site: siteText(detail.site) };
    return specs.map(function (spec) {
      const section = el.items.querySelector('[data-review-key="' + spec[0] + '"]');
      return {
        id: spec[0],
        title: spec[1],
        status: section.querySelector('.review-item-status').value,
        content: texts[spec[0]] || v4.legacy[spec[0]] || ''
      };
    });
  }

  function updateCapacity() {
    try {
      const calculation = calculateCapacity(el.capacityArea.value);
      el.capacityArea.setCustomValidity('');
      el.expectedCapacity.value = calculation ? calculation.finalKw.toFixed(2) : '';
      el.moduleCount.value = calculation ? calculation.moduleCount : '';
      el.installedKw.value = calculation ? calculation.installedKw.toFixed(3) : '';
      const formula = calculation ? capacityFormulaText(calculation) : '';
      let notes = el.capacityBasis.value.trim();
      if (state.autoBasis && notes.startsWith(state.autoBasis)) notes = notes.slice(state.autoBasis.length).trim();
      el.capacityBasis.value = [formula, notes].filter(Boolean).join('\n\n');
      state.autoBasis = formula;
      return true;
    } catch (error) {
      el.capacityArea.setCustomValidity(error.message);
      el.expectedCapacity.value = '';
      el.moduleCount.value = '';
      el.installedKw.value = '';
      if (el.capacityCalculation) el.capacityCalculation.textContent = error.message;
      return false;
    }
  }

  async function saveReview(publish) {
    if (!updateCapacity()) { el.capacityArea.reportValidity(); return; }
    const payload = {
      installationPossible: getVerdict(),
      expectedCapacity: el.expectedCapacity.value === '' ? null : Number(el.expectedCapacity.value),
      capacityAssessment: {
        areaM2: el.capacityArea.value === '' ? null : Number(el.capacityArea.value),
        basis: el.capacityBasis.value.trim(),
        layoutImageDataUrl: state.capacityImageDataUrl,
        layoutImageName: state.capacityImageName
      },
      items: collectItems(),
      detail: collectDetail(),
      serviceSelection: collectServiceSelection(),
      overallOpinion: el.overallOpinion.value.trim(),
      customerNotice: el.customerNotice.value.trim(),
      internalMemo: el.internalMemo.value.trim(),
      publish: publish
    };

    if (publish && payload.installationPossible === 'undetermined') {
      showActionMessage('회원 공개 전 종합 판정을 선택해 주세요.', true);
      return;
    }
    if (publish && !payload.overallOpinion) {
      showActionMessage('회원 공개 전 종합 의견을 입력해 주세요.', true);
      return;
    }

    setBusy(true);
    showActionMessage(publish ? '검토결과를 저장하고 회원에게 공개하고 있습니다.' : '검토결과를 임시 저장하고 있습니다.');

    try {
      const outcome = await auth.saveAdminPrecheckReview(state.requestId, payload);
      const result = outcome.result || {};

      if (!outcome.response.ok || !result.success) {
        throw new Error(result.message || '검토결과를 저장하지 못했습니다.');
      }

      state.review = result.review;
      if (state.request && result.request) state.request.status = result.request.status;
      renderRequest();
      renderReview();

      if (publish) {
        showActionMessage(result.message || '검토결과가 회원에게 공개되었습니다.');
        window.setTimeout(function () {
          window.location.href = '/admin/precheck/';
        }, 900);
      } else {
        showActionMessage(result.message || '검토결과가 임시 저장되었습니다.');
      }
    } catch (error) {
      showActionMessage(error.message || '검토결과를 저장하지 못했습니다.', true);
    } finally {
      setBusy(false);
    }
  }

  function setBusy(active) {
    [el.save, el.publish].forEach(function (node) {
      if (node) node.disabled = active;
    });
  }

  async function handleCapacityImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      showActionMessage('배치도는 JPG, PNG 또는 WEBP 이미지만 등록할 수 있습니다.', true);
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showActionMessage('배치도 이미지 크기는 8MB 이하여야 합니다.', true);
      event.target.value = '';
      return;
    }
    try {
      const optimizedImage = await optimizeImage(file, 1600, 0.82);
      if (optimizedImage.length > 2500000) throw new Error('IMAGE_TOO_LARGE');
      state.capacityImageDataUrl = optimizedImage;
      state.capacityImageName = file.name.slice(0, 120);
      renderCapacityImagePreview();
      showActionMessage('배치도 이미지가 준비되었습니다. 임시저장 또는 공개 버튼을 눌러 저장해 주세요.');
    } catch {
      showActionMessage('배치도 이미지를 처리하지 못했습니다.', true);
    }
  }

  function optimizeImage(file, maxWidth, quality) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        const image = new Image();
        image.onerror = reject;
        image.onload = function () {
          const scale = Math.min(1, maxWidth / image.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function clearCapacityImage() {
    state.capacityImageDataUrl = '';
    state.capacityImageName = '';
    if (el.capacityLayoutFile) el.capacityLayoutFile.value = '';
    renderCapacityImagePreview();
  }

  function renderCapacityImagePreview() {
    const visible = validImageDataUrl(state.capacityImageDataUrl);
    const savedImage = state.review?.resultData?.capacityAssessment?.layoutImageDataUrl || '';
    const status = document.getElementById('capacity-layout-status');
    if (status) {
      status.textContent = '';
      const badge = document.createElement('span');
      badge.className = 'capacity-layout-state';
      badge.textContent = visible
        ? (state.capacityImageDataUrl === savedImage ? '등록 완료' : '저장 대기')
        : (validImageDataUrl(savedImage) ? '삭제 대기' : '미등록');
      status.appendChild(badge);
      const filename = document.createElement('span');
      filename.className = 'capacity-layout-filename';
      filename.textContent = visible ? state.capacityImageName : (validImageDataUrl(savedImage) ? '저장하면 삭제됩니다.' : '등록된 배치도가 없습니다.');
      status.appendChild(filename);
    }
    el.capacityLayoutPreviewWrap.hidden = !visible;
    if (visible) el.capacityLayoutPreview.src = state.capacityImageDataUrl;
    else el.capacityLayoutPreview.removeAttribute('src');
  }

  function validImageDataUrl(value) {
    return /^data:image\/(jpeg|png|webp);base64,/i.test(String(value || ''));
  }

  function showActionMessage(message, error) {
    if (!el.actionMessage) return;
    el.actionMessage.textContent = message || '';
    el.actionMessage.hidden = !message;
    el.actionMessage.classList.toggle('error', Boolean(error));
    if (message) {
      el.actionMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function showMessage(message, error) {
    if (!el.message) return;
    el.message.textContent = message || '';
    el.message.hidden = !message;
    el.message.classList.toggle('error', Boolean(error));
  }


  /* ---------- V4: 선택형 표준화 입력 ---------- */
  const v4 = { legacy: {}, phrases: {}, siteActive: null, sitePrev: [], siteKeep: {} };
  const ORD_RESULT = { ok: '적합', conflict: '저촉', na: '미해당' };
  const GRID_STATE = { possible: '가능', impossible: '불가 (용량 초과)', waiting: '계획대기' };
  const SITE = { shade: '음영발생', slope: '경사도 과다', road: '진입로·배수로', struct: '건물 구조강화' };
  const SITE_KEYS = ['shade', 'slope', 'road', 'struct'];
  const STEP = { shade: [['siteType', '현장 유형', ['토지형', '건물형']], ['cause', '음영 원인', ['수목', '인접 건축물', '전신주·송전탑', '산·지형']], ['time', '음영 시간대', ['오전', '오후', '종일']]] };
  const OPINION_GROUP = { possible: '진행 가능', conditional: '조건부 진행 가능', not_possible: '진행 불가능' };
  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  const api = window.TaeDoSAApi;

  function getVerdict() { return ($('input[name="installation-possible"]:checked') || {}).value || 'undetermined'; }
  function setVerdict(value) { el.verdictInputs.forEach(function (input) { input.checked = input.value === value; }); refreshOpinion(); }

  async function loadPhrases() {
    try {
      const outcome = await api.request('/api/admin/precheck/phrases', { method: 'GET' });
      if (!outcome.response.ok || !outcome.result.success) throw new Error(outcome.result.message);
      v4.phrases = outcome.result.groups || {};
    } catch (error) {
      v4.phrases = {};
      showActionMessage('표준 문장 목록을 불러오지 못했습니다. 문장은 직접 입력할 수 있습니다.', true);
    }
  }
  function phraseList(category, group) { return v4.phrases[category + '.' + group] || []; }

  function bindV4Events() {
    const section = el.items;
    section.addEventListener('change', function (event) {
      const t = event.target;
      if (t.matches('#site-checks input')) {
        if (t.value === 'none' && t.checked) $$('#site-checks input').forEach(function (i) { if (i.value !== 'none') i.checked = false; });
        else if (t.checked) $('#site-checks input[value="none"]').checked = false;
      }
      if (t.matches('.review-item-status')) t.closest('section').dataset.statusTouched = '1';
      if (t.name === 'installation-possible') refreshOpinion();
      refreshV4();
    });
    section.addEventListener('input', function (event) {
      if (event.target.matches('.pr4-detail textarea')) { renderSitePreview(event.target.closest('.pr4-detail')); renderSiteTabs(); }
      if (event.target.matches('.pr4-new')) { const m = event.target.closest('.pr4-reg').querySelector('.pr4-msg'); m.textContent = ''; }
      if (event.target.closest('[data-review-key="ordinance"],[data-review-key="grid"]')) suggestStatus();
    });
    section.addEventListener('click', function (event) {
      const t = event.target;
      const tab = t.closest('.pr4-tab');
      if (tab) { v4.siteActive = tab.dataset.tab; renderSiteTabs(); return; }
      if (t.matches('.pr4-add')) { insertLine(t.closest('.pr4-detail')); return; }
      if (t.id === 'op-add') { insertOpinion(); return; }
      const reg = t.closest('.pr4-reg');
      if (reg) handleRegister(event, reg);
    });
  }

  function refreshV4() { renderOrdinance(); renderSite(); suggestStatus(); refreshOpinion(); }

  /* 01 조례 */
  function renderOrdinance() {
    $$('#ord-items .pr4-row').forEach(function (row) {
      const value = (row.querySelector('input:checked') || {}).value;
      let box = row.querySelector('.pr4-conflict');
      if (value === 'conflict' && !box) {
        box = document.createElement('div');
        box.className = 'pr4-conflict';
        box.innerHTML = '<small>' + escapeHtml(row.dataset.label) + ' 저촉 · 기준과 현재 거리를 입력합니다</small>' +
          '<label class="pr4-f">기준 거리 (m)<input type="number" class="ord-std" min="0" step="any" inputmode="decimal" placeholder="예: 200"></label>' +
          '<label class="pr4-f">현재 거리 (m)<input type="number" class="ord-cur" min="0" step="any" inputmode="decimal" placeholder="예: 100"></label>';
        row.appendChild(box);
      }
      if (value !== 'conflict' && box) box.remove();
    });
  }
  function collectOrdinance() {
    return {
      name: $('#ord-name').value.trim(),
      revisedAt: $('#ord-revised').value,
      reviewedAt: $('#ord-reviewed').value,
      etc: $('#ord-etc').value.trim(),
      items: $$('#ord-items .pr4-row').map(function (row) {
        const result = (row.querySelector('input:checked') || {}).value || '';
        const item = { key: row.dataset.ord, label: row.dataset.label, result: result };
        if (result === 'conflict') {
          item.standardM = numberOrNull(($('.ord-std', row) || {}).value);
          item.actualM = numberOrNull(($('.ord-cur', row) || {}).value);
        }
        return item;
      })
    };
  }

  /* 02 계통 */
  function collectGrid() {
    return {
      state: ($('input[name="grid-state"]:checked') || {}).value || '',
      substation: $('#grid-substation').value.trim(),
      mtr: $('#grid-mtr').value.trim(),
      line: $('#grid-line').value.trim(),
      spareMw: numberOrNull($('#grid-spare').value),
      conditions: $$('#grid-conditions input:checked').map(function (i) { return i.value; }),
      kepco: { branch: $('#kepco-branch').value.trim(), phone: $('#kepco-phone').value.trim(), checkedAt: $('#kepco-date').value, method: $('#kepco-method').value }
    };
  }

  /* 03 현장조건 */
  function siteDetailHTML(k) {
    const steps = (STEP[k] || []).map(function (step) {
      return '<div class="pr4-srow"><span>' + step[1] + '</span><div class="pr4-seg">' + step[2].map(function (o) {
        return '<label><input type="radio" name="' + k + '-' + step[0] + '" value="' + o + '"><span>' + o + '</span></label>';
      }).join('') + '</div></div>';
    }).join('');
    return '<b>' + SITE[k] + ' · 세부내용</b>' + steps + (STEP[k] ? '<p class="pr4-sum"></p>' : '') +
      '<div class="pr4-pick"><select class="pr4-std" aria-label="' + SITE[k] + ' 표준 문장"></select><button type="button" class="admin-button secondary pr4-add">문장 넣기</button></div>' +
      '<textarea rows="3" maxlength="2000" placeholder="표준 문장을 넣거나 직접 입력합니다"></textarea>' +
      '<div class="pr4-prev"><p>고객 마이페이지 표시 미리보기</p><dl></dl></div>' +
      '<details class="pr4-reg" data-cat="site" data-group="' + k + '"><summary>+ 표준 문장 등록 · 관리</summary>' +
      '<div class="pr4-pick"><input type="text" class="pr4-new" maxlength="300" placeholder="자주 쓰는 문장을 등록하면 표준 문장 선택 드롭다운에 등록됩니다"><button type="button" class="admin-button primary pr4-reg-btn">목록에 등록</button></div>' +
      '<small class="pr4-msg" aria-live="polite"></small><div class="pr4-lib"></div></details>';
  }
  function stepValues(d) {
    return (STEP[d.dataset.k] || []).map(function (step) {
      return [step[0], step[1], ($('input[name="' + d.dataset.k + '-' + step[0] + '"]:checked', d) || {}).value || ''];
    });
  }
  function composeShade(d) {
    const v = stepValues(d).map(function (x) { return x[2]; });
    if (v.some(function (x) { return !x; })) return '';
    const cause = { '수목': '수목으로', '인접 건축물': '인접 건축물로', '전신주·송전탑': '전신주·송전탑으로', '산·지형': '산·지형으로' }[v[1]];
    return '(' + v[0] + ') ' + cause + ' 인해 ' + (v[0] === '건물형' ? '지붕' : '부지') + ' 일부에 ' + (v[2] === '종일' ? '종일' : v[2] + ' 시간대') + ' 음영이 발생합니다.';
  }
  function linesOf(d) { return $('textarea', d).value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function fillSiteOptions(d) {
    const sel = $('.pr4-std', d); const keep = sel.value; const k = d.dataset.k;
    const auto = k === 'shade' ? composeShade(d) : '';
    sel.innerHTML = '<option value="">표준 문장 선택</option>' + (auto ? '<option value="' + escapeAttr(auto) + '">[자동기입] ' + escapeHtml(auto) + '</option>' : '') +
      phraseList('site', k).map(function (p) { return '<option value="' + escapeAttr(p.text) + '">' + escapeHtml(p.text) + '</option>'; }).join('');
    if (Array.from(sel.options).some(function (o) { return o.value === keep; })) sel.value = keep;
  }
  function renderSitePreview(d) {
    const sv = stepValues(d);
    const sum = $('.pr4-sum', d);
    if (sum) sum.innerHTML = '선택 항목 · ' + sv.map(function (x) { return escapeHtml(x[1]) + ' ' + (x[2] ? '<b>' + escapeHtml(x[2]) + '</b>' : '<span class="pr4-miss">미선택</span>'); }).join(' · ');
    const lines = linesOf(d);
    $('.pr4-prev dl', d).innerHTML = '<div><dt>검토 항목</dt><dd>' + SITE[d.dataset.k] + '</dd></div>' +
      sv.map(function (x) { return '<div><dt>' + escapeHtml(x[1]) + '</dt><dd>' + (x[2] ? escapeHtml(x[2]) : '<span class="pr4-miss">미선택</span>') + '</dd></div>'; }).join('') +
      '<div class="full"><dt>검토 내용</dt><dd>' + (lines.length ? '<ul>' + lines.map(function (x) { return '<li>' + escapeHtml(x) + '</li>'; }).join('') + '</ul>' : '<span class="pr4-miss">입력된 문장이 없습니다</span>') + '</dd></div>';
  }
  function checkedSite() { return $$('#site-checks input:checked').map(function (i) { return i.value; }).filter(function (v) { return v !== 'none'; }); }
  function renderSite() {
    const box = $('#site-details'); if (!box) return;
    const on = checkedSite();
    $$('.pr4-detail', box).forEach(function (d) { if (!on.includes(d.dataset.k)) { v4.siteKeep[d.dataset.k] = d; d.remove(); } });
    on.forEach(function (k) {
      let d = $('.pr4-detail[data-k="' + k + '"]', box);
      if (!d) {
        d = v4.siteKeep[k];
        if (!d) { d = document.createElement('div'); d.className = 'pr4-detail'; d.dataset.k = k; d.innerHTML = siteDetailHTML(k); }
        box.appendChild(d);
      }
      fillSiteOptions(d); renderSitePreview(d);
      const reg = $('.pr4-reg', d); if (!$('.pr4-li.edit,.pr4-li.del', reg)) renderLib(reg);
    });
    const added = on.filter(function (k) { return !v4.sitePrev.includes(k); });
    if (added.length) v4.siteActive = added[added.length - 1];
    if (!on.includes(v4.siteActive)) v4.siteActive = on[0] || null;
    v4.sitePrev = on;
    renderSiteTabs();
  }
  function renderSiteTabs() {
    const bar = $('#site-tabs'); if (!bar) return;
    const on = checkedSite();
    bar.hidden = on.length === 0;
    bar.innerHTML = on.map(function (k, i) {
      const d = $('#site-details .pr4-detail[data-k="' + k + '"]'); const n = d ? linesOf(d).length : 0;
      return '<button type="button" role="tab" class="pr4-tab' + (k === v4.siteActive ? ' on' : '') + '" data-tab="' + k + '" aria-selected="' + (k === v4.siteActive) + '"><span class="sn">' + (i + 1) + '</span>' + SITE[k] + '<em class="' + (n ? 'has' : '') + '">' + (n ? n + '문장' : '미작성') + '</em></button>';
    }).join('');
    $$('#site-details .pr4-detail').forEach(function (d) { d.hidden = d.dataset.k !== v4.siteActive; });
  }
  function insertLine(d) {
    const sel = $('.pr4-std', d); if (!sel.value) { sel.focus(); return; }
    const ta = $('textarea', d); const lines = linesOf(d);
    if (!lines.includes(sel.value)) lines.push(sel.value);
    ta.value = lines.join('\n'); sel.value = '';
    renderSitePreview(d); renderSiteTabs(); suggestStatus();
  }
  function collectSite() {
    const none = Boolean(($('#site-checks input[value="none"]') || {}).checked);
    return {
      none: none,
      factors: checkedSite().map(function (k) {
        const d = $('#site-details .pr4-detail[data-k="' + k + '"]');
        const f = { key: k, label: SITE[k], lines: d ? linesOf(d) : [] };
        if (d) stepValues(d).forEach(function (x) { if (x[2]) f[x[0]] = x[2]; });
        return f;
      })
    };
  }

  /* 05 종합 의견 */
  function refreshOpinion() {
    const sel = $('#op-std'), btn = $('#op-add'), ta = el.overallOpinion; if (!sel) return;
    const v = getVerdict(); const label = OPINION_GROUP[v];
    if (!label) {
      sel.innerHTML = '<option value="">종합 판정을 먼저 선택해 주세요</option>'; sel.disabled = btn.disabled = true;
      ta.placeholder = '종합 판정을 먼저 선택해 주세요.';
    } else {
      const list = phraseList('opinion', v); const keep = sel.value;
      sel.disabled = btn.disabled = false;
      sel.innerHTML = '<option value="">' + label + ' 표준 문장 선택 (' + list.length + '개)</option>' + list.map(function (p) { return '<option value="' + escapeAttr(p.text) + '">' + escapeHtml(p.text) + '</option>'; }).join('');
      if (list.some(function (p) { return p.text === keep; })) sel.value = keep;
      ta.placeholder = label + ' 판정에 맞는 문장을 기입해 주세요.';
    }
    const reg = $('.pr4-reg[data-cat="opinion"]'); if (reg && !$('.pr4-li.edit,.pr4-li.del', reg)) renderLib(reg);
  }
  function insertOpinion() {
    const sel = $('#op-std'); if (!sel.value) { sel.focus(); return; }
    const lines = el.overallOpinion.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!lines.includes(sel.value)) lines.push(sel.value);
    el.overallOpinion.value = lines.join('\n'); sel.value = '';
  }

  /* 표준 문장 등록 · 수정 · 삭제 (관리자 전용 API) */
  function regGroup(reg) { return reg.dataset.cat === 'opinion' ? getVerdict() : reg.dataset.group; }
  function renderLib(reg) {
    const box = $('.pr4-lib', reg); const cat = reg.dataset.cat; const group = regGroup(reg);
    if (cat === 'opinion' && !OPINION_GROUP[group]) { box.innerHTML = '<p class="pr4-lib-h">종합 판정을 먼저 선택하면 해당 판정의 문장 목록이 나옵니다.</p>'; return; }
    const list = phraseList(cat, group);
    box.innerHTML = '<p class="pr4-lib-h">' + (cat === 'opinion' ? OPINION_GROUP[group] + ' · ' : '') + '등록된 표준 문장 ' + list.length + '개</p>' + list.map(function (p) {
      return '<div class="pr4-li" data-id="' + p.id + '"><span class="lt">' + escapeHtml(p.text) + '</span><span class="la"><button type="button" class="admin-button secondary pr4-sm pr4-ed">수정</button><button type="button" class="admin-button secondary pr4-sm pr4-del">삭제</button></span></div>';
    }).join('');
  }
  function say(reg, text, ok) { const m = $('.pr4-msg', reg); m.textContent = text; m.className = 'pr4-msg ' + (ok ? 'ok' : 'err'); }
  function afterPhraseChange(reg) {
    renderLib(reg);
    if (reg.dataset.cat === 'opinion') refreshOpinion(); else $$('#site-details .pr4-detail').forEach(fillSiteOptions);
  }
  async function handleRegister(event, reg) {
    const t = event.target; const cat = reg.dataset.cat; const group = regGroup(reg);
    const key = cat + '.' + group;
    if (t.matches('.pr4-reg-btn')) {
      const input = $('.pr4-new', reg); const text = input.value.trim();
      if (cat === 'opinion' && !OPINION_GROUP[group]) { say(reg, '종합 판정을 먼저 선택해 주세요. 선택한 판정의 목록에 등록됩니다.'); return; }
      if (!text) { say(reg, '등록할 문장을 입력해 주세요.'); input.focus(); return; }
      t.disabled = true;
      try {
        const out = await api.request('/api/admin/precheck/phrases', { method: 'POST', body: { category: cat, groupKey: group, text: text } });
        if (!out.response.ok || !out.result.success) { say(reg, out.result.message || '문장을 등록하지 못했습니다.'); return; }
        (v4.phrases[key] = v4.phrases[key] || []).push(out.result.phrase);
        input.value = ''; afterPhraseChange(reg); say(reg, '목록에 등록했습니다. 다른 담당자도 같은 문장을 고를 수 있습니다.', true);
      } catch (error) { say(reg, error.message || '문장을 등록하지 못했습니다.'); }
      finally { t.disabled = false; }
      return;
    }
    const li = t.closest('.pr4-li'); if (!li) return;
    const id = Number(li.dataset.id); const list = v4.phrases[key] || []; const item = list.find(function (p) { return p.id === id; });
    if (!item) return;
    if (t.matches('.pr4-ed')) {
      li.classList.add('edit');
      li.innerHTML = '<input type="text" class="pr4-ed-in" maxlength="300" aria-label="문장 수정" value="' + escapeAttr(item.text) + '"><span class="la"><button type="button" class="admin-button primary pr4-sm pr4-ed-ok">저장</button><button type="button" class="admin-button secondary pr4-sm pr4-cancel">취소</button></span>';
      $('.pr4-ed-in', li).focus();
    } else if (t.matches('.pr4-cancel')) {
      renderLib(reg);
    } else if (t.matches('.pr4-ed-ok')) {
      const text = $('.pr4-ed-in', li).value.trim();
      if (!text) { say(reg, '문장을 입력해 주세요.'); return; }
      t.disabled = true;
      try {
        const out = await api.request('/api/admin/precheck/phrases/' + id, { method: 'PUT', body: { text: text } });
        if (!out.response.ok || !out.result.success) { say(reg, out.result.message || '문장을 수정하지 못했습니다.'); t.disabled = false; return; }
        item.text = out.result.phrase.text; afterPhraseChange(reg); say(reg, '문장을 수정했습니다. 이미 입력칸에 넣은 문장은 바뀌지 않습니다.', true);
      } catch (error) { say(reg, error.message || '문장을 수정하지 못했습니다.'); t.disabled = false; }
    } else if (t.matches('.pr4-del')) {
      li.classList.add('del');
      $('.la', li).innerHTML = '<button type="button" class="admin-button primary pr4-sm pr4-warn pr4-del-ok">삭제 확인</button><button type="button" class="admin-button secondary pr4-sm pr4-cancel">취소</button>';
    } else if (t.matches('.pr4-del-ok')) {
      t.disabled = true;
      try {
        const out = await api.request('/api/admin/precheck/phrases/' + id, { method: 'DELETE' });
        if (!out.response.ok || !out.result.success) { say(reg, out.result.message || '문장을 삭제하지 못했습니다.'); t.disabled = false; return; }
        v4.phrases[key] = list.filter(function (p) { return p.id !== id; }); afterPhraseChange(reg);
        say(reg, '목록에서 삭제했습니다. 이미 입력칸에 넣은 문장은 그대로 남습니다.', true);
      } catch (error) { say(reg, error.message || '문장을 삭제하지 못했습니다.'); t.disabled = false; }
    }
  }

  /* 상태 자동 제안 (담당자가 직접 바꾸면 유지) */
  function suggestStatus() {
    const d = collectDetail();
    const ord = d.ordinance.items.filter(function (i) { return i.result; });
    const suggestions = {
      ordinance: !ord.length ? 'info' : (ord.some(function (i) { return i.result === 'conflict'; }) ? 'conditional' : 'ok'),
      grid: ({ possible: 'ok', impossible: 'not_possible', waiting: 'hold' })[d.grid.state] || 'info',
      site: d.site.factors.length ? 'conditional' : (d.site.none ? 'ok' : 'info')
    };
    Object.keys(suggestions).forEach(function (key) {
      const section = el.items.querySelector('[data-review-key="' + key + '"]');
      if (!section || section.dataset.statusTouched === '1') return;
      section.querySelector('.review-item-status').value = suggestions[key];
    });
  }

  function collectDetail() { return { ordinance: collectOrdinance(), grid: collectGrid(), site: collectSite() }; }

  function fillDetail(detail) {
    const o = detail?.ordinance || {}; const g = detail?.grid || {}; const s = detail?.site || {};
    $('#ord-name').value = o.name || ''; $('#ord-revised').value = o.revisedAt || ''; $('#ord-reviewed').value = o.reviewedAt || ''; $('#ord-etc').value = o.etc || '';
    $$('#ord-items .pr4-row').forEach(function (row) {
      const saved = (o.items || []).find(function (i) { return i.key === row.dataset.ord; }) || {};
      $$('input[type=radio]', row).forEach(function (i) { i.checked = i.value === saved.result; });
    });
    renderOrdinance();
    $$('#ord-items .pr4-row').forEach(function (row) {
      const saved = (o.items || []).find(function (i) { return i.key === row.dataset.ord; }) || {};
      if (saved.result === 'conflict') { $('.ord-std', row).value = saved.standardM ?? ''; $('.ord-cur', row).value = saved.actualM ?? ''; }
    });
    $$('input[name="grid-state"]').forEach(function (i) { i.checked = i.value === g.state; });
    $('#grid-substation').value = g.substation || ''; $('#grid-mtr').value = g.mtr || ''; $('#grid-line').value = g.line || '';
    $('#grid-spare').value = g.spareMw ?? '';
    $$('#grid-conditions input').forEach(function (i) { i.checked = (g.conditions || []).includes(i.value); });
    const k = g.kepco || {};
    $('#kepco-branch').value = k.branch || ''; $('#kepco-phone').value = k.phone || ''; $('#kepco-date').value = k.checkedAt || ''; $('#kepco-method').value = k.method || '';
    v4.siteKeep = {}; v4.sitePrev = []; v4.siteActive = null; $('#site-details').innerHTML = '';
    const factors = s.factors || [];
    $$('#site-checks input').forEach(function (i) { i.checked = i.value === 'none' ? Boolean(s.none) : factors.some(function (f) { return f.key === i.value; }); });
    renderSite();
    factors.forEach(function (f) {
      const d = $('#site-details .pr4-detail[data-k="' + f.key + '"]'); if (!d) return;
      (STEP[f.key] || []).forEach(function (step) { $$('input[name="' + f.key + '-' + step[0] + '"]', d).forEach(function (i) { i.checked = i.value === f[step[0]]; }); });
      $('textarea', d).value = (f.lines || []).join('\n');
    });
    renderSite();
  }

  /* 기존 화면·이전 버전 호환용 요약 문장 (items[].content) */
  function ordinanceText(o) {
    const rows = o.items.filter(function (i) { return i.result; }).map(function (i) {
      return i.label + ': ' + ORD_RESULT[i.result] + (i.result === 'conflict' && (i.standardM !== null || i.actualM !== null) ? ' (기준 ' + (i.standardM ?? '-') + 'm / 현재 ' + (i.actualM ?? '-') + 'm)' : '');
    });
    const head = o.name ? '기준 조례: ' + o.name + ([o.revisedAt && '최종 개정 ' + o.revisedAt, o.reviewedAt && '검토일 ' + o.reviewedAt].filter(Boolean).length ? ' (' + [o.revisedAt && '최종 개정 ' + o.revisedAt, o.reviewedAt && '검토일 ' + o.reviewedAt].filter(Boolean).join(', ') + ')' : '') : '';
    return [head].concat(rows, o.etc ? ['기타: ' + o.etc] : []).filter(Boolean).join('\n');
  }
  function gridText(g) {
    const rows = [];
    if (g.state) rows.push('연계상태: ' + GRID_STATE[g.state]);
    const line = [g.substation && '변전소 ' + g.substation, g.mtr && 'MTR ' + g.mtr, g.line && '선로 ' + g.line].filter(Boolean).join(' · ');
    if (line) rows.push(line);
    if (g.spareMw !== null) rows.push('여유용량: ' + g.spareMw + 'MW');
    if (g.conditions.length) rows.push('기타조건: ' + g.conditions.join(', '));
    const k = g.kepco; const kk = [k.branch, k.checkedAt && '검토일 ' + k.checkedAt, k.method].filter(Boolean).join(' · ');
    if (kk) rows.push('한전 확인: ' + kk);
    return rows.join('\n');
  }
  function siteText(s) {
    if (!s.factors.length) return s.none ? '현장 여건상 특이사항이 없습니다.' : '';
    return s.factors.map(function (f) {
      const steps = (STEP[f.key] || []).map(function (step) { return f[step[0]] ? step[1] + ' ' + f[step[0]] : ''; }).filter(Boolean).join(' · ');
      return '[' + f.label + ']' + (steps ? ' ' + steps : '') + (f.lines.length ? '\n- ' + f.lines.join('\n- ') : '');
    }).join('\n');
  }
  function numberOrNull(value) { const n = Number.parseFloat(value); return value === '' || value === undefined || !Number.isFinite(n) ? null : n; }


  function statusLabel(value) {
    return ({ received: '접수', reviewing: '검토중', supplement_required: '보완요청', completed: '검토완료' })[value] || value || '-';
  }
  function siteTypeLabel(value) {
    return ({ land: '토지', building: '건물', mixed: '복합(토지+건물)' })[value] || value || '-';
  }
  function purposeLabel(value) {
    return ({ self_consumption: '자가소비', power_business: '발전사업(매전)', undecided: '미정 / 상담 희망' })[value] || value || '-';
  }
  function ownershipLabel(value) {
    return ({ owner: '본인 소유', leased: '임차(임대인 동의 확보)', consent_planned: '사용동의 확보 예정', other: '기타' })[value] || value || '-';
  }
  function numberUnit(value, unit) {
    return value === null || value === undefined || value === '' ? '-' : Number(value).toLocaleString('ko-KR') + unit;
  }
  function formatPhone(value) {
    const d = String(value || '').replace(/\D/g, '');
    return d.length === 11 ? d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : (value || '-');
  }
  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }
  function escapeAttr(value) { return escapeHtml(value); }
})(window, document);
