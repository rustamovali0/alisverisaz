import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserProfile, requireRole } from "@/lib/auth/session";
import { query } from "./query";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(), signOut: vi.fn(), path: "/store/dashboard/orders",
  flags: { admin_panel_enabled: true, seller_panel_enabled: true, user_access_enabled: true },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-current-path": mocks.path }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("@/lib/platform/system-settings", () => ({ getSystemFlags: async () => mocks.flags }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

function client(role: string, revokedAt: string | null = null, token?: string, profileError?: unknown) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
      getSession: async () => ({ data: { session: { access_token: token } } }),
      signOut: mocks.signOut,
    },
    from: () => query({ data: { id: "user-1", role, session_revoked_at: revokedAt }, error: profileError }),
  };
}

beforeEach(() => {
  mocks.path = "/store/dashboard/orders";
  mocks.flags = { admin_panel_enabled: true, seller_panel_enabled: true, user_access_enabled: true };
  mocks.signOut.mockResolvedValue({});
  mocks.createClient.mockResolvedValue(client("seller"));
});

describe("session and role boundaries", () => {
  it("uses the public session for seller operations", async () => {
    expect((await requireRole(["seller", "admin"])).role).toBe("seller");
    expect(mocks.createClient).toHaveBeenCalledWith({ authScope: "public" });
  });
  it("uses the isolated admin session for mixed-role actions in radmin", async () => {
    mocks.path = "/radmin/orders";
    mocks.createClient.mockResolvedValue(client("admin"));
    expect((await requireRole(["seller", "admin"])).role).toBe("admin");
    expect(mocks.createClient).toHaveBeenCalledWith({ authScope: "admin" });
  });
  it("never accepts a public session for admin-only actions", async () => {
    mocks.createClient.mockResolvedValue(client("customer"));
    await expect(requireRole(["admin"])).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.createClient).toHaveBeenCalledWith({ authScope: "admin" });
  });
  it("redirects unauthenticated admins to the admin login", async () => {
    mocks.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    await expect(requireRole(["admin"], "/radmin/orders")).rejects.toThrow("REDIRECT:/radmin/login?next=%2Fradmin%2Forders");
  });
  it("rejects a customer on a seller action", async () => {
    mocks.createClient.mockResolvedValue(client("customer"));
    await expect(requireRole(["seller"])).rejects.toThrow("REDIRECT:/dashboard");
  });
  it("does not grant a fallback customer session when the profile lookup fails", async () => {
    mocks.createClient.mockResolvedValue(client("seller", null, undefined, { code: "42501" }));
    expect(await getCurrentUserProfile()).toBeNull();
  });
  it.each([undefined, "invalid", `a.${Buffer.from(JSON.stringify({ iat: 100 })).toString("base64url")}.b`])("rejects revoked sessions with missing, invalid, or old issue times (%s)", async (token) => {
    mocks.createClient.mockResolvedValue(client("seller", new Date(200_000).toISOString(), token));
    expect(await getCurrentUserProfile()).toBeNull();
    expect(mocks.signOut).toHaveBeenCalled();
  });
  it("allows a fresh session after revocation", async () => {
    const token = `a.${Buffer.from(JSON.stringify({ iat: 300 })).toString("base64url")}.b`;
    mocks.createClient.mockResolvedValue(client("seller", new Date(200_000).toISOString(), token));
    expect(await getCurrentUserProfile()).not.toBeNull();
  });
  it("rejects seller access when the panel is disabled", async () => {
    mocks.flags.seller_panel_enabled = false;
    await expect(requireRole(["seller"])).rejects.toThrow("deaktivdir");
  });
});
