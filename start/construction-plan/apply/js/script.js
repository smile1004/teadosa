(function(window, document){
  'use strict';

  const auth = window.TaeDoSAAuth;
  const form = document.getElementById('constructionPlanApplyForm');
  const note = document.getElementById('requestNote');
  const noteCount = document.getElementById('noteCount');
  const formMessage = document.getElementById('formMessage');
  const existingUserBlock = document.getElementById('existingUserBlock');
  const newUserBlock = document.getElementById('newUserBlock');
  const siteAddressSearch = document.getElementById('siteAddressSearch');
  const businessRegInput = document.getElementById('businessRegNumber');
  const businessRegRequired = document.getElementById('businessRegRequired');

  if (!form) return;

  init();

  async function init(){
    updateNoteCount();
    bindApplicantType();
    bindUserType();
    bindAddressSearch(siteAddressSearch, 'siteAddress');
    await tryFillFromSession();
  }

  async function tryFillFromSession(){
    if (!auth) return;
    try{
      const outcome = await auth.getSession({force:true});
      const member = outcome && outcome.response && outcome.response.ok && outcome.result && outcome.result.authenticated
        ? outcome.result.member : null;
      if (member){
        fillMember(member);
      }
    }catch(error){/* not logged in; leave fields blank */}
  }

  function fillMember(member){
    setValue('applicantName', member.name || member.companyName || member.company_name || '');
    setValue('applicantPhone', formatPhone(member.phone || ''));
    setValue('applicantEmail', member.email || '');
    const memberType = String(member.memberType || member.member_type || member.type || '').toLowerCase();
    if (memberType.includes('business') || memberType.includes('company') || memberType.includes('corporate')) {
      setRadio('applicantType','business');
    } else {
      setRadio('applicantType','personal');
    }
    updateApplicantTypeFields();
  }

  function bindApplicantType(){
    document.querySelectorAll('input[name="applicantType"]').forEach(function(el){
      el.addEventListener('change', updateApplicantTypeFields);
    });
  }

  function updateApplicantTypeFields(){
    const isBusiness = radioValue('applicantType') === 'business';
    if (businessRegRequired) businessRegRequired.hidden = !isBusiness;
    if (businessRegInput) { if (isBusiness) businessRegInput.setAttribute('required',''); else businessRegInput.removeAttribute('required'); }
  }

  function bindUserType(){
    document.querySelectorAll('input[name="userType"]').forEach(function(el){
      el.addEventListener('change', updateUserTypeBlocks);
    });
  }

  function updateUserTypeBlocks(){
    const type = radioValue('userType');
    if (existingUserBlock) existingUserBlock.hidden = type !== 'existing';
    if (newUserBlock) newUserBlock.hidden = type !== 'new';
  }

  function bindAddressSearch(button, inputId){
    if (!button) return;
    button.addEventListener('click', function(){
      if (!window.daum || !window.daum.Postcode) {
        window.alert('주소검색 서비스를 불러오지 못했습니다. 인터넷 연결 상태를 확인해 주세요.');
        return;
      }
      new window.daum.Postcode({
        oncomplete:function(data){
          setValue(inputId, data.roadAddress || data.jibunAddress || '');
          const input = document.getElementById(inputId);
          if (input) input.focus();
        }
      }).open({popupTitle:'태도사 주소검색'});
    });
  }

  note && note.addEventListener('input', updateNoteCount);

  form.addEventListener('submit', async function(event){
    event.preventDefault();
    clearMessage();
    if (!form.reportValidity()) return;
    if (!radioValue('userType')){
      showMessage('태도사 서비스 이용 구분을 선택해 주세요.','error');
      return;
    }
    if (!auth || !auth.createConstructionPlanRequest) {
      showMessage('신청 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.','error');
      return;
    }

    const payload = {
      formVersion: 'CONSTRUCTION_PLAN_APPLY_V1',
      applicantType: radioValue('applicantType'),
      applicantName: valueOf('applicantName'),
      applicantPhone: valueOf('applicantPhone'),
      applicantEmail: valueOf('applicantEmail'),
      businessRegNumber: valueOf('businessRegNumber'),
      siteAddress: valueOf('siteAddress'),
      licenseNumber: valueOf('licenseNumber'),
      capacity: valueOf('capacity'),
      capacityType: radioValue('capacityType'),
      userType: radioValue('userType'),
      requestNote: valueOf('requestNote'),
      privacyConsent: document.getElementById('privacyConsent').checked,
      applicationConfirmed: document.getElementById('applicationConfirmation').checked
    };

    const submitButton = form.querySelector('.submit-btn');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = '신청 접수 중...'; }

    try {
      const outcome = await auth.createConstructionPlanRequest(payload);
      const result = outcome.result || {};
      if (!outcome.response.ok || !result.success) throw new Error(result.message || '신청을 접수하지 못했습니다.');

      showMessage((result.request && result.request.requestNo ? result.request.requestNo + '번으로 ' : '') + '신청이 접수되었습니다. 담당자가 확인 후 순차적으로 연락드리겠습니다.','info');
      form.querySelectorAll('input,textarea,button').forEach(function(el){ el.disabled = true; });
    } catch (error) {
      showMessage(error.message || '신청 접수 중 오류가 발생했습니다.','error');
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = '공사계획신고 신청하기'; }
    }
  });

  function updateNoteCount(){ if (note && noteCount) noteCount.textContent = note.value.length.toLocaleString('ko-KR') + ' / 1,500'; }
  function setValue(id,value){ const el=document.getElementById(id); if(el) el.value=value; }
  function valueOf(id){ const el=document.getElementById(id); return el ? el.value.trim() : ''; }
  function radioValue(name){ const el=document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : ''; }
  function setRadio(name,value){ const el=document.querySelector('input[name="'+name+'"][value="'+value+'"]'); if(el) el.checked=true; }
  function formatPhone(value){ const d=String(value||'').replace(/\D/g,'').slice(0,11); if(d.length<4)return d; if(d.length<8)return d.slice(0,3)+'-'+d.slice(3); return d.slice(0,3)+'-'+d.slice(3,d.length===10?6:7)+'-'+d.slice(d.length===10?6:7); }
  function showMessage(message,type){ if(!formMessage)return; formMessage.hidden=false; formMessage.className='form-message '+(type||'info'); formMessage.textContent=message; formMessage.scrollIntoView({behavior:'smooth',block:'center'}); }
  function clearMessage(){ if(!formMessage)return; formMessage.hidden=true; formMessage.textContent=''; formMessage.className='form-message'; }
})(window,document);
