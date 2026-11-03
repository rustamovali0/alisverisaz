import { describe, expect, it } from "vitest";
import { safeLinkHref, socialProfileHref } from "@/lib/security/urls";

describe("browser destination validation", () => {
  it.each([
    "javascript:alert(document.domain)",
    "JaVaScRiPt:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "blob:https://alisveris.az/id",
    "//evil.test/path",
    "/\\evil.test",
    "https://user:password@evil.test/",
    "java&#x73;cript:alert(1)",
    "https://example.test/\r\nLocation: x",
    "\u0000https://example.test",
    "https://",
    "mailto:test@example.test?body=malicious",
    "mailto:a%0d%0aBcc:x@example.test",
    "mailto:a@example.test\nBcc:victim@test.test",
  ])("rejects active, ambiguous or malformed destinations: %s", (payload) => {
    expect(safeLinkHref(payload, { allowContact: true })).toBe("");
  });
  it.each([
    "/products?q=telefon&sort=price#new",
    "/radmin/panel",
    "#about",
    "https://ngallery.shop/products",
    "http://example.test/",
  ])("preserves ordinary destinations: %s", (href) => {
    expect(safeLinkHref(href)).toBe(href);
  });
  it("permits contact schemes only for explicitly opted-in navigation", () => {
    expect(safeLinkHref("mailto:admin@alisveris.az")).toBe("");
    expect(
      safeLinkHref("mailto:admin@alisveris.az", { allowContact: true }),
    ).toBe("mailto:admin@alisveris.az");
    expect(safeLinkHref("tel:+994773003383", { allowContact: true })).toBe(
      "tel:+994773003383",
    );
  });
  it("rejects oversized and non-string values without throwing", () => {
    for (const value of [
      null,
      {},
      ["/"],
      23,
      "https://example.test/" + "a".repeat(2048),
    ])
      expect(safeLinkHref(value)).toBe("");
  });
});
describe("public social links, including previously stored values", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "//evil.test",
    "name/../../evil",
    "bad\nname",
    'x\" onclick=alert(1)',
  ])("rejects %s for every social destination", (payload) => {
    for (const kind of ["instagram", "tiktok", "whatsapp"] as const)
      expect(socialProfileHref(kind, payload)).toBe("");
  });
  it("keeps existing handle, full URL, domain/path and phone formats working", () => {
    expect(socialProfileHref("instagram", "@montana.shop")).toBe(
      "https://instagram.com/montana.shop",
    );
    expect(socialProfileHref("tiktok", "montana_shop")).toBe(
      "https://tiktok.com/@montana_shop",
    );
    expect(
      socialProfileHref("instagram", "https://www.instagram.com/shop/"),
    ).toBe("https://www.instagram.com/shop/");
    expect(socialProfileHref("instagram", "instagram.com/shop")).toBe(
      "https://instagram.com/shop",
    );
    expect(socialProfileHref("whatsapp", "+994 (77) 300-33-83")).toBe(
      "https://wa.me/994773003383",
    );
  });
});
