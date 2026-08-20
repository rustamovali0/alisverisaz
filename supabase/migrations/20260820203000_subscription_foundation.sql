alter type public.subscription_status add value if not exists 'assigned';
alter type public.subscription_status add value if not exists 'inactive';

alter table public.subscription_plans
  add column if not exists slug text;

update public.subscription_plans
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where slug is null or btrim(slug) = '';

update public.subscription_plans
set slug = id::text
where slug is null or btrim(slug) = '';

alter table public.subscription_plans
  alter column slug set not null;

create unique index if not exists subscription_plans_slug_unique_idx
on public.subscription_plans (slug);

alter table public.subscriptions
  add column if not exists payment_provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_payment_id text,
  add column if not exists payment_status text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz;

drop index if exists public.subscriptions_one_current_per_store_idx;
create unique index subscriptions_one_current_per_store_idx
on public.subscriptions (store_id)
where status::text in ('trialing', 'active', 'past_due', 'assigned');

drop policy if exists "subscription_plans_select_authenticated" on public.subscription_plans;
create policy "subscription_plans_select_authenticated"
on public.subscription_plans for select
to authenticated
using (is_active or public.is_admin());

drop policy if exists "subscription_plans_manage_admin" on public.subscription_plans;
create policy "subscription_plans_manage_admin"
on public.subscription_plans for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "subscriptions_select_store_owner_or_admin" on public.subscriptions;
create policy "subscriptions_select_store_owner_or_admin"
on public.subscriptions for select
using (public.owns_store(store_id) or public.is_admin());

drop policy if exists "subscriptions_manage_admin" on public.subscriptions;
create policy "subscriptions_manage_admin"
on public.subscriptions for all
using (public.is_admin())
with check (public.is_admin());

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
    and s.status::text in ('trialing', 'active', 'assigned')
    and (s.ends_at is null or s.ends_at > now())
  order by s.created_at desc
  limit 1;
$$;
