(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const state = { requestId: null, request: null, review: null, capacityImageDataUrl: '', capacityImageName: '' };
  const el = {};
  let calculateCapacity;
  let capacityFormulaText;

  window.addEventListener('teadosa:adminready', init, { once: true });

  async function init() {
    ({ calculateCapacity, capacityFormulaText } = await import('/common/js/precheck-capacity.mjs?v=1'));
    const params = new URLSearchParams(window.location.search);
    state.requestId = Number.parseInt(params.get('id'), 10);

    mapElements();

    if (!Number.isInteger(state.requestId) || state.requestId < 1) {
      showMessage('올바른 사전검토 신청번호가 아닙니다.', true);
      return;
    }

    bindEvents();
    await loadDetail();
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
    el.installationPossible = document.getElementById('installation-possible');
    el.expectedCapacity = document.getElementById('expected-capacity');
    el.capacityArea = document.getElementById('capacity-area');
    el.capacityCalculation = document.getElementById('capacity-calculation');
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
  }

  function bindEvents() {
    el.capacityArea.addEventListener('input', updateCapacity);
    el.save.addEventListener('click', function () { saveReview(false); });
    el.publish.addEventListener('click', function () {
      if (!window.confirm('검토결과를 저장하고 회원에게 공개하시겠습니까?')) return;
      saveReview(true);
    });
    if (el.capacityLayoutFile) el.capacityLayoutFile.addEventListener('change', handleCapacityImage);
    if (el.removeCapacityLayout) el.removeCapacityLayout.addEventListener('click', clearCapacityImage);
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
    const data = r.formData || {};

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

    el.installationPossible.value = review.installationPossible || 'undetermined';
    el.expectedCapacity.value = review.expectedCapacity ?? '';
    const capacity = review.resultData?.capacityAssessment || {};
    el.capacityArea.value = Object.prototype.hasOwnProperty.call(capacity, 'areaM2')
      ? (capacity.areaM2 ?? '') : (state.request?.formData?.siteArea ?? '');
    updateCapacity();
    el.capacityBasis.value = capacity.basis || '';
    state.capacityImageDataUrl = validImageDataUrl(capacity.layoutImageDataUrl) ? capacity.layoutImageDataUrl : '';
    state.capacityImageName = capacity.layoutImageName || '';
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

    setFixedItem('ordinance', byId.ordinance || findByTitle(savedItems, '조례'));
    setFixedItem('grid', byId.grid || findByTitle(savedItems, '한전'));
    setFixedItem('site', byId.site || findByTitle(savedItems, '현장'));
  }

  function findByTitle(items, keyword) {
    return items.find(function (item) {
      return String(item.title || '').includes(keyword);
    }) || null;
  }

  function setFixedItem(key, item) {
    const section = el.items.querySelector('[data-review-key="' + key + '"]');
    if (!section) return;
    section.querySelector('.review-item-status').value = item?.status || 'info';
    section.querySelector('.review-item-content').value = item?.content || '';
  }

  function collectItems() {
    const specs = [
      ['ordinance', '조례 검토'],
      ['grid', '한전 계통연계 검토'],
      ['site', '현장조건 검토']
    ];

    return specs.map(function (spec) {
      const section = el.items.querySelector('[data-review-key="' + spec[0] + '"]');
      return {
        id: spec[0],
        title: spec[1],
        status: section.querySelector('.review-item-status').value,
        content: section.querySelector('.review-item-content').value.trim()
      };
    });
  }

  function updateCapacity() {
    try {
      const calculation = calculateCapacity(el.capacityArea.value);
      el.capacityArea.setCustomValidity('');
      el.expectedCapacity.value = calculation ? calculation.finalKw.toFixed(2) : '';
      el.capacityCalculation.textContent = capacityFormulaText(calculation);
      return true;
    } catch (error) {
      el.capacityArea.setCustomValidity(error.message);
      el.expectedCapacity.value = '';
      el.capacityCalculation.textContent = error.message;
      return false;
    }
  }

  async function saveReview(publish) {
    if (!updateCapacity()) { el.capacityArea.reportValidity(); return; }
    const payload = {
      installationPossible: el.installationPossible.value,
      expectedCapacity: el.expectedCapacity.value === '' ? null : Number(el.expectedCapacity.value),
      capacityAssessment: {
        areaM2: el.capacityArea.value === '' ? null : Number(el.capacityArea.value),
        basis: el.capacityBasis.value.trim(),
        layoutImageDataUrl: state.capacityImageDataUrl,
        layoutImageName: state.capacityImageName
      },
      items: collectItems(),
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
