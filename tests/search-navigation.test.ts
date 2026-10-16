import { describe, expect, it } from "vitest";
import { buildMarketplaceSearchHref } from "@/lib/search/navigation";

describe("marketplace search navigation", () => {
  it("replaces an old term and retains the selected filters", () => {
    const href = buildMarketplaceSearchHref("/products?category=kitablar&q=old&sort=newest", "yeni kitab");
    const url = new URL(href, "https://example.test");
    expect(url.searchParams.getAll("q")).toEqual(["yeni kitab"]);
    expect(url.searchParams.get("category")).toBe("kitablar");
    expect(url.searchParams.get("sort")).toBe("newest");
  });
  it("clears q without clearing store filters or the anchor", () => {
    expect(buildMarketplaceSearchHref("/store/shop?q=old&category=books#products", "  "))
      .toBe("/store/shop?category=books#products");
  });
  it("uses the configured results anchor", () => {
    expect(buildMarketplaceSearchHref("/shop#about", "saat", "products"))
      .toBe("/shop?q=saat#products");
  });
  it("encodes Azerbaijani text and query delimiters as one term", () => {
    const href = buildMarketplaceSearchHref("/products", "  ölçü & rəng #1  ");
    const url = new URL(href, "https://example.test");
    expect(url.searchParams.get("q")).toBe("ölçü & rəng #1");
    expect([...url.searchParams.keys()]).toEqual(["q"]);
    expect(url.hash).toBe("");
  });
  it("does not append a question mark to an empty search", () => {
    expect(buildMarketplaceSearchHref("/products", "")).toBe("/products");
  });
});
