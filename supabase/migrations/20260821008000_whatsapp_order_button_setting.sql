insert into public.platform_settings (key, value)
values ('site', '{"show_whatsapp_order_button":true}'::jsonb)
on conflict (key) do update
set value =
  case
    when public.platform_settings.value ? 'show_whatsapp_order_button' then
      public.platform_settings.value
    else
      public.platform_settings.value ||
      '{"show_whatsapp_order_button":true}'::jsonb
  end;
