(function () {
  'use strict';

  const auth = window.TaeDoSAAuth;
  const form = document.querySelector('.signup-panel');
  if (!auth || !form) return;

  const isBusiness = document.body.classList.contains('business-signup-page');
  const memberType = isBusiness ? 'business' : 'personal';
  const submitButton = form.querySelector('button[type="submit"]');
  const initialSubmitText = submitButton ? submitButton.textContent : '';
  const usernameInput = document.getElementById('user-id');
  const usernameButton = document.getElementById('check-username');
  const usernameStatus = document.getElementById('username-status');
  const emailInput = document.getElementById('email');
  const emailStatus = document.getElementById('email-status');
  const passwordInput = document.getElementById('password');
  const passwordConfirmInput = document.getElementById('password-confirm');
  const passwordStatus = document.getElementById('password-status');
  const addressButton = document.getElementById('search-address');
  const postcodeInput = document.getElementById('postcode');
  const addressInput = form.querySelector('[name="address"]');
  const addressDetailInput = form.querySelector('[name="address-detail"]');
  const allAgree = document.getElementById('agree-all');
  const agreeItems = Array.from(document.querySelectorAll('.agreement-list input[type="checkbox"]'));
  const businessInputs = isBusiness ? Array.from(form.querySelectorAll('[name^="business-number-"]')) : [];
  const businessButton = document.getElementById('check-business-number');
  const businessStatus = document.getElementById('business-number-status');

  let checkedUsername = '';
  let checkedBusinessNumber = '';
  let emailTimer = null;
  let emailRequestId = 0;

  bindAgreements();
  bindPasswordToggles();
  bindNumericInputs();
  bindUsernameCheck();
  bindEmailCheck();
  bindPasswordValidation();
  bindAddressSearch();
  bindBusinessNumberCheck();
  bindBusinessFileName();
  form.addEventListener('submit', handleSubmit);

  function bindAgreements() {
    if (allAgree) {
      allAgree.addEventListener('change', function () {
        agreeItems.forEach(function (item) { item.checked = allAgree.checked; });
      });
    }
    agreeItems.forEach(function (item) {
      item.addEventListener('change', function () {
        if (allAgree) allAgree.checked = agreeItems.every(function (check) { return check.checked; });
      });
    });
  }

  function bindPasswordToggles() {
    document.querySelectorAll('.eye-button').forEach(function (button) {
      button.addEventListener('click', function () {
        const target = document.getElementById(button.dataset.passwordTarget);
        if (!target) return;
        const show = target.type === 'password';
        target.type = show ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(show));
        button.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 표시');
      });
    });
  }

  function bindNumericInputs() {
    document.querySelectorAll('input[inputmode="numeric"]').forEach(function (input) {
      input.addEventListener('input', function () {
        input.value = input.value.replace(/\D/g, '').slice(0, input.maxLength || 99);
      });
    });
  }

  function bindUsernameCheck() {
    if (!usernameInput || !usernameButton) return;
    usernameInput.addEventListener('input', function () {
      checkedUsername = '';
      clearField(usernameInput, usernameStatus, '아이디 중복확인을 해주세요.', 'info');
    });
    usernameButton.addEventListener('click', async function () {
      const value = normalizeUsername(usernameInput.value);
      if (!/^[a-zA-Z0-9_-]{6,20}$/.test(value)) {
        setField(usernameInput, usernameStatus, '아이디는 영문, 숫자, 밑줄, 하이픈을 사용하여 6~20자로 입력해 주세요.', 'error');
        return;
      }
      setButtonBusy(usernameButton, true, '확인 중...', '중복확인');
      try {
        const result = (await auth.checkDuplicate('username', value)).result;
        if (result && result.available) {
          checkedUsername = result.normalizedValue || value;
          usernameInput.value = checkedUsername;
          setField(usernameInput, usernameStatus, result.message, 'success');
        } else {
          checkedUsername = '';
          setField(usernameInput, usernameStatus, (result && result.message) || '중복확인에 실패했습니다.', 'error');
        }
      } catch (error) {
        checkedUsername = '';
        setField(usernameInput, usernameStatus, error.message, 'error');
      } finally {
        setButtonBusy(usernameButton, false, '확인 중...', '중복확인');
      }
    });
  }

  function bindEmailCheck() {
    if (!emailInput) return;
    emailInput.addEventListener('input', function () {
      clearTimeout(emailTimer);
      emailRequestId += 1;
      clearField(emailInput, emailStatus, '이메일 형식과 중복 여부를 확인합니다.', 'info');
      const currentRequestId = emailRequestId;
      emailTimer = setTimeout(async function () {
        const value = normalizeEmail(emailInput.value);
        if (!value || !isValidEmail(value)) return;
        try {
          const result = (await auth.checkDuplicate('email', value)).result;
          if (currentRequestId !== emailRequestId) return;
          setField(emailInput, emailStatus, (result && result.message) || '이메일을 확인할 수 없습니다.', result && result.available ? 'success' : 'error');
        } catch (error) {
          if (currentRequestId !== emailRequestId) return;
          setField(emailInput, emailStatus, error.message, 'error');
        }
      }, 450);
    });
  }

  function bindPasswordValidation() {
    [passwordInput, passwordConfirmInput].forEach(function (input) {
      if (input) input.addEventListener('input', validatePassword);
    });
  }

  function bindAddressSearch() {
    if (!addressButton) return;
    addressButton.addEventListener('click', function () {
      if (!window.kakao || !window.kakao.Postcode) {
        alert('주소검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      new window.kakao.Postcode({
        oncomplete: function (data) {
          if (postcodeInput) postcodeInput.value = data.zonecode || '';
          if (addressInput) addressInput.value = data.roadAddress || data.jibunAddress || '';
          if (addressDetailInput) addressDetailInput.focus();
        }
      }).open({ popupTitle: '태도사 주소검색' });
    });
  }

  function bindBusinessNumberCheck() {
    if (!isBusiness || !businessInputs.length || !businessButton) return;
    businessInputs.forEach(function (input) {
      input.addEventListener('input', function () {
        checkedBusinessNumber = '';
        clearField(businessInputs[0], businessStatus, '사업자등록번호 중복확인을 해주세요.', 'info');
      });
    });
    businessButton.addEventListener('click', async function () {
      const value = getBusinessNumber();
      if (!/^\d{10}$/.test(value) || !isValidBusinessNumber(value)) {
        setField(businessInputs[0], businessStatus, '사업자등록번호 10자리를 정확하게 입력해 주세요.', 'error');
        return;
      }
      setButtonBusy(businessButton, true, '확인 중...', '중복확인');
      try {
        const result = (await auth.checkDuplicate('businessNumber', value)).result;
        if (result && result.available) {
          checkedBusinessNumber = result.normalizedValue || value;
          setField(businessInputs[0], businessStatus, result.message, 'success');
        } else {
          checkedBusinessNumber = '';
          setField(businessInputs[0], businessStatus, (result && result.message) || '중복확인에 실패했습니다.', 'error');
        }
      } catch (error) {
        checkedBusinessNumber = '';
        setField(businessInputs[0], businessStatus, error.message, 'error');
      } finally {
        setButtonBusy(businessButton, false, '확인 중...', '중복확인');
      }
    });
  }

  function bindBusinessFileName() {
    const input = document.getElementById('business-file');
    const label = document.getElementById('business-file-name');
    if (!input || !label) return;
    input.addEventListener('change', function () {
      label.textContent = input.files && input.files[0] ? input.files[0].name : 'PDF, JPG, PNG 파일을 첨부해 주세요.';
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!agreeItems.filter(function (item) { return item.required; }).every(function (item) { return item.checked; })) {
      alert('필수 약관에 모두 동의해 주세요.');
      return;
    }

    const username = normalizeUsername(usernameInput ? usernameInput.value : '');
    if (checkedUsername !== username) {
      setField(usernameInput, usernameStatus, '아이디 중복확인을 완료해 주세요.', 'error');
      if (usernameInput) usernameInput.focus();
      return;
    }
    if (!validatePassword()) {
      if (passwordInput) passwordInput.focus();
      return;
    }
    if (isBusiness && checkedBusinessNumber !== getBusinessNumber()) {
      setField(businessInputs[0], businessStatus, '사업자등록번호 중복확인을 완료해 주세요.', 'error');
      if (businessInputs[0]) businessInputs[0].focus();
      return;
    }
    if (isBusiness && (!valueOf(postcodeInput) || !valueOf(addressInput))) {
      alert('사업장 주소를 검색해 입력해 주세요.');
      if (addressButton) addressButton.focus();
      return;
    }

    const email = normalizeEmail(emailInput ? emailInput.value : '');
    try {
      const emailResult = (await auth.checkDuplicate('email', email)).result;
      if (!emailResult || !emailResult.available) {
        setField(emailInput, emailStatus, (emailResult && emailResult.message) || '이메일을 확인해 주세요.', 'error');
        if (emailInput) emailInput.focus();
        return;
      }
    } catch (error) {
      setField(emailInput, emailStatus, error.message, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(username, email);
      const result = (await auth.signup(payload)).result;
      if (!result || !result.success) {
        alert((result && result.message) || '회원가입 처리 중 오류가 발생했습니다.');
        return;
      }
      alert(isBusiness ? '기업회원 가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.' : '개인 회원가입이 완료되었습니다.');
      window.location.href = '/login/';
    } catch (error) {
      console.error('회원가입 요청 오류:', error);
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function buildPayload(username, email) {
    const payload = {
      memberType: memberType,
      username: username,
      email: email,
      password: passwordInput ? passwordInput.value : '',
      passwordConfirm: passwordConfirmInput ? passwordConfirmInput.value : '',
      name: valueOf(document.getElementById(isBusiness ? 'manager-name' : 'member-name')),
      phone: valueOf(form.querySelector('[name="phone-first"]')) + digits(valueOf(form.querySelector('[name="phone-middle"]'))) + digits(valueOf(form.querySelector('[name="phone-last"]'))),
      postalCode: valueOf(postcodeInput),
      address: valueOf(addressInput),
      addressDetail: valueOf(addressDetailInput)
    };
    if (isBusiness) {
      Object.assign(payload, {
        companyName: valueOf(document.getElementById('company-name')),
        businessNumber: getBusinessNumber(),
        ceoName: valueOf(document.getElementById('ceo-name')),
        businessType: valueOf(document.getElementById('business-type')),
        businessItem: valueOf(document.getElementById('business-item')),
        department: valueOf(document.getElementById('department')),
        officePhone: valueOf(document.getElementById('office-phone'))
      });
    }
    return payload;
  }

  function validatePassword() {
    if (!passwordInput || !passwordConfirmInput) return false;
    const value = passwordInput.value;
    const valid = value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
    if (!value) {
      clearField(passwordInput, passwordStatus, '영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요.', 'info');
      return false;
    }
    if (!valid) {
      setField(passwordInput, passwordStatus, '영문, 숫자, 특수문자를 모두 포함해 8자 이상 입력해 주세요.', 'error');
      return false;
    }
    if (passwordConfirmInput.value && value !== passwordConfirmInput.value) {
      setField(passwordConfirmInput, passwordStatus, '비밀번호 확인이 일치하지 않습니다.', 'error');
      return false;
    }
    setField(passwordConfirmInput.value ? passwordConfirmInput : passwordInput, passwordStatus, passwordConfirmInput.value ? '비밀번호가 일치합니다.' : '사용 가능한 비밀번호입니다.', 'success');
    return true;
  }

  function getBusinessNumber() {
    return businessInputs.map(function (input) { return digits(input.value); }).join('');
  }

  function isValidBusinessNumber(value) {
    const numbers = value.split('').map(Number);
    const weights = [1, 3, 7, 1, 3, 7, 1, 3];
    let sum = weights.reduce(function (total, weight, index) { return total + numbers[index] * weight; }, 0);
    const ninth = numbers[8] * 5;
    sum += Math.floor(ninth / 10) + (ninth % 10);
    return ((10 - (sum % 10)) % 10) === numbers[9];
  }

  function normalizeUsername(value) { return String(value || '').normalize('NFKC').trim().toLowerCase(); }
  function normalizeEmail(value) { return String(value || '').normalize('NFKC').trim().toLowerCase(); }
  function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
  function digits(value) { return String(value || '').replace(/\D/g, ''); }
  function valueOf(input) { return input ? String(input.value || '').trim() : ''; }
  function setButtonBusy(button, state, busyText, normalText) { button.disabled = state; button.textContent = state ? busyText : normalText; }
  function setSubmitting(state) { if (submitButton) { submitButton.disabled = state; submitButton.textContent = state ? '가입 처리 중...' : initialSubmitText; } }
  function setField(input, status, message, type) { if (input) { input.classList.remove('is-valid', 'is-invalid'); if (type === 'success') input.classList.add('is-valid'); if (type === 'error') input.classList.add('is-invalid'); } if (status) { status.textContent = message; status.className = 'field-status ' + type; } }
  function clearField(input, status, message, type) { if (input) input.classList.remove('is-valid', 'is-invalid'); if (status) { status.textContent = message; status.className = 'field-status ' + type; } }
})();
