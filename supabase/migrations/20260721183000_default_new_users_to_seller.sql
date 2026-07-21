begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role public.user_role := 'seller'::public.user_role;
begin
  if lower(new.email) = lower('rustamovali664@gmail.com') then
    next_role := 'admin'::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    next_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    role = case
      when lower(excluded.email) = lower('rustamovali664@gmail.com')
        then 'admin'::public.user_role
      else public.profiles.role
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

update public.profiles
set
  role = 'admin'::public.user_role,
  updated_at = now()
where lower(email) = lower('rustamovali664@gmail.com');

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where lower(email) = lower('rustamovali664@gmail.com');

commit;
