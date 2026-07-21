create type public.deposit_type as enum ('fixed', 'percent');

alter type public.deposit_status add value if not exists 'paid';
alter type public.deposit_status add value if not exists 'refunded';

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_platform_settings_updated_at
before update on public.platform_settings
for each row execute function public.set_updated_at();

alter table public.platform_settings enable row level security;

create policy "platform_settings_select_authenticated"
on public.platform_settings for select
to authenticated
using (true);

create policy "platform_settings_manage_admin"
on public.platform_settings for all
using (public.is_admin())
with check (public.is_admin());

insert into public.platform_settings (key, value)
values ('deposit', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;

alter table public.products
add column deposit_enabled boolean not null default false,
add column deposit_type public.deposit_type not null default 'fixed',
add column deposit_value numeric(12, 2) not null default 0;

alter table public.products
add constraint products_deposit_value_non_negative check (deposit_value >= 0);

alter table public.deposits
add column user_id uuid references public.profiles(id) on delete set null,
add column customer_id uuid references public.customers(id) on delete set null,
add column product_id uuid references public.products(id) on delete set null,
add column full_name text,
add column phone text,
add column remaining_amount numeric(12, 2) not null default 0,
add column payment_url text;

alter table public.deposits
add constraint deposits_remaining_amount_non_negative check (remaining_amount >= 0);

create index deposits_user_id_idx on public.deposits (user_id);
create index deposits_customer_id_idx on public.deposits (customer_id);
create index deposits_product_id_idx on public.deposits (product_id);

create policy "deposits_insert_customer_or_admin"
on public.deposits for insert
with check (
  public.is_admin()
  or user_id = auth.uid()
);
