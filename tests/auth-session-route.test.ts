import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/session/route";
const mocks = vi.hoisted(() => ({ profile: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserProfile: mocks.profile }));
beforeEach(() => mocks.profile.mockReset());
it("returns only display profile fields, never authentication tokens", async () => {
  mocks.profile.mockResolvedValue({
    role: "customer", user: { id: "u1", email: "a@example.test", access_token: "secret" },
    profile: { full_name: "User", avatar_url: null, email: "a@example.test" },
  });
  const response = await GET(new NextRequest("https://example.test/api/auth/session?profile=1"));
  const data = await response.json();
  expect(data.profile).toEqual({
    status: "authenticated", userId: "u1", role: "customer",
    email: "a@example.test", fullName: "User", avatarUrl: null,
  });
  expect(JSON.stringify(data)).not.toContain("secret");
});
it("does not report a successful login without a persisted session", async () => {
  mocks.profile.mockResolvedValue(null);
  const response = await GET(new NextRequest("https://example.test/api/auth/session"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ authenticated: false, role: null });
  expect(response.headers.get("cache-control")).toBe("private, max-age=0, must-revalidate");
});
it("checks the public seller session", async () => {
  mocks.profile.mockResolvedValue({ role: "seller" });
  const response = await GET(new NextRequest("https://example.test/api/auth/session?scope=public"));
  expect(mocks.profile).toHaveBeenCalledWith("public");
  expect(await response.json()).toEqual({ authenticated: true, role: "seller" });
});
it("keeps administrator session checks isolated", async () => {
  mocks.profile.mockResolvedValue(null);
  await GET(new NextRequest("https://example.test/api/auth/session?scope=admin"));
  expect(mocks.profile).toHaveBeenCalledWith("admin");
});
