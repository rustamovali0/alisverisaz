import { describe, expect, it } from "vitest";
import { getGoogleMapEmbedUrl, normalizeGoogleMapLink } from "../src/lib/locations/map-link";

describe("Google map links", () => {
  it("extracts only the iframe source and decodes HTML entities", () => {
    expect(normalizeGoogleMapLink('<iframe src="https://www.google.com/maps/embed?pb=test&amp;hl=az" onload="evil()"></iframe>'))
      .toBe("https://www.google.com/maps/embed?pb=test&hl=az");
  });
  it.each(["javascript:alert(1)", "https://evil.test/maps/embed", "https://google.com.evil.test/maps", "https://user@google.com/maps", '<iframe src="https://evil.test"></iframe>', '<iframe src="https://google.com/maps"></iframe><iframe src="https://google.com/maps"></iframe>'])
    ("rejects unsafe input %s", (input) => { expect(normalizeGoogleMapLink(input)).toBeNull(); });
  it("preserves the supplied Google embed", () => {
    const embed = "https://www.google.com/maps/embed?pb=!2d49.9498002!3d40.4041778";
    expect(getGoogleMapEmbedUrl(`<iframe src="${embed}"></iframe>`, "other address")).toBe(embed);
  });
  it("converts place links using place coordinates rather than viewport coordinates", () => {
    const link = "https://www.google.com/maps/place/Mantana+Jeans/@40.4,49.9,17z/data=!3d40.4041778!4d49.9498002?entry=ttu";
    expect(getGoogleMapEmbedUrl(link, "other address")).toBe("https://www.google.com/maps?q=40.4041778%2C49.9498002&output=embed");
  });
  it("uses a place name if no coordinates are available", () => {
    expect(getGoogleMapEmbedUrl("https://www.google.com/maps/place/Mantana+Jeans/", "other address"))
      .toBe("https://www.google.com/maps?q=Mantana%20Jeans&output=embed");
  });
  it("uses saved address for short links without guessing coordinates", () => {
    expect(getGoogleMapEmbedUrl("https://maps.app.goo.gl/abc", "Bakı"))
      .toBe("https://www.google.com/maps?q=Bak%C4%B1&output=embed");
  });
});
