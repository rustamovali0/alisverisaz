insert into public.platform_settings (key, value)
values (
  'site',
  '{"mobile_navbar_variant":"classic"}'::jsonb
)
on conflict (key) do update
set value =
  public.platform_settings.value ||
  jsonb_build_object(
    'mobile_navbar_variant',
    coalesce(public.platform_settings.value -> 'mobile_navbar_variant', '"classic"'::jsonb)
  );
