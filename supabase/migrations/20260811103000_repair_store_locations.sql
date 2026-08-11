create table if not exists public.store_locations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  city text not null default 'Bakı',
  district text,
  address text not null,
  map_link text,
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
  show_address boolean not null default true,
  show_metro boolean not null default true,
  show_bus boolean not null default true,
  show_map boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.store_locations(id) on delete cascade,
  stock_quantity integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (product_id, location_id)
);

alter table public.store_locations
  add column if not exists map_link text,
  add column if not exists show_address boolean not null default true,
  add column if not exists show_metro boolean not null default true,
  add column if not exists show_bus boolean not null default true,
  add column if not exists show_map boolean not null default true;

alter table public.store_locations
  alter column bus_routes set default '{}',
  alter column pickup_available set default true,
  alter column delivery_available set default false,
  alter column is_active set default true;

alter table public.product_locations
  alter column stock_quantity set default 0,
  alter column is_available set default true;

create index if not exists store_locations_store_id_idx on public.store_locations(store_id);
create index if not exists store_locations_active_idx on public.store_locations(store_id, is_active);
create index if not exists store_locations_created_at_idx on public.store_locations(created_at desc);
create index if not exists product_locations_product_id_idx on public.product_locations(product_id);
create index if not exists product_locations_location_id_idx on public.product_locations(location_id);
create index if not exists product_locations_available_idx on public.product_locations(product_id, is_available);

alter table public.store_locations enable row level security;
alter table public.product_locations enable row level security;

drop policy if exists "store locations are publicly readable" on public.store_locations;
create policy "store locations are publicly readable"
  on public.store_locations
  for select
  using (is_active = true);

drop policy if exists "admins manage all store locations" on public.store_locations;
create policy "admins manage all store locations"
  on public.store_locations
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "store owners manage own locations" on public.store_locations;
create policy "store owners manage own locations"
  on public.store_locations
  for all
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

drop policy if exists "product locations are publicly readable" on public.product_locations;
create policy "product locations are publicly readable"
  on public.product_locations
  for select
  using (is_available = true);

drop policy if exists "admins manage all product locations" on public.product_locations;
create policy "admins manage all product locations"
  on public.product_locations
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "store owners manage product locations" on public.product_locations;
create policy "store owners manage product locations"
  on public.product_locations
  for all
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_locations.product_id
        and public.owns_store(p.store_id)
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_locations.product_id
        and public.owns_store(p.store_id)
    )
  );

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    drop trigger if exists set_store_locations_updated_at on public.store_locations;
    create trigger set_store_locations_updated_at
      before update on public.store_locations
      for each row execute function public.set_updated_at();

    drop trigger if exists set_product_locations_updated_at on public.product_locations;
    create trigger set_product_locations_updated_at
      before update on public.product_locations
      for each row execute function public.set_updated_at();
  end if;
end $$;
