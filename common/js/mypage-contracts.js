// 마이페이지: 관리자가 요청한 모두싸인 전자계약을 각 신청 카드에 표시하고, 사이트 안(임베디드)에서 서명받습니다.
(function (window, document) {
  'use strict';

  const api = window.TaeDoSAApi;
  if (!api) return;
  const TYPES = ['license', 'development', 'ppa', 'construction-plan'];
  let contracts = [];
  let dialog;

  load();

  async function load() {
    try {
      const out = await api.request('/api/contracts/my');
      if (!out.response.ok || !out.result.success) return;
      contracts = out.result.contracts || [];
      if (!contracts.length) return;
      decorate();
      // The history lists are rendered asynchronously by mypage.js; decorate them whenever they change.
      new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.warn('전자계약 정보를 불러오지 못했습니다.', error);
    }
  }

  function decorate() {
    document.querySelectorAll('[data-application-action="edit"][data-type][data-id]').forEach(function (trigger) {
      const type = trigger.dataset.type;
      if (!TYPES.includes(type)) return;
      const item = trigger.closest('.precheck-history-item');
      if (!item || item.querySelector('.mypage-contract')) return;
      const contract = contracts.find(function (c) { return c.serviceType === type && String(c.requestId) === trigger.dataset.id && c.status !== 'canceled'; });
      if (!contract) return;
      const box = document.createElement('div');
      box.className = 'mypage-contract ' + contract.status;
      box.innerHTML = contractHtml(contract);
      (item.querySelector('.precheck-history-main') || item).append(box);
    });
  }

  function contractHtml(c) {
    if (c.status === 'requested') {
      return '<div><strong>전자계약 서명 요청</strong><span>담당자가 계약서를 보냈습니다. 내용을 확인하고 서명해 주세요.</span></div>' +
        '<button type="button" class="mypage-contract-button" data-contract-sign="' + c.id + '">전자계약 서명하기</button>';
    }
    if (c.status === 'completed') {
      return '<div><strong>전자계약 완료</strong><span>' + esc(formatDate(c.completedAt)) + ' 서명이 완료되었습니다.</span></div>' +
        '<a class="mypage-contract-button secondary" href="/api/contracts/' + c.id + '/download" target="_blank" rel="noopener">계약서 내려받기</a>';
    }
    return '<div><strong>전자계약 ' + (c.status === 'rejected' ? '서명 거절' : '처리 실패') + '</strong><span>담당자에게 문의해 주세요.</span></div>';
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-contract-sign]');
    if (button) openSigning(button.dataset.contractSign, button);
  });

  // 모두싸인 서명 화면은 iframe 안에서는 브라우저의 제3자 쿠키 차단 때문에 modusign.co.kr로 넘어가며 막히므로 새 창으로 엽니다.
  // The window is opened synchronously on the click (before the API call) so popup blockers allow it.
  let signingWindow = null;
  let watchTimer = null;

  async function openSigning(id, button) {
    signingWindow = window.open('', 'modusign-signing', 'width=1000,height=900');
    if (signingWindow) signingWindow.document.write('<p style="font-family:sans-serif;padding:24px">모두싸인 서명 화면을 여는 중입니다…</p>');
    button.disabled = true;
    button.textContent = '서명 화면 여는 중';
    try {
      const out = await api.request('/api/contracts/' + encodeURIComponent(id) + '/sign', { method: 'POST' });
      if (!out.response.ok || !out.result.success) throw new Error(out.result.message || '서명 화면을 열지 못했습니다.');
      if (signingWindow && !signingWindow.closed) signingWindow.location.href = out.result.embeddedUrl;
      else window.location.href = out.result.embeddedUrl; // popup blocked: continue in this tab
      showWaiting(id);
    } catch (error) {
      if (signingWindow && !signingWindow.closed) signingWindow.close();
      window.alert(error.message);
      if (/새로고침/.test(error.message)) window.location.reload();
    } finally {
      button.disabled = false;
      button.textContent = '전자계약 서명하기';
    }
  }

  function showWaiting(id) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'mypage-contract-dialog waiting';
      dialog.innerHTML = '<strong>새 창에서 전자계약 서명을 진행해 주세요.</strong>' +
        '<p>서명을 마치고 서명 창을 닫으면 자동으로 결과가 반영됩니다. 새 창이 보이지 않으면 브라우저의 팝업 차단을 해제해 주세요.</p>' +
        '<div class="mypage-contract-dialog-actions"><button type="button" data-close>닫기</button><button type="button" class="primary" data-check>서명 완료 확인</button></div>';
      dialog.querySelector('[data-close]').addEventListener('click', function () { dialog.close(); });
      dialog.querySelector('[data-check]').addEventListener('click', function () { checkStatus(true); });
      document.body.append(dialog);
    }
    dialog.dataset.contractId = id;
    if (!dialog.open) dialog.showModal();
    window.clearInterval(watchTimer);
    watchTimer = window.setInterval(function () {
      if (signingWindow && signingWindow.closed) {
        window.clearInterval(watchTimer);
        checkStatus(false);
      }
    }, 1000);
  }

  // The webhook may lag behind, so check the status right away when the signing window closes.
  async function checkStatus(manual) {
    const id = dialog && dialog.dataset.contractId;
    if (!id) return;
    try {
      const out = await api.request('/api/contracts/' + encodeURIComponent(id) + '/refresh', { method: 'POST' });
      if (out.response.ok && out.result.success && out.result.contract.status !== 'requested') { window.location.reload(); return; }
      if (manual) window.alert('아직 서명이 완료되지 않았습니다. 서명 창에서 서명을 마친 뒤 다시 확인해 주세요.');
      else if (dialog.open) dialog.close();
    } catch {
      if (manual) window.alert('계약 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; });
  }
})(window, document);
