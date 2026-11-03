// Authorized, isolated staging only. Never enables Danger in production storage.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import { parseEnv } from 'node:util';
const root='/srv/alisveris/releases/radmin-refresh-20261103';
const app=root+'/app';
const env=parseEnv(fs.readFileSync(root+'/stage.env','utf8'));
const redisUrl=new URL(env.SECURITY_REDIS_URL);
assert.equal(redisUrl.hostname,'127.0.0.1');assert.equal(redisUrl.port,'16380');
const cli=(...args)=>JSON.parse(cp.execFileSync('redis-cli',['--json','-h','127.0.0.1','-p','16380',...args],{encoding:'utf8',env:{PATH:process.env.PATH,REDISCLI_AUTH:decodeURIComponent(redisUrl.password)},stdio:['ignore','pipe','ignore'],timeout:5000}));
const redis={get:key=>cli('GET',key),set:(key,value)=>cli('SET',key,value),del:key=>cli('DEL',key),eval:(script,{keys,arguments:args})=>cli('EVAL',script,String(keys.length),...keys,...args),quit:()=>{}};
const stateKey='security:danger:v1:state',checks=[];
const record=name=>checks.push(name);
const state={enabled:true,version:crypto.randomUUID(),changedAt:Date.now(),expiresAt:Date.now()+900000};
const headers={host:'alisveris.az','x-forwarded-proto':'https','x-real-ip':'203.0.113.77','user-agent':'Danger isolated QA'};
const base='http://127.0.0.1:3104';
async function request(path,status,extra={},options={}){
  // Native HTTP preserves Host; Node's built-in fetch can replace it.
  const r=await new Promise((resolve,reject)=>{
    const req=http.request(base+path,{method:options.method||'GET',headers:{...headers,...extra,...(options.headers||{})},signal:AbortSignal.timeout(20000)},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const pairs=[];for(let i=0;i<res.rawHeaders.length;i+=2)pairs.push([res.rawHeaders[i],res.rawHeaders[i+1]]);resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:pairs}));});
    });req.on('error',reject);req.end(options.body);
  });
  assert((Array.isArray(status)?status:[status]).includes(r.status),`${path}: ${r.status} instead of ${status}`);return r;
}
function sign(kind,host,next,bridge=false){
  const proof={kind,version:state.version,fingerprint:crypto.createHash('sha256').update(JSON.stringify([host,bridge?'bridge':headers['x-real-ip'],headers['user-agent']])).digest('hex'),expiresAt:Date.now()+60000,nonce:crypto.randomUUID(),...(next?{next}:{}),...(bridge?{targetHost:host}:{})};
  const body=Buffer.from(JSON.stringify(proof)).toString('base64url');
  return body+'.'+crypto.createHmac('sha256',env.DANGER_SIGNING_SECRET).update(body).digest('base64url');
}
const post=(body,origin='https://alisveris.az')=>({method:'POST',body:JSON.stringify(body),headers:{...headers,origin,'content-type':'application/json'}});
try{
  const existing=await redis.get(stateKey);
  if(existing){assert(process.argv.includes('--resume'),'Existing staging state: inspect before repeating');assert(!fs.existsSync(root+'/stage-verification.json'),'Staging already verified; do not repeat');await redis.del(stateKey);}
  const smoke=JSON.parse(cp.execFileSync(process.execPath,[app+'/deploy/verify-live-marketplace.mjs',base],{encoding:'utf8',env:{...process.env,QA_HOST:'alisveris.az'},timeout:180000}));
  record(`Normal-mode marketplace smoke: ${smoke.checks.length} checks`);
  await request('/icon.svg',200);await request('/radmin/danger',307);record('Static icon and protected RAdmin route');
  const rateLua=fs.readFileSync('/home/deploy/alisveris-security-setup/danger-rate.lua','utf8');
  const changeLua=fs.readFileSync('/home/deploy/alisveris-security-setup/danger-change.lua','utf8');
  const key='qa:danger-rate:'+crypto.randomUUID();
  const rate=()=>redis.eval(rateLua,{keys:[key,stateKey],arguments:['5','60000','3']});
  assert.equal((await rate())[0],1);assert.equal((await rate())[0],1);assert.equal((await rate())[0],1);assert.equal((await rate())[0],1);
  assert.equal(await redis.eval(changeLua,{keys:[stateKey],arguments:['off',JSON.stringify(state)]}),1);
  assert.equal(await redis.eval(changeLua,{keys:[stateKey],arguments:['off',JSON.stringify({...state,version:crypto.randomUUID()})]}),0);
  assert.equal((await rate())[0],0);await redis.del(key);
  for(let i=0;i<3;i++)assert.equal((await rate())[0],1);assert.equal((await rate())[0],0);
  record('Actual Redis Lua: atomic budget clamp and stale state CAS rejection');
  const challenge=await request('/products',307);assert(new URL(challenge.headers.get('location')).pathname==='/security-check');
  const check=await request('/security-check?next=%2Fproducts',200);const html=await check.text();assert(html.includes('Təhlükəsizlik yoxlaması'));assert(html.includes('noindex'));
  await request('/products',[403,307],{rsc:'1'});await request('/api/marketplace/products',403);await request('/icon.svg',200);
  record('Fresh entry challenged; unverified API/RSC denied; checkpoint and icon remain accessible');
  await request('/api/security/visit',403,{},post({token:'',next:'/products'},'https://other.example'));
  await request('/api/security/visit',403,{},post({token:'',transfer:'forged'}));
  await request('/api/security/visit',403,{},post({token:'',next:'/products'}));
  record('Cross-origin, forged transfer and missing Cloudflare token rejected');
  const cookie='__Host-alisveris-danger-clearance='+sign('clearance','alisveris.az')+'; __Host-alisveris-danger-entry='+sign('entry','alisveris.az','/products');
  await request('/products',200,{cookie});await request('/products',307,{cookie});
  const catalog=await request('/api/marketplace/products',200,{cookie,'x-alisveris-danger':'0'});assert(catalog.headers.get('cache-control').includes('no-store'));
  record('One-use entry, subsequent refresh challenged, API response cannot be cached by spoofing header');
  const customHost='ngallery.shop';
  const bridge=await request('/cart',307,{host:customHost});const bridgeUrl=new URL(bridge.headers.get('location'));
  assert.equal(bridgeUrl.host,'alisveris.az');assert(bridgeUrl.searchParams.has('transfer'));assert(!bridgeUrl.searchParams.has('next'));
  const intent=bridgeUrl.searchParams.get('transfer');const customPost=body=>({method:'POST',body:JSON.stringify(body),headers:{...headers,host:customHost,origin:'https://'+customHost,'content-type':'application/json'}});
  await request('/api/security/return',403,{},customPost({proof:intent}));
  const proof=sign('transfer',customHost,'/cart',true);const exchanged=await request('/api/security/return',200,{},customPost({proof}));
  const customCookie=exchanged.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert(customCookie.includes('__Host-alisveris-danger-entry'));
  assert(exchanged.headers.getSetCookie().every(c=>c.includes('HttpOnly')&&c.includes('Secure')&&!c.includes('Domain=')));
  await request('/cart',200,{host:customHost,cookie:customCookie});await request('/api/security/return',403,{},customPost({proof}));
  record('Registered custom domain: central intent, no unverified exchange, host-only cookies, storefront return and replay denial');
  await redis.set(stateKey,JSON.stringify({...state,expiresAt:Date.now()-1000}));await redis.del(key);
  for(let i=0;i<5;i++)assert.equal((await rate())[0],1);assert.equal((await rate())[0],0);await request('/products',200);
  record('Expiry automatically restores normal page access and original request budget');
  const autoKey='security:danger:auto:v1:config',cooldown='security:danger:auto:v1:cooldown';
  const autoLua=fs.readFileSync('/home/deploy/alisveris-security-setup/danger-auto-signal.lua','utf8');
  const autoChange=fs.readFileSync('/home/deploy/alisveris-security-setup/danger-auto-change.lua','utf8');
  const autoVersion=crypto.randomUUID();
  const autoKeys=[autoKey,...['login_failed','auth_rate_block'].flatMap(k=>['security:danger:auto:v1:'+k+':events','security:danger:auto:v1:'+k+':networks']),cooldown];
  assert.equal(await redis.eval(autoChange,{keys:autoKeys,arguments:['off',JSON.stringify({enabled:true,version:autoVersion,changedAt:Date.now()})]}),1);
  assert.equal(await redis.eval(autoChange,{keys:autoKeys,arguments:['off',JSON.stringify({enabled:false,version:'stale',changedAt:Date.now()})]}),0);
  const signal=(kind,i,networks)=>redis.eval(autoLua,{keys:[autoKey,stateKey,cooldown,'security:danger:auto:v1:'+kind+':events','security:danger:auto:v1:'+kind+':networks','security:danger:auto:v1:last'],arguments:[kind,crypto.createHash('sha256').update('fixture-network-'+(i%networks)).digest('hex'),crypto.randomUUID()]});
  for(let i=0;i<29;i++)assert.equal((await signal('login_failed',i,5))[0],0);
  assert.equal((await signal('login_failed',29,5))[0],1);
  const triggered=JSON.parse(await redis.get(stateKey));assert(triggered.enabled);assert(triggered.expiresAt-triggered.changedAt===900000);
  for(let i=0;i<10;i++)assert.equal((await signal('login_failed',i,5))[0],0);
  assert.equal(JSON.parse(await redis.get(stateKey)).version,triggered.version);
  const manualOff={enabled:false,version:crypto.randomUUID(),changedAt:Date.now(),expiresAt:0};
  assert.equal(await redis.eval(changeLua,{keys:[stateKey,cooldown],arguments:[triggered.version,JSON.stringify(manualOff)]}),1);
  assert.equal((await signal('auth_rate_block',0,3))[0],0);assert.equal(JSON.parse(await redis.get(stateKey)).enabled,false);
  await redis.del(cooldown);
  for(let i=0;i<59;i++)assert.equal((await signal('auth_rate_block',i,3))[0],0);
  assert.equal((await signal('auth_rate_block',59,3))[0],1);
  record('Automatic risk detector: exact distributed thresholds, 15-minute duration, atomic CAS, no timer extension, manual-off cooldown');
  const recovery=cp.execFileSync(process.execPath,['--env-file='+root+'/stage.env',app+'/deploy/security/danger-recover.mjs','off'],{encoding:'utf8'});assert(recovery.includes('söndürüldü'));
  assert.equal(JSON.parse(await redis.get(stateKey)).enabled,false);assert.equal(JSON.parse(await redis.get(autoKey)).enabled,false);await request('/products',200);
  record('Existing SSH operator can restore normal mode without database or Auth changes');
  const result={status:'passed',at:new Date().toISOString(),environment:'isolated Redis 16380 / application 3104',checks};
  fs.writeFileSync(root+'/stage-verification.json',JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result,null,2));
} finally {await redis.quit();}
