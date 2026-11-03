import { beforeEach, expect, it, vi } from "vitest";
import {
  updateHomepageSectionAction,
  updateNavigationItemAction,
  updateSiteSettingsAction,
} from "@/lib/cms/actions";
import { updateSellerStoreSettingsAction } from "@/lib/store-settings/actions";
const m = vi.hoisted(() => ({
  role: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  server: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRole: m.role }));
vi.mock("@/lib/admin/audit", () => ({ recordAdminAudit: vi.fn() }));
vi.mock("@/lib/cache/public-cache", () => ({
  invalidateHomepagePublicData: vi.fn(),
  invalidateNavigationPublicData: vi.fn(),
  invalidatePublicSiteSettings: vi.fn(),
  invalidateStorePublicData: vi.fn(),
}));
vi.mock("@/lib/storage/media-assets", () => ({
  deleteR2MediaAssetsByUrls: vi.fn(),
  recordImageMediaAsset: vi.fn(),
}));
vi.mock("@/lib/storage/r2", () => ({
  isR2PublicUrl: () => false,
  uploadImageToR2: m.upload,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: m.server,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { is_system: false, href: "/products" },
          }),
        }),
      }),
      update: m.update,
    }),
  }),
}));
const form = (values: Record<string, string>) => {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) f.set(key, value);
  return f;
};
beforeEach(() => {
  m.role.mockResolvedValue({ user: { id: "admin-id" }, role: "admin" });
  m.update.mockReturnValue({ eq: async () => ({ error: null }) });
});
it.each([
  "javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "//evil.test/",
])("rejects a dangerous CMS button before update/upload: %s", async (href) => {
  const result = await updateHomepageSectionAction(
    form({ sectionId: "section-id", buttonUrl: href }),
  );
  expect(result.ok).toBe(false);
  expect(m.update).not.toHaveBeenCalled();
  expect(m.upload).not.toHaveBeenCalled();
});
it("rejects a dangerous custom navigation destination on the server", async () => {
  expect(
    (
      await updateNavigationItemAction(
        form({ itemId: "item-id", href: "javascript:alert(1)" }),
      )
    ).ok,
  ).toBe(false);
  expect(m.update).not.toHaveBeenCalled();
});
it("preserves legitimate internal navigation updates", async () => {
  expect(
    (
      await updateNavigationItemAction(
        form({ itemId: "item-id", href: "/products?q=telefon" }),
      )
    ).ok,
  ).toBe(true);
  expect(m.update).toHaveBeenCalledWith(
    expect.objectContaining({ href: "/products?q=telefon" }),
  );
});
it("keeps server-side admin authorization ahead of privileged menu writes", async () => {
  m.role.mockRejectedValueOnce(new Error("Forbidden"));
  await expect(
    updateNavigationItemAction(form({ itemId: "item-id", href: "/products" })),
  ).rejects.toThrow("Forbidden");
  expect(m.update).not.toHaveBeenCalled();
});
it("rejects unsafe site and seller social links without media or business-data writes", async () => {
  expect(
    (
      await updateSiteSettingsAction(
        form({ socialInstagram: "javascript:alert(1)" }),
      )
    ).ok,
  ).toBe(false);
  expect(
    (
      await updateSellerStoreSettingsAction(
        form({
          storeId: "store-id",
          name: "Shop",
          socialTiktok: "data:text/html,hello",
        }),
      )
    ).ok,
  ).toBe(false);
  expect(m.update).not.toHaveBeenCalled();
  expect(m.upload).not.toHaveBeenCalled();
});
