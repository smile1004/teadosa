import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
for (const name of ['kepco','ordin']) {
  const file=new URL(`../functions/api/admin/${name}-test.js`,import.meta.url);
  const source=(await readFile(file,'utf8')).replace(/from '([^']+)'/g,(_,path)=>`from '${new URL(path,file).href}'`);
  const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const request=()=>new Request('https://example.com/api/admin/'+name+'-test',{method:'POST',body:'{}'});
  const unset=await onRequestPost({request:request(),env:{}});
  assert.equal(unset.status,503,'Unauthenticated requests reach configuration check without DB');
  const configured=await onRequestPost({request:request(),env:{KEPCO_API_KEY:'dummy',LAW_API_OC:'dummy'}});
  assert.equal(configured.status,400,'Unauthenticated requests reach input validation');
}
console.log('PASS: both public test endpoints work without login or DB; validation remains active');
