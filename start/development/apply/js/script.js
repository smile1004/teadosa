(function(w,d){
'use strict';
var form=d.getElementById('developmentApplyForm');
var msg=d.getElementById('formMessage');
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
})(window,document);