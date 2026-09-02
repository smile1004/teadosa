(function(w,d){
'use strict';
var auth=w.TaeDoSAAuth;
var form=d.getElementById('developmentApplyForm');
var msg=d.getElementById('formMessage');
var loginNotice=d.getElementById('loginNotice');

function conditional(v){
 d.getElementById('landUseField').hidden=v!=='land';
 d.getElementById('buildingUseField').hidden=v!=='roof';
 d.getElementById('drawingField').hidden=v!=='roof';
}
d.querySelectorAll('input[name="siteType"]').forEach(function(el){el.addEventListener('change',function(){conditional(this.value);});});
var btn=d.getElementById('siteAddressSearch');
if(btn){btn.addEventListener('click',function(){
 if(w.daum&&w.daum.Postcode){new w.daum.Postcode({oncomplete:function(data){d.getElementById('siteAddress').value=data.roadAddress||data.jibunAddress;}}).open();}
});}
if(form){form.addEventListener('submit',function(e){
 e.preventDefault();
 if(!form.checkValidity()){form.reportValidity();return;}
 msg.hidden=false; msg.textContent='신청정보를 확인했습니다. 실제 접수 연동은 관리자 신청 API 연결 후 활성화됩니다.';
});}

if (auth && form) {
  requireMember().then(function(member){
    if (member) fillMember(member);
  });
}

async function requireMember(){
  try{
    var outcome = await auth.getSession({force:true});
    var member = outcome && outcome.response && outcome.response.ok && outcome.result && outcome.result.authenticated
      ? outcome.result.member : null;
    if (member){
      if (loginNotice) loginNotice.hidden = true;
      return member;
    }
  }catch(error){/* redirect below */}

  if (loginNotice) loginNotice.hidden = false;
  w.alert('개발행위허가 신청은 회원가입 및 로그인 후 이용할 수 있습니다.');
  w.location.replace('/login/?next=' + encodeURIComponent('/start/development/apply/') + '&reason=login-required');
  return null;
}

function fillMember(member){
  setValue('applicantName', member.name || member.companyName || member.company_name || '');
  setValue('applicantPhone', formatPhone(member.phone || ''));
  setValue('applicantEmail', member.email || '');
  var memberType = String(member.memberType || member.member_type || member.type || '').toLowerCase();
  if (memberType.indexOf('business') !== -1 || memberType.indexOf('company') !== -1 || memberType.indexOf('corporate') !== -1) {
    setRadio('applicantType','business');
  } else {
    setRadio('applicantType','personal');
  }
}

function setValue(name,value){ var el=d.querySelector('[name="'+name+'"]'); if(el) el.value=value; }
function setRadio(name,value){ var el=d.querySelector('input[name="'+name+'"][value="'+value+'"]'); if(el) el.checked=true; }
function formatPhone(value){ var v=String(value||'').replace(/\D/g,'').slice(0,11); if(v.length<4)return v; if(v.length<8)return v.slice(0,3)+'-'+v.slice(3); return v.slice(0,3)+'-'+v.slice(3,v.length===10?6:7)+'-'+v.slice(v.length===10?6:7); }
})(window,document);