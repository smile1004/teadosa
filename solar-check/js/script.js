(function(){
  'use strict';
  var form=document.getElementById('solarCheckForm');
  var addressInput=document.getElementById('siteAddress');
  var addressButton=document.getElementById('addressSearchButton');
  var analyzeButton=document.getElementById('analyzeButton');
  var sampleButton=document.getElementById('sampleButton');
  var message=document.getElementById('formMessage');
  var resultSection=document.getElementById('resultSection');
  var postcodeLayer=document.getElementById('postcodeLayer');
  var postcodeContainer=document.getElementById('postcodeContainer');
  var postcodeCloseButton=document.getElementById('postcodeCloseButton');
  var selectedAddress=null;
  var mapConfig=null;
  var kakaoSdkPromise=null;

  addressButton.addEventListener('click',function(){
    if(!window.daum||!window.daum.Postcode){
      addressInput.readOnly=false;addressInput.placeholder='도로명 또는 지번주소를 직접 입력해 주세요';addressInput.focus();
      setMessage('주소검색 프로그램을 불러오지 못해 직접 입력 모드로 전환했습니다.');return;
    }
    postcodeLayer.hidden=false;document.body.classList.add('postcode-open');postcodeContainer.innerHTML='';
    new window.daum.Postcode({oncomplete:function(data){
      selectedAddress={roadAddress:data.roadAddress||data.address||'',jibunAddress:data.jibunAddress||'',sido:data.sido||'',sigungu:data.sigungu||'',bname:data.bname||'',zonecode:data.zonecode||''};
      addressInput.value=selectedAddress.roadAddress||selectedAddress.jibunAddress;
      analyzeButton.disabled=!addressInput.value;
      closePostcode();setMessage('주소가 선택되었습니다. 자동검토 버튼을 눌러주세요.');
    },width:'100%',height:'100%'}).embed(postcodeContainer);
  });
  postcodeCloseButton.addEventListener('click',closePostcode);
  postcodeLayer.addEventListener('click',function(event){if(event.target===postcodeLayer)closePostcode();});
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!postcodeLayer.hidden)closePostcode();});
  addressInput.addEventListener('input',function(){
    if(addressInput.readOnly)return;
    selectedAddress={roadAddress:addressInput.value.trim(),jibunAddress:'',sido:'',sigungu:'',bname:'',zonecode:''};
    analyzeButton.disabled=!selectedAddress.roadAddress;
  });

  form.addEventListener('submit',async function(event){
    event.preventDefault();
    if(!selectedAddress){setMessage('먼저 주소 검색으로 사업지를 선택해 주세요.');return;}
    analyzeButton.disabled=true;analyzeButton.textContent='검토 중...';setMessage('공개 위치정보를 확인하고 있습니다.');
    try{
      var coordinates=await geocodeSelectedAddress();
      var response=await fetch('/api/solar-check/analyze',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({address:selectedAddress.roadAddress||selectedAddress.jibunAddress,roadAddress:selectedAddress.roadAddress,jibunAddress:selectedAddress.jibunAddress,region:[selectedAddress.sido,selectedAddress.sigungu,selectedAddress.bname].filter(Boolean).join(' '),siteType:getSiteType(),area:getArea(),latitude:coordinates&&coordinates.latitude,longitude:coordinates&&coordinates.longitude})});
      var result=await response.json().catch(function(){return {};});
      if(!response.ok)throw new Error(result.error||'위치정보를 조회하지 못했습니다.');
      renderResult(result,false);
      setMessage('');
    }catch(error){
      setMessage(error.message+' 아래 샘플 결과로 화면 구성을 먼저 확인할 수 있습니다.');
    }finally{analyzeButton.disabled=false;analyzeButton.textContent='자동검토';}
  });

  sampleButton.addEventListener('click',function(){
    var type=getSiteType();var area=getArea()||500;
    renderResult({roadAddress:selectedAddress&&selectedAddress.roadAddress||'경기도 안양시 동안구 엘에스로 127',jibunAddress:selectedAddress&&selectedAddress.jibunAddress||'경기도 안양시 동안구 호계동 555-9',region:selectedAddress?[selectedAddress.sido,selectedAddress.sigungu,selectedAddress.bname].filter(Boolean).join(' '):'경기도 안양시 동안구',siteType:type,area:area,latitude:37.3718,longitude:126.9507,pnu:'화면 확인용 샘플',source:'화면 확인용 샘플 데이터',mode:'sample',solar:sampleSolar()},true);
  });

  document.getElementById('printButton').addEventListener('click',function(){window.print();});

  function getSiteType(){var selected=form.querySelector('input[name="siteType"]:checked');return selected?selected.value:'unknown';}
  function getArea(){var value=Number(document.getElementById('siteArea').value);return Number.isFinite(value)&&value>0?value:null;}
  function setMessage(text){message.textContent=text||'';}
  function typeLabel(value){return value==='roof'?'건물 지붕형':value==='land'?'토지형':'유형 확인 필요';}
  function roundFive(value){return Math.max(1,Math.round(value/5)*5);}
  function estimate(type,area){
    if(!area)return null;
    var usable=type==='roof'?.58:type==='land'?.72:.6;
    var squarePerKw=type==='roof'?7.5:type==='land'?13:10;
    var mid=area*usable/squarePerKw;
    return{min:roundFive(mid*.85),max:roundFive(mid*1.15)};
  }
  function renderResult(data,isSample){
    var type=data.siteType||getSiteType();var area=Number(data.area)||getArea();var capacity=estimate(type,area);
    document.getElementById('resultModeBadge').textContent=isSample?'화면 확인용 샘플':'공개 위치정보 조회';
    document.getElementById('resultModeBadge').classList.toggle('sample',isSample);
    document.getElementById('overallTitle').textContent=isSample?'샘플 간편검토 결과입니다':'사업지 기본 위치가 확인되었습니다';
    document.getElementById('overallDescription').textContent=isSample?'실제 설치 가능 판정이 아닌 화면 구성 확인용 데이터입니다.':'자동 결과는 참고용이며, 인허가·구조·계통은 담당자 확인이 필요합니다.';
    document.getElementById('resultRoadAddress').textContent=data.roadAddress||data.address||'-';
    document.getElementById('resultJibunAddress').textContent=data.jibunAddress||'';
    document.getElementById('regionValue').textContent=data.region||'-';
    document.getElementById('coordinateValue').textContent=data.latitude&&data.longitude?Number(data.latitude).toFixed(5)+', '+Number(data.longitude).toFixed(5):'조회 필요';
    document.getElementById('pnuValue').textContent=data.pnu||'지번 확인 필요';
    document.getElementById('siteTypeValue').textContent=typeLabel(type);
    document.getElementById('sourceValue').textContent=data.source||(isSample?'샘플 데이터':'V-World 주소검색');
    renderSolar(data.solar,capacity,isSample);
    document.getElementById('resultTimestamp').textContent='검토일시 '+new Intl.DateTimeFormat('ko-KR',{dateStyle:'long',timeStyle:'short'}).format(new Date());
    if(capacity){
      document.getElementById('capacityValue').textContent='약 '+capacity.min+'~'+capacity.max+' kW';
      document.getElementById('capacityCaption').textContent='입력면적 '+area.toLocaleString('ko-KR')+'㎡ 기준';
      document.getElementById('generationValue').textContent='약 '+Math.round(capacity.min*1200/1000).toLocaleString('ko-KR')+'~'+Math.round(capacity.max*1350/1000).toLocaleString('ko-KR')+' MWh/년';
      document.getElementById('costValue').textContent='상담 후 산정';
    }else{
      document.getElementById('capacityValue').textContent='면적 확인 필요';
      document.getElementById('capacityCaption').textContent='정확한 부지·지붕 면적 확인 후 계산합니다.';
      document.getElementById('generationValue').textContent='용량 산정 후 계산';
      document.getElementById('costValue').textContent='견적 확인 필요';
    }
    var precheck=document.getElementById('precheckLink');
    precheck.href='precheck/apply/index.html?address='+encodeURIComponent(data.roadAddress||data.address||'');
    resultSection.hidden=false;
    resultSection.scrollIntoView({behavior:'smooth',block:'start'});
    loadMap(data.latitude,data.longitude);
  }

  function closePostcode(){postcodeLayer.hidden=true;postcodeContainer.innerHTML='';document.body.classList.remove('postcode-open');addressButton.focus();}
  function sampleSolar(){var values=[2.75,3.35,4.15,4.85,5.05,4.72,4.08,4.21,4.02,3.72,2.91,2.52];var days=[31,28.25,31,30,31,30,31,31,30,31,30,31];return{averageDaily:3.86,source:'화면 확인용 일사량 샘플',monthly:values.map(function(value,index){return{month:index+1,irradiance:value,days:days[index]};})};}
  function renderSolar(solar,capacity,isSample){
    var irradiance=document.getElementById('irradianceValue');var annual=document.getElementById('annualSolarValue');var source=document.getElementById('solarSourceValue');var monthly=document.getElementById('monthlyGeneration');
    if(!solar||!Array.isArray(solar.monthly)){irradiance.textContent=isSample?'약 4.0 kWh/㎡/일':'조회정보 없음';annual.textContent=capacity?document.getElementById('generationValue').textContent:'용량 확인 필요';source.textContent=isSample?'화면 확인용 샘플':'NASA POWER 조회 필요';monthly.innerHTML='<p class="empty-data">월별 일사량을 확인하면 발전량 그래프가 표시됩니다.</p>';return;}
    irradiance.textContent=solar.averageDaily.toFixed(2)+' kWh/㎡/일';source.textContent=solar.source;
    if(!capacity){annual.textContent='예상 용량 확인 필요';monthly.innerHTML='<p class="empty-data">참고 면적을 입력하면 월별 예상 발전량을 계산합니다.</p>';return;}
    var kw=(capacity.min+capacity.max)/2;var values=solar.monthly.map(function(item){return Math.round(kw*item.irradiance*item.days*.82);});var total=values.reduce(function(sum,value){return sum+value;},0);annual.textContent=(total/1000).toFixed(1)+' MWh/년';document.getElementById('generationValue').textContent=(total/1000).toFixed(1)+' MWh/년';var max=Math.max.apply(null,values);
    monthly.innerHTML=values.map(function(value,index){return '<div><span class="bar" style="height:'+Math.max(8,Math.round(value/max*100))+'%"></span><b>'+String(index+1)+'월</b><small>'+value.toLocaleString('ko-KR')+'</small></div>';}).join('');
  }

  async function loadMap(latitude,longitude){
    if(!latitude||!longitude)return;
    try{
      await ensureKakaoSdk();
      drawMap(latitude,longitude);
    }catch(error){console.warn('지도 표시 준비 실패',error);}
  }
  async function ensureKakaoSdk(){
    if(window.kakao&&window.kakao.maps&&window.kakao.maps.services)return window.kakao;
    if(kakaoSdkPromise)return kakaoSdkPromise;
    kakaoSdkPromise=(async function(){
      if(!mapConfig){var response=await fetch('/api/solar-check/config',{headers:{'Accept':'application/json'}});if(response.ok)mapConfig=await response.json();}
      if(!mapConfig||!mapConfig.kakaoJavaScriptKey)throw new Error('카카오 지도 키를 확인해 주세요.');
      await new Promise(function(resolve,reject){var script=document.createElement('script');script.src='https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey='+encodeURIComponent(mapConfig.kakaoJavaScriptKey);script.onload=resolve;script.onerror=function(){reject(new Error('카카오 지도 프로그램을 불러오지 못했습니다.'));};document.head.appendChild(script);});
      await new Promise(function(resolve){window.kakao.maps.load(resolve);});
      return window.kakao;
    })();
    return kakaoSdkPromise;
  }
  async function geocodeSelectedAddress(){
    try{
      await ensureKakaoSdk();
      var geocoder=new window.kakao.maps.services.Geocoder();
      var queries=[selectedAddress.roadAddress,selectedAddress.jibunAddress].filter(Boolean);
      for(var i=0;i<queries.length;i++){
        var result=await new Promise(function(resolve){geocoder.addressSearch(queries[i],function(items,status){resolve(status===window.kakao.maps.services.Status.OK&&items[0]?items[0]:null);});});
        if(result)return{longitude:Number(result.x),latitude:Number(result.y)};
      }
    }catch(error){console.warn('브라우저 주소 좌표변환 실패',error);}
    return null;
  }
  function drawMap(latitude,longitude){
    var container=document.getElementById('kakaoMap');var fallback=document.getElementById('mapFallback');var position=new window.kakao.maps.LatLng(latitude,longitude);container.style.display='block';fallback.style.display='none';var map=new window.kakao.maps.Map(container,{center:position,level:4});new window.kakao.maps.Marker({map:map,position:position});}
})();
