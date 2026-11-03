import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import { expect, it, vi } from "vitest";
import { LegalDocument } from "@/components/help/legal-document";
import { getHelpPage } from "@/lib/help-center/content";
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: any) =>
    createElement("a", { href, ...props }, children),
}));
it("retains every legal paragraph and creates a working section destination for every contents link", () => {
  const page = getHelpPage("terms")!;
  const html = renderToStaticMarkup(createElement(LegalDocument, { page }));
  const text = DomUtils.textContent(parseDocument(html));
  for (const section of page.sections) {
    for (const paragraph of section.paragraphs)
      expect(text).toContain(paragraph);
    for (const bullet of section.bullets || []) expect(text).toContain(bullet);
    if (section.note) expect(text).toContain(section.note);
  }
  for (let index = 1; index <= page.sections.length; index++) {
    expect(html).toContain(`id="document-section-${index}"`);
    expect(html).toContain(`href="#document-section-${index}"`);
  }
  expect(html).not.toContain('type="search"');
});
