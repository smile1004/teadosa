(function () {
  'use strict';

  const session = window.TaeDoSASession;
  const auth = window.TaeDoSAAuth;
  const validation = window.TaeDoSAValidation;
  const content = document.getElementById('mypage-content');
  const message = document.getElementById('mypage-message');
  const summary = document.getElementById('mypage-summary');
  const memberTypeBadge = document.getElementById('member-type-badge');
  const approvalBadge = document.getElementById('approval-badge');
  const accountInfo = document.getElementById('account-info');
  const businessInfo = document.getElementById('business-info');
  const businessSection = document.getElementById('business-section');
  const editButton = document.getElementById('edit-profile-button');
  const cancelButton = document.getElementById('cancel-profile-button');
  const editSection = document.getElementById('profile-edit-section');
  const editForm = document.getElementById('profile-edit-form');
  const editBusinessFields = document.getElementById('edit-business-fields');
  const saveButton = document.getElementById('save-profile-button');
  const formMessage = document.getElementById('profile-form-message');
  const addressButton = document.getElementById('mypage-address-search');
  const passwordButton = document.getElementById('change-password-button');
  const passwordSection = document.getElementById('password-change-section');
  const passwordForm = document.getElementById('password-change-form');
  const cancelPasswordButton = document.getElementById('cancel-password-button');
  const savePasswordButton = document.getElementById('save-password-button');
  const passwordMessage = document.getElementById('password-form-message');
  const passwordVisibilityToggle = document.getElementById('password-visibility-toggle');
  const precheckHistoryMessage = document.getElementById('precheck-history-message');
  const precheckHistoryList = document.getElementById('precheck-history-list');

  let currentMember = null;

  if (!session || !auth || !validation || !content || !message || !accountInfo || !editForm) return;

  editButton.addEventListener('click', openEdit);
  cancelButton.addEventListener('click', closeEdit);
  editForm.addEventListener('submit', saveProfile);
  addressButton.addEventListener('click', searchAddress);
  passwordButton.addEventListener('click', openPasswordChange);
  cancelPasswordButton.addEventListener('click', closePasswordChange);
  passwordForm.addEventListener('submit', savePassword);
  passwordVisibilityToggle.addEventListener('change', togglePasswordVisibility);

  loadMember();

  async function loadMember() {
    try {
      const member = await session.require({ nextPath: '/mypage/', loginPath: '/login/' });
      if (!member) return;
      currentMember = member;
      renderMember(member);
      content.hidden = false;
      message.hidden = true;
      await loadPrecheckHistory();
    } catch (error) {
      showMainError(error && error.message ? error.message : '회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  function renderMember(member) {
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
    } else if (businessSection) {
      businessSection.hidden = true;
    }
  }

  async function loadPrecheckHistory() {
    if (!precheckHistoryMessage || !precheckHistoryList || !auth.getMyPrecheckRequests) return;

    precheckHistoryMessage.hidden = false;
    precheckHistoryMessage.classList.remove('error');
    precheckHistoryMessage.textContent = '신청내역을 확인하고 있습니다.';
    precheckHistoryList.hidden = true;

    try {
      const outcome = await auth.getMyPrecheckRequests();
      const result = outcome.result || {};

      if (!outcome.response.ok || !result.success) {
        throw new Error(result.message || '사전검토 신청내역을 불러오지 못했습니다.');
      }

      renderPrecheckHistory(result.requests || []);
    } catch (error) {
      precheckHistoryMessage.textContent = error && error.message ? error.message : '사전검토 신청내역을 불러오지 못했습니다.';
      precheckHistoryMessage.classList.add('error');
    }
  }

  function renderPrecheckHistory(requests) {
    if (!requests.length) {
      precheckHistoryList.innerHTML = '<div class="precheck-history-empty"><strong>사전검토 신청내역이 없습니다.</strong><p>사업지 사전검토가 필요한 경우 신청서를 작성해 주세요.</p><a href="/precheck/apply/">사전검토 신청하기</a></div>';
      precheckHistoryList.hidden = false;
      precheckHistoryMessage.hidden = true;
      return;
    }

    precheckHistoryList.innerHTML = requests.map(function (item) {
      const resultButton = item.resultAvailable
        ? '<a class="precheck-result-button available" href="/precheck/result/?id=' + encodeURIComponent(item.id) + '">결과확인</a>'
        : '<span class="precheck-result-button disabled" aria-disabled="true">' + pendingResultLabel(item.status) + '</span>';

      return '<article class="precheck-history-item">' +
        '<div class="precheck-history-main">' +
          '<div class="precheck-history-top">' +
            '<strong class="precheck-request-no">' + escapeHtml(item.requestNo || '-') + '</strong>' +
            '<span class="precheck-status ' + escapeHtml(item.status || 'received') + '">' + escapeHtml(precheckStatusLabel(item.status)) + '</span>' +
          '</div>' +
          '<p class="precheck-site-address">' + escapeHtml(item.siteAddress || '설치주소 미등록') + '</p>' +
          '<div class="precheck-history-meta">' +
            '<span>신청일 ' + escapeHtml(formatPrecheckDate(item.submittedAt)) + '</span>' +
            '<span>사업지 ' + escapeHtml(precheckSiteTypeLabel(item.siteType)) + '</span>' +
            (item.resultAvailable ? '<span>결과 ' + escapeHtml(possibilityLabel(item.installationPossible)) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="precheck-history-action">' + resultButton + '</div>' +
      '</article>';
    }).join('');

    precheckHistoryList.hidden = false;
    precheckHistoryMessage.hidden = true;
  }

  function precheckStatusLabel(value) {
    return ({
      received: '접수',
      reviewing: '검토중',
      supplement_required: '보완요청',
      completed: '검토완료'
    })[value] || value || '-';
  }

  function pendingResultLabel(status) {
    if (status === 'completed') return '공개 준비중';
    if (status === 'supplement_required') return '보완 필요';
    if (status === 'reviewing') return '검토중';
    return '접수완료';
  }

  function precheckSiteTypeLabel(value) {
    return ({ land: '토지', building: '건물', mixed: '복합(토지+건물)' })[value] || value || '-';
  }

  function possibilityLabel(value) {
    return ({ possible: '진행 가능', conditional: '조건부 가능', not_possible: '진행 어려움', undetermined: '판정 전' })[value] || value || '-';
  }

  function formatPrecheckDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  function openEdit() {
    if (!currentMember) return;
    closePasswordChange();
    fillForm(currentMember);
    editSection.hidden = false;
    editButton.hidden = true;
    clearFormMessage();
    editSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeEdit() {
    editSection.hidden = true;
    editButton.hidden = false;
    editForm.reset();
    clearFormMessage();
  }

  function fillForm(member) {
    setValue('profile-name', member.name);
    setValue('profile-email', member.email);
    setValue('profile-phone', formatPhone(member.phone) === '미등록' ? '' : formatPhone(member.phone));
    setValue('profile-postal-code', member.postalCode);
    setValue('profile-address', member.address);
    setValue('profile-address-detail', member.addressDetail);

    const isBusiness = member.memberType === 'business';
    editBusinessFields.hidden = !isBusiness;
    Array.from(editBusinessFields.querySelectorAll('input')).forEach(function (input) {
      input.disabled = !isBusiness;
    });

    if (isBusiness) {
      setValue('profile-company-name', member.companyName);
      setValue('profile-business-number', formatBusinessNumber(member.businessNumber));
      setValue('profile-ceo-name', member.ceoName);
      setValue('profile-business-type', member.businessType);
      setValue('profile-business-item', member.businessItem);
      setValue('profile-department', member.department);
      setValue('profile-office-phone', formatPhone(member.officePhone) === '미등록' ? '' : formatPhone(member.officePhone));
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    clearFormMessage();

    const payload = collectPayload();
    const validationMessage = validatePayload(payload);
    if (validationMessage) {
      showFormMessage(validationMessage, true);
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = '저장 중...';

    try {
      const outcome = await auth.updateProfile(payload);
      const result = outcome.result || {};

      if (!outcome.response.ok || !result.success || !result.member) {
        showFormMessage(result.message || '회원정보를 수정하지 못했습니다.', true);
        return;
      }

      currentMember = result.member;
      renderMember(currentMember);
      showFormMessage(result.message || '회원정보가 수정되었습니다.', false);
      window.setTimeout(closeEdit, 900);
    } catch (error) {
      showFormMessage(error && error.message ? error.message : '회원정보 수정 중 오류가 발생했습니다.', true);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = '변경사항 저장';
    }
  }

  function openPasswordChange() {
    closeEdit();
    passwordSection.hidden = false;
    passwordButton.hidden = true;
    clearPasswordMessage();
    passwordSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('current-password').focus();
  }

  function closePasswordChange() {
    passwordSection.hidden = true;
    passwordButton.hidden = false;
    passwordForm.reset();
    togglePasswordVisibility();
    clearPasswordMessage();
  }

  function togglePasswordVisibility() {
    const type = passwordVisibilityToggle.checked ? 'text' : 'password';
    ['current-password', 'new-password', 'new-password-confirm'].forEach(function (id) {
      const input = document.getElementById(id);
      if (input) input.type = type;
    });
  }

  async function savePassword(event) {
    event.preventDefault();
    clearPasswordMessage();

    const payload = {
      currentPassword: valueOf('current-password'),
      newPassword: valueOf('new-password'),
      newPasswordConfirm: valueOf('new-password-confirm')
    };

    if (!payload.currentPassword || !payload.newPassword || !payload.newPasswordConfirm) {
      showPasswordMessage('현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.', true);
      return;
    }

    if (!validation.isValidPassword(payload.newPassword)) {
      showPasswordMessage('새 비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.', true);
      return;
    }

    if (payload.newPassword !== payload.newPasswordConfirm) {
      showPasswordMessage('새 비밀번호 확인이 일치하지 않습니다.', true);
      return;
    }

    if (payload.currentPassword === payload.newPassword) {
      showPasswordMessage('현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.', true);
      return;
    }

    savePasswordButton.disabled = true;
    savePasswordButton.textContent = '변경 중...';

    try {
      const outcome = await auth.changePassword(payload);
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) {
        showPasswordMessage(result.message || '비밀번호를 변경하지 못했습니다.', true);
        return;
      }

      passwordForm.reset();
      togglePasswordVisibility();
      showPasswordMessage(result.message || '비밀번호가 변경되었습니다.', false);
      window.setTimeout(closePasswordChange, 1400);
    } catch (error) {
      showPasswordMessage(error && error.message ? error.message : '비밀번호 변경 중 오류가 발생했습니다.', true);
    } finally {
      savePasswordButton.disabled = false;
      savePasswordButton.textContent = '비밀번호 변경';
    }
  }

  function showPasswordMessage(text, isError) {
    passwordMessage.textContent = text;
    passwordMessage.className = 'profile-form-message ' + (isError ? 'error' : 'success');
    passwordMessage.hidden = false;
  }

  function clearPasswordMessage() {
    passwordMessage.textContent = '';
    passwordMessage.className = 'profile-form-message';
    passwordMessage.hidden = true;
  }

  function collectPayload() {
    const payload = {
      name: valueOf('profile-name'),
      email: validation.normalizeEmail(valueOf('profile-email')),
      phone: validation.digits(valueOf('profile-phone')),
      postalCode: valueOf('profile-postal-code'),
      address: valueOf('profile-address'),
      addressDetail: valueOf('profile-address-detail')
    };

    if (currentMember && currentMember.memberType === 'business') {
      payload.companyName = valueOf('profile-company-name');
      payload.ceoName = valueOf('profile-ceo-name');
      payload.businessType = valueOf('profile-business-type');
      payload.businessItem = valueOf('profile-business-item');
      payload.department = valueOf('profile-department');
      payload.officePhone = valueOf('profile-office-phone');
    }
    return payload;
  }

  function validatePayload(payload) {
    if (payload.name.length < 2 || payload.name.length > 50) return '이름은 2~50자로 입력해 주세요.';
    if (!validation.isValidEmail(payload.email)) return '올바른 이메일 주소를 입력해 주세요.';
    if (!/^\d{9,11}$/.test(payload.phone)) return '휴대전화번호를 정확하게 입력해 주세요.';
    if (currentMember.memberType === 'business') {
      if (!payload.companyName) return '기업명을 입력해 주세요.';
      if (!payload.postalCode || !payload.address) return '사업장 주소를 검색해 입력해 주세요.';
    }
    return '';
  }

  function searchAddress() {
    if (!window.daum || !window.daum.Postcode) {
      showFormMessage('주소검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', true);
      return;
    }

    new window.daum.Postcode({
      oncomplete: function (data) {
        setValue('profile-postal-code', data.zonecode || '');
        setValue('profile-address', data.roadAddress || data.jibunAddress || '');
        document.getElementById('profile-address-detail').focus();
      }
    }).open();
  }

  function createRow(label, value) {
    return '<div class="mypage-row"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
  }
  function displayValue(value) { const text = displayRaw(value); return text || '미등록'; }
  function formatAddress(member) {
    const parts = [];
    if (displayRaw(member.postalCode)) parts.push('(' + displayRaw(member.postalCode) + ')');
    if (displayRaw(member.address)) parts.push(displayRaw(member.address));
    if (displayRaw(member.addressDetail)) parts.push(displayRaw(member.addressDetail));
    return parts.length ? parts.join(' ') : '미등록';
  }
  function formatPhone(value) {
    const original = displayRaw(value); if (!original) return '미등록';
    const digits = original.replace(/\D/g, '');
    if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (digits.length === 10 && digits.startsWith('02')) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    if (digits.length === 9 && digits.startsWith('02')) return digits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    return original;
  }
  function formatBusinessNumber(value) { const digits = displayRaw(value).replace(/\D/g, ''); return digits.length === 10 ? digits.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : (digits || '미등록'); }
  function formatDate(value) {
    const raw = displayRaw(value); if (!raw) return '미등록';
    const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : raw.replace(' ', 'T') + 'Z';
    const date = new Date(normalized); if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
  function approvalText(status) { if (status === 'approved') return '승인 완료'; if (status === 'pending') return '승인 대기'; if (status === 'rejected') return '승인 반려'; return displayValue(status); }
  function displayRaw(value) { return value === null || value === undefined ? '' : String(value).trim(); }
  function setValue(id, value) { const element = document.getElementById(id); if (element) element.value = displayRaw(value); }
  function valueOf(id) { const element = document.getElementById(id); return element ? element.value.normalize('NFKC').trim() : ''; }
  function showFormMessage(text, isError) { formMessage.hidden = false; formMessage.textContent = text; formMessage.classList.toggle('error', Boolean(isError)); formMessage.classList.toggle('success', !isError); }
  function clearFormMessage() { formMessage.hidden = true; formMessage.textContent = ''; formMessage.classList.remove('error', 'success'); }
  function showMainError(text) { console.error(text); message.hidden = false; message.classList.add('error'); message.textContent = text; }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
})();
