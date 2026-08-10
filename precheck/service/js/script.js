(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const SERVICE_CATALOG = [
    { code: 'POWER_PERMIT', name: '발전사업허가', desc: '발전사업 추진을 위한 허가 절차를 검토합니다.', href: '/start/' },
    { code: 'DEVELOPMENT_PERMIT', name: '개발행위허가', desc: '사업지 여건과 지자체 기준에 따라 개발행위허가 필요 여부와 진행 범위를 확인합니다.', href: '/start/' },
    { code: 'FIELD_INSPECTION', name: '현장실사', desc: '사업지와 건축물·주변환경을 현장에서 확인합니다.', href: '/precheck/' },
    { code: 'STRUCTURE_REVIEW', name: '구조검토', desc: '건물형 또는 구조 검토가 필요한 경우 구조 안전성과 설치 조건을 확인합니다.', href: '/precheck/' },
    { code: 'DESIGN', name: '태양광 도면설계', desc: '검토 결과와 현장 조건을 바탕으로 설계 업무를 진행합니다.', href: '/start/' }
  ];

  const message = document.getElementById('service-message');
  const content = document.getElementById('service-content');

  init();

  async function init() {
    try {
      const member = await auth.requireAuth({ redirect: false });
      if (!member) {
        const params = new URLSearchParams({
          next: window.location.pathname + window.location.search,
          reason: 'login-required'
        });
        window.location.replace('/login/?' + params.toString());
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const requestId = params.get('id') || '';
      const outcome = await auth.getPrecheckResult(requestId);
      const result = outcome.result || {};

      if (!outcome.response.ok || !result.success) {
        throw new Error(result.message || '사전검토 결과를 불러오지 못했습니다.');
      }

      render(result.request, result.review);
      showMessage('');
      content.hidden = false;
    } catch (error) {
      showMessage(error.message || '가능서비스 정보를 불러오지 못했습니다.', true);
    }
  }

  function render(request, review) {
    const data = request.formData || {};
    const siteType = data.siteType || request.siteType || '';
    const possibility = review.installationPossible || 'undetermined';

    setText('service-result', possibilityLabel(possibility));
    setText('summaryType', siteTypeLabel(siteType));
    setText('service-request-no', request.requestNo || '-');

    const list = document.getElementById('serviceList');
    const services = selectServices(siteType, possibility);

    list.innerHTML = services.map(function (service) {
      return '<article class="service-card dynamic-service-card">' +
        '<div class="service-title"><span class="check">✓</span><div>' +
          '<span class="service-code">' + escapeHtml(service.codeLabel) + '</span>' +
          escapeHtml(service.name) +
          '<span class="sub">' + escapeHtml(service.desc) + '</span>' +
        '</div></div>' +
        '<div class="service-state ' + escapeHtml(service.stateClass) + '">' + escapeHtml(service.stateLabel) + '</div>' +
        '<a class="apply-btn" href="' + escapeHtml(service.href) + '">' + escapeHtml(service.actionLabel) + '</a>' +
      '</article>';
    }).join('');

    const items = review.resultData?.items || [];
    const ref = document.getElementById('reviewReference');
    ref.innerHTML = items.map(function (item) {
      return '<div class="review-reference-row"><strong>' + escapeHtml(item.title || '검토 항목') + '</strong><span>' +
        escapeHtml(itemStatusLabel(item.status)) + '</span></div>';
    }).join('') || '<p>등록된 세부 검토항목이 없습니다.</p>';

    const back = document.getElementById('back-result-button');
    back.onclick = function () {
      window.location.href = '/precheck/result/?id=' + encodeURIComponent(request.id);
    };
  }

  function selectServices(siteType, possibility) {
    return SERVICE_CATALOG.filter(function (service) {
      if (service.code === 'STRUCTURE_REVIEW' && siteType === 'land') return false;
      return true;
    }).map(function (service, index) {
      let stateLabel = '상담 후 진행';
      let stateClass = 'state-consult';
      let actionLabel = '상담하기';

      if (possibility === 'possible') {
        stateLabel = '진행 검토 가능';
        stateClass = 'state-available';
        actionLabel = '서비스 확인';
      } else if (possibility === 'conditional') {
        stateLabel = '조건 확인 필요';
        stateClass = 'state-conditional';
      } else if (possibility === 'not_possible') {
        stateLabel = '추가 검토 필요';
        stateClass = 'state-hold';
      }

      return Object.assign({}, service, {
        codeLabel: 'S-' + String(index + 1).padStart(2, '0'),
        stateLabel: stateLabel,
        stateClass: stateClass,
        actionLabel: actionLabel
      });
    });
  }

  function showMessage(text, error) {
    message.textContent = text || '';
    message.hidden = !text;
    message.classList.toggle('error', Boolean(error));
  }
  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  function possibilityLabel(value) {
    return ({ undetermined: '판정 전', possible: '진행 가능', conditional: '조건부 가능', not_possible: '진행 어려움' })[value] || value || '-';
  }
  function siteTypeLabel(value) {
    return ({ land: '토지', building: '건물', mixed: '복합(토지+건물)' })[value] || value || '-';
  }
  function itemStatusLabel(value) {
    return ({ info: '검토', ok: '적합/가능', conditional: '조건부', hold: '추가확인', not_possible: '어려움' })[value] || '검토';
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }
})(window, document);
