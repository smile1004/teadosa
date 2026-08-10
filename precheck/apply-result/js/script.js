(function (window, document) {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const requestNoFromUrl = (params.get('requestNo') || '').trim();
  let summary = null;

  try {
    const stored = window.sessionStorage.getItem('teadosa:lastPrecheckRequest');
    summary = stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('사전검토 접수정보를 읽지 못했습니다:', error);
  }

  if (summary && requestNoFromUrl && summary.requestNo !== requestNoFromUrl) summary = null;

  const values = {
    resultRequestNo: requestNoFromUrl || (summary && summary.requestNo) || '',
    resultName: summary && summary.name,
    resultPhone: summary && summary.phone,
    resultEmail: summary && summary.email,
    resultAddress: summary && summary.address,
    resultType: summary && summary.siteType,
    resultPurpose: summary && summary.purpose,
    resultCapacity: summary && formatUnit(summary.plannedCapacity, 'kW'),
    resultArea: summary && formatUnit(summary.siteArea, '㎡'),
    resultLandCategory: summary && summary.landCategory,
    resultZoningArea: summary && summary.zoningArea,
    resultOwnership: summary && summary.ownership,
    resultMessage: summary && summary.memo
  };

  Object.entries(values).forEach(function ([id, value]) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || '-';
  });

  const notice = document.getElementById('emptyNotice');
  if (notice) {
    if (summary) {
      notice.style.display = 'none';
    } else if (requestNoFromUrl) {
      notice.textContent = '신청은 정상 접수되었습니다. 상세 입력정보는 보안을 위해 이 화면에 다시 표시하지 않습니다.';
      notice.style.display = 'block';
    } else {
      notice.textContent = '전달된 신청정보가 없습니다. 신청 페이지에서 접수한 뒤 다시 확인해 주세요.';
      notice.style.display = 'block';
    }
  }

  function formatUnit(value, unit) {
    if (value === null || value === undefined || value === '') return '';
    return Number(value).toLocaleString('ko-KR') + ' ' + unit;
  }
})(window, document);
