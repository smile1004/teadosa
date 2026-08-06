(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  window.addEventListener('teadosa:adminready', loadDashboard, { once: true });

  async function loadDashboard() {
    const message = document.getElementById('dashboard-message');
    try {
      const outcome = await auth.getAdminSummary();
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '관리 현황을 불러오지 못했습니다.');

      setText('dashboard-total-members', result.summary.totalMembers);
      setText('dashboard-personal-members', result.summary.personalMembers);
      setText('dashboard-business-members', result.summary.businessMembers);
      setText('dashboard-pending-members', result.summary.pendingBusinessMembers);
      setText('dashboard-pending-members-copy', result.summary.pendingBusinessMembers);
      setText('dashboard-approved-members', result.summary.approvedBusinessMembers);
      renderRecent(result.recentMembers || []);
      if (message) message.hidden = true;
    } catch (error) {
      if (message) {
        message.hidden = false;
        message.classList.add('error');
        message.textContent = error.message || '관리 현황을 불러오지 못했습니다.';
      }
    }
  }

  function renderRecent(members) {
    const body = document.getElementById('recent-member-list');
    if (!body) return;
    if (!members.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-row">등록된 회원이 없습니다.</td></tr>';
      return;
    }
    body.innerHTML = members.map(function (member) {
      const type = member.memberType === 'business' ? '기업회원' : '개인회원';
      const status = member.memberType === 'business'
        ? (member.approvalStatus === 'approved' ? '승인 완료' : '승인 대기')
        : '정상';
      return '<tr>' +
        '<td><strong>' + escapeHtml(member.name || '-') + '</strong><span class="member-sub">' + escapeHtml(member.username || '-') + '</span></td>' +
        '<td>' + type + '</td>' +
        '<td>' + escapeHtml(member.companyName || '-') + '</td>' +
        '<td><span class="status-badge ' + (member.approvalStatus || 'approved') + '">' + status + '</span></td>' +
        '<td>' + formatDate(member.createdAt) + '</td>' +
      '</tr>';
    }).join('');
  }

  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = Number(value || 0).toLocaleString('ko-KR'); }
  function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('ko-KR').format(date); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, function (character) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]; }); }
})(window, document);
