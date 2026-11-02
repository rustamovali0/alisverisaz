import fs from 'node:fs';import crypto from 'node:crypto';import cp from 'node:child_process';
const dir='/home/deploy/alisveris-security-state/redis',base='/home/deploy/alisveris-security-setup';
if(fs.existsSync(dir))throw Error('Dedicated limiter state already exists; inspect before retrying');
fs.mkdirSync(dir,{recursive:true,mode:0o700});fs.chmodSync(dir,0o700);
const password=crypto.randomBytes(32).toString('hex');
const config=['bind 127.0.0.1','port 16379','protected-mode yes','requirepass '+password,'daemonize no','dir '+dir,'logfile ""','save ""','appendonly yes','appendfsync everysec','maxmemory 64mb','maxmemory-policy noeviction'].join('\n')+'\n';
fs.writeFileSync(dir+'/redis.conf',config,{mode:0o600});
fs.writeFileSync(base+'/redis.config.cjs','module.exports = '+JSON.stringify({apps:[{name:'alisveris-security-redis',script:'/usr/bin/redis-server',args:[dir+'/redis.conf'],interpreter:'none',cwd:dir,autorestart:true,max_memory_restart:'160M',kill_timeout:10000,error_file:'/home/deploy/.pm2/logs/alisveris-security-redis-error.log',out_file:'/home/deploy/.pm2/logs/alisveris-security-redis-out.log'}]})+';\n',{mode:0o600});
cp.execFileSync('pm2',['start',base+'/redis.config.cjs','--only','alisveris-security-redis'],{stdio:'ignore'});
const file='/srv/alisveris/releases/enterprise-security-20261102/app/app.env';let env=fs.readFileSync(file,'utf8');
env=env.replace(/^SECURITY_REDIS_URL=.*$/m,'SECURITY_REDIS_URL='+JSON.stringify('redis://:'+password+'@127.0.0.1:16379')).replace(/^AUTH_CAPTCHA_MODE=.*$/m,'AUTH_CAPTCHA_MODE=supabase');fs.writeFileSync(file,env,{mode:0o600});
const checkEnv={...process.env,REDISCLI_AUTH:password};
for(let n=0;n<30;n++){try{if(cp.execFileSync('redis-cli',['-p','16379','PING'],{env:checkEnv,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()==='PONG')break;}catch{} await new Promise(r=>setTimeout(r,100));}
for(const [key,value] of [['maxmemory-policy','noeviction'],['appendonly','yes']]){const result=cp.execFileSync('redis-cli',['-p','16379','--raw','CONFIG','GET',key],{env:checkEnv,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n');if(result[1]!==value)throw Error('Limiter configuration check failed');}
console.log('Dedicated persistent limiter prepared; production cache and application unchanged.');
