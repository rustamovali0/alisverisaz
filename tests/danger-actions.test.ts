import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ current: vi.fn(), password: vi.fn(), change: vi.fn(), audit: vi.fn(), autoChange: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserProfile: m.current }));
vi.mock("@/lib/security/admin-mfa", () => ({ assertAdminMfa: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw Error("REDIRECT"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/danger-password", () => ({ verifyDangerPassword: m.password }));
vi.mock("@/lib/security/danger-state", () => ({ changeDangerState: m.change }));
vi.mock("@/lib/admin/audit", () => ({ recordAdminAudit: m.audit }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: m.rate }));
vi.mock("@/lib/security/danger-auto", () => ({ changeDangerAuto: m.autoChange }));
import { updateDangerMode, updateDangerAuto } from "@/lib/security/danger-actions";
function form() { const f = new FormData(); for (const [k, v] of Object.entries({ enabled: "true", confirm: "yes", seconds: "3600", version: "old-version" })) f.set(k, v); return f; }
beforeEach(() => { m.current.mockResolvedValue({ role: "admin", user: { id: "admin-fixture" } }); m.password.mockResolvedValue({ ok: true, message: "" }); m.rate.mockResolvedValue({ ok: true }); m.change.mockResolvedValue({ expiresAt: 123, version: "next-version" }); });
it.each(["seller", "customer"])("rejects %s even if they submit a forged admin form", async role => {
  m.current.mockResolvedValue({ role, user: { id: "fixture" } });
  await expect(updateDangerMode({ ok: false, message: "" }, form())).rejects.toThrow("REDIRECT"); expect(m.change).not.toHaveBeenCalled();
});
it("requires server-verified current admin password rather than a frontend flag", async () => {
  m.password.mockResolvedValue({ ok: false, message: "wrong password" });
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

it("requires current admin password and confirmation before enabling the automatic detector", async () => {
  m.password.mockResolvedValue({ ok: false, message: "wrong password" });
  expect((await updateDangerAuto({ ok: false, message: "" }, form())).ok).toBe(false); expect(m.autoChange).not.toHaveBeenCalled();
  m.password.mockResolvedValue({ ok: true, message: "" });
  const missing = form(); missing.delete("confirm"); await updateDangerAuto({ ok: false, message: "" }, missing); expect(m.autoChange).not.toHaveBeenCalled();
  m.autoChange.mockResolvedValue({version:"new-auto"});
  expect((await updateDangerAuto({ ok: false, message: "" }, form())).ok).toBe(true);
  expect(m.autoChange).toHaveBeenCalledWith(true,"old-version");expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({action:"DANGER_AUTO_ENABLED"}));
});
it("does not grant sellers permission to enable automatic Danger", async () => {
 m.current.mockResolvedValue({role:"seller",user:{id:"fixture"}});await expect(updateDangerAuto({ok:false,message:""},form())).rejects.toThrow("REDIRECT");expect(m.autoChange).not.toHaveBeenCalled();
});
