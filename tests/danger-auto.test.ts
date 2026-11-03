import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({eval:vi.fn(),mget:vi.fn(),audit:vi.fn(),event:vi.fn()}));
vi.mock("@/lib/security/redis-client",()=>({securityRedisUrl:()=>process.env.SECURITY_REDIS_URL,securityRedisClient:async()=>({withCommandOptions:()=>({eval:m.eval,mGet:m.mget})})}));
vi.mock("@/lib/admin/audit",()=>({recordAdminAudit:m.audit}));
vi.mock("@/lib/security/events",()=>({securityEvent:m.event}));
import {recordDangerRisk,changeDangerAuto,getDangerAutoStatus,AUTO_CONFIG_KEY} from "@/lib/security/danger-auto";
beforeEach(()=>{vi.stubEnv("SECURITY_REDIS_URL","redis://127.0.0.1:16380");vi.stubEnv("DANGER_SIGNING_SECRET","fixture-only-at-least-32-characters");vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","fixture");vi.stubEnv("TURNSTILE_SECRET_KEY","fixture");m.eval.mockResolvedValue([0]);});
afterEach(()=>vi.unstubAllEnvs());
it("never records unknown networks or an unconfigured detector",async()=>{
 await recordDangerRisk("login_failed","unknown");vi.stubEnv("DANGER_SIGNING_SECRET","");await recordDangerRisk("login_failed","203.0.113.1");expect(m.eval).not.toHaveBeenCalled();
});
it("uses bounded atomic Redis storage and hashes network identifiers",async()=>{
 await recordDangerRisk("login_failed","203.0.113.1");const [,input]=m.eval.mock.calls[0];expect(input.keys[0]).toBe(AUTO_CONFIG_KEY);expect(JSON.stringify(input)).not.toContain("203.0.113.1");expect(input.arguments[1]).toMatch(/^[a-f0-9]{64}$/);expect(m.audit).not.toHaveBeenCalled();
});
it("audits a newly automatic activation without credentials or raw network data",async()=>{
 m.eval.mockResolvedValue([1,30,5,100000]);await recordDangerRisk("login_failed","203.0.113.1");expect(m.event).toHaveBeenCalledWith("danger_auto_activated","login_failed",200);expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({action:"DANGER_AUTO_ACTIVATED",metadata:expect.objectContaining({events:30,networks:5,expiresAt:1000000})}));expect(JSON.stringify(m.audit.mock.calls)).not.toContain("203.0.113.1");
});
it("keeps the existing authentication failure response working during a detector storage outage",async()=>{
 m.eval.mockRejectedValue(Error("offline"));await expect(recordDangerRisk("auth_rate_block","203.0.113.1")).resolves.toBeUndefined();expect(m.event).toHaveBeenCalledWith("security_storage_unavailable","danger_auto",503);
});
it("rejects stale automatic settings and refuses enable without configured protection",async()=>{
 m.eval.mockResolvedValue(0);await expect(changeDangerAuto(true,"off")).rejects.toThrow("başqa sessiyada");vi.stubEnv("DANGER_SIGNING_SECRET","");await expect(changeDangerAuto(true,"off")).rejects.toThrow("açarları");
});
it("defaults to disabled and exposes only safe operator status",async()=>{
 m.mget.mockResolvedValue([null,null,null]);expect(await getDangerAutoStatus()).toMatchObject({enabled:false,version:"off"});m.mget.mockResolvedValue(['{"enabled":true,"version":"one","changedAt":1}','{"at":1000,"reason":"login_failed"}',"1800"]);expect(await getDangerAutoStatus()).toMatchObject({enabled:true,lastTriggeredAt:1000,lastReason:"login_failed",cooldownUntil:1800});
});
