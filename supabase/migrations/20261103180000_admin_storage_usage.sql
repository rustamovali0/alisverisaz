create or replace function public.admin_storage_usage()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'database_bytes', pg_catalog.pg_database_size(pg_catalog.current_database())
  )
$$;

revoke all on function public.admin_storage_usage() from public, anon, authenticated;
grant execute on function public.admin_storage_usage() to service_role;
