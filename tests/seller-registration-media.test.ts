import { beforeEach, expect, it, vi } from "vitest";
import { registerAction } from "@/lib/auth/actions";

const mocks = vi.hoisted(() => ({ createUser: vi.fn(), updateUser: vi.fn(), profile: vi.fn(), upload: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/cms/data", () => ({ getSiteSettings: async () => ({ userRegistrationEnabled: true, storeRegistrationEnabled: true }) }));
vi.mock("@/lib/platform/system-settings", () => ({ getSystemFlags: async () => ({ site_enabled: true, seller_panel_enabled: true }) }));
vi.mock("@/lib/auth/security", () => ({
  getClientIp: async () => "127.0.0.1", assertAuthRateLimit: async () => ({ ok: true }),
  recordAuthRateLimitAttempt: async () => ({ isBlocked: false }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ auth: { admin: { createUser: mocks.createUser, updateUserById: mocks.updateUser } } }) }));
vi.mock("@/lib/auth/profiles", () => ({ ensureAuthProfile: mocks.profile }));
vi.mock("@/lib/storage/r2", () => ({ uploadImageToR2: mocks.upload }));
vi.mock("@/lib/storage/media-assets", () => ({ recordImageMediaAsset: vi.fn() }));
vi.mock("@/lib/telegram/notifications", () => ({ notifySellerRegistered: vi.fn() }));

beforeEach(() => {
  mocks.createUser.mockResolvedValue({ data: { user: { id: "seller-test", email: "seller@example.test", user_metadata: { requested_role: "seller" } } }, error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.upload.mockImplementation(async ({ file }) => ({ url: `https://media.example.test/${file.name}` }));
});

it.each([[], ["avatarFile"], ["bannerFile"], ["avatarFile", "bannerFile"]])("accepts optional seller media: %j", async (...fields: string[]) => {
  const form = new FormData();
  Object.entries({ storeName: "QA mağaza", email: "seller@example.test", phone: "+994501234567", password: "test-password", confirmPassword: "test-password", role: "seller", terms: "on" }).forEach(([key, value]) => form.set(key, value));
  for (const field of fields) form.set(field, new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], `${field}.png`, { type: "image/png" }));

  expect(await registerAction(form)).toMatchObject({ ok: true, redirectTo: "/login" });
  expect(mocks.upload).toHaveBeenCalledTimes(fields.length);
  expect(mocks.profile).toHaveBeenCalledWith(expect.objectContaining({ id: "seller-test", role: "customer", avatarUrl: fields.includes("avatarFile") ? "https://media.example.test/avatarFile.png" : null }));
  if (fields.length) {
    expect(mocks.updateUser).toHaveBeenCalledWith("seller-test", { user_metadata: expect.objectContaining({
      avatar_url: fields.includes("avatarFile") ? "https://media.example.test/avatarFile.png" : null,
      banner_url: fields.includes("bannerFile") ? "https://media.example.test/bannerFile.png" : null,
    }) });
  } else {
    expect(mocks.updateUser).not.toHaveBeenCalled();
  }
});
