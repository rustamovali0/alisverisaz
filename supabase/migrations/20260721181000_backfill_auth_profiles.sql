begin;

insert into public.profiles (id, email, full_name, role)
select
  users.id,
  users.email,
  nullif(users.raw_user_meta_data ->> 'full_name', ''),
  case
    when users.raw_user_meta_data ->> 'role' in ('customer', 'seller', 'admin')
      then (users.raw_user_meta_data ->> 'role')::public.user_role
    else 'customer'::public.user_role
  end
from auth.users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.id = users.id
)
on conflict (id) do nothing;

commit;
