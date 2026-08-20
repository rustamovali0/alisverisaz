insert into public.platform_settings (key, value)
values (
  'site',
  '{"global_loader":{"type":"classic","palette":"primary"}}'::jsonb
)
on conflict (key) do update
set value =
  public.platform_settings.value ||
  jsonb_build_object(
    'global_loader',
    coalesce(public.platform_settings.value -> 'global_loader', '{}'::jsonb) ||
    '{"type":"classic","palette":"primary"}'::jsonb
  );
