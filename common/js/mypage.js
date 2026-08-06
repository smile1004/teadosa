(function () {
  'use strict';

  const session = window.TaeDoSASession;
  const info = document.getElementById('mypage-info');
  const message = document.getElementById('mypage-message');

  if (!session || !info || !message) return;

  loadMember();

  async function loadMember() {
    try {
      const member = await session.require({
        nextPath: '/mypage/',
        loginPath: '/login/'
      });

      if (!member) return;

      info.innerHTML = [
        createRow('회원 유형', member.memberType === 'business' ? '기업 전문 회원' : '개인 회원'),
        createRow('아이디', member.username || ''),
        createRow('이름', member.name || ''),
        createRow('이메일', member.email || ''),
        createRow('승인 상태', member.approvalStatus === 'approved' ? '승인 완료' : (member.approvalStatus || ''))
      ].join('');

      info.hidden = false;
      message.hidden = true;
    } catch (error) {
      console.error('마이페이지 회원정보 조회 오류:', error);
      message.textContent = error && error.message
        ? error.message
        : '회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  function createRow(label, value) {
    return '<div class="mypage-row"><span>' + escapeHtml(label) + '</span><span>' + escapeHtml(value) + '</span></div>';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[character];
    });
  }
})();
