create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  type text not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_options_type_check check (
    type in ('color', 'size', 'custom1', 'custom2')
  ),
  constraint product_options_name_length check (
    length(btrim(name)) between 1 and 60
  ),
  constraint product_options_unique_type_per_product unique (product_id, type)
);

create table if not exists public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options(id) on delete cascade,
  value text not null,
  color_hex text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_values_value_length check (
    length(btrim(value)) between 1 and 80
  ),
  constraint product_option_values_color_hex_check check (
    color_hex is null or color_hex ~* '^#[0-9a-f]{6}$'
  ),
  constraint product_option_values_unique_value_per_option unique (option_id, value)
);

alter table public.product_variants
  add column if not exists combination jsonb not null default '{}'::jsonb,
  add column if not exists sku text,
  add column if not exists price_override_amount numeric(12, 2),
  add column if not exists is_enabled boolean not null default true;

do $$
begin
  alter table public.product_variants
    add constraint product_variants_combination_object
    check (jsonb_typeof(combination) = 'object');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.product_variants
    add constraint product_variants_price_override_non_negative
    check (price_override_amount is null or price_override_amount >= 0);
exception
  when duplicate_object then null;
end $$;

drop trigger if exists set_product_options_updated_at on public.product_options;
create trigger set_product_options_updated_at
before update on public.product_options
for each row execute function public.set_updated_at();

drop trigger if exists set_product_option_values_updated_at on public.product_option_values;
create trigger set_product_option_values_updated_at
before update on public.product_option_values
for each row execute function public.set_updated_at();

create index if not exists product_options_product_sort_idx
on public.product_options (product_id, sort_order, id);

create index if not exists product_option_values_option_sort_idx
on public.product_option_values (option_id, sort_order, id);

create index if not exists product_variants_product_enabled_idx
on public.product_variants (product_id, is_enabled);

create index if not exists product_variants_combination_gin_idx
on public.product_variants using gin (combination);

alter table public.product_options enable row level security;
alter table public.product_option_values enable row level security;

drop policy if exists "product_options_select_active_product_public" on public.product_options;
create policy "product_options_select_active_product_public"
on public.product_options for select
using (
  exists (
    select 1
    from public.products p
    where p.id = product_options.product_id
      and p.status = 'active'
  )
);

drop policy if exists "product_options_select_owner_or_admin" on public.product_options;
create policy "product_options_select_owner_or_admin"
on public.product_options for select
using (public.owns_product(product_id) or public.is_admin());

drop policy if exists "product_options_insert_owner_or_admin" on public.product_options;
create policy "product_options_insert_owner_or_admin"
on public.product_options for insert
with check (public.owns_product(product_id) or public.is_admin());

drop policy if exists "product_options_update_owner_or_admin" on public.product_options;
create policy "product_options_update_owner_or_admin"
on public.product_options for update
using (public.owns_product(product_id) or public.is_admin())
with check (public.owns_product(product_id) or public.is_admin());

drop policy if exists "product_options_delete_owner_or_admin" on public.product_options;
create policy "product_options_delete_owner_or_admin"
on public.product_options for delete
using (public.owns_product(product_id) or public.is_admin());

drop policy if exists "product_option_values_select_active_product_public" on public.product_option_values;
create policy "product_option_values_select_active_product_public"
on public.product_option_values for select
using (
  exists (
    select 1
    from public.product_options o
    join public.products p on p.id = o.product_id
    where o.id = product_option_values.option_id
      and p.status = 'active'
  )
);

drop policy if exists "product_option_values_select_owner_or_admin" on public.product_option_values;
create policy "product_option_values_select_owner_or_admin"
on public.product_option_values for select
using (
  exists (
    select 1
    from public.product_options o
    where o.id = product_option_values.option_id
      and (public.owns_product(o.product_id) or public.is_admin())
  )
);

drop policy if exists "product_option_values_insert_owner_or_admin" on public.product_option_values;
create policy "product_option_values_insert_owner_or_admin"
on public.product_option_values for insert
with check (
  exists (
    select 1
    from public.product_options o
    where o.id = product_option_values.option_id
      and (public.owns_product(o.product_id) or public.is_admin())
  )
);

drop policy if exists "product_option_values_update_owner_or_admin" on public.product_option_values;
create policy "product_option_values_update_owner_or_admin"
on public.product_option_values for update
using (
  exists (
    select 1
    from public.product_options o
    where o.id = product_option_values.option_id
      and (public.owns_product(o.product_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.product_options o
    where o.id = product_option_values.option_id
      and (public.owns_product(o.product_id) or public.is_admin())
  )
);

drop policy if exists "product_option_values_delete_owner_or_admin" on public.product_option_values;
create policy "product_option_values_delete_owner_or_admin"
on public.product_option_values for delete
using (
  exists (
    select 1
    from public.product_options o
    where o.id = product_option_values.option_id
      and (public.owns_product(o.product_id) or public.is_admin())
  )
);
