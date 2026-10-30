import "server-only";
import { mkdir,open,readFile,rename,stat,unlink,writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const project="fxfycfkwodywmnzgkyvl";
const fiveDays=5*24*60*60*1000;
type Config={enabled:boolean;url:string;key:string;stateFile:string};
export async function runSupabaseKeepalive(config:Config,fetcher:typeof fetch=fetch,now=Date.now()) {
  if(!config.enabled)return {status:"disabled"};
  const url=new URL(config.url);
  if(url.origin!==`https://${project}.supabase.co` || url.username || url.password || !config.key) throw Error("invalid_keepalive_config");
  if(!config.key.startsWith("sb_publishable_")) {
    let role;try {role=JSON.parse(Buffer.from(config.key.split(".")[1],"base64url").toString()).role;}catch{}
    if(role!=="anon")throw Error("keepalive_requires_public_key");
  }
  await mkdir(dirname(config.stateFile),{recursive:true,mode:0o700});
  const lock=config.stateFile+".lock";
  let handle;
  try {handle=await open(lock,"wx",0o600);}catch(error:any) {
    if(error.code!=="EEXIST")throw error;
    try {if(now-(await stat(lock)).mtimeMs>10*60*1000)await unlink(lock);}catch{}
    return {status:"locked"};
  }
  try {
    let last=0;try {last=Number(JSON.parse(await readFile(config.stateFile,"utf8")).lastSuccess)||0;}catch{}
    if(last>0 && now-last<fiveDays)return {status:"not_due",lastSuccess:last};
    const response=await fetcher(new URL("/rest/v1/rpc/alisveris_heartbeat",url),{method:"POST",
      headers:{apikey:config.key,"content-type":"application/json",...(config.key.startsWith("sb_publishable_")?{}:{authorization:`Bearer ${config.key}`})},
      body:"{}",signal:AbortSignal.timeout(10000),cache:"no-store"});
    if(!response.ok || await response.json()!==1)throw Error("keepalive_query_failed");
    const temp=config.stateFile+".tmp";
    await writeFile(temp,JSON.stringify({project,lastSuccess:now})+"\n",{mode:0o600});await rename(temp,config.stateFile);
    return {status:"ok",lastSuccess:now};
  } finally {await handle.close();await unlink(lock).catch(()=>undefined);}
}
let started=false;
export function startSupabaseKeepalive() {
  if(started || process.env.SUPABASE_KEEPALIVE_ENABLED!=="true")return;started=true;
  const config:Config={enabled:true,url:process.env.SUPABASE_KEEPALIVE_URL || "",key:process.env.SUPABASE_KEEPALIVE_ANON_KEY || "",
    stateFile:process.env.SUPABASE_KEEPALIVE_STATE_FILE || "/srv/alisveris/state/cloud-keepalive.json"};
  const tick=()=>{void runSupabaseKeepalive(config).then(()=>undefined)
    .catch(()=>console.error("Supabase maintenance query failed; will retry in one hour"));};
  setTimeout(tick,10000).unref();setInterval(tick,60*60*1000).unref();
}
