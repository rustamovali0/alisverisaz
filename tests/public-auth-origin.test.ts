import { describe, expect, it } from "vitest";
import { resolvePublicAuthOrigin } from "@/lib/auth/public-origin";

describe("public auth origin", () => {
  it("uses the configured site without paths or parameters", () => {
    expect(resolvePublicAuthOrigin("https://alisveris.az/products?q=test", "alisveris.az", true)).toBe("https://alisveris.az");
  });
  it.each(["http://localhost:3004", "http://127.0.0.1:3004", "http://[::1]:3004", "http://[::ffff:7f00:1]:3004"])("does not expose a production loopback configuration: %s", (url) => {
    expect(resolvePublicAuthOrigin(url, "alisveris.az", true)).toBe("https://alisveris.az");
  });
  it("preserves intentional local development origins", () => {
    expect(resolvePublicAuthOrigin("http://localhost:33107", "alisveris.az", false)).toBe("http://localhost:33107");
  });
});
