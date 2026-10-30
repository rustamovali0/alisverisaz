import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderEmail } from "../supabase/functions/_shared/email";
import { renderRecoveryTemplate } from "@/lib/email/recovery-template";
import { createEmailTestDatabase, buyer, store } from "./email-db";
const order = {
  id: "qa",
  order_number: "QA-1",
  total_amount: 25,
  shipping_amount: 0,
  currency: "AZN",
  shipping_address: {
    full_name: "QA Buyer",
    phone: "+994501234567",
    address: "Bakı, Test 1 <script>",
  },
  customers: { email: "buyer@example.test" },
  notes: "Zəng edin",
  payment_method: "cash",
  payment_status: "pending",
  delivery_method: "pickup",
  stores: { name: "QA Shop", address: "Store address", phone: "+994551234567" },
  seller_profile: { full_name: "QA Seller", email: "seller@example.test" },
  order_items: [{ product_name: "Test", quantity: 1, total_amount: 25 }],
};
it.each(["seller", "administrator"] as const)(
  "includes fulfilment and seller details for %s",
  (recipient_role) => {
    const m = renderEmail(
      {
        id: "q",
        kind: "order_created",
        lock_token: "x",
        recipient_id: "qa",
        recipient_role,
        to_address: "admin@alisveris.az",
        payload: { audience: recipient_role, status: "pending" },
      },
      "https://alisveris.az",
      order,
    );
    expect(m.html).toContain("QA Buyer");
    expect(m.html).toContain("buyer@example.test");
    expect(m.html).toContain("Store address");
    expect(m.html).toContain("seller@example.test");
    expect(m.html).toContain("Zəng edin");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("Şifrənizi və təsdiq");
    if (recipient_role === "administrator")
      expect(m.html).toContain("/radmin/orders");
  },
);
it("keeps privileged contact details out of buyer email and security warning in recovery only", () => {
  const m = renderEmail(
    {
      id: "q",
      kind: "order_created",
      lock_token: "x",
      recipient_id: "qa",
      recipient_role: "customer",
      to_address: "buyer@example.test",
      payload: { audience: "customer", status: "pending" },
    },
    "https://alisveris.az",
    order,
  );
  expect(m.html).not.toContain("Store address");
  expect(m.html).not.toContain("seller@example.test");
  expect(m.html).not.toContain("Şifrənizi və təsdiq");
  expect(renderRecoveryTemplate()).toContain(
    "Şifrənizi və təsdiq kodlarınızı heç kimlə paylaşmayın.",
  );
});
it("queues a separate administrator notice only for new orders while delivery is enabled", async () => {
  const db = await createEmailTestDatabase(true);
  try {
    await db.exec(
      readFileSync(
        "supabase/migrations/20261030120000_system_email_templates.sql",
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261030160000_order_admin_email.sql",
        "utf8",
      ),
    );
    await db.exec(
      `update email_delivery_settings set enabled=true;insert into orders(id,user_id,store_id)values('00000000-0000-4000-8000-000000000050','${buyer}','${store}');`,
    );
    expect(
      (
        await db.query(
          `select to_address from email_outbox where kind='order_created' and recipient_role='administrator'`,
        )
      ).rows,
    ).toEqual([{ to_address: "admin@alisveris.az" }]);
    await db.exec(
      `update orders set status='confirmed';update email_delivery_settings set enabled=false;insert into orders(user_id,store_id)values('${buyer}','${store}')`,
    );
    expect(
      (
        await db.query(
          `select id from email_outbox where kind='order_created' and recipient_role='administrator'`,
        )
      ).rows,
    ).toHaveLength(1);
  } finally {
    await db.close();
  }
}, 15000);

import { createEmailDispatcher } from "../supabase/functions/_shared/delivery";
import { query } from "./query";
import { vi } from "vitest";
it.each(["admin@alisveris.az", "outsider@example.test"])(
  "only releases admin order details to the configured admin address: %s",
  async (address) => {
    const job = {
      id: "job",
      lock_token: "lease",
      kind: "order_created",
      recipient_id: null,
      recipient_role: "administrator",
      to_address: address,
      payload: { audience: "administrator", order_id: "qa", status: "pending" },
    };
    const sendMail = vi.fn(async () => ({
      accepted: [address],
      messageId: "id",
    }));
    const env: Record<string, string> = {
      SMTP_PORT: "465",
      SMTP_HOST: "smtp.example.test",
      SMTP_USER: "u",
      SMTP_PASSWORD: "test-only",
      SMTP_FROM: "no-reply@example.test",
      APP_ORIGIN: "https://alisveris.az",
      SUPABASE_URL: "https://api.example.test",
      SUPABASE_SERVICE_ROLE_KEY: "test",
      EMAIL_DELIVERY_ENABLED: "true",
      EMAIL_DISPATCH_SECRET: "a-secret-at-least-thirty-two-characters-long",
    };
    const handler = createEmailDispatcher(
      (k) => env[k] || "",
      () => ({
        rpc: async (name: string) => ({
          data: name === "email_claim_jobs" ? [job] : true,
        }),
        from: (table: string) =>
          query({
            data:
              table === "email_delivery_settings"
                ? { enabled: true, admin_address: "admin@alisveris.az" }
                : table === "orders"
                  ? order
                  : table === "profiles"
                    ? {
                        full_name: "Owner",
                        email: "owner@example.test",
                        phone: "+994501234567",
                      }
                    : null,
          }),
      }),
      () => ({ sendMail, close() {} }),
    );
    const response = await handler(
      new Request("https://example.test", {
        method: "POST",
        headers: {
          authorization: "Bearer test",
          "x-email-dispatch-secret": env.EMAIL_DISPATCH_SECRET,
        },
      }),
    );
    const result = await response.json();
    expect(result).toMatchObject(
      address === "admin@alisveris.az" ? { sent: 1 } : { skipped: 1 },
    );
    expect(sendMail).toHaveBeenCalledTimes(
      address === "admin@alisveris.az" ? 1 : 0,
    );
  },
);
