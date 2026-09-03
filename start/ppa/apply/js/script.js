(function(window, document){
  'use strict';

  const auth = window.TaeDoSAAuth;
  const form = document.getElementById('ppaApplyForm');
  const note = document.getElementById('requestNote');
  const noteCount = document.getElementById('noteCount');
  const formMessage = document.getElementById('formMessage');
  const existingUserBlock = document.getElementById('existingUserBlock');
  const newUserBlock = document.getElementById('newUserBlock');
  const siteAddressSearch = document.getElementById('siteAddressSearch');

  if (!form) return;

  init();

  async function init(){
    updateNoteCount();
    bindUserType();
    bindFileNameDisplay();
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

  function bindFileNameDisplay(){
    document.querySelectorAll('.upload-box input[type="file"]').forEach(function(input){
      const label = document.getElementById(input.id + '-name');
      if (!label) return;
      input.addEventListener('change', function(){
        label.textContent = input.files && input.files[0] ? input.files[0].name : 'PDF, JPG, PNG 파일을 첨부해 주세요.';
      });
    });
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

  form.addEventListener('submit', function(event){
    event.preventDefault();
    clearMessage();
    if (!form.reportValidity()) return;
    if (!radioValue('userType')){
      showMessage('이용자 구분(기존 이용자 / 신규 이용자)을 선택해 주세요.','error');
      return;
    }
    showMessage('신청정보를 확인했습니다. 실제 접수 연동은 관리자 신청 API 연결 후 활성화됩니다.','info');
  });

  function updateNoteCount(){ if (note && noteCount) noteCount.textContent = note.value.length.toLocaleString('ko-KR') + ' / 1,500'; }
  function setValue(id,value){ const el=document.getElementById(id); if(el) el.value=value; }
  function radioValue(name){ const el=document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : ''; }
  function setRadio(name,value){ const el=document.querySelector('input[name="'+name+'"][value="'+value+'"]'); if(el) el.checked=true; }
  function formatPhone(value){ const d=String(value||'').replace(/\D/g,'').slice(0,11); if(d.length<4)return d; if(d.length<8)return d.slice(0,3)+'-'+d.slice(3); return d.slice(0,3)+'-'+d.slice(3,d.length===10?6:7)+'-'+d.slice(d.length===10?6:7); }
  function showMessage(message,type){ if(!formMessage)return; formMessage.hidden=false; formMessage.className='form-message '+(type||'info'); formMessage.textContent=message; formMessage.scrollIntoView({behavior:'smooth',block:'center'}); }
  function clearMessage(){ if(!formMessage)return; formMessage.hidden=true; formMessage.textContent=''; formMessage.className='form-message'; }
})(window,document);
