import { expect, it } from "vitest";
import { matchesAdminSearch } from "@/lib/dashboard/admin-search";
import {
  heroPresentation,
  publicHomepageSection,
  homepageVisibilityClass,
} from "@/lib/cms/home-presentation";
import { defaultHomepageSections } from "@/lib/cms/defaults";
it.each([
  ["SƏKİL", "şəkil"],
  ["elektronika", "Elektronika"],
  ["eli telefon", "Əli: telefon mağazası"],
  ["IŞIQ", "işıq"],
])("matches Azerbaijani admin searches %s", (query, value) =>
  expect(matchesAdminSearch(query, [value])).toBe(true),
);
it("requires every search word and handles absent fields", () => {
  expect(matchesAdminSearch("eli telefon", ["Əli", "telefon"])).toBe(true);
  expect(matchesAdminSearch("eli komputer", [null, "telefon"])).toBe(false);
});
const section = {
  ...defaultHomepageSections[0],
  id: "hero",
  settings: { showTitle: true },
  showTitle: true,
  showDescription: true,
};
it("uses the same modern default banner presentation for the editor and storefront", () => {
  expect(heroPresentation(section).title).toBe("Hər ehtiyacına bir tapıntı.");
  expect(heroPresentation(section).imageUrl).toBe(
    "/marketplace/images/hero.jpg",
  );
  expect(heroPresentation({ ...section, title: "Öz kampaniyam" }).title).toBe(
    "Öz kampaniyam",
  );
});
it("does not expose unpublished homepage content while retaining its disabled state", () => {
  const hidden = publicHomepageSection({
    ...section,
    status: "draft",
    title: "Unpublished secret",
    description: "draft",
    settings: { private: "draft" },
  });
  expect(hidden.isActive).toBe(false);
  expect(hidden.title).toBe("");
  expect(hidden.settings).toEqual({});
  expect(homepageVisibilityClass(hidden)).toBe("live-hidden-all");
});
it("honours mobile and desktop visibility independently", () => {
  expect(homepageVisibilityClass({ ...section, showMobile: false })).toBe(
    "live-hidden-mobile",
  );
  expect(homepageVisibilityClass({ ...section, showDesktop: false })).toBe(
    "live-hidden-desktop",
  );
});
