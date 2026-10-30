import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { helpTopicLinks, helpQuickLinks } from "@/lib/help-center/landing-data";
import {
  helpArticles,
  helpArticleGroups,
  helpPages,
} from "@/lib/help-center/content";
import { getHelpCenterCopy } from "@/components/help/help-center-copy";
import { HelpCenter } from "@/components/help/help-center";
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

describe("help navigation", () => {
  it("all topic destinations resolve to real pages, categories or articles", () => {
    const pages = new Set(helpPages.map((page) => page.href));
    const articles = new Set(helpArticles.map((article) => article.href));
    const categories = new Set(
      helpArticleGroups.map((group) => `/help/articles#${group.slug}`),
    );
    const appRoutes = new Set([
      "/register",
      "/register?role=seller",
      "/forgot-password",
      "/dashboard/orders",
    ]);
    for (const topic of helpTopicLinks)
      for (const href of [topic.href, ...topic.links])
        expect(
          pages.has(href) ||
            articles.has(href) ||
            categories.has(href) ||
            appRoutes.has(href),
          href,
        ).toBe(true);
  });
  it.each(["az", "en", "ru"])(
    "provides direct navigation, native FAQs and no search input for %s",
    (locale) => {
      const copy = getHelpCenterCopy(locale);
      const html = renderToStaticMarkup(
        React.createElement(HelpCenter, {
          locale,
          topics: helpTopicLinks,
          quickLinks: helpQuickLinks,
          year: 2026,
        }),
      );
      expect(copy.topics).toHaveLength(helpTopicLinks.length);
      expect(html).toContain('href="/about"');
      expect(html).toContain('href="/contact"');
      expect(html).not.toContain("<input");
      expect(html).not.toContain('role="search"');
      expect(html.match(/<h1[ >]/g)).toHaveLength(1);
      expect(html.match(/<details[ >]/g)).toHaveLength(5);
    },
  );
});
