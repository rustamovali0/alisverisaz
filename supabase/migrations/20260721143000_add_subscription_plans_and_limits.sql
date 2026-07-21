insert into public.subscription_plans (
  name,
  description,
  price_amount,
  currency,
  billing_interval,
  features,
  limits,
  is_active
)
values
  (
    'Sadə',
    'Başlanğıc mağazalar üçün aylıq plan',
    7,
    'AZN',
    'month',
    '["50 elan"]'::jsonb,
    '{"listing_limit": 50}'::jsonb,
    true
  ),
  (
    'VIP',
    'Böyüyən mağazalar üçün aylıq plan',
    39,
    'AZN',
    'month',
    '["200 elan"]'::jsonb,
    '{"listing_limit": 200}'::jsonb,
    true
  ),
  (
    'Premium',
    'Yüksək həcmli mağazalar üçün aylıq plan',
    99,
    'AZN',
    'month',
    '["700 elan"]'::jsonb,
    '{"listing_limit": 700}'::jsonb,
    true
  )
on conflict (name) do update
set
  description = excluded.description,
  price_amount = excluded.price_amount,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  features = excluded.features,
  limits = excluded.limits,
  is_active = excluded.is_active,
  updated_at = now();

create or replace function public.get_active_subscription(store_uuid uuid)
returns table (
  subscription_id uuid,
  plan_id uuid,
  plan_name text,
  listing_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.subscription_status
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id as subscription_id,
    p.id as plan_id,
    p.name as plan_name,
    coalesce((p.limits ->> 'listing_limit')::integer, 0) as listing_limit,
    s.starts_at,
    s.ends_at,
    s.status
  from public.subscriptions s
  join public.subscription_plans p on p.id = s.plan_id
  where s.store_id = store_uuid
    and (public.owns_store(store_uuid) or public.is_admin())
    and s.status in ('trialing', 'active')
    and (s.ends_at is null or s.ends_at > now())
  order by s.created_at desc
  limit 1;
$$;

create or replace function public.can_create_product(store_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  active_subscription_id uuid;
  active_listing_limit integer;
  current_count integer;
begin
  select subscription_id, listing_limit
  into active_subscription_id, active_listing_limit
  from public.get_active_subscription(store_uuid)
  limit 1;

  if active_subscription_id is null then
    return false;
  end if;

  select count(*)
  into current_count
  from public.products
  where store_id = store_uuid
    and status <> 'archived';

  return current_count < active_listing_limit;
end;
$$;

create or replace function public.enforce_product_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if not public.can_create_product(new.store_id) then
    raise exception 'Active subscription listing limit reached for this store.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_products_subscription_limit on public.products;

create trigger enforce_products_subscription_limit
before insert on public.products
for each row execute function public.enforce_product_subscription_limit();
