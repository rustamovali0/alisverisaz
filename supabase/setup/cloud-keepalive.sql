-- Apply ONLY to the user's Cloud project fxfycfkwodywmnzgkyvl.
-- This returns a constant and exposes no application data.
create or replace function public.alisveris_heartbeat() returns integer
language sql stable set search_path='' as $$ select 1 $$;
revoke all on function public.alisveris_heartbeat() from public;
grant execute on function public.alisveris_heartbeat() to anon,authenticated;
