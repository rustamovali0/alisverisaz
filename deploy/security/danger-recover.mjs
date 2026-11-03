// Operator-only recovery over the existing SSH session. No public bypass route.
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const key='security:danger:v1:state';
try {
  const u=new URL(process.env.SECURITY_REDIS_URL||process.env.REDIS_URL||'');
  if(!['redis:','rediss:'].includes(u.protocol))throw Error('invalid storage');
  const args=['--raw','-h',u.hostname,'-p',u.port||'6379',...(u.protocol==='rediss:'?['--tls']:[]),...(u.username?['--user',decodeURIComponent(u.username)]:[]),...(u.pathname&&u.pathname!=='/'?['-n',u.pathname.slice(1)]:[])];
  const env={PATH:process.env.PATH,REDISCLI_AUTH:decodeURIComponent(u.password)};
  const cli=(...command)=>execFileSync('redis-cli',[...args,...command],{env,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000}).trim();
  const raw=cli('GET',key);const mode=process.argv[2]||'status';
  if(mode==='off'){
    const next=JSON.stringify({enabled:false,version:crypto.randomUUID(),changedAt:Date.now(),expiresAt:0,operator:'ssh-recovery'});
    const script="local value=redis.call('GET',KEYS[1]) or ''; if value~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',86400);return 1";
    if(cli('EVAL',script,'1',key,raw,next)!=='1')throw Error('state changed');
    console.log('Danger söndürüldü. Əsas təhlükəsizlik qorunur.');
  }else if(mode==='status'){
    const state=raw?JSON.parse(raw):{enabled:false,expiresAt:0};
    console.log(JSON.stringify({enabled:state.enabled===true&&state.expiresAt>Date.now(),expiresAt:state.expiresAt||0}));
  }else throw Error('unknown operation');
}catch{console.error('Danger vəziyyəti dəyişdirilmədi. Mövcud env və Redis bağlantısını yoxlayın.');process.exitCode=1;}
