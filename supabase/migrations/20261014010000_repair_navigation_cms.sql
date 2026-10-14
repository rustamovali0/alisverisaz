-- Restores the optional navigation CMS objects on installations where the
-- original CMS migration was not applied. Existing menus and items are kept.
begin;

create table if not exists public.navigation_menus (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  location text not null,
  is_active boolean not null default true,
  is_system boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint navigation_menus_location_check check (
    location in ('header', 'mobile', 'footer', 'seller_sidebar', 'customer_sidebar', 'admin_extra')
  )
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.navigation_menus(id) on delete cascade,
  parent_id uuid references public.navigation_items(id) on delete cascade,
  title text not null,
  href text not null,
  icon_name text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  is_external boolean not null default false,
  open_in_new_tab boolean not null default false,
  show_mobile boolean not null default true,
  show_desktop boolean not null default true,
  required_role public.user_role,
  required_feature text,
  allowed_plan_ids uuid[] not null default '{}'::uuid[],
  badge_text text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint navigation_items_menu_href_unique unique (menu_id, href)
);

create index if not exists navigation_menus_location_idx
  on public.navigation_menus (location);
create index if not exists navigation_items_menu_order_idx
  on public.navigation_items (menu_id, sort_order);

drop trigger if exists set_navigation_menus_updated_at on public.navigation_menus;
create trigger set_navigation_menus_updated_at
before update on public.navigation_menus
for each row execute function public.set_updated_at();

drop trigger if exists set_navigation_items_updated_at on public.navigation_items;
create trigger set_navigation_items_updated_at
before update on public.navigation_items
for each row execute function public.set_updated_at();

alter table public.navigation_menus enable row level security;
alter table public.navigation_items enable row level security;

drop policy if exists "navigation_menus_select_active" on public.navigation_menus;
create policy "navigation_menus_select_active"
on public.navigation_menus for select
using (is_active or public.is_admin());

drop policy if exists "navigation_menus_manage_admin" on public.navigation_menus;
create policy "navigation_menus_manage_admin"
on public.navigation_menus for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "navigation_items_select_active" on public.navigation_items;
create policy "navigation_items_select_active"
on public.navigation_items for select
using (is_active or public.is_admin());

drop policy if exists "navigation_items_manage_admin" on public.navigation_items;
create policy "navigation_items_manage_admin"
on public.navigation_items for all
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
commit;
