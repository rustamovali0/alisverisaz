import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite;
const buyer = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002",
  admin = "00000000-0000-4000-8000-000000000003";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to authenticated;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.role() returns text language sql as $$select nullif(current_setting('test.role',true),'')$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('aal',current_setting('test.aal',true))$$;create table profiles(id uuid primary key,role text,email text,full_name text,session_revoked_at timestamptz);create function is_admin() returns boolean language sql stable security definer as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;insert into profiles values('${buyer}','customer','b@example.test','Buyer',now()),('${other}','seller','s@example.test','Seller',null),('${admin}','admin','a@example.test','Admin',null);alter table profiles enable row level security;grant select,insert,update on profiles to authenticated;create policy own_profile on profiles for all to authenticated using(id=auth.uid() or is_admin()) with check(id=auth.uid() or is_admin());alter table profiles add column requested_role text;alter table profiles add column seller_application_status text;create table orders(id integer,user_id uuid);alter table orders enable row level security;grant select on orders to authenticated;create policy own_order on orders to authenticated using(user_id=auth.uid() or is_admin());insert into orders values(1,'${buyer}'),(2,'${other}');`,
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261102093000_profile_security_columns.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261102100000_admin_mfa_gate.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => db?.close());
async function asUser(id: string, aal = "aal1") {
  await db.exec("reset role");
  await db.query(
    "select set_config('test.uid',$1,false),set_config('test.role','authenticated',false),set_config('test.aal',$2,false)",
    [id, aal],
  );
  await db.exec("set role authenticated");
}
it("isolates buyer and seller order reads with real RLS", async () => {
  await asUser(buyer);
  expect(
    (await db.query<{ id: number }>("select id from orders")).rows,
  ).toEqual([{ id: 1 }]);
  await asUser(other);
  expect(
    (await db.query<{ id: number }>("select id from orders")).rows,
  ).toEqual([{ id: 2 }]);
});
it("allows ordinary profile edits, blocks role escalation and reversal of session revocation", async () => {
  await asUser(buyer);
  await expect(
    db.exec("update profiles set full_name='Updated' where id=auth.uid() "),
  ).resolves.toBeDefined();
  for (const value of [
    "role='admin'",
    "email='other@example.test'",
    "session_revoked_at=null",
  ])
    await expect(
      db.exec("update profiles set " + value + " where id=auth.uid()"),
    ).rejects.toThrow("PROFILE_SECURITY_COLUMN_FORBIDDEN");
  expect(
    (
      await db.query(
        `update profiles set full_name='attacker' where id='${other}' returning id`,
      )
    ).rows,
  ).toHaveLength(0);
});
it("stages administrator MFA without locking out existing accounts, then gates data and RPC role checks at AAL1", async () => {
  await asUser(admin);
  expect((await db.query("select * from orders")).rows).toHaveLength(2);
  await db.exec(
    "reset role;update security_configuration set admin_mfa_required=true",
  );
  await asUser(admin);
  expect((await db.query("select * from orders")).rows).toHaveLength(0);
  expect(
    (await db.query<{ is_admin: boolean }>("select is_admin()")).rows[0]
      .is_admin,
  ).toBe(false);
  expect((await db.query("select * from profiles")).rows).toHaveLength(1);
  await expect(
    db.exec("update profiles set full_name='changed' where id=auth.uid()"),
  ).resolves.toBeDefined();
  expect(
    (await db.query<{ full_name: string }>("select full_name from profiles"))
      .rows[0].full_name,
  ).toBe("Admin");
  await asUser(admin, "aal2");
  expect((await db.query("select * from orders")).rows).toHaveLength(2);
});

it("does not let new own profiles preapprove sellers or choose privileged roles", async () => {
  const id = "00000000-0000-4000-8000-000000000004";
  await asUser(id);
  await expect(
    db.query(
      "insert into profiles(id,role,requested_role,seller_application_status) values($1,'customer','seller','approved')",
      [id],
    ),
  ).rejects.toThrow("PROFILE_SECURITY_COLUMN_FORBIDDEN");
  await expect(
    db.query(
      "insert into profiles(id,role,requested_role) values($1,'customer','admin')",
      [id],
    ),
  ).rejects.toThrow("PROFILE_ROLE_FORBIDDEN");
  await expect(
    db.query(
      "insert into profiles(id,role,requested_role,seller_application_status) values($1,'customer','seller','pending')",
      [id],
    ),
  ).resolves.toBeDefined();
});
