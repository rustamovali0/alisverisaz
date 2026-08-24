insert into public.platform_settings (key, value)
values (
  'site',
  jsonb_build_object(
    'deposit_enabled', false,
    'show_subscription_in_seller_panel', false,
    'subscriptions_disabled_for_sellers', true,
    'subscription_limits',
    jsonb_build_object(
      'default_product_limit', 100,
      'default_images_per_product_limit', 5
    )
  )
)
on conflict (key) do update
set value =
  public.platform_settings.value ||
  jsonb_build_object(
    'deposit_enabled',
    false,
    'show_subscription_in_seller_panel',
    false,
    'subscriptions_disabled_for_sellers',
    true,
    'subscription_limits',
    coalesce(public.platform_settings.value -> 'subscription_limits', '{}'::jsonb) ||
    jsonb_build_object(
      'default_product_limit',
      coalesce(
        public.read_nonnegative_int_setting(
          coalesce(public.platform_settings.value -> 'subscription_limits', '{}'::jsonb),
          'default_product_limit'
        ),
        100
      ),
      'default_images_per_product_limit',
      coalesce(
        public.read_nonnegative_int_setting(
          coalesce(public.platform_settings.value -> 'subscription_limits', '{}'::jsonb),
          'default_images_per_product_limit'
        ),
        5
      )
    )
  );

update public.navigation_items
set is_active = false
where href in (
  '/radmin/deposits',
  '/admin/deposits',
  '/store/dashboard/deposits'
);

update public.store_panel_settings
set features = coalesce(features, '{}'::jsonb) || '{"deposit":false,"deposits":false}'::jsonb
where store_id is null;

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
  site_settings jsonb := '{}'::jsonb;
  default_limits jsonb := '{}'::jsonb;
  has_plan boolean := false;
  subscriptions_disabled_for_sellers boolean := true;
begin
  select coalesce(settings, '{}'::jsonb)
  into store_settings
  from public.stores
  where id = store_uuid;

  select coalesce(value, '{}'::jsonb)
  into site_settings
  from public.platform_settings
  where key = 'site';

  default_limits := coalesce(site_settings -> 'subscription_limits', '{}'::jsonb);

  subscriptions_disabled_for_sellers :=
    case
      when jsonb_typeof(site_settings -> 'subscriptions_disabled_for_sellers') = 'boolean'
        then (site_settings ->> 'subscriptions_disabled_for_sellers')::boolean
      else true
    end;

  if not subscriptions_disabled_for_sellers then
    select p.limits
    into plan_limits
    from public.subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
    where s.store_id = store_uuid
      and s.status::text in ('trialing', 'active', 'assigned')
      and (s.ends_at is null or s.ends_at > now())
    order by s.created_at desc
    limit 1;
  end if;

  has_plan := plan_limits is not null;

  if store_settings ? 'product_limit_override' then
    product_limit := public.read_nonnegative_int_setting(store_settings, 'product_limit_override');
  elsif has_plan and plan_limits ? 'product_limit' then
    product_limit := public.read_nonnegative_int_setting(plan_limits, 'product_limit');
  elsif has_plan and plan_limits ? 'listing_limit' then
    product_limit := public.read_nonnegative_int_setting(plan_limits, 'listing_limit');
  else
    product_limit := coalesce(
      public.read_nonnegative_int_setting(default_limits, 'default_product_limit'),
      100
    );
  end if;

  if store_settings ? 'images_per_product_limit_override' then
    images_per_product_limit := public.read_nonnegative_int_setting(store_settings, 'images_per_product_limit_override');
  elsif has_plan and plan_limits ? 'images_per_product_limit' then
    images_per_product_limit := public.read_nonnegative_int_setting(plan_limits, 'images_per_product_limit');
  else
    images_per_product_limit := coalesce(
      public.read_nonnegative_int_setting(default_limits, 'default_images_per_product_limit'),
      5
    );
  end if;

  return next;
end;
$$;
