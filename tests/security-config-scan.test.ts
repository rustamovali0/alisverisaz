import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

function preflight(overrides: Record<string, string> = {}) {
  const run = spawnSync(process.execPath, ["scripts/security/preflight.mjs"], {
    encoding: "utf8",
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://shop.example.test",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "example-secret-never-log",
      TRUSTED_PROXY_MODE: "nginx",
      AUTH_CAPTCHA_MODE: "application",
      ...overrides,
    },
  });
  expect(run.stdout).not.toContain("example-secret-never-log");
  return { status: run.status, data: JSON.parse(run.stdout) };
}
it("requires a trusted ingress before deployment", () => {
  const result = preflight({ TRUSTED_PROXY_MODE: "" });
  expect(result.status).toBe(1);
  expect(result.data.ready).toBe(false);
});
it("rejects mixed CAPTCHA pairs and invalid Redis URLs without logging credentials", () => {
  const result = preflight({
    TURNSTILE_SECRET_KEY: "example-secret-never-log",
    SECURITY_REDIS_URL: "https://user:example-secret-never-log@cache.test",
  });
  expect(result.status).toBe(1);
  expect(result.data.errors).toEqual(
    expect.arrayContaining([
      "Turnstile site/secret must be configured together",
      "Invalid security Redis protocol",
    ]),
  );
});
it("does not pretend manual GoTrue/RLS/ingress verification has been performed", () => {
  const result = preflight();
  expect(result.status).toBe(0);
  expect(result.data.manualChecks.length).toBeGreaterThan(3);
  expect(result.data.storage).toContain("migration required");
});
it("detects known key formats without returning their values", async () => {
  // Import as ESM through node; the scanner itself must not run on import.
  const source =
    "import {secretKinds} from './scripts/security/secret-scan.mjs'; console.log(JSON.stringify(secretKinds('ghp_'+ 'a'.repeat(36) + ' '+ 'AKIA'+ 'A'.repeat(16))))";
  const run = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", source],
    { encoding: "utf8" },
  );
  expect(JSON.parse(run.stdout)).toEqual(["github-token", "aws-access-key"]);
});
