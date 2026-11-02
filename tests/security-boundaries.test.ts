import { afterEach, expect, it, vi } from "vitest";
import { fetchTrustedBytes } from "@/lib/security/fetch";
import { reportOnlyCsp, hstsValue } from "@/lib/security/headers";
import { mfaRequirement } from "@/lib/security/admin-mfa";
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it.each([
  "http://127.0.0.1/latest/meta-data",
  "https://api.telegram.org.evil.test/a",
  "https://api.telegram.org@127.0.0.1/a",
  "file:///etc/passwd",
])("rejects SSRF before any network request: %s", async (url) => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    fetchTrustedBytes(url, "https://api.telegram.org", 10),
  ).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects a redirect and an oversized streamed response", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 302 }))
    .mockResolvedValueOnce(new Response("x".repeat(11)));
  vi.stubGlobal("fetch", fetch);
  await expect(
    fetchTrustedBytes(
      "https://api.telegram.org/file",
      "https://api.telegram.org",
      10,
    ),
  ).rejects.toThrow();
  await expect(
    fetchTrustedBytes(
      "https://api.telegram.org/file",
      "https://api.telegram.org",
      10,
    ),
  ).rejects.toThrow("REMOTE_RESOURCE_TOO_LARGE");
  expect(fetch.mock.calls[0][1]).toMatchObject({
    redirect: "error",
    cache: "no-store",
  });
});
it("retains bytes from an allowed, bounded provider response", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("image")),
  );
  expect(
    (
      await fetchTrustedBytes(
        "https://api.telegram.org/file",
        "https://api.telegram.org",
        10,
      )
    ).buffer.toString(),
  ).toBe("image");
});
it("observes a strict CSP without unsafe script execution and never assumes wildcard HSTS", () => {
  const csp = reportOnlyCsp("https://api.example.test");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  expect(csp).not.toContain("unsafe-eval");
  expect(csp).toContain("/api/security/csp-report");
  vi.stubEnv("HSTS_INCLUDE_SUBDOMAINS", "");
  expect(hstsValue()).not.toContain("includeSubDomains");
});
it("requires AAL2 for enrolled administrators and supports a controlled enrollment rollout", () => {
  expect(mfaRequirement("aal1", "aal2", "enrolled")).toBe("verify");
  expect(mfaRequirement("aal2", "aal2", "required")).toBeNull();
  expect(mfaRequirement("aal1", "aal1", "enrolled")).toBeNull();
  expect(mfaRequirement("aal1", "aal1", "required")).toBe("enroll");
});
