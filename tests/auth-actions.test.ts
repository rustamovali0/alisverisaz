import { beforeEach, expect, it, vi } from "vitest";
import { loginAction, registerAction, requestPasswordResetAction } from "@/lib/auth/actions";
import { query } from "./query";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), server: vi.fn(), from: vi.fn(), getUser: vi.fn(), generateLink: vi.fn(),
  sendEmail: vi.fn(), assertLimit: vi.fn(), recordAttempt: vi.fn(), verifyCaptcha: vi.fn(),
  afterTasks: [] as Array<() => Promise<void>>,
}));
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => mocks.afterTasks.push(task) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "host": "evil.test", "x-forwarded-host": "evil.test", "x-forwarded-proto": "https" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/config/env.server", () => ({ serverEnv: { hasSupabaseSecretKey: true, hasSmtpConfig: true, hasTurnstileConfig: true } }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));
vi.mock("@/lib/email/password-reset", () => ({ sendPasswordResetEmail: mocks.sendEmail }));
vi.mock("@/lib/cms/data", () => ({ getSiteSettings: async () => ({ userRegistrationEnabled: true, storeRegistrationEnabled: true }) }));
vi.mock("@/lib/platform/system-settings", () => ({ getSystemFlags: async () => ({ site_enabled: true, user_access_enabled: true, seller_panel_enabled: true }) }));
vi.mock("@/lib/auth/security", () => ({
  getClientIp: async () => "127.0.0.1", assertAuthRateLimit: mocks.assertLimit,
  recordAuthRateLimitAttempt: mocks.recordAttempt, resetAuthRateLimit: vi.fn(),
  readCaptchaToken: (form: FormData) => form.get("captchaToken") ?? "", verifyCaptchaToken: mocks.verifyCaptcha,
}));

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => {
  mocks.afterTasks = [];
  mocks.admin.mockReturnValue({ from: mocks.from, auth: { admin: { getUserById: mocks.getUser, generateLink: mocks.generateLink } } });
  mocks.from.mockReturnValue(query({ data: { id: "user-1", email: "user@example.test" } }));
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.test" } } });
  mocks.generateLink.mockResolvedValue({ data: { properties: { hashed_token: "test-hash" } } });
  mocks.sendEmail.mockResolvedValue(undefined);
  mocks.assertLimit.mockResolvedValue({ ok: true });
  mocks.recordAttempt.mockResolvedValue({ isBlocked: false });
  mocks.verifyCaptcha.mockResolvedValue({ ok: false, message: "CAPTCHA required" });
});
it("returns identical public responses for active, missing, and inactive accounts", async () => {
  const data = form({ identifier: "user@example.test" });
  const active = await requestPasswordResetAction(data);
  await mocks.afterTasks.pop()?.();
  expect(active.ok).toBe(true);
  mocks.from.mockReturnValue(query());
  expect(await requestPasswordResetAction(data)).toEqual(active);
  await mocks.afterTasks.pop()?.();
  mocks.from.mockReturnValue(query({ data: { id: "user-1" } }));
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.test", banned_until: "2099-01-01" } } });
  expect(await requestPasswordResetAction(data)).toEqual(active);
  await mocks.afterTasks.pop()?.();
  expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
});
it("never uses an attacker-controlled host for the emailed recovery token", async () => {
  await requestPasswordResetAction(form({ identifier: "user@example.test" }));
  await mocks.afterTasks.pop()?.();
  const { resetUrl } = mocks.sendEmail.mock.calls[0][0];
  expect(new URL(resetUrl).origin).toBe("https://shop.example.test");
  expect(new URL(resetUrl).searchParams.get("token_hash")).toBe("test-hash");
});
it("rejects a blocked password reset before account lookup or email delivery", async () => {
  mocks.assertLimit.mockResolvedValue({ ok: false, message: "rate limited" });
  expect((await requestPasswordResetAction(form({ identifier: "user@example.test" }))).ok).toBe(false);
  expect(mocks.admin).not.toHaveBeenCalled();
  expect(mocks.sendEmail).not.toHaveBeenCalled();
});
it("does not expose account lookup or email delivery time in the reset response", async () => {
  expect((await requestPasswordResetAction(form({ identifier: "user@example.test" }))).ok).toBe(true);
  expect(mocks.admin).not.toHaveBeenCalled();
  expect(mocks.sendEmail).not.toHaveBeenCalled();
  expect(mocks.afterTasks).toHaveLength(1);
});
it("stops reset if recording the attempt fails", async () => {
  mocks.recordAttempt.mockResolvedValue({ isBlocked: true, message: "storage unavailable" });
  expect((await requestPasswordResetAction(form({ identifier: "user@example.test" }))).ok).toBe(false);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("does not break public login when the CAPTCHA token is missing", async () => {
  mocks.server.mockResolvedValue({});
  const result = await loginAction(form({ identifier: "not-an-email", password: "test-password" }));

  expect(result.ok).toBe(false);
  expect(result.message).toBe("Düzgün email daxil edin.");
  expect(mocks.verifyCaptcha).not.toHaveBeenCalled();
  expect(mocks.server).toHaveBeenCalled();
});
it("rate limits registration before creating an account", async () => {
  mocks.assertLimit.mockResolvedValue({ ok: false, message: "rate limited" });
  const result = await registerAction(form({ fullName: "QA User", email: "user@example.test", phone: "+994501234567", password: "test-password", confirmPassword: "test-password", role: "customer", terms: "on" }));
  expect(result).toMatchObject({ ok: false, message: "rate limited" });
  expect(mocks.admin).not.toHaveBeenCalled();
});
