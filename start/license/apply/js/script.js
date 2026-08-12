(function(window, document){
  'use strict';

  const auth = window.TaeDoSAAuth;
  const form = document.getElementById('licenseApplyForm');
  const loginNotice = document.getElementById('loginNotice');
  const precheckSelect = document.getElementById('precheckRequest');
  const precheckStatus = document.getElementById('precheckStatus');
  const note = document.getElementById('requestNote');
  const noteCount = document.getElementById('noteCount');
  const formMessage = document.getElementById('formMessage');
  const personalFields = document.getElementById('personalFields');
  const businessFields = document.getElementById('businessFields');
  const personalAddressSearch = document.getElementById('personalAddressSearch');

  if (!auth || !form) return;

  let completedPrechecks = [];

  init();

  async function init(){
    updateNoteCount();
    bindApplicantType();
    bindAddressSearch();
    const member = await requireMember();
    if (!member) return;
    fillMember(member);
    await loadPrechecks();
  }

  function bindAddressSearch(){
    if (!personalAddressSearch) return;
    personalAddressSearch.addEventListener('click', function(){
      if (!window.daum || !window.daum.Postcode) {
        window.alert('주소검색 서비스를 불러오지 못했습니다. 인터넷 연결 상태를 확인해 주세요.');
        return;
      }
      new window.daum.Postcode({
        oncomplete:function(data){
          setValue('personalAddress', data.roadAddress || data.jibunAddress || '');
          const input = document.getElementById('personalAddress');
          if (input) input.focus();
        }
      }).open({popupTitle:'태도사 주소검색'});
    });
  }

  async function requireMember(){
    try{
      const outcome = await auth.getSession({force:true});
      const member = outcome && outcome.response && outcome.response.ok && outcome.result && outcome.result.authenticated
        ? outcome.result.member : null;
      if (member){
        if (loginNotice) loginNotice.hidden = true;
        return member;
      }
    }catch(error){/* redirect below */}

    if (loginNotice) loginNotice.hidden = false;
    window.alert('발전사업허가 신청은 회원가입 및 로그인 후 이용할 수 있습니다.');
    window.location.replace('/login/?next=' + encodeURIComponent('/start/license/apply/') + '&reason=login-required');
    return null;
  }

  function fillMember(member){
    setValue('applicantName', member.name || member.companyName || member.company_name || '');
    setValue('applicantPhone', formatPhone(member.phone || ''));
    setValue('applicantEmail', member.email || '');
    const memberType = String(member.memberType || member.member_type || member.type || '').toLowerCase();
    if (memberType.includes('business') || memberType.includes('company') || memberType.includes('corporate')) {
      setRadio('applicantType','business');
      setValue('corporationName', member.companyName || member.company_name || member.name || '');
      setValue('representativeName', member.representativeName || member.representative_name || '');
    } else {
      setRadio('applicantType','personal');
    }
    updateApplicantFields();
  }

  function bindApplicantType(){
    document.querySelectorAll('input[name="applicantType"]').forEach(function(el){
      el.addEventListener('change', updateApplicantFields);
    });
  }

  function updateApplicantFields(){
    const type = radioValue('applicantType');
    if (personalFields) personalFields.hidden = type !== 'personal';
    if (businessFields) businessFields.hidden = type !== 'business';
  }

  async function loadPrechecks(){
    if (!precheckSelect) return;
    precheckSelect.innerHTML = '<option value="">사전검토 결과를 선택해 주세요.</option>';
    try{
      const outcome = await auth.getMyPrecheckRequests();
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '사전검토 내역을 불러오지 못했습니다.');
      completedPrechecks = (result.requests || []).filter(function(item){ return item.resultAvailable; });

      if (!completedPrechecks.length){
        precheckSelect.disabled = true;
        precheckStatus.className = 'precheck-status warning';
        precheckStatus.innerHTML = '신청 가능한 사전검토 완료 내역이 없습니다. 먼저 <a href="/precheck/apply/">사전검토를 신청</a>하고 결과 확인을 완료해 주세요.';
        return;
      }

      completedPrechecks.forEach(function(item){
        const option = document.createElement('option');
        option.value = String(item.id);
        option.textContent = item.requestNo + ' · ' + (item.siteAddress || '주소 정보 없음');
        option.dataset.requestNo = item.requestNo || '';
        precheckSelect.appendChild(option);
      });
      precheckStatus.className = 'precheck-status';
      precheckStatus.textContent = '완료된 사전검토 결과 ' + completedPrechecks.length + '건을 불러왔습니다.';
    }catch(error){
      precheckSelect.disabled = true;
      precheckStatus.className = 'precheck-status warning';
      precheckStatus.textContent = error.message || '사전검토 내역을 불러오지 못했습니다.';
    }
  }

  precheckSelect && precheckSelect.addEventListener('change', function(){
    const selected = completedPrechecks.find(function(item){ return String(item.id) === precheckSelect.value; });
    if (!selected) return;
    setValue('siteAddress', selected.siteAddress || '');
    if (selected.siteType) {
      const raw = String(selected.siteType).toLowerCase();
      if (raw.includes('land') || String(selected.siteType).includes('토지')) setRadio('siteType', 'land');
      else if (raw.includes('building') || String(selected.siteType).includes('건물') || String(selected.siteType).includes('지붕')) setRadio('siteType', 'building');
    }
  });

  note && note.addEventListener('input', updateNoteCount);

  form.addEventListener('submit', async function(event){
    event.preventDefault();
    const member = await requireMember();
    if (!member) return;

    clearMessage();
    if (!completedPrechecks.length){
      showMessage('완료된 사전검토 결과가 있어야 발전사업허가 서비스를 신청할 수 있습니다.','error');
      return;
    }
    if (!form.reportValidity()) return;

    const payload = {
      formVersion:'GENERATION_LICENSE_APPLY_V2',
      applicantType:radioValue('applicantType'),
      applicantName:valueOf('applicantName'),
      applicantPhone:valueOf('applicantPhone'),
      applicantEmail:valueOf('applicantEmail'),
      personalAddress:valueOf('personalAddress'),
      registeredDomicile:valueOf('registeredDomicile'),
      representativeName:valueOf('representativeName'),
      corporationName:valueOf('corporationName'),
      corporationRegistrationNumber:valueOf('corporationRegistrationNumber'),
      headOfficeAddress:valueOf('headOfficeAddress'),
      precheckRequestId:Number(precheckSelect.value),
      precheckRequestNo:precheckSelect.options[precheckSelect.selectedIndex] ? precheckSelect.options[precheckSelect.selectedIndex].dataset.requestNo || '' : '',
      siteType:radioValue('siteType'),
      siteAddress:valueOf('siteAddress'),
      businessPurpose:radioValue('businessPurpose'),
      desiredCapacity:valueOf('desiredCapacity'),
      desiredSchedule:valueOf('desiredSchedule'),
      ownership:radioValue('ownership'),
      collateralStatus:radioValue('collateralStatus'),
      contractorStatus:radioValue('contractorStatus'),
      totalProjectCost:numberValue('totalProjectCost'),
      costPerKw:valueOf('costPerKw'),
      ownFundingPlan:checkedValues('ownFundingPlan'),
      ownFundingAmount:numberValue('ownFundingAmount'),
      loanFundingPlan:checkedValues('loanFundingPlan'),
      loanAmount:numberValue('loanAmount'),
      lender:valueOf('lender'),
      requestNote:valueOf('requestNote'),
      applicationConfirmed:document.getElementById('applicationConfirmation').checked
    };

    // 주민등록번호는 온라인 임시저장 데이터에 포함하지 않습니다.
    try{ window.sessionStorage.setItem('teadosa:generationLicenseDraft', JSON.stringify(payload)); }catch(error){}
    showMessage('신청서 입력내용이 확인되었습니다. 실제 접수 저장 및 관리자 연동은 다음 단계에서 연결합니다.','info');
  });

  function updateNoteCount(){ if (note && noteCount) noteCount.textContent = note.value.length.toLocaleString('ko-KR') + ' / 1,500'; }
  function setValue(id,value){ const el=document.getElementById(id); if(el) el.value=value; }
  function valueOf(id){ const el=document.getElementById(id); return el ? el.value.trim() : ''; }
  function numberValue(id){ const v=valueOf(id); return v ? Number(v) : null; }
  function radioValue(name){ const el=document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : ''; }
  function checkedValues(name){ return Array.from(document.querySelectorAll('input[name="'+name+'"]:checked')).map(function(el){ return el.value; }); }
  function setRadio(name,value){ const el=document.querySelector('input[name="'+name+'"][value="'+value+'"]'); if(el) el.checked=true; }
  function formatPhone(value){ const d=String(value||'').replace(/\D/g,'').slice(0,11); if(d.length<4)return d; if(d.length<8)return d.slice(0,3)+'-'+d.slice(3); return d.slice(0,3)+'-'+d.slice(3,d.length===10?6:7)+'-'+d.slice(d.length===10?6:7); }
  function showMessage(message,type){ if(!formMessage)return; formMessage.hidden=false; formMessage.className='form-message '+(type||'info'); formMessage.textContent=message; formMessage.scrollIntoView({behavior:'smooth',block:'center'}); }
  function clearMessage(){ if(!formMessage)return; formMessage.hidden=true; formMessage.textContent=''; formMessage.className='form-message'; }
})(window,document);
