-- Read-only. Run in Supabase SQL Editor. Only missing objects are returned.
-- This checks literal table/RPC references and the known problem columns, not every column or RLS policy.
with required_tables(name) as (values
  ('activity_events'),
  ('admin_audit_logs'),
  ('admin_session_registry'),
  ('announcements'),
  ('auth_rate_limits'),
  ('categories'),
  ('customer_addresses'),
  ('customers'),
  ('delivery_settings'),
  ('delivery_store_overrides'),
  ('deposits'),
  ('favorites'),
  ('homepage_sections'),
  ('marketplace_search_terms'),
  ('media_assets'),
  ('navigation_items'),
  ('navigation_menus'),
  ('notifications'),
  ('order_items'),
  ('orders'),
  ('payments'),
  ('platform_settings'),
  ('product_images'),
  ('product_locations'),
  ('product_messages'),
  ('product_option_values'),
  ('product_options'),
  ('product_variants'),
  ('product_views'),
  ('products'),
  ('profiles'),
  ('promotion_requests'),
  ('reviews'),
  ('seller_promo_codes'),
  ('store_feature_overrides'),
  ('store_locations'),
  ('store_panel_settings'),
  ('store_views'),
  ('stores'),
  ('subscription_plans'),
  ('subscriptions'),
  ('support_messages'),
  ('telegram_pending_admin_actions'),
  ('telegram_rate_limits'),
  ('theme_settings'),
  ('user_panel_settings')
), required_functions(name) as (values
  ('create_atomic_checkout_orders'),
  ('get_store_effective_limits'),
  ('record_marketplace_search')
), required_columns(table_name, column_name) as (values
  ('profiles', 'requested_role'),
  ('profiles', 'seller_application_status'),
  ('profiles', 'session_revoked_at'),
  ('store_panel_settings', 'updated_by'),
  ('stores', 'settings'),
  ('stores', 'slug'),
  ('stores', 'logo_url'),
  ('stores', 'banner_url')
)
select 'table' as kind, name as missing_object from required_tables
where to_regclass('public.' || name) is null
union all
select 'function', name from required_functions r
where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = r.name)
union all
select 'column', r.table_name || '.' || r.column_name from required_columns r
where not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = r.table_name and c.column_name = r.column_name)
order by kind, missing_object;
