import { beforeEach, expect, it, vi } from "vitest";
import { enrollAdminMfa, verifyAdminMfa } from "@/lib/security/mfa-actions";
const m = vi.hoisted(() => ({
  current: vi.fn(),
  aal: vi.fn(),
  enroll: vi.fn(),
  list: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserProfile: m.current }));
vi.mock("@/lib/auth/security", () => ({
  getClientIp: async () => "unknown",
  assertAuthRateLimit: async () => ({ ok: true }),
}));
vi.mock("@/lib/admin/audit", () => ({ recordAdminAudit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: m.aal,
        enroll: m.enroll,
        listFactors: m.list,
        challengeAndVerify: m.verify,
      },
    },
  }),
}));
beforeEach(() => {
  m.current.mockResolvedValue({ role: "admin", user: { id: "admin" } });
  m.aal.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal2" },
  });
});
it("rejects non-admin MFA mutations", async () => {
  m.current.mockResolvedValue({ role: "seller", user: { id: "seller" } });
  await expect(enrollAdminMfa()).rejects.toThrow("İcazəniz yoxdur");
  expect(m.enroll).not.toHaveBeenCalled();
});
it("cannot bypass an existing factor by enrolling another factor at AAL1", async () => {
  await expect(enrollAdminMfa()).rejects.toThrow("Əvvəlcə");
  expect(m.enroll).not.toHaveBeenCalled();
});
it("cannot submit a factor belonging to another user", async () => {
  m.list.mockResolvedValue({ data: { totp: [{ id: "own-factor" }] } });
  expect((await verifyAdminMfa("foreign-factor", "123456")).ok).toBe(false);
  expect(m.verify).not.toHaveBeenCalled();
});
