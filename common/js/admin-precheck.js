(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const state = { page: 1, pageSize: 20, totalPages: 1, loading: false, requests: [] };
  const el = {};

  window.addEventListener('teadosa:adminready', init, { once: true });

  function init() {
    el.form = document.getElementById('precheck-search-form');
    el.search = document.getElementById('precheck-search');
    el.status = document.getElementById('precheck-status-filter');
    el.reset = document.getElementById('precheck-reset-filter');
    el.refresh = document.getElementById('refresh-precheck');
    el.body = document.getElementById('precheck-table-body');
    el.message = document.getElementById('precheck-list-message');
    el.previous = document.getElementById('precheck-previous-page');
    el.next = document.getElementById('precheck-next-page');
    el.pageStatus = document.getElementById('precheck-page-status');

    const params = new URLSearchParams(window.location.search);
    el.search.value = params.get('search') || '';
    el.status.value = params.get('status') || '';

    el.form.addEventListener('submit', function (event) { event.preventDefault(); state.page = 1; syncUrl(); loadRequests(); });
    el.reset.addEventListener('click', function () { el.search.value = ''; el.status.value = ''; state.page = 1; syncUrl(); loadRequests(); });
    el.refresh.addEventListener('click', loadRequests);
    el.previous.addEventListener('click', function () { if (state.page > 1) { state.page -= 1; loadRequests(); } });
    el.next.addEventListener('click', function () { if (state.page < state.totalPages) { state.page += 1; loadRequests(); } });
    el.body.addEventListener('change', handleStatusChange);

    loadRequests();
  }

  async function loadRequests() {
    if (state.loading) return;
    state.loading = true;
    setMessage('사전검토 신청목록을 불러오고 있습니다.');
    setControlsDisabled(true);
    try {
      const outcome = await auth.getAdminPrecheckRequests({
        search: el.search.value.trim(), status: el.status.value, page: state.page, pageSize: state.pageSize
      });
      const result = outcome.result || {};
      if (outcome.response.status === 401) return redirectToLogin(result.code === 'SESSION_EXPIRED' ? 'session-expired' : 'login-required');
      if (outcome.response.status === 403) throw new Error(result.message || '관리자 권한이 필요합니다.');
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '사전검토 신청목록을 불러오지 못했습니다.');

      state.requests = result.requests || [];
      state.page = result.pagination.page;
      state.totalPages = result.pagination.totalPages;
      renderSummary(result.summary || {});
      renderRows(state.requests);
      renderPagination(result.pagination);
      setMessage(state.requests.length ? '' : '검색 조건에 맞는 사전검토 신청이 없습니다.');
    } catch (error) {
      state.requests = [];
      renderRows([]);
      setMessage(error.message || '사전검토 신청목록을 불러오지 못했습니다.', true);
    } finally {
      state.loading = false;
      setControlsDisabled(false);
    }
  }

  function renderRows(requests) {
    if (!requests.length) {
      el.body.innerHTML = '<tr><td class="empty-row" colspan="8">표시할 사전검토 신청이 없습니다.</td></tr>';
      return;
    }
    el.body.innerHTML = requests.map(function (item) {
      return '<tr>' +
        '<td><span class="member-main precheck-request-no">' + escapeHtml(item.requestNo || '-') + '</span></td>' +
        '<td><span class="member-main">' + escapeHtml(item.applicantName || '-') + '</span><span class="member-sub">' + memberTypeLabel(item.memberType) + '</span></td>' +
        '<td><span class="member-main">' + formatPhone(item.phone) + '</span><span class="member-sub">' + escapeHtml(item.email || '-') + '</span></td>' +
        '<td>' + escapeHtml(item.companyName || '-') + '</td>' +
        '<td><span class="precheck-address" title="' + escapeHtml(item.siteAddress || '') + '">' + escapeHtml(item.siteAddress || '-') + '</span></td>' +
        '<td>' + formatDate(item.submittedAt) + '</td>' +
        '<td><select class="precheck-status-select status-' + escapeHtml(item.status) + '" data-request-id="' + item.id + '" data-original-status="' + escapeHtml(item.status) + '" aria-label="' + escapeHtml(item.requestNo || '신청') + ' 처리상태">' + statusOptions(item.status) + '</select></td>' +
        '<td><a class="admin-button detail" href="/admin/precheck/detail/?id=' + encodeURIComponent(item.id) + '">상세보기</a></td>' +
      '</tr>';
    }).join('');
  }

  async function handleStatusChange(event) {
    const select = event.target.closest('.precheck-status-select');
    if (!select) return;
    const requestId = select.dataset.requestId;
    const previousStatus = select.dataset.originalStatus;
    const nextStatus = select.value;
    if (previousStatus === nextStatus) return;

    const item = state.requests.find(function (row) { return String(row.id) === String(requestId); });
    const label = statusLabel(nextStatus);
    if (!window.confirm((item?.requestNo || '선택 신청') + '의 처리상태를 [' + label + ']로 변경하시겠습니까?')) {
      select.value = previousStatus;
      return;
    }

    select.disabled = true;
    try {
      const outcome = await auth.updateAdminPrecheckStatus(requestId, nextStatus);
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '처리상태를 변경하지 못했습니다.');
      select.dataset.originalStatus = nextStatus;
      select.className = 'precheck-status-select status-' + nextStatus;
      setMessage(result.message || '처리상태가 변경되었습니다.');
      await loadRequests();
    } catch (error) {
      select.value = previousStatus;
      setMessage(error.message || '처리상태를 변경하지 못했습니다.', true);
    } finally { select.disabled = false; }
  }

  function renderSummary(summary) {
    setText('precheck-total-count', summary.total);
    setText('precheck-received-count', summary.received);
    setText('precheck-reviewing-count', summary.reviewing);
    setText('precheck-supplement-count', summary.supplementRequired);
    setText('precheck-completed-count', summary.completed);
  }

  function renderPagination(pagination) {
    el.pageStatus.textContent = pagination.page + ' / ' + pagination.totalPages;
    el.previous.disabled = pagination.page <= 1;
    el.next.disabled = pagination.page >= pagination.totalPages;
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (el.search.value.trim()) params.set('search', el.search.value.trim());
    if (el.status.value) params.set('status', el.status.value);
    const query = params.toString();
    window.history.replaceState(null, '', '/admin/precheck/' + (query ? '?' + query : ''));
  }

  function statusOptions(selected) {
    return [
      ['received', '접수'], ['reviewing', '검토중'], ['supplement_required', '보완요청'], ['completed', '검토완료']
    ].map(function (option) { return '<option value="' + option[0] + '"' + (selected === option[0] ? ' selected' : '') + '>' + option[1] + '</option>'; }).join('');
  }

  function statusLabel(value) { return ({ received: '접수', reviewing: '검토중', supplement_required: '보완요청', completed: '검토완료' })[value] || value; }
  function memberTypeLabel(value) { return value === 'business' ? '기업회원' : value === 'personal' ? '개인회원' : '회원'; }
  function setControlsDisabled(disabled) { [el.refresh, el.previous, el.next].forEach(function (node) { if (node) node.disabled = disabled; }); }
  function setMessage(message, error) { el.message.textContent = message || ''; el.message.classList.toggle('error', Boolean(error)); el.message.hidden = !message; }
  function setText(id, value) { const node = document.getElementById(id); if (node) node.textContent = Number(value || 0).toLocaleString('ko-KR'); }
  function redirectToLogin(reason) { const params = new URLSearchParams({ next: '/admin/precheck/', reason: reason }); window.location.replace('/login/?' + params.toString()); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, function (char) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]; }); }
  function formatDate(value) { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? escapeHtml(value) : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
  function formatPhone(value) { const digits = String(value || '').replace(/\D/g, ''); if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3'); if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'); return escapeHtml(value || '-'); }
})(window, document);
