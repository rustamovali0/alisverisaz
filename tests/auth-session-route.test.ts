import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/session/route";
const mocks = vi.hoisted(() => ({ profile: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserProfile: mocks.profile }));
beforeEach(() => mocks.profile.mockReset());
it("does not report a successful login without a persisted session", async () => {
  mocks.profile.mockResolvedValue(null);
  const response = await GET(new NextRequest("https://example.test/api/auth/session"));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ authenticated: false, role: null });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
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
