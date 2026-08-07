(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  const form = document.getElementById('preCheckForm');
  const submitButton = form ? form.querySelector('.btn-submit') : null;
  const formMessage = document.getElementById('formMessage');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');

  if (!auth || !form) return;

  init();

  async function init() {
    setSubmitting(true, '회원정보 확인 중...');

    try {
      const member = await auth.requireAuth({
        loginPath: '/login/',
        nextPath: '/precheck/apply/'
      });

      if (!member) return;

      if (nameInput && !nameInput.value) {
        nameInput.value = member.name || '';
        nameInput.defaultValue = nameInput.value;
      }
      if (phoneInput && !phoneInput.value) {
        phoneInput.value = formatPhone(member.phone || '');
        phoneInput.defaultValue = phoneInput.value;
      }
      clearMessage();
      setSubmitting(false);
    } catch (error) {
      showMessage(error.message || '회원정보를 확인하지 못했습니다.', 'error');
      setSubmitting(false);
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearMessage();

    if (!form.reportValidity()) return;

    const payload = {
      name: valueOf('name'),
      phone: valueOf('phone'),
      address: valueOf('address'),
      siteType: radioValue('siteType'),
      purpose: radioValue('purpose'),
      memo: valueOf('memo')
    };

    const validationMessage = validate(payload);
    if (validationMessage) {
      showMessage(validationMessage, 'error');
      return;
    }

    setSubmitting(true, '접수 중...');

    try {
      const outcome = await auth.createPrecheckRequest(payload);
      const result = outcome.result || {};

      if (outcome.response.status === 401) {
        const params = new URLSearchParams({
          next: '/precheck/apply/',
          reason: result.code === 'SESSION_EXPIRED' ? 'session-expired' : 'login-required'
        });
        window.location.replace('/login/?' + params.toString());
        return;
      }

      if (!outcome.response.ok || !result.success || !result.request) {
        showMessage(result.message || '신청을 접수하지 못했습니다.', 'error');
        setSubmitting(false);
        return;
      }

      const summary = {
        requestNo: result.request.requestNo,
        status: result.request.status,
        name: result.request.applicantName,
        phone: formatPhone(result.request.phone),
        address: result.request.siteAddress,
        siteType: displaySiteType(result.request.siteType),
        purpose: displayPurpose(result.request.purpose),
        memo: result.request.requestNote || '입력 내용 없음',
        submittedAt: result.request.submittedAt
      };

      try {
        window.sessionStorage.setItem('teadosa:lastPrecheckRequest', JSON.stringify(summary));
      } catch (storageError) {
        console.warn('사전검토 접수정보 임시 저장 실패:', storageError);
      }

      window.location.assign('/precheck/apply-result/?requestNo=' + encodeURIComponent(summary.requestNo));
    } catch (error) {
      showMessage(error.message || '서버와 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setSubmitting(false);
    }
  });

  form.addEventListener('reset', function () {
    window.setTimeout(function () {
      clearMessage();
    }, 0);
  });

  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      phoneInput.value = formatPhone(phoneInput.value);
    });
  }

  function validate(payload) {
    if (!payload.name) return '이름을 입력해 주세요.';
    if (!/^\d{9,11}$/.test(digits(payload.phone))) return '연락처를 정확하게 입력해 주세요.';
    if (!payload.address) return '설치주소를 입력해 주세요.';
    if (!payload.siteType) return '사업지 유형을 선택해 주세요.';
    if (!payload.purpose) return '용도를 선택해 주세요.';
    if (payload.memo.length > 2000) return '추가 요청사항은 2,000자 이내로 입력해 주세요.';
    return '';
  }

  function valueOf(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
  }

  function radioValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : '';
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatPhone(value) {
    const number = digits(value).slice(0, 11);
    if (number.length <= 3) return number;
    if (number.length <= 7) return number.slice(0, 3) + '-' + number.slice(3);
    if (number.length === 10) return number.slice(0, 3) + '-' + number.slice(3, 6) + '-' + number.slice(6);
    return number.slice(0, 3) + '-' + number.slice(3, 7) + '-' + number.slice(7);
  }

  function displaySiteType(value) {
    return value === 'land' ? '토지' : value === 'building' ? '건물' : value;
  }

  function displayPurpose(value) {
    return value === 'self_consumption' ? '자가소비' : value === 'power_business' ? '발전사업' : value;
  }

  function setSubmitting(active, label) {
    if (!submitButton) return;
    submitButton.disabled = active;
    submitButton.textContent = active ? (label || '처리 중...') : '신청하기';
  }

  function showMessage(message, type) {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = 'form-message ' + (type === 'error' ? 'error' : 'success');
    formMessage.hidden = false;
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearMessage() {
    if (!formMessage) return;
    formMessage.hidden = true;
    formMessage.textContent = '';
    formMessage.className = 'form-message';
  }
})(window, document);
