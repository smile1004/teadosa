import assert from 'node:assert/strict';
import { queryKepco } from '../common/js/kepco-query.mjs';
const input={metroCd:'44',cityCd:'131',addrLidong:'광덕면'};
assert.equal((await queryKepco(input,'')).status,503);
assert.equal((await queryKepco({},'test-key')).status,400);
const result=await queryKepco(input,'test-key',async url=>{
  const p=new URL(url).searchParams;
  assert.equal(p.get('addrLidong'),'광덕면');assert.equal(p.get('apiKey'),'test-key');
  return Response.json({data:[{vol1:'0',vol2:'',vol3:'1234'}],debug:'test-key'});
});
assert.equal(result.body.rows[0].vol1,'0');
assert.equal(result.body.rows[0].vol2,'');
assert.ok(!JSON.stringify(result).includes('test-key'));
assert.equal((await queryKepco(input,'test-key',async()=>new Response('<html>error</html>'))).status,502);
assert.equal((await queryKepco(input,'test-key',async()=>{throw Error('secret URL');})).status,502);
console.log('PASS: input checks, query encoding, zero/missing capacity, key redaction, non-JSON and connection errors');
