import assert from 'node:assert/strict';
import {queryOrdin} from '../common/js/ordin-query.mjs';
assert.equal((await queryOrdin({query:'태양광'},'')).status,503);
assert.equal((await queryOrdin({query:'태양광',sborg:'1234567'},'private-oc')).status,400);
const result=await queryOrdin({query:'완주군 군계획',page:2},'private-oc',async url=>{
  const u=new URL(url);assert.equal(u.hostname,'www.law.go.kr');assert.equal(u.searchParams.get('query'),'완주군 군계획');assert.equal(u.searchParams.get('page'),'2');assert.equal(u.searchParams.get('knd'),'30001');
  return Response.json({OrdinSearch:{totalCnt:'1',law:{자치법규ID:'123',자치법규명:'테스트 조례'}},debug:'private-oc'});
});
assert.equal(result.body.rows.length,1);assert.ok(!JSON.stringify(result).includes('private-oc'));
assert.equal((await queryOrdin({query:'x'},'private-oc',async()=>Response.json({error:'승인 필요'}))).status,502);
const detail=await queryOrdin({mode:'detail',id:'123'},'private-oc',async url=>{
  assert.equal(new URL(url).pathname,'/DRF/lawService.do');return Response.json({자치법규:{조문:{조내용:'본문'}}});
});assert.equal(detail.body.detail.조문.조내용,'본문');
const fail=await queryOrdin({query:'x'},'private-oc',async()=>{throw Error('private-oc');});assert.ok(!JSON.stringify(fail).includes('private-oc'));
console.log('PASS: input validation, official request fields, single result, detail, error and OC redaction');
