create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Ev',
  city text,
  region text,
  address text not null,
  phone text,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_label_length check (char_length(label) between 1 and 80),
  constraint customer_addresses_address_length check (char_length(address) between 1 and 500)
);

alter table public.customer_addresses enable row level security;

create index if not exists customer_addresses_user_created_idx
on public.customer_addresses (user_id, created_at desc, id desc);

create unique index if not exists customer_addresses_one_default_per_user_idx
on public.customer_addresses (user_id)
where is_default = true;

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

drop policy if exists "customer_addresses_select_own_or_admin" on public.customer_addresses;
create policy "customer_addresses_select_own_or_admin"
on public.customer_addresses for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "customer_addresses_insert_own" on public.customer_addresses;
create policy "customer_addresses_insert_own"
on public.customer_addresses for insert
with check (user_id = auth.uid());

drop policy if exists "customer_addresses_update_own_or_admin" on public.customer_addresses;
create policy "customer_addresses_update_own_or_admin"
on public.customer_addresses for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "customer_addresses_delete_own_or_admin" on public.customer_addresses;
create policy "customer_addresses_delete_own_or_admin"
on public.customer_addresses for delete
using (user_id = auth.uid() or public.is_admin());
