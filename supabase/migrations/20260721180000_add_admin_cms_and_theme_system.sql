create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  title text,
  description text,
  image_url text,
  button_label text,
  button_url text,
  item_limit integer not null default 8,
  data_filter text not null default 'manual',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  show_mobile boolean not null default true,
  show_desktop boolean not null default true,
  theme_variant text not null default 'default',
  status text not null default 'published',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_sections_key_unique unique (key),
  constraint homepage_sections_item_limit_non_negative check (item_limit >= 0),
  constraint homepage_sections_status_check check (status in ('draft', 'published', 'archived'))
);

create table public.navigation_menus (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  title text not null,
  location text not null,
  is_active boolean not null default true,
  is_system boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint navigation_menus_key_unique unique (key),
  constraint navigation_menus_location_check check (
    location in ('header', 'mobile', 'footer', 'seller_sidebar', 'customer_sidebar', 'admin_extra')
  )
);

create table public.navigation_items (
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

create table public.theme_settings (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null,
  name text not null,
  status text not null default 'draft',
  is_active boolean not null default false,
  preview_image_url text,
  hero_variant text not null default 'default',
  product_card_variant text not null default 'default',
  section_order jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint theme_settings_theme_status_unique unique (theme_key, status),
  constraint theme_settings_status_check check (status in ('draft', 'published', 'archived'))
);

create unique index theme_settings_one_active_idx
on public.theme_settings (is_active)
where is_active;

create table public.store_panel_settings (
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

create table public.store_feature_overrides (
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

create table public.user_panel_settings (
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

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  type text not null default 'info',
  target text not null default 'all',
  plan_ids uuid[] not null default '{}'::uuid[],
  store_ids uuid[] not null default '{}'::uuid[],
  starts_at timestamptz,
  ends_at timestamptz,
  is_dismissible boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_type_check check (type in ('info', 'warning', 'campaign', 'maintenance')),
  constraint announcements_target_check check (target in ('all', 'seller', 'customer', 'admin', 'store'))
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'cms-media',
  path text not null,
  url text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  width integer,
  height integer,
  alt_text text,
  usage_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_path_unique unique (bucket, path),
  constraint media_assets_size_non_negative check (size_bytes >= 0)
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger set_homepage_sections_updated_at
before update on public.homepage_sections
for each row execute function public.set_updated_at();

create trigger set_navigation_menus_updated_at
before update on public.navigation_menus
for each row execute function public.set_updated_at();

create trigger set_navigation_items_updated_at
before update on public.navigation_items
for each row execute function public.set_updated_at();

create trigger set_theme_settings_updated_at
before update on public.theme_settings
for each row execute function public.set_updated_at();

create trigger set_store_panel_settings_updated_at
before update on public.store_panel_settings
for each row execute function public.set_updated_at();

create trigger set_store_feature_overrides_updated_at
before update on public.store_feature_overrides
for each row execute function public.set_updated_at();

create trigger set_user_panel_settings_updated_at
before update on public.user_panel_settings
for each row execute function public.set_updated_at();

create trigger set_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create trigger set_media_assets_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

create index homepage_sections_status_active_order_idx
on public.homepage_sections (status, is_active, sort_order);

create index navigation_menus_location_idx on public.navigation_menus (location);
create index navigation_items_menu_order_idx on public.navigation_items (menu_id, sort_order);
create index store_panel_settings_store_id_idx on public.store_panel_settings (store_id);
create index store_feature_overrides_store_id_idx on public.store_feature_overrides (store_id);
create index announcements_target_active_idx on public.announcements (target, is_active);
create index media_assets_created_at_idx on public.media_assets (created_at desc);
create index admin_audit_logs_admin_id_idx on public.admin_audit_logs (admin_id);
create index admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id);

alter table public.homepage_sections enable row level security;
alter table public.navigation_menus enable row level security;
alter table public.navigation_items enable row level security;
alter table public.theme_settings enable row level security;
alter table public.store_panel_settings enable row level security;
alter table public.store_feature_overrides enable row level security;
alter table public.user_panel_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.media_assets enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "homepage_sections_select_published"
on public.homepage_sections for select
using ((status = 'published' and is_active) or public.is_admin());

create policy "homepage_sections_manage_admin"
on public.homepage_sections for all
using (public.is_admin())
with check (public.is_admin());

create policy "navigation_menus_select_active"
on public.navigation_menus for select
using (is_active or public.is_admin());

create policy "navigation_menus_manage_admin"
on public.navigation_menus for all
using (public.is_admin())
with check (public.is_admin());

create policy "navigation_items_select_active"
on public.navigation_items for select
using (is_active or public.is_admin());

create policy "navigation_items_manage_admin"
on public.navigation_items for all
using (public.is_admin())
with check (public.is_admin());

create policy "theme_settings_select_published"
on public.theme_settings for select
using ((status = 'published' and is_active) or public.is_admin());

create policy "theme_settings_manage_admin"
on public.theme_settings for all
using (public.is_admin())
with check (public.is_admin());

create policy "store_panel_settings_select_admin_or_store_owner"
on public.store_panel_settings for select
using (public.is_admin() or store_id is null or public.owns_store(store_id));

create policy "store_panel_settings_manage_admin"
on public.store_panel_settings for all
using (public.is_admin())
with check (public.is_admin());

create policy "store_feature_overrides_select_admin_or_store_owner"
on public.store_feature_overrides for select
using (public.is_admin() or public.owns_store(store_id));

create policy "store_feature_overrides_manage_admin"
on public.store_feature_overrides for all
using (public.is_admin())
with check (public.is_admin());

create policy "user_panel_settings_select_authenticated"
on public.user_panel_settings for select
to authenticated
using (true);

create policy "user_panel_settings_manage_admin"
on public.user_panel_settings for all
using (public.is_admin())
with check (public.is_admin());

create policy "announcements_select_active"
on public.announcements for select
using (
  public.is_admin()
  or (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  )
);

create policy "announcements_manage_admin"
on public.announcements for all
using (public.is_admin())
with check (public.is_admin());

create policy "media_assets_select_public"
on public.media_assets for select
using (true);

create policy "media_assets_manage_admin"
on public.media_assets for all
using (public.is_admin())
with check (public.is_admin());

create policy "admin_audit_logs_select_admin"
on public.admin_audit_logs for select
using (public.is_admin());

create policy "admin_audit_logs_insert_admin"
on public.admin_audit_logs for insert
with check (public.is_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'cms-media',
  'cms-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "cms_media_select_public"
on storage.objects for select
using (bucket_id = 'cms-media');

create policy "cms_media_insert_admin"
on storage.objects for insert
to authenticated
with check (bucket_id = 'cms-media' and public.is_admin());

create policy "cms_media_update_admin"
on storage.objects for update
to authenticated
using (bucket_id = 'cms-media' and public.is_admin())
with check (bucket_id = 'cms-media' and public.is_admin());

create policy "cms_media_delete_admin"
on storage.objects for delete
to authenticated
using (bucket_id = 'cms-media' and public.is_admin());

insert into public.platform_settings (key, value)
values
  (
    'site',
    '{
      "site_name": "alisveris.az",
      "short_name": "Alisveris",
      "logo_url": "",
      "dark_logo_url": "",
      "favicon_url": "",
      "default_seo_title": "alisveris.az - Marketplace, mağaza və elan platforması",
      "default_meta_description": "Azərbaycanda məhsul satışı, mağaza idarəetməsi, elan yerləşdirmə və sifarişlər üçün marketplace platforması.",
      "default_seo_keywords": "alisveris.az, alışveriş, marketplace, məhsul satışı, elan, mağaza",
      "contact_email": "",
      "phone": "",
      "whatsapp": "",
      "address": "",
      "social_links": {},
      "copyright_text": "© alisveris.az",
      "maintenance_mode": false,
      "user_registration_enabled": true,
      "store_registration_enabled": true,
      "deposit_enabled": true,
      "active_home_theme": "default",
      "default_theme_mode": "system"
    }'::jsonb
  ),
  (
    'theme',
    '{"active_home_theme": "default", "default_theme_mode": "system"}'::jsonb
  )
on conflict (key) do update
set value = public.platform_settings.value || excluded.value;

insert into public.homepage_sections (
  key,
  title,
  description,
  button_label,
  button_url,
  item_limit,
  data_filter,
  sort_order,
  is_active,
  theme_variant,
  status
)
values
  ('announcement', 'alisveris.az', 'Mağaza və elan platforması aktivdir.', null, null, 0, 'manual', 1, true, 'default', 'published'),
  ('hero', 'Azərbaycanda marketplace platforması', 'Məhsul satışı, elan yerləşdirmə və sifariş idarəetməsi üçün müasir platforma.', 'Məhsullara bax', '/products', 0, 'manual', 2, true, 'default', 'published'),
  ('categories', 'Kateqoriyalar', 'Aktiv məhsul kateqoriyalarını kəşf edin.', null, null, 8, 'active_categories', 3, true, 'default', 'published'),
  ('featured_products', 'Seçilmiş məhsullar', 'Platformadakı aktiv məhsullar.', 'Hamısına bax', '/products', 8, 'featured', 4, true, 'default', 'published'),
  ('new_products', 'Yeni məhsullar', 'Ən son əlavə olunan məhsullar.', 'Yeni məhsullar', '/products', 8, 'new', 5, true, 'default', 'published'),
  ('discounted_products', 'Endirimli məhsullar', 'Endirimli aktiv məhsullar.', 'Endirimlərə bax', '/products', 8, 'discounted', 6, true, 'default', 'published'),
  ('benefits', 'Üstünlüklər', 'Satıcı və alıcılar üçün rahat idarəetmə.', null, null, 3, 'manual', 7, true, 'default', 'published'),
  ('cta', 'Mağazanı idarə etməyə başla', 'alisveris.az paneli ilə məhsul və sifarişləri idarə et.', 'Qeydiyyat', '/register', 0, 'manual', 8, true, 'default', 'published'),
  ('footer', 'alisveris.az', 'Marketplace, mağaza və elan platforması.', null, null, 0, 'manual', 9, true, 'default', 'published')
on conflict (key) do update
set
  title = excluded.title,
  description = excluded.description,
  button_label = excluded.button_label,
  button_url = excluded.button_url,
  item_limit = excluded.item_limit,
  data_filter = excluded.data_filter,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  theme_variant = excluded.theme_variant,
  status = excluded.status;

insert into public.navigation_menus (key, title, location, is_system)
values
  ('main_header', 'Əsas header menyusu', 'header', true),
  ('mobile_main', 'Mobil menyu', 'mobile', true),
  ('footer_main', 'Footer menyusu', 'footer', true),
  ('seller_sidebar', 'Satıcı sidebar', 'seller_sidebar', true),
  ('customer_sidebar', 'İstifadəçi sidebar', 'customer_sidebar', true),
  ('admin_extra', 'Admin əlavə menyu', 'admin_extra', true)
on conflict (key) do update
set title = excluded.title, location = excluded.location, is_system = excluded.is_system;

with menu_rows as (
  select id, key from public.navigation_menus
)
insert into public.navigation_items (
  menu_id,
  title,
  href,
  icon_name,
  sort_order,
  is_active,
  is_system,
  required_role
)
values
  ((select id from menu_rows where key = 'main_header'), 'Məhsullar', '/products', 'box', 1, true, true, null),
  ((select id from menu_rows where key = 'main_header'), 'Səbət', '/cart', 'shoppingCart', 2, true, true, null),
  ((select id from menu_rows where key = 'seller_sidebar'), 'Dashboard', '/store/dashboard', 'home', 1, true, true, 'seller'),
  ((select id from menu_rows where key = 'seller_sidebar'), 'Məhsullar', '/store/dashboard/products', 'box', 2, true, true, 'seller'),
  ((select id from menu_rows where key = 'seller_sidebar'), 'Sifarişlər', '/store/dashboard/orders', 'shoppingCart', 3, true, true, 'seller'),
  ((select id from menu_rows where key = 'seller_sidebar'), 'Beh sifarişləri', '/store/dashboard/deposits', 'creditCard', 4, true, true, 'seller'),
  ((select id from menu_rows where key = 'seller_sidebar'), 'Müştərilər', '/store/dashboard/customers', 'users', 5, true, true, 'seller'),
  ((select id from menu_rows where key = 'seller_sidebar'), 'Analitika', '/store/dashboard/analytics', 'barChart', 6, true, false, 'seller'),
  ((select id from menu_rows where key = 'seller_sidebar'), 'Abunəlik', '/store/dashboard/subscription', 'receipt', 7, true, true, 'seller'),
  ((select id from menu_rows where key = 'seller_sidebar'), 'Ayarlar', '/store/dashboard/settings', 'settings', 8, true, true, 'seller'),
  ((select id from menu_rows where key = 'customer_sidebar'), 'Dashboard', '/dashboard', 'home', 1, true, true, 'customer'),
  ((select id from menu_rows where key = 'customer_sidebar'), 'Elanlarım', '/dashboard/listings', 'package', 2, true, true, 'customer'),
  ((select id from menu_rows where key = 'customer_sidebar'), 'Sifarişlər', '/dashboard/orders', 'shoppingCart', 3, true, true, 'customer'),
  ((select id from menu_rows where key = 'customer_sidebar'), 'Favorilər', '/dashboard/favorites', 'heart', 4, true, false, 'customer'),
  ((select id from menu_rows where key = 'customer_sidebar'), 'Ödənişlər', '/dashboard/payments', 'creditCard', 5, true, false, 'customer'),
  ((select id from menu_rows where key = 'customer_sidebar'), 'Profil', '/dashboard/profile', 'user', 6, true, true, 'customer'),
  ((select id from menu_rows where key = 'admin_extra'), 'Sayt idarəetməsi', '/admin/site-management', 'settings', 1, true, true, 'admin'),
  ((select id from menu_rows where key = 'admin_extra'), 'Ana səhifə bölmələri', '/admin/homepage-sections', 'layout', 2, true, true, 'admin'),
  ((select id from menu_rows where key = 'admin_extra'), 'Menyular', '/admin/menus', 'menu', 3, true, true, 'admin'),
  ((select id from menu_rows where key = 'admin_extra'), 'Temalar', '/admin/themes', 'palette', 4, true, true, 'admin'),
  ((select id from menu_rows where key = 'admin_extra'), 'Media', '/admin/media', 'image', 5, true, true, 'admin'),
  ((select id from menu_rows where key = 'admin_extra'), 'Audit log', '/admin/audit-log', 'receipt', 6, true, true, 'admin')
on conflict (menu_id, href) do update
set
  title = excluded.title,
  icon_name = excluded.icon_name,
  sort_order = excluded.sort_order,
  is_system = excluded.is_system,
  required_role = excluded.required_role;

insert into public.theme_settings (theme_key, name, status, is_active, config, published_at)
values
  ('default', 'Default', 'published', true, '{"layout": "default"}'::jsonb, now()),
  ('modern-marketplace', 'Modern Marketplace', 'draft', false, '{"layout": "modern"}'::jsonb, null),
  ('luxury-commerce', 'Luxury Commerce', 'draft', false, '{"layout": "luxury"}'::jsonb, null),
  ('minimal-storefront', 'Minimal Storefront', 'draft', false, '{"layout": "minimal"}'::jsonb, null),
  ('bold-catalog', 'Bold Catalog', 'draft', false, '{"layout": "bold"}'::jsonb, null)
on conflict (theme_key, status) do update
set name = excluded.name, config = excluded.config;

insert into public.store_panel_settings (store_id, title, dashboard_welcome_title, dashboard_help_text, features, sidebar_items)
values (
  null,
  'Mağaza paneli',
  'Mağazanı idarə et',
  'Məhsullar, sifarişlər, müştərilər və abunəlik məlumatları burada görünür.',
  '{
    "dashboard": true,
    "products": true,
    "orders": true,
    "customers": true,
    "analytics": true,
    "subscription": true,
    "deposits": true,
    "payments": true,
    "notifications": true,
    "settings": true
  }'::jsonb,
  '[]'::jsonb
)
on conflict (store_id) do nothing;

insert into public.user_panel_settings (key, title, features, sidebar_items)
values (
  'global',
  'Fərdi panel',
  '{
    "dashboard": true,
    "listings": true,
    "orders": true,
    "favorites": true,
    "payments": true,
    "profile": true,
    "notifications": true
  }'::jsonb,
  '[]'::jsonb
)
on conflict (key) do update
set title = excluded.title, features = excluded.features;
