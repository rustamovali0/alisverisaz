create table if not exists public.store_panel_settings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  title text not null default 'Mağaza paneli',
  logo_url text,
  dashboard_welcome_title text,
  dashboard_help_text text,
  support_email text,
  support_phone text,
  announcement_text text,
  sidebar_variant text not null default 'default',
  card_variant text not null default 'default',
  default_theme_mode text not null default 'system',
  features jsonb not null default '{}'::jsonb,
  sidebar_items jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_panel_settings_store_unique unique (store_id),
  constraint store_panel_settings_theme_check check (default_theme_mode in ('light', 'dark', 'system'))
);

create unique index if not exists store_panel_settings_one_global_idx
on public.store_panel_settings ((store_id is null))
where store_id is null;

create table if not exists public.store_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  feature_key text not null,
  is_enabled boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_feature_overrides_store_feature_unique unique (store_id, feature_key)
);

create table if not exists public.user_panel_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null default 'global',
  title text not null default 'Fərdi panel',
  dashboard_announcement text,
  sidebar_items jsonb not null default '[]'::jsonb,
  features jsonb not null default '{}'::jsonb,
  empty_states jsonb not null default '{}'::jsonb,
  default_card_variant text not null default 'default',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_panel_settings_key_unique unique (key)
);

alter table public.store_panel_settings enable row level security;
alter table public.store_feature_overrides enable row level security;
alter table public.user_panel_settings enable row level security;

create index if not exists store_panel_settings_store_id_idx
  on public.store_panel_settings (store_id);
create index if not exists store_feature_overrides_store_id_idx
  on public.store_feature_overrides (store_id);

do $$
begin
  if to_regprocedure('public.is_admin()') is not null
    and to_regprocedure('public.owns_store(uuid)') is not null
  then
    drop policy if exists "store_panel_settings_select_admin_or_store_owner" on public.store_panel_settings;
    create policy "store_panel_settings_select_admin_or_store_owner"
    on public.store_panel_settings for select
    using (public.is_admin() or store_id is null or public.owns_store(store_id));

    drop policy if exists "store_panel_settings_manage_admin" on public.store_panel_settings;
    create policy "store_panel_settings_manage_admin"
    on public.store_panel_settings for all
    using (public.is_admin())
    with check (public.is_admin());

    drop policy if exists "store_feature_overrides_select_admin_or_store_owner" on public.store_feature_overrides;
    create policy "store_feature_overrides_select_admin_or_store_owner"
    on public.store_feature_overrides for select
    using (public.is_admin() or public.owns_store(store_id));

    drop policy if exists "store_feature_overrides_manage_admin" on public.store_feature_overrides;
    create policy "store_feature_overrides_manage_admin"
    on public.store_feature_overrides for all
    using (public.is_admin())
    with check (public.is_admin());

    drop policy if exists "user_panel_settings_select_authenticated" on public.user_panel_settings;
    create policy "user_panel_settings_select_authenticated"
    on public.user_panel_settings for select
    using (auth.uid() is not null);

    drop policy if exists "user_panel_settings_manage_admin" on public.user_panel_settings;
    create policy "user_panel_settings_manage_admin"
    on public.user_panel_settings for all
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;

insert into public.store_panel_settings (
  store_id,
  title,
  dashboard_welcome_title,
  dashboard_help_text,
  features,
  sidebar_items
)
select
  null,
  'Mağaza paneli',
  'Mağazanı idarə et',
  'Məhsullar, sifarişlər, müştərilər və abunəlik məlumatları burada görünür.',
  '{
    "dashboard": true,
    "products": true,
    "orders": true,
    "customers": true,
    "messages": true,
    "analytics": true,
    "earnings": true,
    "subscription": true,
    "deposits": true,
    "payments": true,
    "notifications": true,
    "settings": true
  }'::jsonb,
  '[]'::jsonb
where not exists (
  select 1 from public.store_panel_settings where store_id is null
);

insert into public.user_panel_settings (key, title, features, sidebar_items)
values (
  'global',
  'Fərdi panel',
  '{
    "dashboard": true,
    "listings": true,
    "orders": true,
    "messages": true,
    "favorites": true,
    "payments": true,
    "profile": true,
    "notifications": true
  }'::jsonb,
  '[]'::jsonb
)
on conflict (key) do nothing;

update public.store_panel_settings
set features = coalesce(features, '{}'::jsonb)
  || case when coalesce(features, '{}'::jsonb) ? 'earnings' then '{}'::jsonb else '{"earnings": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'messages' then '{}'::jsonb else '{"messages": true}'::jsonb end
where store_id is null;

update public.user_panel_settings
set features = coalesce(features, '{}'::jsonb)
  || case when coalesce(features, '{}'::jsonb) ? 'listings' then '{}'::jsonb else '{"listings": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'orders' then '{}'::jsonb else '{"orders": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'messages' then '{}'::jsonb else '{"messages": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'favorites' then '{}'::jsonb else '{"favorites": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'payments' then '{}'::jsonb else '{"payments": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'profile' then '{}'::jsonb else '{"profile": true}'::jsonb end
where key = 'global';
