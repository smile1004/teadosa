(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const message = document.getElementById('member-detail-message');
  const content = document.getElementById('member-detail-content');
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('id');
  let member = null;

  window.addEventListener('teadosa:adminready', loadMember, { once: true });
  document.getElementById('detail-actions').addEventListener('click', handleApproval);

  async function loadMember() {
    if (!/^\d+$/.test(memberId || '')) return showError('회원 번호가 올바르지 않습니다.');
    setMessage('회원정보를 불러오고 있습니다.');
    try {
      const outcome = await auth.getAdminMember(memberId);
      const result = outcome.result || {};
      if (outcome.response.status === 401) return redirectToLogin(result.code === 'SESSION_EXPIRED' ? 'session-expired' : 'login-required');
      if (outcome.response.status === 403) throw new Error(result.message || '관리자 권한이 필요합니다.');
      if (!outcome.response.ok || !result.success || !result.member) throw new Error(result.message || '회원정보를 불러오지 못했습니다.');
      member = result.member;
      renderMember(member);
      message.hidden = true;
      content.hidden = false;
    } catch (error) { showError(error.message || '회원정보를 불러오지 못했습니다.'); }
  }

  function renderMember(item) {
    const isBusiness = item.memberType === 'business';
    const approved = item.approvalStatus === 'approved';
    setText('detail-name', item.name || item.companyName || '이름 미등록');
    setText('detail-username', item.username);
    setText('detail-id', item.id);
    setText('detail-account-username', item.username);
    setText('detail-account-name', item.name);
    setText('detail-email', item.email);
    setText('detail-phone', formatPhone(item.phone));
    setText('detail-type-text', isBusiness ? '기업 전문 회원' : '개인 회원');
    setText('detail-role-text', item.role === 'admin' ? '관리자' : '일반회원');
    setText('detail-postal-code', item.postalCode);
    setText('detail-address', item.address);
    setText('detail-address-detail', item.addressDetail);
    setText('detail-created-at', formatDateTime(item.createdAt));
    setText('detail-updated-at', formatDateTime(item.updatedAt));
    setText('detail-session-count', item.activeSessionCount || 0);

    const typeBadge = document.getElementById('detail-member-type');
    typeBadge.textContent = isBusiness ? '기업회원' : '개인회원';
    const roleBadge = document.getElementById('detail-role');
    roleBadge.hidden = item.role !== 'admin';
    const approvalBadge = document.getElementById('detail-approval');
    approvalBadge.textContent = approved ? '승인 완료' : '승인 대기';
    approvalBadge.className = 'status-badge ' + (approved ? 'approved' : 'pending');

    const businessCard = document.getElementById('business-detail-card');
    businessCard.hidden = !isBusiness;
    if (isBusiness) {
      setText('detail-company-name', item.companyName);
      setText('detail-business-number', formatBusinessNumber(item.businessNumber));
      setText('detail-ceo-name', item.ceoName);
      setText('detail-business-type', item.businessType);
      setText('detail-business-item', item.businessItem);
      setText('detail-department', item.department);
      setText('detail-office-phone', formatPhone(item.officePhone));
      setText('detail-approval-text', approved ? '승인 완료' : '승인 대기');
      document.getElementById('detail-actions').innerHTML = approved
        ? '<button class="admin-button cancel" type="button" data-approval="pending">승인취소</button>'
        : '<button class="admin-button approve" type="button" data-approval="approved">승인</button>';
    } else {
      document.getElementById('detail-actions').innerHTML = '';
    }
  }

  async function handleApproval(event) {
    const button = event.target.closest('[data-approval]');
    if (!button || !member) return;
    const nextStatus = button.dataset.approval;
    const label = nextStatus === 'approved' ? '승인' : '승인취소';
    if (!window.confirm((member.companyName || member.username) + ' 계정을 ' + label + '하시겠습니까?')) return;
    button.disabled = true;
    try {
      const outcome = await auth.updateMemberApproval(member.id, nextStatus);
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '승인 상태를 변경하지 못했습니다.');
      setMessage(result.message || '처리가 완료되었습니다.');
      message.hidden = false;
      await loadMember();
    } catch (error) {
      showError(error.message || '승인 상태를 변경하지 못했습니다.');
    } finally { button.disabled = false; }
  }

  function setText(id, value) { document.getElementById(id).textContent = value === null || value === undefined || value === '' ? '미등록' : String(value); }
  function setMessage(text) { message.textContent = text; message.classList.remove('error'); message.hidden = false; }
  function showError(text) { message.textContent = text; message.classList.add('error'); message.hidden = false; content.hidden = true; }
  function redirectToLogin(reason) { const query = new URLSearchParams({ next: window.location.pathname + window.location.search, reason: reason }); window.location.replace('/admin/login/?' + query.toString()); }
  function formatDateTime(value) { if (!value) return '미등록'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(date); }
  function formatPhone(value) { const digits = String(value || '').replace(/\D/g, ''); if (!digits) return '미등록'; if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3'); if (digits.length === 10) return digits.replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3'); return String(value); }
  function formatBusinessNumber(value) { const digits = String(value || '').replace(/\D/g, ''); return digits.length === 10 ? digits.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : (value || '미등록'); }
})(window, document);
