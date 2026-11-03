import type { HomepageSection } from "@/lib/cms/types";
export const homeSectionLabels: Record<string, string> = {
  hero: "Əsas banner",
  categories: "Kateqoriyalar",
  featured_products: "Seçilmiş mağazalar",
};
export function heroPresentation(section?: HomepageSection) {
  const legacy =
    !section?.title ||
    /Alışverişdə hər mağaza|Alışverişin ünvanı|^alisveris.az$/i.test(
      section.title,
    );
  return {
    title: legacy ? "Hər ehtiyacına bir tapıntı." : section.title,
    description: legacy
      ? "Sevdiyin məhsullar, etibarlı mağazalar. Hamısı bir ünvanda — alışveriş.az-da."
      : section?.description || "",
    imageUrl:
      section?.imageUrl && !section.imageUrl.includes("/auth/")
        ? section.imageUrl
        : "/marketplace/images/hero.jpg",
  };
}
export function homepageVisibilityClass(section?: HomepageSection) {
  if (!section) return "";
  if (
    !section.isActive ||
    section.status !== "published" ||
    (!section.showMobile && !section.showDesktop)
  )
    return "live-hidden-all";
  return `${!section.showMobile ? "live-hidden-mobile" : ""} ${!section.showDesktop ? "live-hidden-desktop" : ""}`.trim();
}
export function publicHomepageSection(
  section: HomepageSection,
): HomepageSection {
  return section.isActive && section.status === "published"
    ? section
    : {
        ...section,
        title: "",
        description: "",
        imageUrl: "",
        buttonLabel: "",
        buttonUrl: "",
        settings: {},
        isActive: false,
      };
}
