insert into public.platform_settings (key, value)
values (
  'site',
  '{"subscription_limits":{"default_product_limit":null,"default_images_per_product_limit":null}}'::jsonb
)
on conflict (key) do update
set value =
  public.platform_settings.value ||
  jsonb_build_object(
    'subscription_limits',
    coalesce(public.platform_settings.value -> 'subscription_limits', '{}'::jsonb) ||
    '{"default_product_limit":null,"default_images_per_product_limit":null}'::jsonb
  );

update public.subscription_plans
set limits = jsonb_set(
  jsonb_set(
    coalesce(limits, '{}'::jsonb),
    '{product_limit}',
    case
      when limits ? 'product_limit' then limits -> 'product_limit'
      when limits ? 'listing_limit' then limits -> 'listing_limit'
      else 'null'::jsonb
    end,
    true
  ),
  '{images_per_product_limit}',
  case
    when limits ? 'images_per_product_limit' then limits -> 'images_per_product_limit'
    else 'null'::jsonb
  end,
  true
);

create or replace function public.read_nonnegative_int_setting(settings jsonb, setting_key text)
returns integer
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  raw_value jsonb;
  numeric_value numeric;
begin
  if settings is null or not (settings ? setting_key) then
    return null;
  end if;

  raw_value := settings -> setting_key;

  if raw_value is null or raw_value = 'null'::jsonb then
    return null;
  end if;

  if jsonb_typeof(raw_value) = 'number' then
    numeric_value := (raw_value #>> '{}')::numeric;
  elsif jsonb_typeof(raw_value) = 'string' and raw_value #>> '{}' ~ '^[0-9]+$' then
    numeric_value := (raw_value #>> '{}')::numeric;
  else
    return null;
  end if;

  if numeric_value < 0 then
    return null;
  end if;

  return floor(numeric_value)::integer;
end;
$$;

create or replace function public.get_store_effective_limits(store_uuid uuid)
returns table (
  product_limit integer,
  images_per_product_limit integer
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  store_settings jsonb := '{}'::jsonb;
  plan_limits jsonb := null;
  default_limits jsonb := '{}'::jsonb;
  has_plan boolean := false;
begin
  select coalesce(settings, '{}'::jsonb)
  into store_settings
  from public.stores
  where id = store_uuid;

  select p.limits
  into plan_limits
  from public.subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  where s.store_id = store_uuid
    and s.status::text in ('trialing', 'active', 'assigned')
    and (s.ends_at is null or s.ends_at > now())
  order by s.created_at desc
  limit 1;

  has_plan := plan_limits is not null;

  select coalesce(value -> 'subscription_limits', '{}'::jsonb)
  into default_limits
  from public.platform_settings
  where key = 'site';

  if store_settings ? 'product_limit_override' then
    product_limit := public.read_nonnegative_int_setting(store_settings, 'product_limit_override');
  elsif has_plan and plan_limits ? 'product_limit' then
    product_limit := public.read_nonnegative_int_setting(plan_limits, 'product_limit');
  elsif has_plan and plan_limits ? 'listing_limit' then
    product_limit := public.read_nonnegative_int_setting(plan_limits, 'listing_limit');
  else
    product_limit := public.read_nonnegative_int_setting(default_limits, 'default_product_limit');
  end if;

  if store_settings ? 'images_per_product_limit_override' then
    images_per_product_limit := public.read_nonnegative_int_setting(store_settings, 'images_per_product_limit_override');
  elsif has_plan and plan_limits ? 'images_per_product_limit' then
    images_per_product_limit := public.read_nonnegative_int_setting(plan_limits, 'images_per_product_limit');
  else
    images_per_product_limit := public.read_nonnegative_int_setting(default_limits, 'default_images_per_product_limit');
  end if;

  return next;
end;
$$;

create or replace function public.enforce_store_product_entitlement_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  effective_product_limit integer;
  current_count integer;
  new_counts boolean;
  old_counts boolean;
begin
  new_counts := new.listing_type = 'store' and new.status::text in ('draft', 'active');

  if tg_op = 'UPDATE' then
    old_counts := old.listing_type = 'store' and old.status::text in ('draft', 'active');

    if not new_counts then
      return new;
    end if;

    if old_counts and old.store_id = new.store_id then
      return new;
    end if;
  elsif not new_counts then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('product-limit:' || new.store_id::text, 0));

  select limits.product_limit
  into effective_product_limit
  from public.get_store_effective_limits(new.store_id) as limits;

  if effective_product_limit is null then
    return new;
  end if;

  select count(*)
  into current_count
  from public.products p
  where p.store_id = new.store_id
    and p.listing_type = 'store'
    and p.status::text in ('draft', 'active')
    and (tg_op = 'INSERT' or p.id <> new.id);

  if current_count >= effective_product_limit then
    raise exception 'Məhsul limitiniz dolub.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_products_subscription_limit on public.products;
drop trigger if exists enforce_store_product_entitlement_limit on public.products;
create trigger enforce_store_product_entitlement_limit
before insert or update of store_id, status, listing_type on public.products
for each row
execute function public.enforce_store_product_entitlement_limit();

create or replace function public.enforce_product_image_entitlement_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  product_store_id uuid;
  product_listing_type text;
  effective_image_limit integer;
  current_count integer;
begin
  select p.store_id, p.listing_type::text
  into product_store_id, product_listing_type
  from public.products p
  where p.id = new.product_id;

  if product_store_id is null or product_listing_type <> 'store' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.product_id = new.product_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('product-image-limit:' || new.product_id::text, 0));

  select limits.images_per_product_limit
  into effective_image_limit
  from public.get_store_effective_limits(product_store_id) as limits;

  if effective_image_limit is null then
    return new;
  end if;

  select count(*)
  into current_count
  from public.product_images pi
  where pi.product_id = new.product_id
    and (tg_op = 'INSERT' or pi.id <> new.id);

  if current_count >= effective_image_limit then
    raise exception 'Məhsul şəkil limitiniz dolub.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_product_image_entitlement_limit on public.product_images;
create trigger enforce_product_image_entitlement_limit
before insert or update of product_id on public.product_images
for each row
execute function public.enforce_product_image_entitlement_limit();
