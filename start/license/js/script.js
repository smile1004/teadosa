(function(window,document){
  'use strict';
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click',function(e){
      var target=document.querySelector(link.getAttribute('href'));
      if(!target)return;
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  var applyButton=document.getElementById('licenseApplyButton');
  var auth=window.TaeDoSAAuth;
  if(!applyButton || !auth) return;
  applyButton.addEventListener('click',async function(event){
    event.preventDefault();
    try{
      var outcome=await auth.getSession({force:true});
      var loggedIn=Boolean(outcome && outcome.response && outcome.response.ok && outcome.result && outcome.result.authenticated && outcome.result.member);
      if(loggedIn){ window.location.href='/start/license/apply/'; return; }
    }catch(error){}
    window.alert('발전사업허가 신청은 회원가입 및 로그인 후 이용할 수 있습니다.');
    window.location.href='/login/?next='+encodeURIComponent('/start/license/apply/')+'&reason=login-required';
  });
})(window,document);
