(function () {
  'use strict';

  const session = window.TaeDoSASession;
  const content = document.getElementById('mypage-content');
  const message = document.getElementById('mypage-message');
  const summary = document.getElementById('mypage-summary');
  const memberTypeBadge = document.getElementById('member-type-badge');
  const approvalBadge = document.getElementById('approval-badge');
  const accountInfo = document.getElementById('account-info');
  const businessInfo = document.getElementById('business-info');
  const businessSection = document.getElementById('business-section');

  if (!session || !content || !message || !accountInfo) return;

  loadMember();

  async function loadMember() {
    try {
      const member = await session.require({
        nextPath: '/mypage/',
        loginPath: '/login/'
      });

      if (!member) return;

      const isBusiness = member.memberType === 'business';
      const memberTypeText = isBusiness ? '기업 전문 회원' : '개인 회원';

      summary.textContent = (member.name || member.username || '회원') + '님의 가입정보입니다.';
      memberTypeBadge.textContent = memberTypeText;

      accountInfo.innerHTML = [
        createRow('회원 유형', memberTypeText),
        createRow('아이디', displayValue(member.username)),
        createRow(isBusiness ? '담당자명' : '이름', displayValue(member.name)),
        createRow('이메일', displayValue(member.email)),
        createRow('휴대전화', formatPhone(member.phone)),
        createRow('주소', formatAddress(member)),
        createRow('가입일', formatDate(member.createdAt))
      ].join('');

      if (isBusiness && businessSection && businessInfo) {
        businessInfo.innerHTML = [
          createRow('기업명', displayValue(member.companyName)),
          createRow('사업자등록번호', formatBusinessNumber(member.businessNumber)),
          createRow('대표자명', displayValue(member.ceoName)),
          createRow('업태', displayValue(member.businessType)),
          createRow('종목', displayValue(member.businessItem)),
          createRow('담당 부서', displayValue(member.department)),
          createRow('회사 전화', formatPhone(member.officePhone)),
          createRow('승인 상태', approvalText(member.approvalStatus))
        ].join('');

        approvalBadge.textContent = approvalText(member.approvalStatus);
        approvalBadge.dataset.status = member.approvalStatus || 'unknown';
        businessSection.hidden = false;
      }

      content.hidden = false;
      message.hidden = true;
    } catch (error) {
      console.error('마이페이지 회원정보 조회 오류:', error);
      message.classList.add('error');
      message.textContent = error && error.message
        ? error.message
        : '회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  function createRow(label, value) {
    return '<div class="mypage-row">' +
      '<dt>' + escapeHtml(label) + '</dt>' +
      '<dd>' + escapeHtml(value) + '</dd>' +
      '</div>';
  }

  function displayValue(value) {
    const text = value === null || value === undefined ? '' : String(value).trim();
    return text || '미등록';
  }

  function formatAddress(member) {
    const postalCode = displayRaw(member.postalCode);
    const address = displayRaw(member.address);
    const detail = displayRaw(member.addressDetail);
    const parts = [];
    if (postalCode) parts.push('(' + postalCode + ')');
    if (address) parts.push(address);
    if (detail) parts.push(detail);
    return parts.length ? parts.join(' ') : '미등록';
  }

  function formatPhone(value) {
    const original = displayRaw(value);
    if (!original) return '미등록';
    const digits = original.replace(/\D/g, '');
    if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (digits.length === 10 && digits.startsWith('02')) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    if (digits.length === 9 && digits.startsWith('02')) return digits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    return original;
  }

  function formatBusinessNumber(value) {
    const digits = displayRaw(value).replace(/\D/g, '');
    if (digits.length !== 10) return digits || '미등록';
    return digits.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
  }

  function formatDate(value) {
    const raw = displayRaw(value);
    if (!raw) return '미등록';
    const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : raw.replace(' ', 'T') + 'Z';
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(date);
  }

  function approvalText(status) {
    if (status === 'approved') return '승인 완료';
    if (status === 'pending') return '승인 대기';
    if (status === 'rejected') return '승인 반려';
    return displayValue(status);
  }

  function displayRaw(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[character];
    });
  }
})();
