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
  var activeMap=null;
  var sitePosition=null;
  var activeTool=null;
  var measurePoints=[];
  var measureOverlays=[];
  var measureShape=null;
  var districtVisible=false;
  var setbackCircle=null;
  var mapTools=document.getElementById('mapTools');
  var mapToolResult=document.getElementById('mapToolResult');
  var districtToggle=document.getElementById('districtToggle');
  var setbackToggle=document.getElementById('setbackToggle');
  var setbackMeters=document.getElementById('setbackMeters');

  Array.prototype.forEach.call(document.querySelectorAll('[data-map-tool]'),function(button){button.addEventListener('click',function(){toggleMeasureTool(button.dataset.mapTool,button);});});
  districtToggle.addEventListener('click',toggleDistrict);
  setbackToggle.addEventListener('click',toggleSetback);
  setbackMeters.addEventListener('change',function(){if(setbackCircle)drawSetbackCircle();});

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
    renderResult({roadAddress:'전북특별자치도 전주시 완산구 석산1길 18-10',jibunAddress:'전북특별자치도 전주시 완산구 효자동3가 1698-3',region:'전북특별자치도 전주시 완산구',siteType:'roof',area:411.08,landArea:618.9,latitude:35.820227,longitude:127.103579,pnu:'5211114200116980003',source:'화면 확인용 샘플 데이터',mode:'sample',solar:sampleSolar()},true);
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
    var type=data.siteType||getSiteType();var area=Number(data.area)||getArea();var capacity=isSample?{min:66,max:66}:estimate(type,area);
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
    renderDetailedSections(data,isSample,capacity,area);
    document.getElementById('resultTimestamp').textContent='검토일시 '+new Intl.DateTimeFormat('ko-KR',{dateStyle:'long',timeStyle:'short'}).format(new Date());
    if(capacity){
      document.getElementById('capacityValue').textContent=isSample?'66 kW':'약 '+capacity.min+'~'+capacity.max+' kW';
      document.getElementById('capacityCaption').textContent=(isSample?'지붕면적 ':'입력면적 ')+area.toLocaleString('ko-KR')+'㎡ 기준';
      document.getElementById('generationValue').textContent='약 '+Math.round(capacity.min*1200/1000).toLocaleString('ko-KR')+'~'+Math.round(capacity.max*1350/1000).toLocaleString('ko-KR')+' MWh/년';
      document.getElementById('costValue').textContent=isSample?'7,590~8,250만원':'상담 후 산정';
    }else{
      document.getElementById('capacityValue').textContent='면적 확인 필요';
      document.getElementById('capacityCaption').textContent='정확한 부지·지붕 면적 확인 후 계산합니다.';
      document.getElementById('generationValue').textContent='용량 산정 후 계산';
      document.getElementById('costValue').textContent='견적 확인 필요';
    }
    renderSolar(data.solar,capacity,isSample);
    var precheck=document.getElementById('precheckLink');
    precheck.href='precheck/apply/index.html?address='+encodeURIComponent(data.roadAddress||data.address||'');
    resultSection.hidden=false;
    resultSection.scrollIntoView({behavior:'smooth',block:'start'});
    loadMap(data.latitude,data.longitude,data.parcelGeometry);
  }

  function closePostcode(){postcodeLayer.hidden=true;postcodeContainer.innerHTML='';document.body.classList.remove('postcode-open');addressButton.focus();}
  function sampleSolar(){var values=[2.75,3.35,4.15,4.85,5.05,4.72,4.08,4.21,4.02,3.72,2.91,2.52];var days=[31,28.25,31,30,31,30,31,31,30,31,30,31];return{averageDaily:3.86,source:'화면 확인용 일사량 샘플',monthly:values.map(function(value,index){return{month:index+1,irradiance:value,days:days[index]};})};}
  function setText(id,value){var element=document.getElementById(id);if(element)element.textContent=value;}
  function setTags(id,values){var element=document.getElementById(id);if(element)element.innerHTML=values.map(function(value){return '<span>'+value+'</span>';}).join('');}
  function renderDetailedSections(data,isSample,capacity,area){
    setText('landPnuValue',data.pnu||'지번 확인 필요');
    setText('landAreaValue',isSample?'618.9㎡':(data.landArea||area?(Number(data.landArea||area).toLocaleString('ko-KR')+'㎡ (입력값)'):'추가 연동'));
    setText('solarCapacityValue',capacity?(isSample?'66 kW':'약 '+capacity.min+'~'+capacity.max+' kW'):'용량 확인 필요');
    if(!isSample){
      ['landCategoryValue','landZoneValue','landRestrictionValue','maxSlopeValue','avgSlopeValue','slopeDirectionValue','elevationValue','buildingUseValue','buildingStructureValue','buildingRoofAreaValue','buildingApprovalValue','buildingHeightValue'].forEach(function(id){setText(id,'추가 연동');});
      setTags('landUseRegionTags',['토지이용계획 API 연동 필요']);setTags('landUseDistrictTags',['공간정보 중첩 분석 필요']);setTags('landUseRestrictionTags',['규제정보 연동 필요']);
      setText('substationValue','한전 확인 필요');setText('distributionLineValue','한전 확인 필요');setText('gridStatusValue','공개자료 조회 후에도 실제 연계 가능 여부는 한전 검토로 확정됩니다.');renderSetbacks(data.setbacks);return;
    }
    setText('landCategoryValue','대');setText('landZoneValue','중심상업지역');setText('landRestrictionValue','중심상업지역');
    setTags('landUseRegionTags',['중심상업지역','지구단위계획구역','방화지구']);setTags('landUseDistrictTags',['소로1류(폭 10m~12m) 접함','소로3류(폭 8m 미만) 접함','주차장 접함']);setTags('landUseRestrictionTags',['가축사육제한구역']);
    setText('maxSlopeValue','3.4°');setText('avgSlopeValue','2.1°');setText('slopeDirectionValue','북서');setText('elevationValue','31m');
    setText('buildingUseValue','제2종근린생활시설');setText('buildingStructureValue','철근콘크리트구조');setText('buildingRoofAreaValue','411.08㎡');setText('buildingApprovalValue','2015년 (11년)');setText('buildingRoofTypeValue','평슬래브');setText('buildingHeightValue','22.35m');
    setText('substationValue','서곡');setText('distributionLineValue','호남');setText('gridStatusValue','샘플 기준 3계층 모두 여유용량이 있습니다. 실제 값은 한전 조회로 확인합니다.');
    setText('tierSubstationName','서곡');setText('tierSubstationStatus','여유있음');setText('tierSubstationCapacity','접수 21,126 kW · 여유 178,874 kW');
    setText('tierTransformerName','#2');setText('tierTransformerStatus','여유있음');setText('tierTransformerCapacity','접수 1,794 kW · 여유 48,206 kW');
    setText('tierLineName','호남');setText('tierLineStatus','여유있음');setText('tierLineCapacity','접수 408 kW · 여유 11,592 kW');
    var bars=document.querySelectorAll('.grid-tier-list .capacity-bar i');[11,4,3].forEach(function(value,index){if(bars[index])bars[index].style.width=value+'%';});
    var rows=document.querySelectorAll('.setback-rows li');var values=[['-','17m','미측정'],['100m','101m','적합'],['-','784m','미측정'],['-','-','미측정'],['100m','961m','적합']];rows.forEach(function(row,index){var spans=row.querySelectorAll('span,strong,em');if(values[index]&&spans.length>=3){spans[0].textContent=values[index][0];spans[1].textContent=values[index][1];spans[2].textContent=values[index][2];}});
  }
  function renderSetbacks(setbacks){
    var rows=document.querySelectorAll('.setback-rows li');var keys=['road','residential','river','forest','heritage'];var measured=0;
    keys.forEach(function(key,index){var item=setbacks&&setbacks[key];var row=rows[index];if(!row)return;var cells=row.querySelectorAll('span,strong,em');if(cells.length<3)return;var hasDistance=item&&item.distance!==null&&item.distance!==undefined&&item.distance!==''&&Number.isFinite(Number(item.distance));cells[0].textContent=item&&item.note||'원천자료 확인 필요';cells[1].textContent=hasDistance?Number(item.distance).toLocaleString('ko-KR')+'m':'-';cells[2].textContent=item&&item.status||'확인 필요';if(hasDistance)measured+=1;});
    setText('setbackSummary',measured?measured+'개 항목의 공간 참고거리를 확인했습니다. 측정 기준과 조례 판정은 상세 내용을 확인해 주세요.':'V-World 공간정보를 조회하지 못했습니다. 인증키의 2D 데이터 API 권한과 등록 도메인을 확인해 주세요.');
  }
  function renderSolar(solar,capacity,isSample){
    var irradiance=document.getElementById('irradianceValue');var annual=document.getElementById('annualSolarValue');var source=document.getElementById('solarSourceValue');var monthly=document.getElementById('monthlyGeneration');
    if(!solar||!Array.isArray(solar.monthly)){irradiance.textContent=isSample?'약 4.0 kWh/㎡/일':'조회정보 없음';annual.textContent=capacity?document.getElementById('generationValue').textContent:'용량 확인 필요';source.textContent=isSample?'화면 확인용 샘플':'NASA POWER 조회 필요';monthly.innerHTML='<p class="empty-data">월별 일사량을 확인하면 발전량 그래프가 표시됩니다.</p>';return;}
    irradiance.textContent=solar.averageDaily.toFixed(2)+' kWh/㎡/일';source.textContent=solar.source;
    if(!capacity){annual.textContent='예상 용량 확인 필요';monthly.innerHTML='<p class="empty-data">참고 면적을 입력하면 월별 예상 발전량을 계산합니다.</p>';return;}
    var kw=(capacity.min+capacity.max)/2;var values=isSample?[4600,5900,7900,9600,10000,9400,8000,7900,6800,7100,4900,4300]:solar.monthly.map(function(item){return Math.round(kw*item.irradiance*item.days*.82);});var total=values.reduce(function(sum,value){return sum+value;},0);annual.textContent=(total/1000).toFixed(1)+' MWh/년';document.getElementById('generationValue').textContent=(total/1000).toFixed(1)+' MWh/년';setText('capacityFactorValue',isSample?'14.9%':(total/(kw*8760)*100).toFixed(1)+'%');var max=Math.max.apply(null,values);
    monthly.innerHTML=values.map(function(value,index){return '<div><span class="bar" style="height:'+Math.max(8,Math.round(value/max*100))+'%"></span><b>'+String(index+1)+'월</b><small>'+value.toLocaleString('ko-KR')+'</small></div>';}).join('');
  }

  async function loadMap(latitude,longitude,parcelGeometry){
    if(!latitude||!longitude)return;
    try{
      await ensureKakaoSdk();
      drawMap(latitude,longitude,parcelGeometry);
    }catch(error){console.warn('지도 표시 준비 실패',error);}
  }
  async function ensureKakaoSdk(){
    if(window.kakao&&window.kakao.maps&&window.kakao.maps.services)return window.kakao;
    if(kakaoSdkPromise)return kakaoSdkPromise;
    kakaoSdkPromise=(async function(){
      if(!mapConfig){var response=await fetch('/api/solar-check/config?v=2',{cache:'no-store',headers:{'Accept':'application/json'}});if(response.ok)mapConfig=await response.json();}
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
  function drawMap(latitude,longitude,parcelGeometry){
    var container=document.getElementById('kakaoMap');var fallback=document.getElementById('mapFallback');sitePosition=new window.kakao.maps.LatLng(latitude,longitude);container.style.display='block';fallback.style.display='none';activeMap=new window.kakao.maps.Map(container,{center:sitePosition,level:4});activeMap.setMapTypeId(window.kakao.maps.MapTypeId.HYBRID);new window.kakao.maps.Marker({map:activeMap,position:sitePosition});
    activeMap.addControl(new window.kakao.maps.MapTypeControl(),window.kakao.maps.ControlPosition.TOPRIGHT);
    activeMap.addControl(new window.kakao.maps.ZoomControl(),window.kakao.maps.ControlPosition.RIGHT);
    window.kakao.maps.event.addListener(activeMap,'click',handleMapClick);
    mapTools.hidden=false;
    resetMapTools();
    drawParcelBoundary(parcelGeometry);
  }
  function drawParcelBoundary(geometry){
    if(!activeMap||!geometry||!window.kakao||!window.kakao.maps)return;
    var polygons=geometry.type==='MultiPolygon'?geometry.coordinates:geometry.type==='Polygon'?[geometry.coordinates]:[];
    polygons.forEach(function(polygon){
      if(!Array.isArray(polygon)||!Array.isArray(polygon[0]))return;
      var path=polygon[0].map(function(point){return new window.kakao.maps.LatLng(Number(point[1]),Number(point[0]));});
      if(path.length<3)return;
      new window.kakao.maps.Polygon({map:activeMap,path:path,strokeWeight:3,strokeColor:'#ef7f1a',strokeOpacity:.95,fillColor:'#ffb56e',fillOpacity:.22});
    });
  }
  function toggleMeasureTool(tool,button){
    if(!activeMap)return;
    var turningOff=activeTool===tool;
    clearMeasurement();
    activeTool=turningOff?null:tool;
    Array.prototype.forEach.call(document.querySelectorAll('[data-map-tool]'),function(item){item.classList.toggle('active',item===button&&!turningOff);});
    if(activeTool==='distance')showMapResult('지도에서 지점을 차례로 클릭하면 <strong>누적 거리</strong>가 계산됩니다.');
    else if(activeTool==='area')showMapResult('지도에서 경계점을 3개 이상 클릭하면 <strong>면적</strong>이 계산됩니다.');
    else hideMapResult();
  }
  function handleMapClick(event){
    if(!activeTool)return;
    measurePoints.push(event.latLng);
    var dot=new window.kakao.maps.Circle({map:activeMap,center:event.latLng,radius:1.8,strokeWeight:2,strokeColor:'#ffffff',strokeOpacity:1,fillColor:'#ef7f1a',fillOpacity:1});
    measureOverlays.push(dot);
    if(activeTool==='distance')drawDistance();
    if(activeTool==='area')drawArea();
  }
  function drawDistance(){
    if(measureShape)measureShape.setMap(null);
    var line=new window.kakao.maps.Polyline({map:activeMap,path:measurePoints,strokeWeight:4,strokeColor:'#ef7f1a',strokeOpacity:.95,strokeStyle:'solid'});
    measureShape=line;
    var length=line.getLength();
    showMapResult(measurePoints.length<2?'다음 지점을 클릭해 주세요.':'누적 거리 <strong>'+formatDistance(length)+'</strong> · 계속 클릭하면 거리가 이어집니다.');
  }
  function drawArea(){
    if(measureShape)measureShape.setMap(null);
    var polygon=new window.kakao.maps.Polygon({map:activeMap,path:measurePoints,strokeWeight:3,strokeColor:'#ef7f1a',strokeOpacity:.95,fillColor:'#ff9c43',fillOpacity:.25});
    measureShape=polygon;
    if(measurePoints.length<3)showMapResult('경계점을 '+(3-measurePoints.length)+'개 더 클릭해 주세요.');
    else{var area=polygon.getArea();showMapResult('측정 면적 <strong>'+Math.round(area).toLocaleString('ko-KR')+'㎡</strong> · 약 '+Math.round(area/3.3058).toLocaleString('ko-KR')+'평');}
  }
  function toggleDistrict(){
    if(!activeMap)return;
    districtVisible=!districtVisible;
    if(districtVisible)activeMap.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);else activeMap.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    districtToggle.textContent='지적도 '+(districtVisible?'ON':'OFF');districtToggle.classList.toggle('active',districtVisible);
  }
  function toggleSetback(){
    if(!activeMap||!sitePosition)return;
    if(setbackCircle){setbackCircle.setMap(null);setbackCircle=null;setbackToggle.textContent='이격거리 OFF';setbackToggle.classList.remove('active');document.querySelector('.setback-setting').classList.remove('visible');hideMapResult();return;}
    setbackToggle.classList.add('active');document.querySelector('.setback-setting').classList.add('visible');drawSetbackCircle();
  }
  function drawSetbackCircle(){
    if(setbackCircle)setbackCircle.setMap(null);
    var radius=Math.max(10,Math.min(5000,Number(setbackMeters.value)||100));setbackMeters.value=radius;
    setbackCircle=new window.kakao.maps.Circle({map:activeMap,center:sitePosition,radius:radius,strokeWeight:3,strokeColor:'#d55416',strokeOpacity:.95,strokeStyle:'dash',fillColor:'#ef7f1a',fillOpacity:.14});
    setbackToggle.textContent='이격거리 ON';showMapResult('사업지 중심에서 <strong>'+radius.toLocaleString('ko-KR')+'m</strong> 반경을 표시했습니다. 거리값을 변경하면 다시 그려집니다.');
  }
  function clearMeasurement(){measureOverlays.forEach(function(overlay){overlay.setMap(null);});if(measureShape)measureShape.setMap(null);measureShape=null;measureOverlays=[];measurePoints=[];}
  function resetMapTools(){clearMeasurement();activeTool=null;document.querySelectorAll('[data-map-tool]').forEach(function(item){item.classList.remove('active');});if(setbackCircle)setbackCircle.setMap(null);setbackCircle=null;districtVisible=false;districtToggle.textContent='지적도 OFF';districtToggle.classList.remove('active');setbackToggle.textContent='이격거리 OFF';setbackToggle.classList.remove('active');document.querySelector('.setback-setting').classList.remove('visible');hideMapResult();}
  function showMapResult(html){mapToolResult.innerHTML=html;mapToolResult.hidden=false;}
  function hideMapResult(){mapToolResult.hidden=true;mapToolResult.textContent='';}
  function formatDistance(value){return value>=1000?(value/1000).toFixed(2)+'km':Math.round(value).toLocaleString('ko-KR')+'m';}
})();
