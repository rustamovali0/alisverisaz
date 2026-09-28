import { expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { proxy } from "@/proxy";

vi.mock("@/lib/platform/system-settings-proxy", () => ({ getSystemFlagsForProxy: async () => ({ site_enabled: true, admin_panel_enabled: true, seller_panel_enabled: true, user_access_enabled: true }) }));
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: async () => {
  const response = NextResponse.next();
  response.cookies.set("session", "refreshed", { httpOnly: true, secure: true, sameSite: "lax", path: "/", domain: ".alisveris.az", maxAge: 60 });
  return response;
} }));
it("preserves security attributes and expiration when copying refreshed auth cookies", async () => {
  const response = await proxy(new NextRequest("https://www.alisveris.az/store/dashboard/products"));
  expect(response.cookies.get("session")).toMatchObject({ value: "refreshed", httpOnly: true, secure: true, sameSite: "lax", domain: ".alisveris.az", maxAge: 60 });
});
it("overwrites forged route headers during localization", async () => {
  const response = await proxy(new NextRequest("https://www.alisveris.az/store/dashboard/products", { headers: { "x-current-path": "/radmin/orders" } }));
  expect(response.headers.get("x-middleware-request-x-current-path")).toBe("/store/dashboard/products");
});
