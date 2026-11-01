import { beforeEach, expect, it, vi } from "vitest";
import { loginAction, registerAction, requestPasswordResetAction, updatePasswordAction } from "@/lib/auth/actions";
import { query } from "./query";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), server: vi.fn(), from: vi.fn(), getUser: vi.fn(),
  sendEmail: vi.fn(), assertLimit: vi.fn(), recordAttempt: vi.fn(), verifyCaptcha: vi.fn(),
  afterTasks: [] as Array<() => Promise<void>>,
}));
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => mocks.afterTasks.push(task) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "host": "evil.test", "x-forwarded-host": "evil.test", "x-forwarded-proto": "https" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/config/env.server", () => ({ serverEnv: { hasSupabaseSecretKey: true, hasTurnstileConfig: true } }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));
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
  mocks.admin.mockReturnValue({ from: mocks.from, auth: { resetPasswordForEmail: mocks.sendEmail, admin: { getUserById: mocks.getUser } } });
  mocks.from.mockReturnValue(query({ data: { id: "user-1", email: "user@example.test" } }));
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.test" } } });
  mocks.sendEmail.mockResolvedValue({ error: null });
  mocks.assertLimit.mockResolvedValue({ ok: true });
  mocks.recordAttempt.mockResolvedValue({ isBlocked: false });
  mocks.verifyCaptcha.mockResolvedValue({ ok: false, message: "CAPTCHA required" });
});
it("reports unregistered and inactive accounts without queuing a recovery email", async () => {
  const data = form({ identifier: "user@example.test" });
  expect((await requestPasswordResetAction(data)).ok).toBe(true);
  await mocks.afterTasks.pop()?.();
  mocks.from.mockReturnValue(query());
  expect(await requestPasswordResetAction(data)).toMatchObject({ok:false,message:"Bu e-poçt ünvanı ilə qeydiyyat tapılmadı. Əvvəlcə qeydiyyatdan keçin."});
  expect(mocks.afterTasks).toHaveLength(0);
  mocks.from.mockReturnValue(query({ data: { id: "user-1" } }));
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.test", banned_until: "2099-01-01" } } });
  expect(await requestPasswordResetAction(data)).toMatchObject({ok:false,message:"Bu hesab hazırda aktiv deyil. Dəstək mərkəzinə müraciət edin."});
  expect(mocks.afterTasks).toHaveLength(0);
  expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
});
it("treats a missing Auth user as unregistered rather than claiming delivery", async () => {
  mocks.getUser.mockResolvedValue({data:{user:null},error:{status:404,code:"user_not_found"}});
  expect((await requestPasswordResetAction(form({identifier:"user@example.test"}))).ok).toBe(false);
  expect(mocks.afterTasks).toHaveLength(0);
});
it("does not misreport database failures as an unregistered address", async () => {
  mocks.from.mockReturnValue(query({error:{message:"database unavailable"}}));
  const result=await requestPasswordResetAction(form({identifier:"user@example.test"}));
  expect(result.ok).toBe(false);
  expect(result.message).not.toContain("qeydiyyat tapılmadı");
  expect(mocks.afterTasks).toHaveLength(0);
});
it("matches email addresses literally instead of treating underscores and percent signs as lookup wildcards", async () => {
  const email="person_one+%tag@example.test";
  const profile=query({data:{id:"user-1",email}});mocks.from.mockReturnValue(profile);
  mocks.getUser.mockResolvedValue({data:{user:{id:"user-1",email}}});
  expect((await requestPasswordResetAction(form({identifier:email}))).ok).toBe(true);
  expect(profile.ilike).toHaveBeenCalledWith("email","person\\_one+\\%tag@example.test");
});
it("never uses an attacker-controlled host for the emailed recovery token", async () => {
  await requestPasswordResetAction(form({ identifier: "user@example.test" }));
  await mocks.afterTasks.pop()?.();
  const [email, {redirectTo}] = mocks.sendEmail.mock.calls[0];
  expect(email).toBe("user@example.test");
  expect(new URL(redirectTo).origin).toBe("https://shop.example.test");
  expect(new URL(redirectTo).pathname).toBe("/reset-password");
  expect(redirectTo).not.toContain("token");
});
it("rejects a blocked password reset before account lookup or email delivery", async () => {
  mocks.assertLimit.mockResolvedValue({ ok: false, message: "rate limited" });
  expect((await requestPasswordResetAction(form({ identifier: "user@example.test" }))).ok).toBe(false);
  expect(mocks.admin).not.toHaveBeenCalled();
  expect(mocks.sendEmail).not.toHaveBeenCalled();
});
it("checks registration before responding without waiting for SMTP delivery", async () => {
  expect((await requestPasswordResetAction(form({ identifier: "user@example.test" }))).ok).toBe(true);
  expect(mocks.admin).toHaveBeenCalled();
  expect(mocks.getUser).toHaveBeenCalled();
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
it("never promotes a customer from user-editable seller approval metadata", async () => {
  const profileQuery = query({ data: { role: "customer", full_name: "QA Seller" } });
  const profileUpdateQuery = query();
  const storeQuery = query({ data: { id: "store-1", logo_url: null, cover_url: null } });
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: {
      user: {
        id: "seller-1",
        email: "seller@example.test",
        user_metadata: {
          requested_role: "seller",
          seller_application_status: "approved",
          full_name: "QA Seller",
        },
      },
    },
    error: null,
  });

  mocks.server.mockResolvedValue({
    auth: { signInWithPassword, signOut: vi.fn() },
    from: () => profileQuery,
  });
  mocks.from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return profileUpdateQuery;
    }

    if (table === "stores") {
      return storeQuery;
    }

    return query();
  });

  const result = await loginAction(
    form({ identifier: "seller@example.test", password: "test-password" }),
  );

  expect(result).toMatchObject({ ok: true, redirectTo: "/" });
  expect(profileUpdateQuery.update).not.toHaveBeenCalled();
});
it("reports profile lookup failures instead of claiming success and entering a redirect loop", async () => {
  const signOut = vi.fn();
  mocks.server.mockResolvedValue({
    auth: {
      signInWithPassword: async () => ({ data: { user: { id: "seller-1", user_metadata: {} } }, error: null }),
      signOut,
    },
    from: () => query({ error: { code: "42501", message: "permission denied" } }),
  });
  expect(await loginAction(form({ identifier: "seller@example.test", password: "test-password" })))
    .toMatchObject({ ok: false });
  expect(signOut).toHaveBeenCalled();
});
it("does not block seller login when store synchronization fails", async () => {
  const profileQuery = query({ data: { role: "seller", full_name: "QA Seller" } });
  const signInWithPassword = vi.fn().mockResolvedValue({
    data: {
      user: {
        id: "seller-1",
        email: "seller@example.test",
        user_metadata: {},
      },
    },
    error: null,
  });

  mocks.server.mockResolvedValue({
    auth: { signInWithPassword, signOut: vi.fn() },
    from: () => profileQuery,
  });
  mocks.from.mockImplementation((table: string) => {
    if (table === "stores") {
      return query({ error: { message: "schema cache miss" } });
    }

    return query();
  });

  const result = await loginAction(
    form({ identifier: "seller@example.test", password: "test-password" }),
  );

  expect(result).toMatchObject({ ok: true, redirectTo: "/store/dashboard" });
});
it("rate limits registration before creating an account", async () => {
  mocks.assertLimit.mockResolvedValue({ ok: false, message: "rate limited" });
  const result = await registerAction(form({ fullName: "QA User", email: "user@example.test", phone: "+994501234567", password: "test-password", confirmPassword: "test-password", role: "customer", terms: "on" }));
  expect(result).toMatchObject({ ok: false, message: "rate limited" });
  expect(mocks.admin).not.toHaveBeenCalled();
});

it("rejects expired or missing recovery sessions without changing a password", async () => {
  const updateUser=vi.fn();
  mocks.server.mockResolvedValue({auth:{getUser:async()=>({data:{user:null}}),updateUser}});
  expect((await updatePasswordAction(form({password:"new-long-password",confirmPassword:"new-long-password"}))).ok).toBe(false);
  expect(updateUser).not.toHaveBeenCalled();
});
it("validates matching strong passwords before accessing a recovery session", async () => {
  const result=await updatePasswordAction(form({password:"1234567",confirmPassword:"1234567"}));
  expect(result.ok).toBe(false);expect(mocks.server).not.toHaveBeenCalled();
  expect((await updatePasswordAction(form({password:"new-long-password",confirmPassword:"different-password"}))).ok).toBe(false);
});
it.each(["customer", "seller"])("replaces revoked sessions with an approved %s login after resetting a password", async (role) => {
  const updateUser=vi.fn(async()=>({error:null})),signOut=vi.fn(async()=>({error:null}));
  const signInWithPassword=vi.fn(async()=>({data:{user:{id:"user-1",email:"user@example.test",user_metadata:{}}},error:null}));
  const profile=query();mocks.from.mockReturnValue(profile);
  mocks.server.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"user-1",email:"user@example.test"}}}),updateUser,signOut,signInWithPassword},from:()=>query({data:{role,full_name:"QA User",phone:null}})});
  expect(await updatePasswordAction(form({password:"new-long-password",confirmPassword:"new-long-password"}))).toMatchObject({ok:true,redirectTo:role==="seller"?"/store/dashboard":"/"});
  expect(updateUser).toHaveBeenCalledWith({password:"new-long-password"});
  expect(profile.update).toHaveBeenCalledWith({session_revoked_at:expect.any(String)});
  expect(signOut).toHaveBeenCalledWith({scope:"global"});
  expect(signInWithPassword).toHaveBeenCalledWith({email:"user@example.test",password:"new-long-password"});
  expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(signInWithPassword.mock.invocationCallOrder[0]);
  const revokedAt=Date.parse(profile.update.mock.calls[0][0].session_revoked_at);
  expect(Math.floor(Date.now()/1000)*1000).toBeGreaterThanOrEqual(revokedAt);
  expect(mocks.server).toHaveBeenCalledWith({authScope:"public",requireCookieWrite:true});
});

it.each([
  {code:"same_password",message:"same password"},
  {message:"New password should be different from the old password."},
])("explains a reused password without signing out the recovery session: %j", async (error) => {
  const signOut=vi.fn();
  mocks.server.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"user-1",email:"user@example.test"}}}),updateUser:async()=>({error}),signOut}});
  expect(await updatePasswordAction(form({password:"existing-password",confirmPassword:"existing-password"}))).toEqual({ok:false,message:"Yeni şifrə əvvəlki şifrədən fərqli olmalıdır."});
  expect(signOut).not.toHaveBeenCalled();
  expect(mocks.admin).not.toHaveBeenCalled();
});

it("reports a completed reset if automatic login fails, without pretending the new password failed", async () => {
  const signInWithPassword=vi.fn(async()=>({data:{user:null},error:{message:"unavailable"}}));
  mocks.server.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"user-1",email:"user@example.test"}}}),updateUser:async()=>({error:null}),signOut:async()=>({error:null}),signInWithPassword}});
  const result=await updatePasswordAction(form({password:"new-long-password",confirmPassword:"new-long-password"}));
  expect(result).toMatchObject({ok:true,redirectTo:"/login"});
  expect(result.message).toContain("Şifrə yeniləndi");
  expect(signInWithPassword).toHaveBeenCalled();
});

it("does not bypass pending seller approval during automatic login", async () => {
  const signOut=vi.fn(async()=>({error:null}));
  mocks.server.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"user-1",email:"user@example.test"}}}),updateUser:async()=>({error:null}),signOut,signInWithPassword:async()=>({data:{user:{id:"user-1",email:"user@example.test",user_metadata:{requested_role:"seller",seller_application_status:"pending"}}},error:null})},from:()=>query({data:{role:"customer"}})});
  expect(await updatePasswordAction(form({password:"new-long-password",confirmPassword:"new-long-password"}))).toMatchObject({ok:true,redirectTo:"/login"});
  expect(signOut).toHaveBeenCalledTimes(2);
});

it("keeps the old-session boundary if revoking sessions fails", async () => {
  const signInWithPassword=vi.fn();
  mocks.from.mockReturnValue(query({error:{message:"revocation failed"}}));
  mocks.server.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"user-1",email:"user@example.test"}}}),updateUser:async()=>({error:null}),signOut:async()=>({error:null}),signInWithPassword}});
  expect(await updatePasswordAction(form({password:"new-long-password",confirmPassword:"new-long-password"}))).toMatchObject({ok:true,redirectTo:"/login"});
  expect(signInWithPassword).not.toHaveBeenCalled();
});
