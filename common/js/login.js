(function () {
  'use strict';

  const auth = window.TaeDoSAAuth;
  const form = document.querySelector('.login-form');
  if (!auth || !form) return;

  const usernameInput = document.getElementById('login-id');
  const passwordInput = document.getElementById('login-password');
  const toggleButton = document.getElementById('password-toggle');
  const submitButton = form.querySelector('.login-submit');
  const rememberIdCheckbox = form.querySelector('input[name="remember-id"]');
  const messageElement = document.getElementById('login-message');
  const STORAGE_KEY = 'teadosa_saved_username';

  restoreSavedUsername();
  showRedirectReason();
  bindPasswordToggle();
  checkExistingLogin();
  form.addEventListener('submit', handleSubmit);


  function showRedirectReason() {
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'session-expired') {
      showMessage('로그인 시간이 만료되었습니다. 다시 로그인해 주세요.', 'error');
    } else if (reason === 'login-required') {
      showMessage('마이페이지를 이용하려면 로그인이 필요합니다.', 'info');
    }
  }

  function restoreSavedUsername() {
    const savedUsername = localStorage.getItem(STORAGE_KEY);
    if (savedUsername && usernameInput) {
      usernameInput.value = savedUsername;
      if (rememberIdCheckbox) rememberIdCheckbox.checked = true;
    }
  }

  function bindPasswordToggle() {
    if (!passwordInput || !toggleButton) return;
    toggleButton.addEventListener('click', function () {
      const visible = passwordInput.type === 'text';
      passwordInput.type = visible ? 'password' : 'text';
      toggleButton.setAttribute('aria-pressed', String(!visible));
      toggleButton.setAttribute('aria-label', visible ? '비밀번호 표시' : '비밀번호 숨기기');
    });
  }

  async function checkExistingLogin() {
    try {
      const outcome = await auth.getSession();
      if (outcome.response.ok && outcome.result && outcome.result.authenticated) {
        window.location.replace(getSafeNextPath() || '/');
      }
    } catch (error) {
      console.warn('로그인 상태 확인 실패:', error);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearMessage();
    if (!form.reportValidity()) return;

    const username = String(usernameInput.value || '').normalize('NFKC').trim().toLowerCase();
    const password = passwordInput.value;
    setSubmitting(true);

    try {
      const outcome = await auth.login({ username: username, password: password });
      const result = outcome.result;
      if (!outcome.response.ok || !result || !result.success) {
        showMessage((result && result.message) || '로그인할 수 없습니다.', 'error');
        if (result && result.code === 'INVALID_CREDENTIALS') {
          passwordInput.value = '';
          passwordInput.focus();
        }
        return;
      }
      if (rememberIdCheckbox && rememberIdCheckbox.checked) localStorage.setItem(STORAGE_KEY, username);
      else localStorage.removeItem(STORAGE_KEY);
      showMessage('로그인되었습니다. 메인 페이지로 이동합니다.', 'info');
      window.location.href = getSafeNextPath() || '/';
    } catch (error) {
      console.error('로그인 요청 오류:', error);
      showMessage(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function getSafeNextPath() {
    const nextPath = new URLSearchParams(window.location.search).get('next');
    if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//') || nextPath.includes('\\')) return null;
    return nextPath;
  }

  function setSubmitting(state) { submitButton.disabled = state; submitButton.textContent = state ? '로그인 중...' : '로그인'; }
  function showMessage(message, type) { messageElement.hidden = false; messageElement.className = 'login-message ' + type; messageElement.textContent = message; }
  function clearMessage() { messageElement.hidden = true; messageElement.className = 'login-message'; messageElement.textContent = ''; }
})();
