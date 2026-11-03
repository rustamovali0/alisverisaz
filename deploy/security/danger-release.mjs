import fs from 'node:fs';
import crypto from 'node:crypto';
import cp from 'node:child_process';
const root='/srv/alisveris/releases/danger-mode-20261103';
const app=root+'/app';
const previousApp='/srv/alisveris/releases/enterprise-security-20261102/app';
const setup='/home/deploy/alisveris-security-setup';
const pm2=(...args)=>cp.execFileSync('pm2',args,{encoding:'utf8',timeout:30000});
const processes=()=>JSON.parse(pm2('jlist'));
const main=()=>processes().find(p=>p.name==='alisveris-vds');
const write=(file,value)=>{fs.writeFileSync(file,value,{mode:0o600});fs.chmodSync(file,0o600);};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function guardMain(){const p=main();if(!p||p.pm2_env.pm_cwd!==previousApp||p.pm2_env.status!=='online')throw Error('Production changed; inspect before continuing');return p;}
function setEnv(text,key,value){return text.split('\n').filter(l=>!l.startsWith(key+'=')).join('\n')+'\n'+key+'='+JSON.stringify(value)+'\n';}
async function health(port,path="/",marker="live-home"){
  const deadline=Date.now()+60000;
  while(Date.now()<deadline){try{const r=await fetch(`http://127.0.0.1:${port}${path}`,{headers:{host:'alisveris.az','x-forwarded-proto':'https'},signal:AbortSignal.timeout(5000)});if(r.status===200&&(await r.text()).includes(marker))return;}catch{}await new Promise(r=>setTimeout(r,500));}
  throw Error('Native runtime failed its readiness check');
}
async function prepare(){
  const archive=setup+'/danger-mode-20261103.tgz',expected=process.argv[3];
  guardMain();if(!/^[a-f0-9]{64}$/.test(expected||'')||hash(archive)!==expected)throw Error('Archive checksum mismatch');
  if(fs.existsSync(root))throw Error('Release exists; inspect before retrying');
  const listeners=cp.execFileSync('ss',['-ltn'],{encoding:'utf8'});
  if(/:(3104|16380)\s/.test(listeners))throw Error('Staging ports are occupied');
  fs.mkdirSync(app,{recursive:true});
  cp.execFileSync('tar',['-xzf',archive,'-C',app]);
  for(const name of ['sharp-linux-x64','sharp-libvips-linux-x64']){
    const target=app+'/node_modules/@img/'+name;
    if(!fs.existsSync(target))fs.cpSync(previousApp+'/node_modules/@img/'+name,target,{recursive:true});
  }
  let production=fs.readFileSync(previousApp+'/app.env','utf8');
  production=setEnv(production,'DANGER_SIGNING_SECRET',crypto.randomBytes(48).toString('base64url'));
  write(app+'/app.env',production);
  const redisDir=root+'/redis-stage';fs.mkdirSync(redisDir,{mode:0o700});
  const password=crypto.randomBytes(32).toString('hex');
  write(redisDir+'/redis.conf',`bind 127.0.0.1\nport 16380\nprotected-mode yes\nrequirepass ${password}\ndaemonize yes\npidfile ${redisDir}/redis.pid\ndir ${redisDir}\nlogfile ${redisDir}/redis.log\nsave ""\nappendonly no\nmaxmemory 32mb\nmaxmemory-policy noeviction\n`);
  cp.execFileSync('redis-server',[redisDir+'/redis.conf'],{stdio:'ignore'});
  let staging=setEnv(production,'SECURITY_REDIS_URL','redis://:'+password+'@127.0.0.1:16380');
  staging=setEnv(staging,'DANGER_SIGNING_SECRET',crypto.randomBytes(48).toString('base64url'));
  write(root+'/stage.env',staging);
  write(root+'/stage.config.cjs','module.exports='+JSON.stringify({apps:[{name:'alisveris-danger-staging',script:app+'/server.js',cwd:app,node_args:'--env-file='+root+'/stage.env',env:{NODE_ENV:'production',PORT:'3104',HOSTNAME:'::ffff:127.0.0.1'},max_memory_restart:'700M',kill_timeout:10000}]})+';\n');
  pm2('start',root+'/stage.config.cjs','--only','alisveris-danger-staging');
  await health(3104);
  write(root+'/preparation-result.json',JSON.stringify({status:'prepared',archiveSha256:expected,previousPid:main().pid,previousApp,newApp:app,at:new Date().toISOString()},null,2));
  console.log('Danger staging hazırdır. Production və database dəyişdirilmədi.');
}
async function refreshStage(){
  const p=guardMain(),file=root+'/preparation-result.json',prepared=JSON.parse(fs.readFileSync(file));
  const archive=setup+'/danger-mode-20261103.tgz',expected=process.argv[3];
  if(p.pid!==prepared.previousPid||fs.existsSync(root+'/deployment-result.json')||fs.existsSync(root+'/stage-verification.json'))throw Error('Inspect existing readiness before refreshing staging');
  if(!/^[a-f0-9]{64}$/.test(expected||'')||hash(archive)!==expected)throw Error('Archive checksum mismatch');
  const stage=processes().find(v=>v.name==='alisveris-danger-staging');
  if(!stage||stage.pm2_env.pm_cwd!==app)throw Error('Unexpected staging owner');
  pm2('stop','alisveris-danger-staging');
  cp.execFileSync('tar',['-xzf',archive,'-C',app],{stdio:['ignore','pipe','pipe']});
  pm2('restart','alisveris-danger-staging');await health(3104,'/icon.svg','<svg');
  write(file,JSON.stringify({...prepared,archiveSha256:expected,refreshedAt:new Date().toISOString()},null,2));
  console.log('Staging artifact refreshed; production unchanged.');
}
async function activate(){
  const source=process.argv[3];if(!/^[a-f0-9]{40}$/.test(source||''))throw Error('Verified source commit is required');
  const old=guardMain(),prepared=JSON.parse(fs.readFileSync(root+'/preparation-result.json'));
  const stage=JSON.parse(fs.readFileSync(root+'/stage-verification.json'));
  if(old.pid!==prepared.previousPid||stage.status!=='passed')throw Error('Readiness state changed');
  if(fs.existsSync(root+'/deployment-result.json')||fs.existsSync(root+'/rollback.config.cjs'))throw Error('Deployment already attempted; inspect before retrying');
  const core=old.pm2_env;
  write(root+'/rollback.config.cjs','module.exports='+JSON.stringify({apps:[{name:'alisveris-vds',script:core.pm_exec_path,cwd:core.pm_cwd,node_args:core.node_args,env:core.env,interpreter:core.exec_interpreter,error_file:core.pm_err_log_path,out_file:core.pm_out_log_path,kill_timeout:10000,autorestart:true}]})+';\n');
  let switched=false;
  try{
    pm2('delete','alisveris-vds');switched=true;
    pm2('start',app+'/deploy/live-marketplace-vds.config.cjs','--only','alisveris-vds');
    await health(3004);
    const smoke=JSON.parse(cp.execFileSync(process.execPath,[app+'/deploy/verify-live-marketplace.mjs','http://127.0.0.1:3004'],{env:{...process.env,QA_HOST:'alisveris.az'},encoding:'utf8',timeout:180000}));
    if(main().pm2_env.pm_cwd!==app)throw Error('Unexpected main runtime');
    pm2('delete','alisveris-danger-staging');pm2('save');
    const result={status:'deployed',release:app,previousRelease:previousApp,sourceCommit:source,pid:main().pid,checks:smoke.checks.length,dangerEnabled:false,deployedAt:new Date().toISOString()};
    write(root+'/deployment-result.json',JSON.stringify(result,null,2));write(root+'/source-commit.txt',source+'\n');
    console.log(JSON.stringify(result));
  }catch(e){
    if(switched){if(main())pm2('delete','alisveris-vds');pm2('start',root+'/rollback.config.cjs','--only','alisveris-vds');pm2('save');}
    throw e;
  }
}
try{
  if(process.argv[2]==='prepare')await prepare();else if(process.argv[2]==='refresh-stage')await refreshStage();else if(process.argv[2]==='activate')await activate();else throw Error('Use prepare or activate');
}catch(e){console.error(e instanceof Error?e.message:'Operation failed');process.exitCode=1;}
