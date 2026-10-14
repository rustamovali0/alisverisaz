const fs = require("node:fs");
const { execFileSync, spawnSync } = require("node:child_process");

const [base, name = "alisveris-vds", port = "3004", host = "alisveris.az"] = process.argv.slice(2);

if (!base || !fs.existsSync(`${base}/app/server.js`)) {
  throw new Error("Release application was not built");
}

const old = JSON.parse(execFileSync("pm2", ["jlist"], { encoding: "utf8" }))
  .find((process) => process.name === name)?.pm2_env;

if (!old?.pm_exec_path || !old.pm_cwd) {
  throw new Error("Live PM2 process is missing");
}

fs.writeFileSync(`${base}/previous-process.json`, JSON.stringify(old), { mode: 0o600 });
process.loadEnvFile(`${base}/app.env`);

const env = {
  ...process.env,
  HOSTNAME: "localhost",
  PORT: port,
  NODE_ENV: "production",
  NODE_OPTIONS: "--max-old-space-size=768",
};

function pm2(args, processEnv = env) {
  const result = spawnSync("pm2", args, { env: processEnv, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("PM2 command failed");
  }
}

async function healthy() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        headers: { Host: host, "X-Forwarded-Proto": "https" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 200) {
        await response.body?.cancel();
        return;
      }
      await response.body?.cancel();
    } catch {
      // Keep retrying while the standalone server starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("New application health check failed");
}

(async () => {
  try {
    pm2(["delete", name]);
    pm2(["start", `${base}/app/server.js`, "--name", name, "--cwd", `${base}/app`, "--time"]);
    await healthy();
    pm2(["save"]);
    console.log("NEW APPLICATION HEALTH: OK");
  } catch (error) {
    spawnSync("pm2", ["delete", name], { stdio: "inherit" });
    pm2(["start", old.pm_exec_path, "--name", name, "--cwd", old.pm_cwd, "--time"], {
      ...process.env,
      ...old.env,
      HOSTNAME: "localhost",
      PORT: old.env?.PORT ?? port,
      NODE_ENV: "production",
    });
    pm2(["save"]);
    console.error("Application restored; database migration was not rolled back.", error.message);
    process.exitCode = 1;
  }
})();
