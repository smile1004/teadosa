import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { calculateCapacity, capacityFormulaText, applicationArea } from '../common/js/precheck-capacity.mjs';
assert.equal(applicationArea({site:{siteArea:411}}),411);
assert.equal(applicationArea({siteArea:286}),286);
assert.equal(applicationArea({site:{siteArea:0},siteArea:286}),0);

for (const [area, count, capacity] of [[411,152,68.10],[286,105,47.04],[813,301,134.85],[4104,1520,680.96]]) {
  const result = calculateCapacity(area);
  assert.equal(result.moduleCount, count);
  assert.equal(result.finalKw, capacity);
}
for (const area of ['', ' ', null, undefined]) assert.equal(calculateCapacity(area), null);
assert.equal(calculateCapacity(0).finalKw, 0);
assert.equal(calculateCapacity(2.699).moduleCount, 0);
assert.equal(calculateCapacity(2.7).moduleCount, 1);
assert.equal(calculateCapacity(8.1).moduleCount, 3);
for (const area of [-1, 'bad', Infinity, true, [], 100000001]) assert.throws(() => calculateCapacity(area));

// Exercise the real save handler with only authentication and D1 replaced.
const source = (await readFile(new URL('../functions/api/admin/precheck/[id]/review.js', import.meta.url), 'utf8'))
  .replace(/^import .*admin-auth.js';/m, `const requireAdmin = async () => ({admin:{member_id:1}}); const jsonResponse = (body, status=200) => ({body,status});`)
  .replace('../../../../../common/js/precheck-capacity.mjs', new URL('../common/js/precheck-capacity.mjs', import.meta.url).href);
const { onRequestPut } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let stored;
const DB = { prepare(sql) { return { bind(...args) { return {
  async first() {
    if (sql.includes('FROM precheck_requests')) return {id:1, request_no:'TEST',form_data:JSON.stringify({site:{siteArea:411}})};
    if (sql.includes('SELECT id, published_at')) return stored ? {id:1,published_at:stored.published_at} : null;
    return stored;
  },
  async run() {
    if (sql.includes('INSERT INTO precheck_reviews')) stored = {id:1, expected_capacity:args[2],result_data:args[7],published_at:args[10]};
    if (sql.includes('UPDATE precheck_reviews')) stored = {id:1, expected_capacity:args[1],result_data:args[6],published_at:args[9]};
    return {success:true,meta:{changes:1,last_row_id:1}};
  }
}; } }; } };
async function save(capacityAssessment, publish=false) {
  return onRequestPut({env:{DB},params:{id:'1'},request:{json:async()=>({
    expectedCapacity:999999,capacityAssessment,publish,installationPossible:'possible',overallOpinion:'검토 완료',
    items:[{id:'site',title:'현장조건 검토',status:'info',content:'검토 내용'}]
  })}});
}
let saved = await save({basis:'추가 근거',layoutImageDataUrl:'data:image/png;base64,AAAA',layoutImageName:'test.png'});
assert.equal(saved.status,200);
assert.equal(saved.body.review.expectedCapacity,68.10);
assert.equal(saved.body.review.resultData.capacityAssessment.calculation.moduleCount,152);
assert.equal(saved.body.review.resultData.capacityAssessment.layoutImageName,'test.png');
saved = await save({areaM2:286},true);
assert.equal(saved.body.review.expectedCapacity,47.04);
assert.ok(saved.body.review.publishedAt);
const publishedReview = saved.body.review;
assert.equal((await save({areaM2:-1})).status,400);
assert.equal((await save({areaM2:null})).body.review.expectedCapacity,null);
assert.equal((await save({areaM2:0})).body.review.expectedCapacity,0);

// Render the saved response through the actual customer result script.
const nodes = new Map();
const document = {getElementById(id) {
  if (!nodes.has(id)) nodes.set(id,{textContent:'',innerHTML:'',hidden:true,classList:{toggle(){}},removeAttribute(){}});
  return nodes.get(id);
}};
const window = {location:{search:'?id=1'},TaeDoSAAuth:{
  requireAuth:async()=>({id:1}),
  getPrecheckResult:async()=>({response:{ok:true,status:200},result:{success:true,request:{formData:{},siteAddress:''},review:publishedReview}})
}};
vm.runInNewContext(await readFile(new URL('../precheck/result/js/script.js', import.meta.url),'utf8'),{window,document,URLSearchParams,Intl,console});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(nodes.get('expected-capacity-value').textContent,'47.04 kW');
assert.match(nodes.get('expected-capacity-calculation').textContent,/105장/);
assert.equal(nodes.get('expected-capacity-card').hidden,false);
assert.match(nodes.get('result-items').innerHTML,/현장조건 검토/);
// Admin: application-area prefill, live edit, save payload, and reload.
const adminNodes = new Map();
function adminNode(id) {
  if (!adminNodes.has(id)) adminNodes.set(id, {
    value:'',textContent:'',hidden:true,events:{},classList:{toggle(){}},
    addEventListener(event, callback) { this.events[event] = callback; },
    querySelector(selector) { return adminNode(id + selector); },
    setCustomValidity(message) { this.validationMessage = message; },
    reportValidity(){},removeAttribute(){},scrollIntoView(){}
  });
  return adminNodes.get(id);
}
let adminInit, submitted;
const adminWindow = {location:{search:'?id=1'},addEventListener(event,callback){adminInit=callback;},TaeDoSAAuth:{
  getAdminPrecheckDetail:async()=>({response:{ok:true},result:{success:true,request:{formData:{site:{siteArea:411}}},review:{resultData:{capacityAssessment:{areaM2:null}}}}}),
  saveAdminPrecheckReview:async(id,payload)=>{
    submitted=payload;
    const result=await save(payload.capacityAssessment);
    return {response:{ok:true},result:result.body};
  }
}};
const adminSource=(await readFile(new URL('../common/js/admin-precheck-detail.js',import.meta.url),'utf8'))
  .replace("import('/common/js/precheck-capacity.mjs?v=2')",'Promise.resolve(capacityModule)');
vm.runInNewContext(adminSource,{window:adminWindow,document:{getElementById:adminNode},URLSearchParams,Intl,console,capacityModule:{calculateCapacity,capacityFormulaText,applicationArea}});
await adminInit();
assert.equal(adminNode('capacity-area').value,411);
assert.equal(adminNode('expected-capacity').value,'68.10');
assert.equal(adminNode('capacity-module-count').value,152);
assert.equal(adminNode('capacity-installed-kw').value,'97.280');
adminNode('capacity-area').value='813';
adminNode('capacity-area').events.input();
assert.equal(adminNode('expected-capacity').value,'134.85');
assert.equal(adminNode('capacity-module-count').value,301);
adminNode('save-review').events.click();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(submitted.capacityAssessment.areaM2,813);
assert.equal(adminNode('capacity-area').value,813);
assert.equal(adminNode('expected-capacity').value,'134.85');
// Reproduce authentication finishing before the detail script is loaded.
adminNodes.clear();
adminNode('admin-protected-content').hidden=false;
let detailLoads=0;
adminWindow.TaeDoSAAuth.getAdminPrecheckDetail=async()=>{
  detailLoads++;
  return {response:{ok:true},result:{success:true,request:{formData:{}},review:null}};
};
vm.runInNewContext(adminSource,{window:adminWindow,document:{getElementById:adminNode},URLSearchParams,Intl,console,capacityModule:{calculateCapacity,capacityFormulaText,applicationArea}});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(detailLoads,1,'must initialize even when adminready has already fired');
assert.equal(adminNode('capacity-area').value,'');
assert.equal(adminNode('expected-capacity').value,'');
adminNode('capacity-area').value='411';
adminNode('capacity-area').events.input();
assert.equal(adminNode('expected-capacity').value,'68.10');
assert.equal(adminNode('capacity-module-count').value,152);
assert.equal(adminNode('capacity-installed-kw').value,'97.280');
await adminInit();
assert.equal(detailLoads,1,'duplicate ready event must not overwrite edits');
adminNode('capacity-area').value='';
adminNode('capacity-area').events.change();
assert.equal(adminNode('capacity-module-count').value,'');
assert.equal(adminNode('capacity-installed-kw').value,'');
assert.equal(adminNode('expected-capacity').value,'');
const adminHtml=await readFile(new URL('../admin/precheck/detail/index.html',import.meta.url),'utf8');
for (const [id,value] of [['capacity-module-area','2.700'],['capacity-module-power','640'],['capacity-free-rate','30'],['capacity-install-rate','70']]) {
  assert.match(adminHtml,new RegExp(`id="${id}"[^>]*value="${value}"[^>]*readonly`));
}
console.log('PASS: supplied examples, server persistence, result rendering, admin prefill/edit/save/reload, late script loading, empty area, intermediate fields and default constants.');
