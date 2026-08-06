(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  if (!auth) return;

  const accessMessage = document.getElementById('admin-access-message');
  const protectedContent = document.getElementById('admin-protected-content');
  const adminName = document.getElementById('admin-user-name');
  const logoutButton = document.getElementById('admin-logout');

  init();

  async function init() {
    try {
      const member = await auth.requireAuth({ redirect: false });
      if (!member) return redirectToLogin('login-required');
      if (member.role !== 'admin') {
        showAccessError('관리자 권한이 없는 계정입니다.');
        window.setTimeout(function () { window.location.replace('/mypage/'); }, 1500);
        return;
      }

      if (adminName) adminName.textContent = (member.name || member.username || '관리자') + '님';
      if (accessMessage) accessMessage.hidden = true;
      if (protectedContent) protectedContent.hidden = false;
      markActiveMenu();
      window.dispatchEvent(new CustomEvent('teadosa:adminready', { detail: { member: member } }));
    } catch (error) {
      showAccessError(error.message || '관리자 권한을 확인하지 못했습니다.');
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async function () {
      logoutButton.disabled = true;
      try { await auth.logout(); } finally { window.location.replace('/login/'); }
    });
  }

  function markActiveMenu() {
    const currentPath = window.location.pathname.replace(/\/+$/, '/') || '/';
    document.querySelectorAll('[data-admin-path]').forEach(function (link) {
      const path = link.getAttribute('data-admin-path');
      const active = path === '/admin/' ? currentPath === '/admin/' : currentPath.startsWith(path);
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function redirectToLogin(reason) {
    const params = new URLSearchParams({ next: window.location.pathname + window.location.search, reason: reason });
    window.location.replace('/login/?' + params.toString());
  }

  function showAccessError(message) {
    if (!accessMessage) return;
    accessMessage.hidden = false;
    accessMessage.textContent = message;
    accessMessage.classList.add('error');
  }
})(window, document);
