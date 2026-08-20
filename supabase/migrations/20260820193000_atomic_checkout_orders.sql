begin;

create or replace function public.create_atomic_checkout_orders(
  p_items jsonb,
  p_full_name text,
  p_phone text,
  p_address text,
  p_notes text default null,
  p_request_id uuid default null
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
    or length(btrim(coalesce(p_address, ''))) not between 5 and 500
    or length(coalesce(p_notes, '')) > 1000 then
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
      total_amount,
      currency,
      shipping_address,
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
      store_row.subtotal_amount,
      store_row.currency,
      jsonb_build_object(
        'full_name', btrim(p_full_name),
        'phone', btrim(p_phone),
        'address', btrim(p_address)
      ),
      nullif(btrim(coalesce(p_notes, '')), ''),
      jsonb_strip_nulls(
        jsonb_build_object(
          'checkout_request_id', p_request_id,
          'source', 'atomic_checkout_rpc'
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
      store_row.subtotal_amount,
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
  uuid
) from public, anon;

grant execute on function public.create_atomic_checkout_orders(
  jsonb,
  text,
  text,
  text,
  text,
  uuid
) to authenticated;

commit;
