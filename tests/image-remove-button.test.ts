import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

it("removes default padding from icon buttons so the X cannot collapse", () => {
  const html = renderToStaticMarkup(createElement(Button,
    { size: "icon", type: "button", "aria-label": "Remove image" },
    createElement(X, { className: "size-5 shrink-0" })));
  expect(html).toContain("p-0");
  expect(html).not.toContain("px-4");
  expect(html).toContain("shrink-0");
  expect(html).toContain('type="button"');
});
