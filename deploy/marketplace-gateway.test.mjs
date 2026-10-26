import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceGateway } from "./marketplace-gateway.mjs";
let directory, backend, gateway, base;
const listen = (server) =>
  new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const close = (server) =>
  new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  });
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "alisveris-gateway-"));
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), "<h1>New marketplace</h1>");
  await writeFile(
    join(directory, "assets", "app.js"),
    'console.log("marketplace")',
  );
  backend = http.createServer((req, res) => {
    let body = "";
    req.on("data", (x) => (body += x));
    req.on("end", () => {
      res.setHeader("Set-Cookie", [
        "session=one; HttpOnly; Secure; SameSite=Lax",
        "refresh=two; HttpOnly; Secure; SameSite=Lax",
      ]);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          url: req.url,
          method: req.method,
          host: req.headers.host,
          cookie: req.headers.cookie,
          body,
        }),
      );
    });
  });
  await listen(backend);
  gateway = createMarketplaceGateway({
    frontendDirectory: directory,
    backendPort: backend.address().port,
  });
  await listen(gateway);
  base = `http://127.0.0.1:${gateway.address().port}`;
});
after(async () => {
  await close(gateway);
  await close(backend);
  await rm(directory, { recursive: true, force: true });
});
test("new frontend responds on homepage with queries and no-store", async () => {
  const r = await fetch(base + "/?q=Sony");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /New marketplace/);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
});
test("hashed assets use correct MIME and immutable cache", async () => {
  const r = await fetch(base + "/marketplace/assets/app.js");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /javascript/);
  assert.match(r.headers.get("cache-control"), /immutable/);
});
test("HEAD returns headers without body", async () => {
  const r = await fetch(base + "/", { method: "HEAD" });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "");
  assert.ok(Number(r.headers.get("content-length")) > 0);
});
test("unknown and encoded traversal paths never expose files", async () => {
  for (const path of [
    "/marketplace/missing.js",
    "/marketplace/assets/%2e%2e%2findex.html",
    "/marketplace/.env",
    "/marketplace/%00",
  ]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 404, path);
  }
});
test("asset writes are rejected", async () => {
  const r = await fetch(base + "/marketplace/assets/app.js", {
    method: "POST",
  });
  assert.equal(r.status, 405);
});
test("API routes, body and cookies pass through unchanged", async () => {
  const r = await fetch(base + "/api/orders?x=1", {
    method: "POST",
    headers: { Cookie: "session=abc", "content-type": "application/json" },
    body: '{"quantity":2}',
  });
  const data = await r.json();
  assert.equal(data.url, "/api/orders?x=1");
  assert.equal(data.method, "POST");
  assert.equal(data.body, '{"quantity":2}');
  assert.equal(data.cookie, "session=abc");
  assert.equal(r.headers.getSetCookie().length, 2);
});
test("real auth and admin routes stay with existing backend", async () => {
  for (const path of [
    "/login",
    "/auth/callback?code=example",
    "/radmin",
    "/dashboard",
    "/products",
    "/robots.txt",
    "/does-not-exist",
  ]) {
    const r = await fetch(base + path);
    assert.equal((await r.json()).url, path);
  }
});
test("homepage server actions stay with backend", async () => {
  const r = await fetch(base + "/", {
    method: "POST",
    headers: { "Next-Action": "example" },
    body: "action-body",
  });
  assert.equal((await r.json()).body, "action-body");
});
test("Next RSC requests stay with backend", async () => {
  const r = await fetch(base + "/?_rsc=example", { headers: { RSC: "1" } });
  assert.equal((await r.json()).url, "/?_rsc=example");
});

test("PM2-style module loading starts the gateway and supervised backend", async () => {
  const { spawn } = await import("node:child_process");
  const { once } = await import("node:events");
  const { fileURLToPath } = await import("node:url");
  const launchDirectory = join(directory, "pm2-fixture");
  await mkdir(join(launchDirectory, "backend"), { recursive: true });
  await mkdir(join(launchDirectory, "frontend"), { recursive: true });
  await writeFile(
    join(launchDirectory, "frontend", "index.html"),
    "<h1>PM2 storefront</h1>",
  );
  await writeFile(
    join(launchDirectory, "backend", "server.js"),
    "require('node:http').createServer((req,res)=>res.end('existing-backend')).listen(Number(process.env.PORT),process.env.HOSTNAME);",
  );
  const gatewayURL = new URL("./marketplace-gateway.mjs", import.meta.url);
  const loader = join(launchDirectory, "pm2-loader.mjs");
  await writeFile(loader, `import ${JSON.stringify(gatewayURL.href)};`);
  const temporaryPort = async () => {
    const socket = http.createServer();
    await listen(socket);
    const port = socket.address().port;
    await close(socket);
    return port;
  };
  const port = await temporaryPort(),
    backendPort = await temporaryPort();
  const launcher = spawn(process.execPath, [loader], {
    cwd: launchDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      MARKETPLACE_BACKEND_PORT: String(backendPort),
      pm_exec_path: fileURLToPath(gatewayURL),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  launcher.stdout.on("data", (x) => (output += x));
  launcher.stderr.on("data", (x) => (output += x));
  try {
    let html = "";
    for (let i = 0; i < 60; i++) {
      if (launcher.exitCode !== null)
        throw Error("PM2-loaded module exited before listening: " + output);
      try {
        const r = await fetch(`http://127.0.0.1:${port}/`);
        html = await r.text();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    assert.match(html, /PM2 storefront/, output);
    assert.equal(
      await (await fetch(`http://127.0.0.1:${port}/api/test`)).text(),
      "existing-backend",
    );
  } finally {
    if (launcher.exitCode === null) {
      launcher.kill("SIGTERM");
      await once(launcher, "exit");
    }
  }
});

test("store subdomain homepages stay with the existing backend", async () => {
  const response = await requestWithHost("shop.alisveris.az");
  const data = JSON.parse(response.body);
  assert.equal(data.url, "/");
  assert.equal(data.host, "shop.alisveris.az");
});
test("www homepage uses the approved marketplace frontend", async () => {
  const response = await requestWithHost("www.alisveris.az");
  assert.equal(response.status, 200);
  assert.match(response.body, /New marketplace/);
});
function requestWithHost(host) {
  return new Promise((resolve, reject) => {
    http
      .get(base + "/", { headers: { Host: host } }, (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () =>
          resolve({ status: response.statusCode, body }),
        );
        response.on("error", reject);
      })
      .on("error", reject);
  });
}
