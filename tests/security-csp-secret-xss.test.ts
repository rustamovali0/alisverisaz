import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { JsonLd } from "@/components/seo/json-ld";
import { POST } from "@/app/api/security/csp-report/route";
const m = vi.hoisted(() => ({ event: vi.fn() }));
vi.mock("@/lib/security/api", () => ({ apiRateLimit: async () => null }));
vi.mock("@/lib/security/events", () => ({ securityEvent: m.event }));
it("escapes user-originated script delimiters in structured data", () => {
  const html = renderToStaticMarkup(
    createElement(JsonLd, {
      data: { name: "</script><script>alert(1)</script>" },
    }),
  );
  expect(html.match(/<script/g)).toHaveLength(1);
  expect(html).toContain("\\u003c/script>");
  expect(html).not.toContain("<script>alert");
});
it("records only the CSP directive, discarding sensitive document/token URLs and samples", async () => {
  const r = await POST(
    new Request("https://shop.example.test/api/security/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: JSON.stringify({
        "csp-report": {
          "effective-directive": "script-src-elem",
          "document-uri": "https://site.test/reset?token=private",
          "script-sample": "secret",
        },
      }),
    }),
  );
  expect(r.status).toBe(204);
  expect(m.event).toHaveBeenCalledWith("csp_violation", "script-src-elem", 204);
  expect(JSON.stringify(m.event.mock.calls)).not.toContain("private");
});
it("rejects oversized CSP report streams", async () => {
  const r = await POST(
    new Request("https://shop.example.test/api/security/csp-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(4100),
    }),
  );
  expect(r.status).toBe(413);
  expect(m.event).not.toHaveBeenCalled();
});
