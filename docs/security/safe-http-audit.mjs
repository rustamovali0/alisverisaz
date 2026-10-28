import assert from 'node:assert/strict';
const base = new URL(process.argv[2] || 'https://alisveris.az');
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw Error('Use a plain HTTP(S) origin');
const checks=[];
async function check(path, expected, init) {
 const r=await fetch(new URL(path,base),{...init,redirect:'manual',signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,expected,`${path}: expected ${expected}, got ${r.status}`);
 checks.push({path,status:r.status,ok:true});return r;
}
const session=await check('/api/auth/session',200);
assert.deepEqual(await session.json(),{authenticated:false,role:null});
assert.match(session.headers.get('cache-control')||'',/private|no-store/);
assert.match(session.headers.get('x-content-type-options')||'',/nosniff/);
assert.match(session.headers.get('content-security-policy')||'',/frame-ancestors 'self'/);
if(base.protocol==='https:') assert.match(session.headers.get('strict-transport-security')||'',/max-age=/);
const products=await check('/api/marketplace/products?limit=2',200);
const payload=await products.json();assert.ok(payload.products.length<=2);
const forbiddenKeys=new Set(['access_token','refresh_token','service_role','password_hash','cost_amount','costAmount']);
function inspect(v){if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){assert.ok(!forbiddenKeys.has(k),`Unexpected public field: ${k}`);inspect(x);}}
inspect(payload);
await check('/api/marketplace/products?minPrice=20&maxPrice=1',400);
const json={'content-type':'application/json'};
await check('/api/telegram/webhook',403,{method:'POST',headers:json,body:'{}'});
await check('/api/marketplace/searches',403,{method:'POST',headers:{...json,origin:'https://attacker.example'},body:'{"term":"audit"}'});
await check('/api/marketplace/searches',415,{method:'POST',headers:{'content-type':'text/plain'},body:'{}'});
await check('/api/marketplace/searches',400,{method:'POST',headers:json,body:'{"term":{"$ne":null}}'});
await check('/api/marketplace/searches',400,{method:'POST',headers:json,body:'{'});
await check('/api/marketplace/searches',413,{method:'POST',headers:json,body:JSON.stringify({term:'a'.repeat(5000)})});
console.log(JSON.stringify({base:base.origin,checkedAt:new Date().toISOString(),checks},null,2));
