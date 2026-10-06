create table if not exists public.promotion_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  status text not null default 'pending',
  requested_days integer not null default 1,
  daily_price_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'AZN',
  starts_at timestamptz,
  ends_at timestamptz,
  seller_note text,
  admin_note text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_requests_target_type_check check (target_type in ('store', 'product')),
  constraint promotion_requests_status_check check (status in ('pending', 'approved', 'rejected', 'canceled')),
  constraint promotion_requests_days_positive check (requested_days between 1 and 90),
  constraint promotion_requests_price_non_negative check (daily_price_amount >= 0 and total_amount >= 0),
  constraint promotion_requests_product_required check (
    (target_type = 'store' and product_id is null) or
    (target_type = 'product' and product_id is not null)
  ),
  constraint promotion_requests_period_valid check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

drop trigger if exists set_promotion_requests_updated_at on public.promotion_requests;
create trigger set_promotion_requests_updated_at
before update on public.promotion_requests
for each row execute function public.set_updated_at();

create index if not exists promotion_requests_requester_idx
on public.promotion_requests (requester_id, created_at desc);

create index if not exists promotion_requests_status_idx
on public.promotion_requests (status, created_at desc);

create index if not exists promotion_requests_store_active_idx
on public.promotion_requests (store_id, starts_at desc)
where status = 'approved';

create index if not exists promotion_requests_product_active_idx
on public.promotion_requests (product_id, starts_at desc)
where status = 'approved' and product_id is not null;

alter table public.promotion_requests enable row level security;

drop policy if exists "promotion_requests_select_own_or_admin" on public.promotion_requests;
create policy "promotion_requests_select_own_or_admin"
on public.promotion_requests for select
using (
  public.is_admin()
  or requester_id = auth.uid()
  or exists (
    select 1
    from public.stores
    where stores.id = promotion_requests.store_id
      and stores.owner_id = auth.uid()
  )
);

drop policy if exists "promotion_requests_insert_own_store" on public.promotion_requests;
create policy "promotion_requests_insert_own_store"
on public.promotion_requests for insert
with check (
  requester_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1
    from public.stores
    where stores.id = promotion_requests.store_id
      and stores.owner_id = auth.uid()
  )
  and (
    target_type = 'store'
    or exists (
      select 1
      from public.products
      where products.id = promotion_requests.product_id
        and products.store_id = promotion_requests.store_id
    )
  )
);

drop policy if exists "promotion_requests_manage_admin" on public.promotion_requests;
create policy "promotion_requests_manage_admin"
on public.promotion_requests for all
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.promotion_requests to authenticated;
grant all on public.promotion_requests to service_role;
notify pgrst, 'reload schema';
