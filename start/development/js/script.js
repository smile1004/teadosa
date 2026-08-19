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

  var landButton=document.getElementById('flowLandButton');
  var roofButton=document.getElementById('flowRoofButton');
  var roofSubSelector=document.getElementById('roofSubSelector');
  var roofWithButton=document.getElementById('flowRoofWithButton');
  var roofWithoutButton=document.getElementById('flowRoofWithoutButton');
  var landPanel=document.getElementById('flowLand');
  var roofWithPanel=document.getElementById('flowRoofWithDrawings');
  var roofWithoutPanel=document.getElementById('flowRoofWithoutDrawings');
  var roofMode='with';

  function setActive(button,active){
    if(!button)return;
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-selected',active?'true':'false');
  }

  function showBusinessType(type){
    var isLand=type==='land';
    setActive(landButton,isLand);
    setActive(roofButton,!isLand);
    if(roofSubSelector) roofSubSelector.hidden=isLand;
    if(landPanel) landPanel.hidden=!isLand;
    if(roofWithPanel) roofWithPanel.hidden=isLand || roofMode!=='with';
    if(roofWithoutPanel) roofWithoutPanel.hidden=isLand || roofMode!=='without';
  }

  function showRoofType(type){
    roofMode=type;
    setActive(roofWithButton,type==='with');
    setActive(roofWithoutButton,type==='without');
    if(roofWithPanel) roofWithPanel.hidden=type!=='with';
    if(roofWithoutPanel) roofWithoutPanel.hidden=type!=='without';
  }

  if(landButton) landButton.addEventListener('click',function(){showBusinessType('land');});
  if(roofButton) roofButton.addEventListener('click',function(){showBusinessType('roof');});
  if(roofWithButton) roofWithButton.addEventListener('click',function(){showRoofType('with');});
  if(roofWithoutButton) roofWithoutButton.addEventListener('click',function(){showRoofType('without');});

  var applyButton=document.getElementById('developmentApplyButton');
  var auth=window.TaeDoSAAuth;
  if(!applyButton || !auth) return;
  applyButton.addEventListener('click',async function(event){
    event.preventDefault();
    try{
      var outcome=await auth.getSession({force:true});
      var loggedIn=Boolean(outcome && outcome.response && outcome.response.ok && outcome.result && outcome.result.authenticated && outcome.result.member);
      if(loggedIn){ window.location.href='/start/development/apply/'; return; }
    }catch(error){}
    window.alert('개발행위허가 신청은 회원가입 및 로그인 후 이용할 수 있습니다.');
    window.location.href='/login/?next='+encodeURIComponent('/start/development/apply/')+'&reason=login-required';
  });
})(window,document);
