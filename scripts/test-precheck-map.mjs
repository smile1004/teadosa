import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../precheck/result/js/script.js', import.meta.url), 'utf8');
async function run(mode) {
  const element = () => ({hidden:true,textContent:'',innerHTML:'',children:[],events:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},insertAdjacentElement(){},appendChild(child){this.children.push(child);},addEventListener(name,fn){this.events[name]=fn;}});
  const nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  };
  let relayouts=0, mapsCreated=0, placeQuery='';
  const locationLayers=[];
  class LocationLayer {constructor(options){this.map=options.map;locationLayers.push(this);}setMap(map){this.map=map;}}
  const timerCallbacks=new Map();
  const window={location:{search:'?id=1'},
    setTimeout(fn){const id=timerCallbacks.size+1;timerCallbacks.set(id,fn);return id;},
    clearTimeout(id){timerCallbacks.delete(id);},
    TaeDoSAAuth:{requireAuth:async()=>({}),getPrecheckResult:async()=>({response:{ok:true},result:{success:true,
      request:{siteAddress:mode.startsWith('place')?'전주시 완산구 효자엘르디움에듀파크 101동 301호':'서울특별시 중구 세종대로 110',formData:{}},review:{resultData:{items:[]}}}})}};
  if(mode!=='missing') window.kakao={maps:{
    load(callback){if(mode!=='timeout') callback();},
    services:{Status:{OK:'OK'},Geocoder:class {addressSearch(address,callback){callback(mode.startsWith('place')?[]:[{x:'126.978',y:'37.566'}],mode.startsWith('place')?'ZERO_RESULT':'OK');}},
      Places:class {keywordSearch(query,callback){placeQuery=query;const place={x:'127.1',y:'35.8',place_name:'효자엘르디움에듀파크'};callback(mode==='place-ambiguous'?[place,place]:[place],'OK',{totalCount:mode==='place-ambiguous'?2:1});}}},
    LatLng:class {},MapTypeId:{SKYVIEW:1},ControlPosition:{RIGHT:1},ZoomControl:class {},Marker:LocationLayer,CustomOverlay:LocationLayer,
    Map:class {
      constructor(){assert.equal(get('result-content').hidden,false);mapsCreated++;if(mode==='render-error')throw Error('render failure');}
      addControl(){} relayout(){relayouts++;} setCenter(){} setCursor(){}
    },event:{addListener(){}}
  }};
  vm.runInNewContext(source,{window,document:{getElementById:get,querySelectorAll:()=>[],createElement:element},URLSearchParams,Intl,console:{error(){}},AbortSignal});
  await new Promise(resolve=>setImmediate(resolve));
  if(mode==='timeout') {
    for(const callback of timerCallbacks.values())callback();
    await new Promise(resolve=>setImmediate(resolve));
  }
  if(mode==='ok'||mode==='place') {assert.equal(mapsCreated,1);assert.equal(relayouts,1);assert.equal(get('result-map-message').hidden,true);}
  else if(mode==='place-ambiguous'){
    assert.equal(mapsCreated,0);
    const choices=get('result-map-message').children[0];
    assert.equal(choices.children.length,4);
    choices.children[2].events.click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(mapsCreated,1);
    assert.equal(get('result-map-message').hidden,true);
  }
  else {assert.equal(get('result-map-message').hidden,false);assert.match(get('result-map-message').textContent,/불러오지 못했습니다/);}
  if(mode.startsWith('place'))assert.equal(placeQuery,'전주시 완산구 효자엘르디움에듀파크');
  if(mode==='place')assert.match(get('result-map-address').textContent,/대표 위치/);
  if(mode==='ok') {
    for(const tool of ['result-map-area','result-map-distance']) {
      get(tool).events.click();
      assert.ok(locationLayers.every(layer=>layer.map===null));
      get('result-map-measure-cancel').events.click();
      assert.ok(locationLayers.every(layer=>layer.map!==null));
    }
  }
}
for(const mode of ['ok','missing','timeout','render-error','place','place-ambiguous']) await run(mode);
console.log('PASS: visible-container initialization, relayout, SDK missing/timeout, and map render failure messages.');
