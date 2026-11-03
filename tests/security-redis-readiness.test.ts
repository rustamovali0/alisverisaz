import {expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({create:vi.fn()}));
vi.mock("redis",()=>({createClient:m.create}));
import {securityRedisClient} from "@/lib/security/redis-client";
it("holds concurrent callers until the shared Redis connection is ready, not merely open",async()=>{
 vi.stubEnv("SECURITY_REDIS_URL","redis://127.0.0.1:16380");
 let ready!:()=>void;
 const client={isOpen:false,isReady:false,listenerCount:()=>1,connect:vi.fn(()=>{client.isOpen=true;return new Promise<void>(resolve=>{ready=()=>{client.isReady=true;resolve();};});})};
 m.create.mockReturnValue(client);
 let firstReturned=false,secondReturned=false;
 const a=securityRedisClient().then(value=>{firstReturned=true;return value;});
 const b=securityRedisClient().then(value=>{secondReturned=true;return value;});
 await Promise.resolve();expect(firstReturned).toBe(false);expect(secondReturned).toBe(false);expect(client.connect).toHaveBeenCalledTimes(1);
 ready();expect(await a).toBe(client);expect(await b).toBe(client);vi.unstubAllEnvs();
});
