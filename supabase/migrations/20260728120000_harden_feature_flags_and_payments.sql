update public.store_panel_settings
set features = coalesce(features, '{}'::jsonb) || '{"earnings": true}'::jsonb
where store_id is null
  and coalesce(features ->> 'earnings', '') = '';

update public.user_panel_settings
set features = coalesce(features, '{}'::jsonb)
  || case when coalesce(features, '{}'::jsonb) ? 'listings' then '{}'::jsonb else '{"listings": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'orders' then '{}'::jsonb else '{"orders": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'favorites' then '{}'::jsonb else '{"favorites": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'payments' then '{}'::jsonb else '{"payments": true}'::jsonb end
  || case when coalesce(features, '{}'::jsonb) ? 'profile' then '{}'::jsonb else '{"profile": true}'::jsonb end
where key = 'global';
