begin;

alter table public.store_panel_settings
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.profiles
  add column if not exists requested_role text,
  add column if not exists seller_application_status text;

update public.profiles p
set
  requested_role = coalesce(
    p.requested_role,
    nullif(u.raw_user_meta_data ->> 'requested_role', ''),
    case when p.role = 'seller'::public.user_role then 'seller' else null end
  ),
  seller_application_status = coalesce(
    p.seller_application_status,
    nullif(u.raw_user_meta_data ->> 'seller_application_status', ''),
    case
      when p.role = 'seller'::public.user_role then 'approved'
      else null
    end
  )
from auth.users u
where u.id = p.id;

create index if not exists profiles_requested_role_idx
  on public.profiles (requested_role);

create index if not exists profiles_seller_application_status_idx
  on public.profiles (seller_application_status);

do $$
begin
  alter table public.profiles
    add constraint profiles_requested_role_check
    check (requested_role is null or requested_role in ('customer', 'seller', 'admin'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_seller_application_status_check
    check (
      seller_application_status is null
      or seller_application_status in ('pending', 'approved', 'rejected', 'active')
    );
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

commit;
