import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
async function load(path, auth) {
  const source=(await readFile(new URL(path,import.meta.url),'utf8')).replace(/^import .*auth.js';/m,
    `const ${auth}=async()=>({member:{member_id:1},admin:{member_id:1}}); const jsonResponse=(body,status=200)=>({body,status});`);
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const list=await load('../functions/api/precheck/my-requests.js','requireMember');
const rows=[
  {id:1,status:'completed',review_id:1,published_at:null},
  {id:2,status:'reviewing',review_id:2,published_at:'2026-09-08T00:00:00Z'},
  {id:3,status:'completed',review_id:3,published_at:'2026-09-08T00:00:00Z'}
];
const result=await list.onRequestGet({request:{},env:{DB:{prepare:()=>({bind:()=>({all:async()=>({results:rows})})})}}});
assert.deepEqual(result.body.requests.map(row=>row.resultAvailable),[false,true,true]);
const status=await load('../functions/api/admin/precheck/[id]/status.js','requireAdmin');
for(const published of [false,true]) {
  let writes=0;
  const response=await status.onRequestPut({params:{id:'1'},request:{json:async()=>({status:'completed'})},env:{DB:{prepare(sql){return {bind(){return {
    first:async()=>sql.includes('FROM precheck_requests')?{id:1}:published?{published_at:'2026-09-08'}:null,
    run:async()=>{writes++;return {success:true,meta:{changes:1}};}
  };}};}}}});
  assert.equal(response.status,published?200:400);
  assert.equal(writes,published?1:0);
}
console.log('PASS: published result availability and completed-state guard; unpublished reviews remain private.');
