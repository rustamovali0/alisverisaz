insert into public.platform_settings (key, value)
values ('site', '{"show_subscription_in_seller_panel":false}'::jsonb)
on conflict (key) do update
set value =
  case
    when public.platform_settings.value ? 'show_subscription_in_seller_panel' then
      public.platform_settings.value
    else
      public.platform_settings.value ||
      '{"show_subscription_in_seller_panel":false}'::jsonb
  end;
