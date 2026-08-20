create table if not exists public.delivery_settings (
  key text primary key default 'global',
  pickup_enabled boolean not null default true,
  courier_enabled boolean not null default true,
  region_enabled boolean not null default true,
  baku_price numeric(12, 2) not null default 4,
  region_price numeric(12, 2) not null default 7,
  free_delivery_threshold numeric(12, 2),
  pickup_estimate text not null default 'Mağazadan götürmə',
  courier_estimate text not null default '1-2 iş günü',
  region_estimate text not null default '2-5 iş günü',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_settings_prices_non_negative check (
    baku_price >= 0
    and region_price >= 0
    and (free_delivery_threshold is null or free_delivery_threshold >= 0)
  )
);

drop trigger if exists set_delivery_settings_updated_at on public.delivery_settings;
create trigger set_delivery_settings_updated_at
before update on public.delivery_settings
for each row execute function public.set_updated_at();

alter table public.delivery_settings enable row level security;

drop policy if exists "delivery_settings_select_authenticated" on public.delivery_settings;
create policy "delivery_settings_select_authenticated"
on public.delivery_settings for select
to authenticated
using (true);

drop policy if exists "delivery_settings_manage_admin" on public.delivery_settings;
create policy "delivery_settings_manage_admin"
on public.delivery_settings for all
using (public.is_admin())
with check (public.is_admin());

insert into public.delivery_settings (key)
values ('global')
on conflict (key) do nothing;

create table if not exists public.delivery_store_overrides (
  store_id uuid primary key references public.stores(id) on delete cascade,
  pickup_enabled boolean,
  courier_enabled boolean,
  region_enabled boolean,
  baku_price numeric(12, 2),
  region_price numeric(12, 2),
  free_delivery_threshold numeric(12, 2),
  pickup_estimate text,
  courier_estimate text,
  region_estimate text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_store_overrides_prices_non_negative check (
    (baku_price is null or baku_price >= 0)
    and (region_price is null or region_price >= 0)
    and (free_delivery_threshold is null or free_delivery_threshold >= 0)
  )
);

drop trigger if exists set_delivery_store_overrides_updated_at on public.delivery_store_overrides;
create trigger set_delivery_store_overrides_updated_at
before update on public.delivery_store_overrides
for each row execute function public.set_updated_at();

alter table public.delivery_store_overrides enable row level security;

drop policy if exists "delivery_store_overrides_select_admin" on public.delivery_store_overrides;
create policy "delivery_store_overrides_select_admin"
on public.delivery_store_overrides for select
using (public.is_admin());

drop policy if exists "delivery_store_overrides_manage_admin" on public.delivery_store_overrides;
create policy "delivery_store_overrides_manage_admin"
on public.delivery_store_overrides for all
using (public.is_admin())
with check (public.is_admin());

alter table public.orders
  add column if not exists delivery_method text,
  add column if not exists delivery_amount numeric(12, 2) not null default 0,
  add column if not exists delivery_region text,
  add column if not exists delivery_address text,
  add column if not exists delivery_estimate text;

alter table public.orders
  drop constraint if exists orders_delivery_method_check;

alter table public.orders
  add constraint orders_delivery_method_check
  check (
    delivery_method is null
    or delivery_method in ('pickup', 'courier', 'region')
  );

drop function if exists public.create_atomic_checkout_orders(
  jsonb,
  text,
  text,
  text,
  text,
  uuid
);

create or replace function public.create_atomic_checkout_orders(
  p_items jsonb,
  p_full_name text,
  p_phone text,
  p_address text,
  p_notes text default null,
  p_request_id uuid default null,
  p_delivery_method text default 'courier',
  p_delivery_region text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.user_role;
  v_raw_count integer;
  v_valid_count integer;
  v_item_count integer;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_order_ids uuid[] := '{}';
  v_result jsonb;
  v_delivery_method text := lower(btrim(coalesce(p_delivery_method, 'courier')));
  v_delivery_region text := nullif(btrim(coalesce(p_delivery_region, '')), '');
  v_pickup_enabled boolean;
  v_courier_enabled boolean;
  v_region_enabled boolean;
  v_baku_price numeric(12, 2);
  v_region_price numeric(12, 2);
  v_free_delivery_threshold numeric(12, 2);
  v_pickup_estimate text;
  v_courier_estimate text;
  v_region_estimate text;
  v_delivery_amount numeric(12, 2);
  v_delivery_estimate text;
  store_row record;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select profiles.role
    into v_role
  from public.profiles profiles
  where profiles.id = v_user_id;

  if v_role is distinct from 'customer'::public.user_role then
    raise exception 'CHECKOUT_NOT_ALLOWED';
  end if;

  if v_delivery_method not in ('pickup', 'courier', 'region') then
    raise exception 'INVALID_DELIVERY';
  end if;

  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_request_id::text, 0));

    select jsonb_build_object(
      'orderIds',
      coalesce(jsonb_agg(orders.id::text order by orders.created_at, orders.id), '[]'::jsonb),
      'orders',
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', orders.id::text,
            'storeId', orders.store_id::text,
            'orderNumber', orders.order_number,
            'totalAmount', orders.total_amount,
            'itemCount', coalesce(item_counts.item_count, 0)
          )
          order by orders.created_at, orders.id
        ),
        '[]'::jsonb
      )
    )
      into v_result
    from public.orders orders
    left join (
      select order_items.order_id, count(*)::integer as item_count
      from public.order_items order_items
      group by order_items.order_id
    ) item_counts on item_counts.order_id = orders.id
    where orders.user_id = v_user_id
      and orders.metadata ->> 'checkout_request_id' = p_request_id::text;

    if jsonb_array_length(coalesce(v_result -> 'orderIds', '[]'::jsonb)) > 0 then
      return v_result;
    end if;
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'INVALID_CART';
  end if;

  v_raw_count := jsonb_array_length(p_items);

  if v_raw_count < 1 or v_raw_count > 50 then
    raise exception 'INVALID_CART';
  end if;

  if length(btrim(coalesce(p_full_name, ''))) not between 2 and 120
    or length(btrim(coalesce(p_phone, ''))) not between 7 and 32
    or length(coalesce(p_notes, '')) > 1000
    or (
      v_delivery_method <> 'pickup'
      and length(btrim(coalesce(p_address, ''))) not between 5 and 500
    )
    or (
      v_delivery_method = 'region'
      and length(coalesce(v_delivery_region, '')) not between 2 and 120
    ) then
    raise exception 'INVALID_CHECKOUT';
  end if;

  drop table if exists pg_temp.checkout_items_tmp;
  create temporary table checkout_items_tmp (
    product_id uuid primary key,
    quantity integer not null check (quantity > 0 and quantity <= 1000)
  ) on commit drop;

  with raw_items as (
    select
      value ->> 'productId' as product_id_text,
      value ->> 'quantity' as quantity_text
    from jsonb_array_elements(p_items)
  ),
  parsed_items as (
    select
      case
        when product_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then product_id_text::uuid
        else null
      end as product_id,
      case
        when quantity_text ~ '^[0-9]{1,4}$'
          then quantity_text::integer
        else null
      end as quantity
    from raw_items
  ),
  valid_items as (
    select product_id, quantity
    from parsed_items
    where product_id is not null
      and quantity between 1 and 1000
  )
  insert into pg_temp.checkout_items_tmp (product_id, quantity)
  select valid_items.product_id, sum(valid_items.quantity)::integer
  from valid_items
  group by valid_items.product_id;

  with raw_items as (
    select
      value ->> 'productId' as product_id_text,
      value ->> 'quantity' as quantity_text
    from jsonb_array_elements(p_items)
  ),
  parsed_items as (
    select
      case
        when product_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then product_id_text::uuid
        else null
      end as product_id,
      case
        when quantity_text ~ '^[0-9]{1,4}$'
          then quantity_text::integer
        else null
      end as quantity
    from raw_items
  )
  select count(*)::integer
    into v_valid_count
  from parsed_items
  where product_id is not null
    and quantity between 1 and 1000;

  if v_valid_count <> v_raw_count then
    raise exception 'INVALID_CART_ITEM';
  end if;

  if exists (select 1 from pg_temp.checkout_items_tmp where quantity > 1000) then
    raise exception 'INVALID_CART_ITEM';
  end if;

  select count(*)::integer into v_item_count from pg_temp.checkout_items_tmp;

  if v_item_count < 1 or v_item_count > 50 then
    raise exception 'INVALID_CART';
  end if;

  drop table if exists pg_temp.checkout_products_tmp;
  create temporary table checkout_products_tmp on commit drop as
  select
    products.id,
    products.store_id,
    products.name,
    products.sku,
    products.price_amount,
    products.discount_amount,
    products.currency,
    products.stock_quantity,
    products.status,
    checkout_items.quantity,
    greatest(products.price_amount - coalesce(products.discount_amount, 0), 0)::numeric(12, 2)
      as unit_price_amount
  from public.products products
  join pg_temp.checkout_items_tmp checkout_items on checkout_items.product_id = products.id
  order by products.id
  for update of products;

  if (select count(*) from pg_temp.checkout_products_tmp) <> v_item_count then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  if exists (select 1 from pg_temp.checkout_products_tmp where status <> 'active'::public.product_status) then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  if exists (select 1 from pg_temp.checkout_products_tmp where stock_quantity < quantity) then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  drop table if exists pg_temp.checkout_created_orders_tmp;
  create temporary table checkout_created_orders_tmp (
    id uuid primary key,
    store_id uuid not null,
    order_number text not null,
    total_amount numeric(12, 2) not null,
    item_count integer not null
  ) on commit drop;

  for store_row in
    select
      store_id,
      min(currency) as currency,
      sum(unit_price_amount * quantity)::numeric(12, 2) as subtotal_amount,
      count(*)::integer as item_count
    from pg_temp.checkout_products_tmp
    group by store_id
    order by store_id
  loop
    select
      coalesce(o.pickup_enabled, d.pickup_enabled, true),
      coalesce(o.courier_enabled, d.courier_enabled, true),
      coalesce(o.region_enabled, d.region_enabled, true),
      coalesce(o.baku_price, d.baku_price, 0)::numeric(12, 2),
      coalesce(o.region_price, d.region_price, 0)::numeric(12, 2),
      coalesce(o.free_delivery_threshold, d.free_delivery_threshold),
      coalesce(nullif(o.pickup_estimate, ''), d.pickup_estimate, 'Mağazadan götürmə'),
      coalesce(nullif(o.courier_estimate, ''), d.courier_estimate, '1-2 iş günü'),
      coalesce(nullif(o.region_estimate, ''), d.region_estimate, '2-5 iş günü')
    into
      v_pickup_enabled,
      v_courier_enabled,
      v_region_enabled,
      v_baku_price,
      v_region_price,
      v_free_delivery_threshold,
      v_pickup_estimate,
      v_courier_estimate,
      v_region_estimate
    from public.delivery_settings d
    left join public.delivery_store_overrides o on o.store_id = store_row.store_id
    where d.key = 'global';

    if v_delivery_method = 'pickup' then
      if not coalesce(v_pickup_enabled, true) then
        raise exception 'DELIVERY_METHOD_UNAVAILABLE';
      end if;

      v_delivery_amount := 0;
      v_delivery_estimate := v_pickup_estimate;
    elsif v_delivery_method = 'courier' then
      if not coalesce(v_courier_enabled, true) then
        raise exception 'DELIVERY_METHOD_UNAVAILABLE';
      end if;

      v_delivery_amount := v_baku_price;
      v_delivery_estimate := v_courier_estimate;
    else
      if not coalesce(v_region_enabled, true) then
        raise exception 'DELIVERY_METHOD_UNAVAILABLE';
      end if;

      v_delivery_amount := v_region_price;
      v_delivery_estimate := v_region_estimate;
    end if;

    if v_free_delivery_threshold is not null
      and store_row.subtotal_amount >= v_free_delivery_threshold then
      v_delivery_amount := 0;
    end if;

    select customers.id
      into v_customer_id
    from public.customers customers
    where customers.store_id = store_row.store_id
      and customers.user_id = v_user_id
    order by customers.created_at
    limit 1
    for update;

    if v_customer_id is null then
      insert into public.customers (
        store_id,
        user_id,
        email,
        full_name,
        phone
      )
      select
        store_row.store_id,
        v_user_id,
        profiles.email,
        btrim(p_full_name),
        btrim(p_phone)
      from public.profiles profiles
      where profiles.id = v_user_id
      returning id into v_customer_id;
    else
      update public.customers
      set
        full_name = btrim(p_full_name),
        phone = btrim(p_phone),
        email = profiles.email,
        updated_at = now()
      from public.profiles profiles
      where customers.id = v_customer_id
        and profiles.id = v_user_id;
    end if;

    v_order_number :=
      'AZ-' ||
      to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') ||
      '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    insert into public.orders (
      store_id,
      customer_id,
      user_id,
      order_number,
      status,
      payment_status,
      subtotal_amount,
      shipping_amount,
      total_amount,
      currency,
      shipping_address,
      delivery_method,
      delivery_amount,
      delivery_region,
      delivery_address,
      delivery_estimate,
      notes,
      metadata
    )
    values (
      store_row.store_id,
      v_customer_id,
      v_user_id,
      v_order_number,
      'pending'::public.order_status,
      'pending'::public.payment_status,
      store_row.subtotal_amount,
      v_delivery_amount,
      (store_row.subtotal_amount + v_delivery_amount)::numeric(12, 2),
      store_row.currency,
      jsonb_build_object(
        'full_name', btrim(p_full_name),
        'phone', btrim(p_phone),
        'address', case when v_delivery_method = 'pickup' then null else btrim(p_address) end,
        'delivery_method', v_delivery_method,
        'delivery_region', v_delivery_region,
        'delivery_estimate', v_delivery_estimate
      ),
      v_delivery_method,
      v_delivery_amount,
      v_delivery_region,
      case when v_delivery_method = 'pickup' then null else btrim(p_address) end,
      v_delivery_estimate,
      nullif(btrim(coalesce(p_notes, '')), ''),
      jsonb_strip_nulls(
        jsonb_build_object(
          'checkout_request_id', p_request_id,
          'source', 'atomic_checkout_rpc',
          'delivery_method', v_delivery_method,
          'delivery_amount', v_delivery_amount,
          'delivery_region', v_delivery_region,
          'delivery_estimate', v_delivery_estimate
        )
      )
    )
    returning id into v_order_id;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_sku,
      quantity,
      unit_price_amount,
      total_amount
    )
    select
      v_order_id,
      checkout_products.id,
      checkout_products.name,
      checkout_products.sku,
      checkout_products.quantity,
      checkout_products.unit_price_amount,
      (checkout_products.unit_price_amount * checkout_products.quantity)::numeric(12, 2)
    from pg_temp.checkout_products_tmp checkout_products
    where checkout_products.store_id = store_row.store_id
    order by checkout_products.id;

    insert into pg_temp.checkout_created_orders_tmp (
      id,
      store_id,
      order_number,
      total_amount,
      item_count
    )
    values (
      v_order_id,
      store_row.store_id,
      v_order_number,
      (store_row.subtotal_amount + v_delivery_amount)::numeric(12, 2),
      store_row.item_count
    );

    v_order_ids := array_append(v_order_ids, v_order_id);
  end loop;

  update public.products products
  set
    stock_quantity = products.stock_quantity - checkout_products.quantity,
    updated_at = now()
  from pg_temp.checkout_products_tmp checkout_products
  where products.id = checkout_products.id;

  select jsonb_build_object(
    'orderIds',
    coalesce(jsonb_agg(id::text order by id), '[]'::jsonb),
    'orders',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id::text,
          'storeId', store_id::text,
          'orderNumber', order_number,
          'totalAmount', total_amount,
          'itemCount', item_count
        )
        order by id
      ),
      '[]'::jsonb
    )
  )
    into v_result
  from pg_temp.checkout_created_orders_tmp;

  return v_result;
end;
$$;

revoke all on function public.create_atomic_checkout_orders(
  jsonb,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text
) from public, anon;

grant execute on function public.create_atomic_checkout_orders(
  jsonb,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text
) to authenticated;
