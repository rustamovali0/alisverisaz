import {beforeEach,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({rate:vi.fn(),signal:vi.fn()}));
vi.mock("@/lib/security/rate-limit",()=>({consumeRateLimit:m.rate,clearRateLimit:vi.fn()}));
vi.mock("@/lib/security/danger-auto",()=>({recordDangerRisk:m.signal}));
vi.mock("@/lib/config/env.server",()=>({serverEnv:{}}));
import {assertAuthRateLimit} from "@/lib/auth/security";
const rule={endpoint:"login" as const,identifier:"fixture@example.test",ip:"203.0.113.1",maxAttempts:5,windowSeconds:900};
beforeEach(()=>m.rate.mockReset());
it("feeds an account-level auth rejection with the trusted network rather than an email",async()=>{
 m.rate.mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({ok:false,status:429});await assertAuthRateLimit(rule);expect(m.signal).toHaveBeenCalledWith("auth_rate_block","203.0.113.1");
});
it("feeds an IP-level auth rejection only once",async()=>{
 m.rate.mockResolvedValue({ok:false,status:429});await assertAuthRateLimit({...rule,endpoint:"register"});expect(m.signal).toHaveBeenCalledTimes(1);expect(m.rate).toHaveBeenCalledTimes(1);
});
it("does not classify a storage outage or search budget as an auth attack",async()=>{
 m.rate.mockResolvedValue({ok:false,status:503});await assertAuthRateLimit(rule);m.rate.mockResolvedValue({ok:false,status:429});await assertAuthRateLimit({...rule,endpoint:"marketplace_search"});expect(m.signal).not.toHaveBeenCalled();
});
