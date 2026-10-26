import http from "node:http";
import net from "node:net";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
const hopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
function proxyHeaders(headers) {
  const omitted = new Set([
    ...hopHeaders,
    ...String(headers.connection || "")
      .toLowerCase()
      .split(",")
      .map((x) => x.trim()),
  ]);
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !omitted.has(key.toLowerCase())),
  );
}
function errorResponse(res, status, message) {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(message);
}

/** Frontend owns only HTML GET / and /marketplace assets. All backend routes and actions are proxied unchanged. */
export function createMarketplaceGateway({
  frontendDirectory,
  backendPort,
  backendHost = "127.0.0.1",
}) {
  const directory = resolve(frontendDirectory);
  const server = http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      errorResponse(res, 400, "Invalid URL");
      return;
    }
    const hostname = String(req.headers.host || "localhost")
      .toLowerCase()
      .replace(/:\d+$/, "");
    const isMarketplaceHost = [
      "alisveris.az",
      "www.alisveris.az",
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(hostname);
    const isDocument =
      isMarketplaceHost &&
      url.pathname === "/" &&
      (req.method === "GET" || req.method === "HEAD") &&
      !req.headers.rsc &&
      !url.searchParams.has("_rsc") &&
      !req.headers["next-action"];
    const isAsset = url.pathname.startsWith("/marketplace/");
    if (isDocument || isAsset) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.setHeader("allow", "GET, HEAD");
        errorResponse(res, 405, "Method not allowed");
        return;
      }
      let relative;
      try {
        relative = isDocument
          ? "index.html"
          : decodeURIComponent(url.pathname.slice("/marketplace/".length));
      } catch {
        errorResponse(res, 400, "Invalid path");
        return;
      }
      if (
        relative.includes("\0") ||
        relative.includes("\\") ||
        relative
          .split("/")
          .some((part) => part === ".." || part.startsWith("."))
      ) {
        errorResponse(res, 404, "Not found");
        return;
      }
      const file = resolve(directory, relative);
      if (!file.startsWith(directory + sep)) {
        errorResponse(res, 404, "Not found");
        return;
      }
      try {
        const info = await stat(file);
        if (!info.isFile()) {
          errorResponse(res, 404, "Not found");
          return;
        }
        const extension = file.slice(file.lastIndexOf(".")).toLowerCase();
        if (!contentTypes[extension]) {
          errorResponse(res, 404, "Not found");
          return;
        }
        res.writeHead(200, {
          "content-type": contentTypes[extension],
          "content-length": info.size,
          "cache-control": isDocument
            ? "no-store"
            : relative.startsWith("assets/")
              ? "public, max-age=31536000, immutable"
              : "public, max-age=86400",
          "x-content-type-options": "nosniff",
          "x-frame-options": "SAMEORIGIN",
          "content-security-policy":
            "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
          "referrer-policy": "same-origin",
        });
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        const stream = createReadStream(file);
        stream.on("error", () => res.destroy());
        res.on("close", () => stream.destroy());
        stream.pipe(res);
      } catch (error) {
        errorResponse(
          res,
          error.code === "ENOENT" ? 404 : 500,
          error.code === "ENOENT" ? "Not found" : "Unable to serve frontend",
        );
      }
      return;
    }
    const upstream = http.request(
      {
        hostname: backendHost,
        port: backendPort,
        path: req.url,
        method: req.method,
        headers: proxyHeaders(req.headers),
      },
      (response) => {
        res.writeHead(
          response.statusCode || 502,
          proxyHeaders(response.headers),
        );
        response.on("error", () => res.destroy());
        response.pipe(res);
      },
    );
    upstream.on("error", () =>
      errorResponse(res, 502, "Application is temporarily unavailable"),
    );
    req.on("aborted", () => upstream.destroy());
    res.on("close", () => upstream.destroy());
    req.pipe(upstream);
  });
  // Keep existing server WebSocket endpoints working; Supabase's external sockets are unaffected.
  server.on("upgrade", (req, socket, head) => {
    const upstream = net.connect(backendPort, backendHost, () => {
      upstream.write(
        `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
          req.rawHeaders.reduce(
            (s, v, i) => s + (i % 2 === 0 ? `${v}: ` : `${v}\r\n`),
            "",
          ) +
          "\r\n",
      );
      if (head.length) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
    socket.on("close", () => upstream.destroy());
  });
  return server;
}

async function waitForBackend(port, child) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error("Backend exited before readiness");
    const ready = await new Promise((resolveReady) => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.destroy();
        resolveReady(true);
      });
      socket.once("error", () => resolveReady(false));
      socket.setTimeout(300, () => {
        socket.destroy();
        resolveReady(false);
      });
    });
    if (ready) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Backend readiness timeout");
}
async function start() {
  const cwd = process.cwd();
  const port = Number(process.env.PORT || 3004);
  const backendPort = Number(process.env.MARKETPLACE_BACKEND_PORT || 3405);
  if (port === backendPort)
    throw new Error("Frontend and backend ports must differ");
  // Keep the backend on loopback without NextURL canonicalizing its origin to
  // localhost and treating locale rewrites as external requests.
  const child = spawn(process.execPath, ["server.js"], {
    cwd: resolve(cwd, "backend"),
    env: {
      ...process.env,
      HOSTNAME: "::ffff:127.0.0.1",
      PORT: String(backendPort),
    },
    stdio: "inherit",
  });
  const server = createMarketplaceGateway({
    frontendDirectory: resolve(cwd, "frontend"),
    backendPort,
  });
  let stopping = false;
  const shutdown = (code = 0) => {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    server.close();
    child.kill("SIGTERM");
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      process.exit(code);
    }, 8000);
    timer.unref();
    child.once("exit", () => process.exit(code));
  };
  process.on("SIGINT", () => shutdown());
  process.on("SIGTERM", () => shutdown());
  child.on("error", (error) => {
    console.error("[marketplace] Backend startup failed:", error.message);
    shutdown(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error("[marketplace] Backend exited:", code, signal);
      shutdown(1);
    }
  });
  server.on("error", (error) => {
    console.error("[marketplace] Gateway failed:", error.message);
    shutdown(1);
  });
  try {
    await waitForBackend(backendPort, child);
    server.listen(port, "127.0.0.1", () =>
      console.log(
        `[marketplace] Frontend ready on 127.0.0.1:${port}; backend on 127.0.0.1:${backendPort}`,
      ),
    );
  } catch (error) {
    console.error("[marketplace]", error.message);
    shutdown(1);
  }
}
const entrypoint = process.env.pm_exec_path || process.argv[1];
if (entrypoint && resolve(entrypoint) === fileURLToPath(import.meta.url)) {
  start().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
