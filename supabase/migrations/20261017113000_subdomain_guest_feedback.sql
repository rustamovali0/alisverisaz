alter table public.reviews alter column user_id drop not null;
alter table public.reviews add column if not exists guest_key text;
alter table public.reviews add column if not exists guest_name text;
alter table public.reviews drop constraint if exists reviews_identity_required;
alter table public.reviews add constraint reviews_identity_required
  check (user_id is not null or (guest_key is not null and char_length(guest_key) = 64));
alter table public.reviews drop constraint if exists reviews_guest_name_length;
alter table public.reviews add constraint reviews_guest_name_length
  check (guest_name is null or char_length(guest_name) between 2 and 80);
create unique index if not exists reviews_product_guest_unique
  on public.reviews(product_id, guest_key) where guest_key is not null;

alter table public.product_messages add column if not exists guest_key text;
alter table public.product_messages add column if not exists identity_key text;
alter table public.product_messages drop constraint if exists product_messages_guest_key_length;
alter table public.product_messages add constraint product_messages_guest_key_length
  check (guest_key is null or char_length(guest_key) = 64);
create unique index if not exists product_messages_product_guest_unique
  on public.product_messages(product_id, guest_key) where guest_key is not null;
create unique index if not exists product_messages_product_identity_unique
  on public.product_messages(product_id, identity_key) where identity_key is not null;
