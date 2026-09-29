(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  const message = document.getElementById('serviceMessage');
  const content = document.getElementById('serviceContent');

  window.showToast = function (text) {
    const toast = document.getElementById('toast');
    toast.textContent = text;
    toast.classList.add('show');
    window.setTimeout(function () { toast.classList.remove('show'); }, 1800);
  };

  if (!auth) return;
  init();

  async function init() {
    try {
      const member = await auth.requireAuth({ redirect: false });
      if (!member) {
        const params = new URLSearchParams({ next: window.location.pathname + window.location.search, reason: 'login-required' });
        window.location.replace('/login/?' + params.toString());
        return;
      }

      const services = await import('/common/js/precheck-services.mjs?v=3');
      const requestId = new URLSearchParams(window.location.search).get('id') || '';
      const outcome = await auth.getPrecheckResult(requestId);
      const result = outcome.result || {};

      if (outcome.response.status === 404) {
        showMessage(result.message || '아직 공개된 검토결과가 없습니다. 검토가 완료되면 가능 서비스를 확인할 수 있습니다.');
        return;
      }
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '가능 서비스를 불러오지 못했습니다.');

      const selection = services.normalizeServiceSelection(result.review?.resultData?.serviceSelection);
      if (!selection) {
        showMessage('아직 가능 서비스가 등록되지 않았습니다. 담당자가 검토결과를 바탕으로 등록하면 확인할 수 있습니다.');
        return;
      }

      render(services, selection, result.request, result.review);
      showMessage('');
      content.hidden = false;
    } catch (error) {
      showMessage(error.message || '가능 서비스를 불러오지 못했습니다.', true);
    }
  }

  function render(services, selection, request, review) {
    const spec = services.SERVICE_TYPES[selection.type];
    const list = services.servicesForType(selection.type);
    const available = new Set(selection.services);

    setText('summaryPossibility', possibilityLabel(review.installationPossible));
    setText('summaryType', spec.label);
    setText('summaryCount', available.size + '개 / ' + list.length + '개');
    document.getElementById('resultLink').href = 'precheck/result/' + (request?.id ? '?id=' + encodeURIComponent(request.id) : '');

    document.getElementById('serviceList').innerHTML = list.map(function (s) {
      const ok = available.has(s.key);
      const price = services.priceText(s);
      const action = !ok
        ? '<span class="unavailable-label">신청 불가</span>'
        : s.href
          ? '<a class="apply-btn" href="' + escapeHtml(s.href) + '">신청하기</a>'
          : '<button class="apply-btn" type="button" data-toast="' + escapeHtml(s.code + ' ' + s.name + ' 상담 신청으로 연결됩니다.') + '">신청하기</button>';
      return '<article class="service-card' + (ok ? '' : ' unavailable') + '">' +
        '<div class="service-title"><span class="check">' + (ok ? '✓' : '–') + '</span><div><span class="service-code">' + s.code + '</span>' +
        escapeHtml(s.name) + (s.note ? '<span class="sub">' + escapeHtml(s.note) + '</span>' : '') + '</div></div>' +
        '<div class="price">' + price + '</div>' + action + '</article>';
    }).join('');

    const picked = list.filter(function (s) { return available.has(s.key); });
    const priced = picked.filter(services.hasPrice);
    const min = priced.reduce(function (sum, s) { return sum + s.min; }, 0);
    const max = priced.reduce(function (sum, s) { return sum + s.max; }, 0);
    const extra = picked.length > priced.length ? ' + 별도 견적' : '';
    setText('totalPrice', !picked.length ? '신청 가능한 서비스가 없습니다'
      : priced.length ? services.formatWon(min) + '원 ~ ' + services.formatWon(max) + '원' + extra : '별도 견적');

    document.getElementById('packageTable').innerHTML =
      '<thead><tr><th>패키지상품</th><th>항목</th><th>가격</th></tr></thead><tbody>' +
      services.packagesForType(selection.type).map(function (p) {
        const ok = selection.packages.includes(p.key);
        const action = ok
          ? '<button class="package-apply-btn" type="button" data-toast="' + escapeHtml(p.name + ' 패키지 신청으로 연결됩니다.') + '">신청하기</button>'
          : '<span class="unavailable-label">신청 불가</span>';
        const note = p.unpriced.length ? '<small class="package-note">' + escapeHtml(p.unpriced.map(function (s) { return s.name; }).join(', ') + ' 별도 견적') + '</small>' : '';
        return '<tr class="' + (ok ? '' : 'unavailable') + '"><td class="package-name">' + escapeHtml(p.name) + '</td><td class="package-codes">' + p.codes.map(function (c) { return '<span>' + c + '</span>'; }).join(', ') +
          '</td><td><div class="package-price-cell"><span>' + services.formatWon(p.min) + ' ~ ' + services.formatWon(p.max) + '원' + note + '</span>' + action + '</div></td></tr>';
      }).join('') + '</tbody>';

    content.addEventListener('click', function (event) {
      const button = event.target.closest('[data-toast]');
      if (button) window.showToast(button.dataset.toast);
    });
  }

  function possibilityLabel(value) {
    return ({ possible: '진행 가능', conditional: '조건부 가능', not_possible: '진행 어려움', undetermined: '판정 전' })[value] || '-';
  }
  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  function showMessage(text, error) {
    message.textContent = text || '';
    message.hidden = !text;
    message.classList.toggle('error', Boolean(error));
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }
})(window, document);
