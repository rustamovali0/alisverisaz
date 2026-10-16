const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const { spawnSync } = require("node:child_process");

const base = "/srv/alisveris/releases/rtest-premium-20261014";
const source = path.join(base, "source");
const envFile = path.join(base, "rtest.app.env");
const values = parseEnv(fs.readFileSync(envFile, "utf8"));
const testHost = "rtest.alisveris.az";
if (values.NEXT_PUBLIC_SUPABASE_URL !== `https://${testHost}`) {
  throw new Error("Rtest API URL must point to the isolated test host");
}
values.NEXT_PUBLIC_APP_URL = `https://${testHost}`;
values.NEXT_PUBLIC_STORE_ROOT_DOMAIN = testHost;
values.REDIS_CACHE_NAMESPACE = "alisveris:rtest:20261014";
values.NEXT_PUBLIC_RTEST_DESIGN = "atelier";
const envText = Object.entries(values)
  .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
  .join("\n") + "\n";
for (const file of [envFile, path.join(base, "app.env")]) {
  fs.writeFileSync(file, envText, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}
const env = { ...process.env, ...values };
delete env.NODE_OPTIONS;
// A repeated `cp -al node_modules node_modules` created an extra dependency
// tree. Next's tracer can select these hardlinks instead of the runtime files.
const nestedDependencies = path.join(source, "node_modules/node_modules");
if (fs.existsSync(nestedDependencies)) {
  fs.renameSync(nestedDependencies, path.join(base, `nested-dependencies-backup-${Date.now()}`));
}
const previousBuild = path.join(source, ".next");
if (fs.existsSync(previousBuild)) {
  fs.renameSync(previousBuild, path.join(base, `build-before-repair-${Date.now()}`));
}
const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  cwd: source,
  env,
  stdio: "inherit",
});
if (build.status !== 0) {
  process.exitCode = build.status || 1;
} else {
  const standalone = path.join(source, ".next/standalone");
  if (!fs.existsSync(path.join(standalone, "server.js"))) {
    throw new Error("Standalone server is missing after build");
  }
  const prepared = fs.mkdtempSync(path.join(base, "app-prepared-"));
  fs.cpSync(standalone, prepared, { recursive: true });
  fs.cpSync(path.join(source, ".next/static"), path.join(prepared, ".next/static"), { recursive: true });
  if (fs.existsSync(path.join(source, "public"))) {
    fs.cpSync(path.join(source, "public"), path.join(prepared, "public"), { recursive: true });
  }
  require.resolve("next", { paths: [prepared] });
  require.resolve("next/dist/server/lib/start-server", { paths: [prepared] });
  const app = path.join(base, "app");
  if (fs.existsSync(app)) fs.renameSync(app, `${app}-before-repair-${Date.now()}`);
  fs.renameSync(prepared, app);
  console.log("RTEST APPLICATION BUILD: OK");
}
