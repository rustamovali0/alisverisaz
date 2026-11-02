begin;
-- Row ownership is not permission to undo revocation or grant approval/roles.
create function public.security_guard_profile_write() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; begin
 if auth.role()='service_role' or (auth.role() is null and auth.uid() is null) or public.is_admin() then return new; end if;
 if new.id is distinct from auth.uid() then raise exception 'PROFILE_OWNER_REQUIRED' using errcode='42501'; end if;
 if tg_op='INSERT' then
  if new.role::text<>'customer' then raise exception 'PROFILE_ROLE_FORBIDDEN' using errcode='42501'; end if;
  foreach k in array array['session_revoked_at','banned_until'] loop
   if to_jsonb(new)->>k is not null then raise exception 'PROFILE_SECURITY_COLUMN_FORBIDDEN' using errcode='42501'; end if;
  end loop;
  if coalesce(to_jsonb(new)->>'requested_role','customer') not in ('customer','seller') then raise exception 'PROFILE_ROLE_FORBIDDEN' using errcode='42501'; end if;
  foreach k in array array['seller_application_status','seller_approval_status'] loop
   if to_jsonb(new)->>k is not null and to_jsonb(new)->>k not in ('pending','active') then raise exception 'PROFILE_SECURITY_COLUMN_FORBIDDEN' using errcode='42501'; end if;
  end loop;
 else
  foreach k in array array['id','role','email','requested_role','seller_application_status','seller_approval_status','session_revoked_at','banned_until'] loop
   if (to_jsonb(new)->k) is distinct from (to_jsonb(old)->k) then raise exception 'PROFILE_SECURITY_COLUMN_FORBIDDEN' using errcode='42501'; end if;
  end loop;
 end if;
 return new;
end $$;
revoke all on function public.security_guard_profile_write() from public,anon,authenticated;
create trigger security_guard_profile_write before insert or update on public.profiles for each row execute function public.security_guard_profile_write();
commit;
