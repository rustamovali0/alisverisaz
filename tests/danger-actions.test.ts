import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ current: vi.fn(), assurance: vi.fn(), change: vi.fn(), audit: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserProfile: m.current }));
vi.mock("@/lib/security/admin-mfa", () => ({ assertAdminMfa: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw Error("REDIRECT"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { mfa: { getAuthenticatorAssuranceLevel: m.assurance } } }) }));
vi.mock("@/lib/security/danger-state", () => ({ changeDangerState: m.change }));
vi.mock("@/lib/admin/audit", () => ({ recordAdminAudit: m.audit }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: m.rate }));
import { updateDangerMode } from "@/lib/security/danger-actions";
function form() { const f = new FormData(); for (const [k, v] of Object.entries({ enabled: "true", confirm: "yes", seconds: "3600", version: "old-version" })) f.set(k, v); return f; }
beforeEach(() => { m.current.mockResolvedValue({ role: "admin", user: { id: "admin-fixture" } }); m.assurance.mockResolvedValue({ data: { currentLevel: "aal2" } }); m.rate.mockResolvedValue({ ok: true }); m.change.mockResolvedValue({ expiresAt: 123, version: "next-version" }); });
it.each(["seller", "customer"])("rejects %s even if they submit a forged admin form", async role => {
  m.current.mockResolvedValue({ role, user: { id: "fixture" } });
  await expect(updateDangerMode({ ok: false, message: "" }, form())).rejects.toThrow("REDIRECT"); expect(m.change).not.toHaveBeenCalled();
});
it("requires verified AAL2 rather than trusting a checkbox or frontend state", async () => {
  m.assurance.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" } });
  expect((await updateDangerMode({ ok: false, message: "" }, form())).ok).toBe(false); expect(m.change).not.toHaveBeenCalled();
});
it("requires deliberate confirmation and respects the control budget", async () => {
  const f = form(); f.delete("confirm"); await updateDangerMode({ ok: false, message: "" }, f); expect(m.change).not.toHaveBeenCalled();
  m.rate.mockResolvedValue({ ok: false, message: "limited" }); expect((await updateDangerMode({ ok: false, message: "" }, form())).message).toBe("limited"); expect(m.change).not.toHaveBeenCalled();
});
it("records an authorized mode change without secrets", async () => {
  expect((await updateDangerMode({ ok: false, message: "" }, form())).ok).toBe(true);
  expect(m.change).toHaveBeenCalledWith(true, 3600, "old-version"); expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "DANGER_ENABLED", adminId: "admin-fixture" }));
});
