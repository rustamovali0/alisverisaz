create table if not exists public.store_locations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  city text not null default 'Bakı',
  district text,
  address text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  nearest_metro text,
  metro_distance_meters integer,
  metro_walk_minutes integer,
  bus_stop_name text,
  bus_routes text[] not null default '{}',
  phone text,
  working_hours text,
  pickup_available boolean not null default true,
  delivery_available boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_locations_name_length check (char_length(name) between 2 and 120),
  constraint store_locations_address_length check (char_length(address) between 4 and 500),
  constraint store_locations_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint store_locations_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint store_locations_metro_distance_positive check (metro_distance_meters is null or metro_distance_meters >= 0),
  constraint store_locations_metro_walk_positive check (metro_walk_minutes is null or metro_walk_minutes >= 0)
);

create table if not exists public.product_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.store_locations(id) on delete cascade,
  stock_quantity integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  constraint product_locations_stock_non_negative check (stock_quantity >= 0),
  constraint product_locations_product_location_unique unique (product_id, location_id)
);

create index if not exists store_locations_store_id_idx
  on public.store_locations(store_id);

create index if not exists store_locations_active_idx
  on public.store_locations(store_id, is_active);

create index if not exists product_locations_product_id_idx
  on public.product_locations(product_id);

create index if not exists product_locations_location_id_idx
  on public.product_locations(location_id);

drop trigger if exists set_store_locations_updated_at on public.store_locations;

create trigger set_store_locations_updated_at
before update on public.store_locations
for each row execute function public.set_updated_at();

create or replace function public.ensure_product_location_store_match()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  product_store_id uuid;
  location_store_id uuid;
begin
  select store_id into product_store_id
  from public.products
  where id = new.product_id;

  select store_id into location_store_id
  from public.store_locations
  where id = new.location_id;

  if product_store_id is null
    or location_store_id is null
    or product_store_id <> location_store_id then
    raise exception 'Product and location must belong to the same store.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_product_location_store_match_trigger
  on public.product_locations;

create trigger ensure_product_location_store_match_trigger
before insert or update on public.product_locations
for each row execute function public.ensure_product_location_store_match();

alter table public.store_locations enable row level security;
alter table public.product_locations enable row level security;

drop policy if exists "store_locations_select_public_owner_admin" on public.store_locations;
drop policy if exists "store_locations_insert_owner_admin" on public.store_locations;
drop policy if exists "store_locations_update_owner_admin" on public.store_locations;
drop policy if exists "store_locations_delete_admin" on public.store_locations;

create policy "store_locations_select_public_owner_admin"
on public.store_locations for select
using (
  is_active
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "store_locations_insert_owner_admin"
on public.store_locations for insert
with check (
  public.owns_store(store_id)
  or public.is_admin()
);

create policy "store_locations_update_owner_admin"
on public.store_locations for update
using (
  public.owns_store(store_id)
  or public.is_admin()
)
with check (
  public.owns_store(store_id)
  or public.is_admin()
);

create policy "store_locations_delete_admin"
on public.store_locations for delete
using (public.is_admin());

drop policy if exists "product_locations_select_public_owner_admin" on public.product_locations;
drop policy if exists "product_locations_insert_owner_admin" on public.product_locations;
drop policy if exists "product_locations_update_owner_admin" on public.product_locations;
drop policy if exists "product_locations_delete_owner_admin" on public.product_locations;

create policy "product_locations_select_public_owner_admin"
on public.product_locations for select
using (
  (
    is_available
    and exists (
      select 1
      from public.products p
      join public.store_locations sl on sl.id = product_locations.location_id
      where p.id = product_locations.product_id
        and p.status = 'active'
        and sl.is_active
    )
  )
  or public.owns_product(product_id)
  or public.is_admin()
);

create policy "product_locations_insert_owner_admin"
on public.product_locations for insert
with check (
  public.owns_product(product_id)
  or public.is_admin()
);

create policy "product_locations_update_owner_admin"
on public.product_locations for update
using (
  public.owns_product(product_id)
  or public.is_admin()
)
with check (
  public.owns_product(product_id)
  or public.is_admin()
);

create policy "product_locations_delete_owner_admin"
on public.product_locations for delete
using (
  public.owns_product(product_id)
  or public.is_admin()
);
