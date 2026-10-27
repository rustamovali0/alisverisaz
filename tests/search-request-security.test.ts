import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readBoundedJson } from "@/lib/http/read-json";
import { POST } from "@/app/api/marketplace/searches/route";
const mocks = vi.hoisted(() => ({ limit: vi.fn(), record: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth/security", () => ({ assertAuthRateLimit: mocks.limit, recordAuthRateLimitAttempt: mocks.record, getClientIp: async () => "127.0.0.1" }));
vi.mock("@/lib/search/data", () => ({ normalizeMarketplaceSearchTerm: (v: string) => v.trim().slice(0,120), getPopularMarketplaceSearches: async () => [] }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc }) }));
beforeEach(() => { vi.clearAllMocks(); mocks.limit.mockResolvedValue({ok:true}); });
function request(body: string, headers: Record<string,string> = {}) {
 return new NextRequest("https://alisveris.az/api/marketplace/searches", {method:"POST",body,headers:{"content-type":"application/json",...headers}});
}
describe("search tracking request boundary", () => {
 it.each([
  ['{"term":"phone"}', {origin:"https://attacker.example"},403],
  ['{"term":"phone"}', {"sec-fetch-site":"cross-site"},403],
  ['{"term":"phone"}', {"content-type":"text/plain"},415],
  ['{',{},400],
  ['{"term":{"$ne":null}}',{},400],
  ['[]',{},400],
  [JSON.stringify({term:"x".repeat(5000)}),{},413],
 ] as const)("rejects invalid request without database access (%s)", async(body,headers,status)=>{
   expect((await POST(request(body,{...headers}))).status).toBe(status);
   expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled();
 });
 it("accepts a same-origin JSON search",async()=>{
   expect((await POST(request('{"term":"phone"}',{origin:"https://alisveris.az"}))).status).toBe(204);
   expect(mocks.rpc).toHaveBeenCalledWith("record_marketplace_search",{search_term:"phone"});
 });
});
describe("bounded JSON stream",()=>{
 it("rejects an oversized streamed body without a Content-Length",async()=>{
  const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('"'+"a".repeat(30)));controller.enqueue(new TextEncoder().encode('"'));controller.close();}});
  const req=new Request("https://example.test",{method:"POST",body:stream,duplex:"half"} as RequestInit);
  await expect(readBoundedJson(req,16)).rejects.toThrow(RangeError);
 });
 it("handles UTF-8 bytes, not just character count",async()=>{
  await expect(readBoundedJson(new Request("https://example.test",{method:"POST",body:'"əəəə"'}),8)).rejects.toThrow(RangeError);
 });
});
