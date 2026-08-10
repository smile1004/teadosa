(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const state = { requestId: null, request: null, review: null };
  const el = {};

  window.addEventListener('teadosa:adminready', init, { once: true });

  async function init() {
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
    el.basic = document.getElementById('request-basic-info');
    el.formData = document.getElementById('request-form-data');
    el.requestStatus = document.getElementById('request-status-badge');
    el.formVersion = document.getElementById('form-version-badge');
    el.publishStatus = document.getElementById('publish-status-badge');
    el.installationPossible = document.getElementById('installation-possible');
    el.expectedCapacity = document.getElementById('expected-capacity');
    el.items = document.getElementById('review-items');
    el.addItem = document.getElementById('add-review-item');
    el.overallOpinion = document.getElementById('overall-opinion');
    el.customerNotice = document.getElementById('customer-notice');
    el.internalMemo = document.getElementById('internal-memo');
    el.save = document.getElementById('save-review');
    el.publish = document.getElementById('publish-review');
  }

  function bindEvents() {
    el.addItem.addEventListener('click', function () {
      appendReviewItem({ status: 'info' });
    });

    el.items.addEventListener('click', function (event) {
      const button = event.target.closest('[data-remove-review-item]');
      if (button) button.closest('.review-item-editor')?.remove();
    });

    el.save.addEventListener('click', function () { saveReview(false); });
    el.publish.addEventListener('click', function () {
      if (!window.confirm('검토결과를 저장하고 회원에게 공개하시겠습니까?')) return;
      saveReview(true);
    });
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
  }

  function renderReview() {
    const review = state.review || {};

    el.installationPossible.value = review.installationPossible || 'undetermined';
    el.expectedCapacity.value = review.expectedCapacity ?? '';
    el.overallOpinion.value = review.overallOpinion || '';
    el.customerNotice.value = review.customerNotice || '';
    el.internalMemo.value = review.internalMemo || '';

    el.publishStatus.textContent = review.publishedAt ? '회원 공개됨' : '미공개';
    el.publishStatus.className = 'admin-inline-badge' + (review.publishedAt ? ' published' : '');

    el.items.innerHTML = '';
    const items = review.resultData?.items || [];

    if (items.length) {
      items.forEach(appendReviewItem);
    } else {
      appendReviewItem({ title: '지자체 조례 및 인허가 검토', status: 'info', content: '' });
      appendReviewItem({ title: '한국전력 계통연계 검토', status: 'info', content: '' });
    }
  }

  function appendReviewItem(item) {
    const row = document.createElement('div');
    row.className = 'review-item-editor';
    row.innerHTML =
      '<div class="review-item-top">' +
        '<input class="review-item-title" type="text" maxlength="100" placeholder="검토 항목명" value="' + escapeAttr(item?.title || '') + '">' +
        '<select class="review-item-status">' + statusOptions(item?.status || 'info') + '</select>' +
        '<button type="button" class="review-item-remove" data-remove-review-item>삭제</button>' +
      '</div>' +
      '<textarea class="review-item-content" rows="4" maxlength="3000" placeholder="검토 결과와 근거를 입력해 주세요.">' + escapeHtml(item?.content || '') + '</textarea>';

    el.items.appendChild(row);
  }

  function collectItems() {
    return Array.from(el.items.querySelectorAll('.review-item-editor')).map(function (row, index) {
      return {
        id: 'item-' + (index + 1),
        title: row.querySelector('.review-item-title').value.trim(),
        status: row.querySelector('.review-item-status').value,
        content: row.querySelector('.review-item-content').value.trim()
      };
    }).filter(function (item) {
      return item.title || item.content;
    });
  }

  async function saveReview(publish) {
    const payload = {
      installationPossible: el.installationPossible.value,
      expectedCapacity: el.expectedCapacity.value === '' ? null : Number(el.expectedCapacity.value),
      items: collectItems(),
      overallOpinion: el.overallOpinion.value.trim(),
      customerNotice: el.customerNotice.value.trim(),
      internalMemo: el.internalMemo.value.trim(),
      publish: publish
    };

    if (publish && payload.installationPossible === 'undetermined') {
      showMessage('회원 공개 전 종합 판정을 선택해 주세요.', true);
      return;
    }
    if (publish && !payload.overallOpinion) {
      showMessage('회원 공개 전 종합 의견을 입력해 주세요.', true);
      return;
    }

    setBusy(true);
    showMessage(publish ? '검토결과를 저장하고 공개하고 있습니다.' : '검토결과를 저장하고 있습니다.');

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
      showMessage(result.message || '저장되었습니다.');
    } catch (error) {
      showMessage(error.message || '검토결과를 저장하지 못했습니다.', true);
    } finally {
      setBusy(false);
    }
  }

  function setBusy(active) {
    [el.save, el.publish, el.addItem].forEach(function (node) {
      if (node) node.disabled = active;
    });
  }

  function showMessage(message, error) {
    if (!el.message) return;
    el.message.textContent = message || '';
    el.message.hidden = !message;
    el.message.classList.toggle('error', Boolean(error));
  }

  function statusOptions(selected) {
    return [
      ['info', '일반'],
      ['ok', '적합/가능'],
      ['conditional', '조건부'],
      ['hold', '추가확인'],
      ['not_possible', '어려움']
    ].map(function (item) {
      return '<option value="' + item[0] + '"' + (selected === item[0] ? ' selected' : '') + '>' + item[1] + '</option>';
    }).join('');
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
