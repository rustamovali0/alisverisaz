import { expect, it, vi } from "vitest";
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/i18n/navigation", () => ({ redirect }));

it("sends legacy creation links to the standalone editor with the locale intact", async () => {
  const { default: Page } = await import("@/app/[locale]/store/dashboard/products/new/page");
  await Page({ params: Promise.resolve({ locale: "az" }) });
  expect(redirect).toHaveBeenLastCalledWith({ href: "/sell/product/new", locale: "az" });
});

it("preserves the product and locale when redirecting old edit links", async () => {
  const { default: Page } = await import("@/app/[locale]/store/dashboard/products/[productId]/edit/page");
  await Page({ params: Promise.resolve({ locale: "ru", productId: "product-123" }) });
  expect(redirect).toHaveBeenLastCalledWith({
    href: "/sell/product/product-123/edit", locale: "ru",
  });
});
