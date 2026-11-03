import {beforeEach,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({signIn:vi.fn(),signOut:vi.fn(),create:vi.fn(),rate:vi.fn(),clear:vi.fn(),captcha:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/supabase/public",()=>({createSupabasePublicClient:m.create}));
vi.mock("@/lib/auth/security",()=>({getClientIp:async()=>"203.0.113.1",readCaptchaToken:(f:FormData)=>f.get("captchaToken"),verifyFormCaptcha:m.captcha}));
vi.mock("@/lib/security/rate-limit",()=>({consumeRateLimit:m.rate,clearRateLimit:m.clear}));
vi.mock("@/lib/admin/audit",()=>({recordAdminAudit:m.audit}));
vi.mock("@/lib/security/events",()=>({securityEvent:vi.fn()}));
import {verifyDangerPassword} from "@/lib/security/danger-password";
const user={id:"admin-one",email:"verified-admin@example.test"};
function form(password="current-password"){const f=new FormData();f.set("adminPassword",password);f.set("captchaToken","fresh-captcha");f.set("email","attacker@example.test");return f;}
beforeEach(()=>{m.rate.mockResolvedValue({ok:true});m.captcha.mockResolvedValue({ok:true});m.create.mockReturnValue({auth:{signInWithPassword:m.signIn,signOut:m.signOut}});m.signIn.mockResolvedValue({data:{user:{id:user.id},session:{access_token:"fixture"}},error:null});m.signOut.mockResolvedValue({error:null});});
it("checks the trusted current admin account, then revokes only the disposable verification session",async()=>{
 expect((await verifyDangerPassword(user,form())).ok).toBe(true);expect(m.signIn).toHaveBeenCalledWith(expect.objectContaining({email:user.email,password:"current-password"}));expect(m.create).toHaveBeenCalledWith({requestTimeoutMs:5000});expect(m.signOut).toHaveBeenCalledWith({scope:"local"});expect(m.clear).toHaveBeenCalledWith("danger_password:user",user.id);
});
it("passes native CAPTCHA exactly once without exposing an authenticated cookie client",async()=>{
 vi.stubEnv("AUTH_CAPTCHA_MODE","supabase");await verifyDangerPassword(user,form());expect(m.signIn).toHaveBeenCalledWith(expect.objectContaining({options:{captchaToken:"fresh-captcha"}}));vi.unstubAllEnvs();
});
it("rejects wrong credentials and never logs the submitted password",async()=>{
 m.signIn.mockResolvedValue({data:{user:null,session:null},error:{message:"private-provider-error"}});const result=await verifyDangerPassword(user,form());expect(result.ok).toBe(false);expect(m.signOut).not.toHaveBeenCalled();expect(JSON.stringify(m.audit.mock.calls)).not.toContain("current-password");expect(JSON.stringify(result)).not.toContain("private-provider-error");
});
it("rejects a provider response for another account and cleans up that session",async()=>{
 m.signIn.mockResolvedValue({data:{user:{id:"another-user"},session:{access_token:"fixture"}},error:null});expect((await verifyDangerPassword(user,form())).ok).toBe(false);expect(m.signOut).toHaveBeenCalledWith({scope:"local"});
});
it("rejects missing and oversized passwords before contacting Auth",async()=>{
 expect((await verifyDangerPassword(user,form(""))).ok).toBe(false);expect((await verifyDangerPassword(user,form("x".repeat(1025)))).ok).toBe(false);expect(m.create).not.toHaveBeenCalled();
});
it("enforces shared IP/account budgets and CAPTCHA before password verification",async()=>{
 m.rate.mockResolvedValueOnce({ok:false,message:"limited"});expect((await verifyDangerPassword(user,form())).message).toBe("limited");expect(m.create).not.toHaveBeenCalled();m.captcha.mockResolvedValue({ok:false,message:"captcha required"});expect((await verifyDangerPassword(user,form())).message).toBe("captcha required");expect(m.create).not.toHaveBeenCalled();
});
it("fails closed on an unavailable password provider",async()=>{
 m.signIn.mockRejectedValue(Error("network"));expect((await verifyDangerPassword(user,form())).ok).toBe(false);expect(m.clear).not.toHaveBeenCalled();
});
