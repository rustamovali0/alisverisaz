import fs from "node:fs";
import { execFileSync } from "node:child_process";
const release = "/srv/alisveris/releases/enterprise-security-20261102";
const app = release + "/app";
const expectedCwd = "/srv/alisveris/releases/header-hover-20261101/app";
const expectedPid = 2607893;
const sourceCommit = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(sourceCommit || "")) throw Error("Pass the verified source commit");
const pm2 = (...args) => execFileSync("pm2", args, { encoding: "utf8", timeout: 30000 });
const processes = () => JSON.parse(pm2("jlist"));
const running = () => processes().find(p => p.name === "alisveris-vds");
const previous = running();
if (previous?.pid !== expectedPid || previous?.pm2_env.pm_cwd !== expectedCwd || previous?.pm2_env.status !== "online") throw Error("Production changed since inspection; nothing switched");
const old = previous.pm2_env;
const rollbackPath = release + "/rollback.config.cjs";
if (fs.existsSync(rollbackPath)) throw Error("Rollback already exists; inspect before retrying");
const rollback = { apps: [{ name: "alisveris-vds", script: old.pm_exec_path, cwd: old.pm_cwd, interpreter: old.exec_interpreter, node_args: old.node_args || [], instances: 1, exec_mode: "fork", env: old.env, error_file: old.pm_err_log_path, out_file: old.pm_out_log_path, kill_timeout: old.kill_timeout || 10000, autorestart: true }] };
fs.writeFileSync(rollbackPath, "module.exports = " + JSON.stringify(rollback, null, 2) + ";\n", {mode:0o600});
fs.chmodSync(rollbackPath,0o600);
fs.writeFileSync(release + "/source-commit.txt", sourceCommit + "\n");
async function waitForNative() {
  let last;
  const deadline = Date.now()+90000;
  while(Date.now()<deadline) {
    try {
      const r = await fetch("http://127.0.0.1:3004/", {headers:{host:"alisveris.az","x-forwarded-proto":"https"},signal:AbortSignal.timeout(5000)});
      const html = await r.text();
      if (r.status !== 200 || !html.includes("live-home") || !html.includes("/_next/") || html.includes("/marketplace/assets/")) throw Error("Native homepage unavailable");
      return;
    } catch(e) { last=e; await new Promise(resolve=>setTimeout(resolve,500)); }
  }
  throw last;
}
let switched=false;
try {
  pm2("delete","alisveris-vds"); switched=true;
  pm2("start",app + "/deploy/live-marketplace-vds.config.cjs","--only","alisveris-vds");
  await waitForNative();
  const checks = JSON.parse(execFileSync(process.execPath,["/home/deploy/alisveris-security-setup/verify-live-marketplace.mjs","http://127.0.0.1:3004"],{env:{...process.env,QA_HOST:"alisveris.az"},encoding:"utf8",timeout:180000}));
  const current = running();
  if (current.pm2_env.pm_cwd !== app || !current.pm2_env.pm_exec_path.endsWith("/server.js") || current.pm2_env.status !== "online") throw Error("Unexpected production runtime");
  const staging=processes().find(p=>p.name==="alisveris-security-staging");
  if (staging?.pm2_env.pm_cwd===app) pm2("delete","alisveris-security-staging");
  pm2("save");
  const result={status:"deployed",domain:"https://alisveris.az",sourceCommit,release:app,previousRelease:expectedCwd,rollbackConfig:rollbackPath,pm2Name:current.name,pid:current.pid,port:3004,restarts:current.pm2_env.restart_time,checks:checks.checks.length,productsAcrossPages:checks.productsAcrossPages,deployedAt:new Date().toISOString()};
  fs.writeFileSync(release+"/deployment-result.json",JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result));
} catch(error) {
  if(switched) {
    try { if(running()) pm2("delete","alisveris-vds"); pm2("start",rollbackPath,"--only","alisveris-vds"); pm2("save"); console.error("Previous gateway release restored."); }
    catch(rollbackError) { console.error("Rollback needs attention:",rollbackError.message); }
  }
  throw error;
}
