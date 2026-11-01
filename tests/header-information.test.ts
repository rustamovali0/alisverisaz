import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { MarketplaceHeader } from "@/components/layout/marketplace-header";
const state = vi.hoisted(() => ({ path: "/help" }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => state.path,
  Link: ({ href, children, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));
vi.mock("@/i18n/marketplace-copy", () => ({
  useMarketplaceText: () => (source: string) => source,
}));
vi.mock("@/lib/auth/use-client-auth-profile", () => ({
  useClientAuthProfileState: () => ({
    profile: { status: "anonymous" },
    isResolved: true,
  }),
}));
vi.mock("@/components/auth/header-account-actions", () => ({
  HeaderAccountActions: () => null,
}));
vi.mock("@/components/layout/marketplace-brand", () => ({
  MarketplaceBrand: () => null,
}));
vi.mock("@/components/layout/mobile-bottom-nav", () => ({
  MobileBottomNav: () => null,
}));
vi.mock("@/components/notifications/notification-center", () => ({
  NotificationCenter: () => null,
}));
vi.mock("@/components/theme/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/i18n/language-switcher", () => ({
  LanguageSwitcher: () => null,
  LanguageCompactDropdown: () => null,
}));
vi.mock("@/components/search/marketplace-search", () => ({
  MarketplaceSearch: ({ placeholder }: any) =>
    React.createElement("input", { placeholder, "data-product-search": true }),
}));
beforeEach(() => {
  state.path = "/help";
});
it.each([
  "/help",
  "/help/articles",
  "/help/articles/account",
  "/about",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/rules",
  "/guide/seller",
])("hides product search and shopping navigation on %s", (path) => {
  state.path = path;
  const html = renderToStaticMarkup(React.createElement(MarketplaceHeader));
  expect(html).toContain('data-info-header="true"');
  expect(html).not.toContain("data-product-search");
  expect(html).not.toContain('class="live-utility"');
  expect(html).not.toContain('class="live-navigation"');
});
it.each(["/", "/products", "/products/example", "/stores", "/helpful"])(
  "keeps the short marketplace search on %s",
  (path) => {
    state.path = path;
    const html = renderToStaticMarkup(React.createElement(MarketplaceHeader));
    expect(html).toContain('placeholder="Nə axtarırsınız?"');
    expect(html).toContain("data-product-search");
    expect(html).not.toContain("Məhsul, mağaza və daha çox");
  },
);
