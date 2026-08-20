begin;

alter type public.subscription_status add value if not exists 'assigned';
alter type public.subscription_status add value if not exists 'inactive';

commit;

drop index if exists public.subscriptions_one_current_per_store_idx;

create unique index subscriptions_one_current_per_store_idx
on public.subscriptions (store_id)
where status in (
  'trialing'::public.subscription_status,
  'active'::public.subscription_status,
  'past_due'::public.subscription_status,
  'assigned'::public.subscription_status
);
