insert into public.platform_settings (key, value)
values (
  'site',
  '{"order_email_notifications_enabled": true}'::jsonb
)
on conflict (key) do update
set value =
  case
    when public.platform_settings.value ? 'order_email_notifications_enabled' then
      public.platform_settings.value
    else
      public.platform_settings.value || excluded.value
  end;
