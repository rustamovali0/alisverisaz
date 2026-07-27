create table if not exists public.product_views (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  visitor_id text,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'normal' check (source in ('normal', 'share', 'direct')),
  viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint product_views_identity_required check (user_id is not null or visitor_id is not null)
);

create unique index if not exists product_views_product_user_unique
on public.product_views (product_id, user_id)
where user_id is not null;

create unique index if not exists product_views_product_visitor_unique
on public.product_views (product_id, visitor_id)
where user_id is null and visitor_id is not null;

create index if not exists product_views_seller_viewed_at_idx
on public.product_views (seller_id, viewed_at desc);

create index if not exists product_views_product_viewed_at_idx
on public.product_views (product_id, viewed_at desc);

create table if not exists public.store_views (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  visitor_id text,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'normal' check (source in ('normal', 'share', 'direct')),
  viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint store_views_identity_required check (user_id is not null or visitor_id is not null)
);

create unique index if not exists store_views_store_user_unique
on public.store_views (store_id, user_id)
where user_id is not null;

create unique index if not exists store_views_store_visitor_unique
on public.store_views (store_id, visitor_id)
where user_id is null and visitor_id is not null;

create index if not exists store_views_seller_viewed_at_idx
on public.store_views (seller_id, viewed_at desc);

create index if not exists store_views_store_viewed_at_idx
on public.store_views (store_id, viewed_at desc);

create table if not exists public.product_statistics (
  product_id uuid primary key references public.products(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  unique_views integer not null default 0,
  total_views integer not null default 0,
  share_link_views integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_statistics (
  store_id uuid primary key references public.stores(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  unique_visitors integer not null default 0,
  total_views integer not null default 0,
  share_link_visitors integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.product_views enable row level security;
alter table public.store_views enable row level security;
alter table public.product_statistics enable row level security;
alter table public.store_statistics enable row level security;

drop policy if exists "product_views_owner_or_admin_select" on public.product_views;
create policy "product_views_owner_or_admin_select"
on public.product_views for select
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "product_views_service_insert" on public.product_views;
create policy "product_views_service_insert"
on public.product_views for insert
with check (true);

drop policy if exists "product_views_owner_or_admin_delete" on public.product_views;
create policy "product_views_owner_or_admin_delete"
on public.product_views for delete
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "store_views_owner_or_admin_select" on public.store_views;
create policy "store_views_owner_or_admin_select"
on public.store_views for select
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "store_views_service_insert" on public.store_views;
create policy "store_views_service_insert"
on public.store_views for insert
with check (true);

drop policy if exists "store_views_owner_or_admin_delete" on public.store_views;
create policy "store_views_owner_or_admin_delete"
on public.store_views for delete
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "product_statistics_owner_or_admin_select" on public.product_statistics;
create policy "product_statistics_owner_or_admin_select"
on public.product_statistics for select
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "product_statistics_owner_or_admin_delete" on public.product_statistics;
create policy "product_statistics_owner_or_admin_delete"
on public.product_statistics for delete
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "store_statistics_owner_or_admin_select" on public.store_statistics;
create policy "store_statistics_owner_or_admin_select"
on public.store_statistics for select
using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "store_statistics_owner_or_admin_delete" on public.store_statistics;
create policy "store_statistics_owner_or_admin_delete"
on public.store_statistics for delete
using (seller_id = auth.uid() or public.is_admin());
