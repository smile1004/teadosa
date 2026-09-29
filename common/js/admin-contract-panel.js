// 관리자 개별 서비스 상세(발전사업허가·개발행위허가·한전PPA·공사계획신고)에 모두싸인 전자계약 패널을 붙입니다.
(function (window, document) {
  'use strict';

  const api = window.TaeDoSAApi;
  const match = window.location.pathname.match(/^\/admin\/(license|development|ppa|construction-plan)\/detail\/?/);
  const requestId = Number.parseInt(new URLSearchParams(window.location.search).get('id'), 10);
  if (!api || !match || !Number.isInteger(requestId) || requestId < 1) return;
  const serviceType = match[1];
  let panel;
  let started = false;

  window.addEventListener('teadosa:adminready', start, { once: true });
  waitForContent();

  function waitForContent() {
    const content = document.getElementById('admin-protected-content');
    if (content && !content.hidden) return start();
    window.setTimeout(function () { if (!started) waitForContent(); }, 300);
  }

  function start() {
    if (started) return;
    started = true;
    const content = document.getElementById('admin-protected-content');
    if (!content) return;
    panel = document.createElement('section');
    panel.className = 'admin-panel contract-admin-panel';
    panel.innerHTML = '<div class="panel-head"><div><p class="panel-kicker">E-CONTRACT</p><h2>전자계약 (모두싸인)</h2></div>' +
      '<button class="admin-button primary" type="button" data-contract-request>전자계약 요청 보내기</button></div>' +
      '<p class="contract-admin-desc">요청하면 모두싸인 템플릿으로 계약서가 만들어지고, 회원이 마이페이지에서 바로 서명합니다. 서명이 끝나면 처리상태가 자동으로 「계약완료」로 바뀝니다.</p>' +
      '<p class="admin-inline-message contract-admin-message" role="status" hidden></p>' +
      '<div class="contract-admin-list"></div>';
    const history = content.querySelector('[id$="-status-history"]');
    const anchor = history ? history.closest('section') : null;
    if (anchor) anchor.before(panel); else content.append(panel);
    panel.querySelector('[data-contract-request]').addEventListener('click', requestContract);
    panel.addEventListener('click', function (event) {
      const refresh = event.target.closest('[data-contract-refresh]');
      if (refresh) refreshContract(refresh.dataset.contractRefresh, refresh);
    });
    load();
  }

  async function load() {
    try {
      const out = await api.request('/api/admin/contracts?serviceType=' + encodeURIComponent(serviceType) + '&requestId=' + requestId);
      if (!out.response.ok || !out.result.success) throw new Error(out.result.message || '전자계약 정보를 불러오지 못했습니다.');
      render(out.result.contracts || [], out.result.configured);
    } catch (error) {
      message(error.message, true);
    }
  }

  function render(contracts, configured) {
    const button = panel.querySelector('[data-contract-request]');
    const open = contracts.some(function (c) { return c.status === 'requested' || c.status === 'completed'; });
    button.disabled = !configured || open;
    button.title = !configured ? '모두싸인 API 키·템플릿 ID 설정이 필요합니다.' : open ? '진행 중이거나 완료된 계약이 있습니다.' : '';
    if (!configured) message('모두싸인 API 키 또는 템플릿 ID가 설정되지 않아 요청할 수 없습니다. (Cloudflare 환경변수 설정 필요)', true);
    panel.querySelector('.contract-admin-list').innerHTML = contracts.length
      ? contracts.map(function (c) {
          return '<article class="contract-admin-item">' +
            '<div><strong>' + esc(c.title) + '</strong><span>요청 ' + esc(datetime(c.requestedAt)) + (c.completedAt ? ' · 완료 ' + esc(datetime(c.completedAt)) : '') + '</span></div>' +
            '<span class="contract-status ' + esc(c.status) + '">' + esc(statusLabel(c.status)) + '</span>' +
            '<div class="contract-admin-actions">' +
              (c.status === 'completed' ? '<a class="admin-button secondary" href="/api/contracts/' + c.id + '/download" target="_blank" rel="noopener">계약서 PDF</a>' : '') +
              '<button class="admin-button secondary" type="button" data-contract-refresh="' + c.id + '">상태 새로고침</button>' +
            '</div></article>';
        }).join('')
      : '<p class="empty-row">요청된 전자계약이 없습니다.</p>';
  }

  async function requestContract(event) {
    const button = event.currentTarget;
    if (!window.confirm('이 신청 건으로 모두싸인 전자계약을 요청하시겠습니까?')) return;
    button.disabled = true;
    message('모두싸인에 계약서를 생성하고 있습니다.');
    try {
      const out = await api.request('/api/admin/contracts', { method: 'POST', body: { serviceType: serviceType, requestId: requestId } });
      if (!out.response.ok || !out.result.success) throw new Error(out.result.message || '전자계약을 요청하지 못했습니다.');
      message(out.result.message);
      await load();
    } catch (error) {
      message(error.message, true);
      button.disabled = false;
    }
  }

  async function refreshContract(id, button) {
    button.disabled = true;
    try {
      const out = await api.request('/api/contracts/' + encodeURIComponent(id) + '/refresh', { method: 'POST' });
      if (!out.response.ok || !out.result.success) throw new Error(out.result.message || '상태를 확인하지 못했습니다.');
      message('계약 상태: ' + statusLabel(out.result.contract.status));
      if (out.result.contract.status === 'completed') window.setTimeout(function () { window.location.reload(); }, 800);
      else await load();
    } catch (error) {
      message(error.message, true);
      button.disabled = false;
    }
  }

  function message(text, error) {
    const node = panel.querySelector('.contract-admin-message');
    node.textContent = text || '';
    node.hidden = !text;
    node.classList.toggle('error', Boolean(error));
  }
  function statusLabel(value) {
    return ({ requested: '서명 대기', completed: '서명 완료', rejected: '서명 거절', canceled: '요청 취소', failed: '처리 실패' })[value] || value;
  }
  function datetime(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; });
  }
})(window, document);
