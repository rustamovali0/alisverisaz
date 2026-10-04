import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/auth/auth-split-screen", () => ({
  AuthSplitScreen: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/components/auth/reset-password-form", () => ({
  ResetPasswordForm: () => null,
}));

it("keeps the password reset form open for recovery links", async () => {
  const { default: ResetPasswordPage } = await import(
    "@/app/[locale]/(auth)/reset-password/page"
  );

  await expect(
    ResetPasswordPage({
      searchParams: Promise.resolve({ mode: "recovery" }),
    }),
  ).resolves.toBeTruthy();
  expect(mocks.redirect).not.toHaveBeenCalled();
});

it("redirects direct reset page visits back to forgot password", async () => {
  const { default: ResetPasswordPage } = await import(
    "@/app/[locale]/(auth)/reset-password/page"
  );

  await expect(
    ResetPasswordPage({
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("REDIRECT:/forgot-password");
});
