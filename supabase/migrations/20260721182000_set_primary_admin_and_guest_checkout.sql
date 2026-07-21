begin;

update public.profiles
set
  role = 'admin'::public.user_role,
  updated_at = now()
where lower(email) = lower('rustamovali664@gmail.com');

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where lower(email) = lower('rustamovali664@gmail.com');

commit;
