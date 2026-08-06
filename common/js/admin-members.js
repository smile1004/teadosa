(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const elements = {
    accessMessage: document.getElementById('admin-access-message'), content: document.getElementById('admin-content'),
    form: document.getElementById('member-search-form'), search: document.getElementById('member-search'),
    memberType: document.getElementById('member-type-filter'), approval: document.getElementById('approval-filter'),
    reset: document.getElementById('reset-filter'), refresh: document.getElementById('refresh-members'),
    body: document.getElementById('member-table-body'), listMessage: document.getElementById('member-list-message'),
    previous: document.getElementById('previous-page'), next: document.getElementById('next-page'), pageStatus: document.getElementById('page-status'),
    totalCount: document.getElementById('total-count'), resultCount: document.getElementById('result-count'), pendingCount: document.getElementById('pending-count')
  };

  const state = { page: 1, pageSize: 20, totalPages: 1, loading: false, members: [] };

  window.addEventListener('teadosa:adminready', function () {
    applyQueryFilters();
    bindEvents();
    loadMembers();
  }, { once: true });

  function applyQueryFilters() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('search')) elements.search.value = params.get('search') || '';
    if (params.has('memberType')) elements.memberType.value = params.get('memberType') || '';
    if (params.has('approvalStatus')) elements.approval.value = params.get('approvalStatus') || '';
  }

  function bindEvents() {
    elements.form.addEventListener('submit', function (event) { event.preventDefault(); state.page = 1; loadMembers(); });
    elements.reset.addEventListener('click', function () { elements.form.reset(); state.page = 1; loadMembers(); });
    elements.refresh.addEventListener('click', loadMembers);
    elements.previous.addEventListener('click', function () { if (state.page > 1) { state.page -= 1; loadMembers(); } });
    elements.next.addEventListener('click', function () { if (state.page < state.totalPages) { state.page += 1; loadMembers(); } });
    elements.body.addEventListener('click', handleTableClick);
  }

  async function loadMembers() {
    if (state.loading) return;
    state.loading = true;
    setListMessage('회원목록을 불러오고 있습니다.');
    setControlsDisabled(true);
    try {
      const outcome = await auth.getAdminMembers({
        search: elements.search.value.trim(), memberType: elements.memberType.value,
        approvalStatus: elements.approval.value, page: state.page, pageSize: state.pageSize
      });
      const result = outcome.result || {};
      if (outcome.response.status === 401) return redirectToLogin(result.code === 'SESSION_EXPIRED' ? 'session-expired' : 'login-required');
      if (outcome.response.status === 403) throw new Error(result.message || '관리자 권한이 필요합니다.');
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '회원목록을 불러오지 못했습니다.');
      state.members = result.members || [];
      state.page = result.pagination.page;
      state.totalPages = result.pagination.totalPages;
      renderMembers(state.members);
      renderPagination(result.pagination);
      setListMessage(state.members.length ? '' : '검색 조건에 맞는 회원이 없습니다.');
    } catch (error) {
      state.members = [];
      renderMembers([]);
      setListMessage(error.message || '회원목록을 불러오지 못했습니다.', true);
    } finally { state.loading = false; setControlsDisabled(false); }
  }

  function renderMembers(members) {
    if (!members.length) { elements.body.innerHTML = '<tr><td class="empty-row" colspan="7">표시할 회원이 없습니다.</td></tr>'; return; }
    elements.body.innerHTML = members.map(function (member) {
      const isBusiness = member.memberType === 'business';
      const status = member.approvalStatus === 'approved' ? 'approved' : 'pending';
      const action = isBusiness ? (status === 'approved'
        ? '<button class="admin-button cancel" type="button" data-action="pending" data-member-id="' + member.id + '">승인취소</button>'
        : '<button class="admin-button approve" type="button" data-action="approved" data-member-id="' + member.id + '">승인</button>') : '<span class="member-sub">해당 없음</span>';
      return '<tr>' +
        '<td><span class="member-main">' + escapeHtml(member.name || '미등록') + '</span><span class="member-sub">' + escapeHtml(member.username) + '</span></td>' +
        '<td><span class="type-badge">' + (isBusiness ? '기업회원' : '개인회원') + '</span>' + (member.role === 'admin' ? '<span class="role-badge">관리자</span>' : '') + '</td>' +
        '<td><span class="member-main">' + escapeHtml(member.companyName || '-') + '</span><span class="member-sub">' + formatBusinessNumber(member.businessNumber) + '</span></td>' +
        '<td><span class="member-main">' + escapeHtml(member.email || '-') + '</span><span class="member-sub">' + formatPhone(member.phone) + '</span></td>' +
        '<td><span class="status-badge ' + status + '">' + (status === 'approved' ? '승인 완료' : '승인 대기') + '</span></td>' +
        '<td>' + formatDate(member.createdAt) + '</td><td><div class="row-actions"><a class="admin-button detail" href="/admin/members/detail/?id=' + encodeURIComponent(member.id) + '">상세보기</a>' + action + '</div></td></tr>';
    }).join('');
  }

  function handleTableClick(event) {
    const button = event.target.closest('[data-member-id][data-action]');
    if (!button) return;
    handleApprovalClick(button);
  }

  async function handleApprovalClick(button) {
    const memberId = button.dataset.memberId;
    const status = button.dataset.action;
    const member = state.members.find(function (item) { return String(item.id) === String(memberId); });
    const label = status === 'approved' ? '승인' : '승인취소';
    if (!window.confirm((member?.companyName || member?.username || '선택 회원') + ' 계정을 ' + label + '하시겠습니까?')) return;
    button.disabled = true;
    try {
      const outcome = await auth.updateMemberApproval(memberId, status);
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '승인 상태를 변경하지 못했습니다.');
      setListMessage(result.message || '처리가 완료되었습니다.');
      await loadMembers();
    } catch (error) { setListMessage(error.message || '승인 상태를 변경하지 못했습니다.', true); }
    finally { button.disabled = false; }
  }

  function renderPagination(pagination) {
    elements.pageStatus.textContent = pagination.page + ' / ' + pagination.totalPages;
    elements.previous.disabled = pagination.page <= 1;
    elements.next.disabled = pagination.page >= pagination.totalPages;
    elements.totalCount.textContent = String(pagination.total);
    elements.resultCount.textContent = String(state.members.length);
    elements.pendingCount.textContent = String(state.members.filter(function (member) { return member.memberType === 'business' && member.approvalStatus === 'pending'; }).length);
  }
  function setControlsDisabled(disabled) { [elements.refresh, elements.previous, elements.next].forEach(function (el) { el.disabled = disabled; }); }
  function setListMessage(message, error) { elements.listMessage.textContent = message || ''; elements.listMessage.classList.toggle('error', Boolean(error)); elements.listMessage.hidden = !message; }
  function showAccessError(message) { elements.accessMessage.textContent = message; elements.accessMessage.classList.add('error'); }
  function redirectToLogin(reason) { const params = new URLSearchParams({ next: '/admin/', reason: reason }); window.location.replace('/login/?' + params.toString()); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, function (char) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]; }); }
  function formatDate(value) { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? escapeHtml(value) : new Intl.DateTimeFormat('ko-KR').format(date); }
  function formatPhone(value) { const digits = String(value || '').replace(/\D/g, ''); if (!digits) return '-'; if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3'); return escapeHtml(value); }
  function formatBusinessNumber(value) { const digits = String(value || '').replace(/\D/g, ''); return digits.length === 10 ? digits.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : (escapeHtml(value) || '-'); }
})(window, document);
