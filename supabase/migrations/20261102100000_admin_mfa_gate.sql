begin;
-- Additive and OFF until every administrator has enrolled/tested TOTP.
create table public.security_configuration (id boolean primary key default true check(id), admin_mfa_required boolean not null default false);
insert into public.security_configuration(id) values(true);
alter table public.security_configuration enable row level security;
revoke all on public.security_configuration from public,anon,authenticated;
grant all on public.security_configuration to service_role;
create function public.security_admin_session_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.profiles where id=auth.uid() and role='admin')
 or not coalesce((select admin_mfa_required from public.security_configuration where id),false)
 or coalesce(auth.jwt()->>'aal','aal1')='aal2';
$$;
revoke all on function public.security_admin_session_allowed() from public;
grant execute on function public.security_admin_session_allowed() to anon,authenticated,service_role;
-- Preserve the original role check while also covering SECURITY DEFINER RPCs
-- that authorize with is_admin (RLS alone does not constrain definer functions).
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin') and public.security_admin_session_allowed();
$$;
do $$ declare t record; begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname<>'profiles' loop
  execute format('create policy security_admin_mfa_gate on public.%I as restrictive for all to authenticated using(public.security_admin_session_allowed()) with check(public.security_admin_session_allowed())',t.relname);
 end loop;
end $$;
-- AAL1 admins can still load their OWN basic profile to complete the challenge.
create policy security_admin_mfa_profile_read on public.profiles as restrictive for select to authenticated using(id=auth.uid() or public.security_admin_session_allowed());
create policy security_admin_mfa_profile_insert on public.profiles as restrictive for insert to authenticated with check(public.security_admin_session_allowed());
create policy security_admin_mfa_profile_update on public.profiles as restrictive for update to authenticated using(public.security_admin_session_allowed()) with check(public.security_admin_session_allowed());
create policy security_admin_mfa_profile_delete on public.profiles as restrictive for delete to authenticated using(public.security_admin_session_allowed());
commit;
