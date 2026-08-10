(function (window, document) {
  'use strict';

  const auth = window.TaeDoSAAuth;
  const form = document.getElementById('preCheckForm');

  const submitButton = form ? form.querySelector('.btn-submit') : null;
  const formMessage = document.getElementById('formMessage');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const memoInput = document.getElementById('memo');
  const memoCount = document.getElementById('memoCount');

  if (!auth || !form) return;

  let applicationAuthState = {
    checked: false,
    authenticated: false,
    checking: null
  };

  async function checkApplicationAuth() {
    if (applicationAuthState.checked) return applicationAuthState.authenticated;
    if (applicationAuthState.checking) return applicationAuthState.checking;

    applicationAuthState.checking = (async function () {
      try {
        const outcome = await auth.getSession({ force: true });
        applicationAuthState.authenticated = Boolean(
          outcome &&
          outcome.response &&
          outcome.response.ok &&
          outcome.result &&
          outcome.result.authenticated &&
          outcome.result.member
        );
      } catch (error) {
        applicationAuthState.authenticated = false;
      } finally {
        applicationAuthState.checked = true;
        applicationAuthState.checking = null;
      }

      return applicationAuthState.authenticated;
    })();

    return applicationAuthState.checking;
  }

  async function requireLoginBeforeInput(event) {
    const allowed = await checkApplicationAuth();
    if (allowed) return true;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    window.alert('사전검토 신청은 회원가입 및 로그인 후 이용할 수 있습니다.');

    const next = '/precheck/apply/';
    window.location.href = '/login/?next=' + encodeURIComponent(next) + '&reason=login-required';
    return false;
  }

  form.addEventListener('pointerdown', async function (event) {
    const target = event.target.closest('input, select, textarea, button');
    if (!target) return;

    const allowed = await checkApplicationAuth();
    if (allowed) return;

    event.preventDefault();
    event.stopPropagation();

    window.alert('사전검토 신청은 회원가입 및 로그인 후 이용할 수 있습니다.');
    window.location.href = '/login/?next=' + encodeURIComponent('/precheck/apply/') + '&reason=login-required';
  }, true);

  form.addEventListener('keydown', async function (event) {
    if (!event.target.matches('input, select, textarea')) return;

    const allowed = await checkApplicationAuth();
    if (allowed) return;

    event.preventDefault();
    event.stopPropagation();

    window.alert('사전검토 신청은 회원가입 및 로그인 후 이용할 수 있습니다.');
    window.location.href = '/login/?next=' + encodeURIComponent('/precheck/apply/') + '&reason=login-required';
  }, true);

  checkApplicationAuth();


  updateMemoCount();



  init();

  async function init() {
    setSubmitting(false);
    applyPrefill();

    try {
      const outcome = await auth.getSession({ force: true });
      const member = outcome && outcome.response && outcome.response.ok
        ? (outcome.result && outcome.result.member)
        : null;

      if (!member) {
        clearMessage();
        return;
      }

      setDefaultValue(nameInput, member.name || '');
      setDefaultValue(phoneInput, formatPhone(member.phone || ''));
      setDefaultValue(emailInput, member.email || '');
      clearMessage();
    } catch (error) {
      clearMessage();
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!(await requireLoginBeforeInput(event))) return;

    clearMessage();

    if (!form.reportValidity()) return;

    const payload = {
      formVersion: 'PRECHECK_V2',
      name: valueOf('name'),
      phone: valueOf('phone'),
      email: valueOf('email'),
      address: valueOf('address'),
      siteType: radioValue('siteType'),
      purpose: radioValue('purpose'),
      plannedCapacity: numberValue('plannedCapacity'),
      siteArea: numberValue('siteArea'),
      landCategory: valueOf('landCategory'),
      zoningArea: valueOf('zoningArea'),
      ownership: radioValue('ownership'),
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
        window.location.assign('/login/?' + params.toString());
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
        email: result.request.email || payload.email,
        address: result.request.siteAddress,
        siteType: displaySiteType(result.request.siteType),
        purpose: displayPurpose(result.request.purpose),
        plannedCapacity: result.request.plannedCapacity,
        siteArea: result.request.siteArea,
        landCategory: result.request.landCategory || payload.landCategory,
        zoningArea: result.request.zoningArea || payload.zoningArea,
        ownership: result.request.ownership || payload.ownership,
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
          updateMemoCount();
      clearMessage();
    }, 0);
  });

  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      phoneInput.value = formatPhone(phoneInput.value);
    });
  }

  if (memoInput) memoInput.addEventListener('input', updateMemoCount);

  function applyPrefill() {
    let prefill = null;
    try {
      const raw = window.sessionStorage.getItem('teadosa:precheckPrefill');
      if (raw) {
        prefill = JSON.parse(raw);
        window.sessionStorage.removeItem('teadosa:precheckPrefill');
      }
    } catch (error) {
      console.warn('사전검토 입력내용 불러오기 실패:', error);
    }
    if (!prefill || typeof prefill !== 'object') return;

    setInput('name', prefill.name);
    setInput('phone', formatPhone(prefill.phone || ''));
    setInput('email', prefill.email);
    setInput('address', prefill.address);
    setInput('plannedCapacity', prefill.plannedCapacity);
    setInput('siteArea', prefill.siteArea);
    setInput('landCategory', prefill.landCategory);
    setInput('zoningArea', prefill.zoningArea);
    setInput('memo', prefill.memo);
    setRadio('siteType', prefill.siteType);
    setRadio('purpose', prefill.purpose);
    setRadio('ownership', prefill.ownership);
    updateMemoCount();
  }

  function setInput(id, value) {
    if (value === undefined || value === null || value === '') return;
    const input = document.getElementById(id);
    if (input) input.value = value;
  }

  function setRadio(name, value) {
    if (!value) return;
    const radio = form.querySelector('input[name="' + name + '"][value="' + cssEscape(value) + '"]');
    if (radio) radio.checked = true;
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function validate(payload) {
    if (!payload.name) return '이름을 입력해 주세요.';
    if (!/^\d{9,11}$/.test(digits(payload.phone))) return '연락처를 정확하게 입력해 주세요.';
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return '이메일 형식을 확인해 주세요.';
    if (!payload.address) return '설치주소를 입력해 주세요.';
    if (!payload.siteType) return '사업지 유형을 선택해 주세요.';
    if (!payload.purpose) return '용도를 선택해 주세요.';
    if (payload.plannedCapacity !== null && payload.plannedCapacity < 0) return '설치 예정 용량을 확인해 주세요.';
    if (payload.siteArea !== null && payload.siteArea < 0) return '부지면적을 확인해 주세요.';
    if (payload.memo.length > 2000) return '추가 요청사항은 2,000자 이내로 입력해 주세요.';
    return '';
  }

  function valueOf(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
  }

  function numberValue(id) {
    const text = valueOf(id);
    if (text === '') return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
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
    const map = { land: '토지', building: '건물', mixed: '복합(토지+건물)' };
    return map[value] || value;
  }

  function displayPurpose(value) {
    const map = { self_consumption: '자가소비', power_business: '발전사업(매전)', undecided: '미정 · 상담희망' };
    return map[value] || value;
  }

  function setDefaultValue(input, value) {
    if (!input || input.value || !value) return;
    input.value = value;
    input.defaultValue = value;
  }

  function updateMemoCount() {
    if (!memoInput || !memoCount) return;
    memoCount.textContent = memoInput.value.length.toLocaleString('ko-KR') + ' / 2,000';
  }

  function setSubmitting(active, label) {
    if (!submitButton) return;
    submitButton.disabled = active;
    submitButton.textContent = active ? (label || '처리 중...') : '사전검토 신청하기';
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
