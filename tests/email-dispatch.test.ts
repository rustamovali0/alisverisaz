import { expect, it, vi } from "vitest";
import {
  type EmailJob,
  type EmailWorkerDependencies,
  handleEmailDispatch,
  renderEmail,
} from "../supabase/functions/_shared/email";
const secret = "test-only-dispatch-secret-at-least-32-characters";
const job: EmailJob = {
  id: "job-1",
  kind: "notification",
  lock_token: "lease-1",
  recipient_id: "buyer",
  recipient_role: "customer",
  to_address: "buyer@example.test",
  payload: { title: "Salam", body: "Sifariş" },
};
function deps(): EmailWorkerDependencies {
  return {
    enabled: true,
    configured: true,
    secret,
    origin: "https://alisveris.az",
    claim: vi.fn(async () => [job]),
    prepare: vi.fn(async () => ({ allowed: true })),
    send: vi.fn(async () => "message-id"),
    finish: vi.fn(async () => {}),
  };
}
const request = (authorization = secret) =>
  new Request("https://api.example.test/email-dispatch", {
    method: "POST",
    headers: {
      authorization: "Bearer test-service-jwt",
      "x-email-dispatch-secret": authorization,
    },
    body: JSON.stringify({ to: "attacker@example.test", html: "untrusted" }),
  });
it("requires the worker secret and rejects public/user credentials before any DB access", async () => {
  for (const token of ["", "Bearer public-key", "Bearer user-jwt"]) {
    const d = deps();
    expect((await handleEmailDispatch(request(token), d)).status).toBe(401);
    expect(d.claim).not.toHaveBeenCalled();
  }
});
it("stays disabled without activation or sender credentials and never claims jobs", async () => {
  for (const fields of [{ enabled: false }, { configured: false }]) {
    const d = { ...deps(), ...fields };
    expect((await handleEmailDispatch(request(), d)).status).toBe(503);
    expect(d.claim).not.toHaveBeenCalled();
  }
});
it("accepts POST only and rejects an empty worker secret", async () => {
  expect(
    (await handleEmailDispatch(new Request("https://example.test"), deps()))
      .status,
  ).toBe(405);
  expect(
    (await handleEmailDispatch(request(""), { ...deps(), secret: "" })).status,
  ).toBe(401);
});
it("uses only claimed database jobs, ignoring arbitrary request recipients and HTML", async () => {
  const d = deps();
  expect((await handleEmailDispatch(request(), d)).status).toBe(200);
  expect(d.send).toHaveBeenCalledWith(
    job,
    expect.objectContaining({ subject: "Salam" }),
  );
  expect(d.finish).toHaveBeenCalledWith(job, "sent", undefined, "message-id");
});
it("checks current recipient preferences and activation before sending", async () => {
  const d = deps();
  d.prepare = vi.fn(async () => ({ allowed: false }));
  await handleEmailDispatch(request(), d);
  expect(d.send).not.toHaveBeenCalled();
  expect(d.finish).toHaveBeenCalledWith(
    job,
    "skipped",
    "preferences_or_disabled",
  );
});
it("does not mark SMTP failures as sent or save sensitive provider error strings", async () => {
  const d = deps();
  d.send = vi.fn(async () => {
    throw Error("password=SECRET buyer@example.test");
  });
  const r = await handleEmailDispatch(request(), d);
  expect(await r.json()).toMatchObject({ sent: 0, retry: 1 });
  expect(d.finish).toHaveBeenCalledWith(job, "retry", "delivery_failed");
});
it("keeps a lost acknowledgement retryable instead of silently losing the mail job", async () => {
  const d = deps();
  d.finish = vi.fn(async (_j, result) => {
    if (result === "sent") throw Error("db unavailable");
  });
  await handleEmailDispatch(request(), d);
  expect(d.finish).toHaveBeenLastCalledWith(
    job,
    "retry",
    "acknowledgement_failed",
  );
});
it("escapes stored user HTML and strips CRLF from subjects", () => {
  const output = renderEmail({
    ...job,
    payload: {
      title: "<img src=x onerror=alert(1)>\r\nBcc: x",
      body: "<script>alert(1)</script>",
    },
  }, "https://alisveris.az");
  expect(output.html).not.toContain("<script>");
  expect(output.html).not.toContain("<img src=x");
  expect(output.html).toContain("&lt;script&gt;");
  expect(output.subject).not.toMatch(/[\r\n]/);
});
it("rejects unsafe app origins and ignores untrusted notification hrefs", () => {
  expect(() => renderEmail(job, "javascript:alert(1)")).toThrow(
    "invalid_app_origin",
  );
  const output = renderEmail({
    ...job,
    payload: { href: "https://attacker.test" },
  }, "https://alisveris.az");
  expect(output.html).not.toContain("attacker.test");
});
const order = {
  id: "order-1",
  order_number: "AZ-1",
  total_amount: 44,
  shipping_amount: 4,
  currency: "AZN",
  stores: { name: "Shop" },
  order_items: [{ product_name: "Printer", quantity: 2, total_amount: 40 }],
};
it("renders buyer and seller order summaries with AZN totals and separate cabinet paths", () => {
  const buyer = renderEmail(
    {
      ...job,
      kind: "order_created",
      payload: { audience: "customer", status: "pending" },
    },
    "https://alisveris.az",
    order,
  );
  const seller = renderEmail(
    {
      ...job,
      kind: "order_created",
      recipient_role: "seller",
      payload: { audience: "seller", status: "pending" },
    },
    "https://alisveris.az",
    order,
  );
  expect(buyer.text).toContain("Printer × 2");
  expect(buyer.text).toContain("44,00");
  expect(buyer.html).toContain("/dashboard/orders");
  expect(seller.html).toContain("/store/dashboard/orders");
});
it("retries an order until its line items are committed and rejects invalid amounts", () => {
  const j = { ...job, kind: "order_created" };
  expect(() =>
    renderEmail(j, "https://alisveris.az", { ...order, order_items: [] })
  ).toThrow("order_items_not_ready");
  expect(() =>
    renderEmail(j, "https://alisveris.az", { ...order, total_amount: -1 })
  ).toThrow("invalid_order_amount");
});
it("renders both registration types for the fixed administrator address with escaped profile text",()=>{
  for(const role of ["customer","seller"]){const message=renderEmail({...job,kind:"registration_admin",recipient_role:"administrator",recipient_id:null,payload:{requested_role:role,name:'<img onerror="bad">',email:"new@example.test",store:"Demo"}},"https://alisveris.az");expect(message.subject).toContain(role==="seller"?"satıcı":"alıcı");expect(message.html).toContain("/radmin/users");expect(message.html).not.toContain('<img onerror="bad">');}
});
it("sends seller notifications to the seller cabinet",()=>{expect(renderEmail({...job,recipient_role:"seller"},"https://alisveris.az").html).toContain("/store/dashboard/notifications")});
