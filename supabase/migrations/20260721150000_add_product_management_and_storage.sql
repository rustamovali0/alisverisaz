create type public.product_listing_type as enum ('store', 'personal');

alter table public.products
add column listing_type public.product_listing_type not null default 'store',
add column owner_id uuid references public.profiles(id) on delete set null,
add column discount_amount numeric(12, 2) not null default 0,
add column activation_payment_id uuid references public.payments(id) on delete set null;

alter table public.products
add constraint products_discount_non_negative check (discount_amount >= 0);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text not null,
  price_delta_amount numeric(12, 2) not null default 0,
  stock_quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_stock_non_negative check (stock_quantity >= 0)
);

create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create index products_listing_type_idx on public.products (listing_type);
create index products_owner_id_idx on public.products (owner_id);
create index products_activation_payment_id_idx on public.products (activation_payment_id);
create index product_variants_product_id_idx on public.product_variants (product_id);

alter table public.product_variants enable row level security;

create policy "product_variants_select_store_owner_or_admin"
on public.product_variants for select
using (public.owns_product(product_id) or public.is_admin());

create policy "product_variants_insert_store_owner_or_admin"
on public.product_variants for insert
with check (public.owns_product(product_id) or public.is_admin());

create policy "product_variants_update_store_owner_or_admin"
on public.product_variants for update
using (public.owns_product(product_id) or public.is_admin())
with check (public.owns_product(product_id) or public.is_admin());

create policy "product_variants_delete_store_owner_or_admin"
on public.product_variants for delete
using (public.owns_product(product_id) or public.is_admin());

create or replace function public.enforce_product_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.listing_type = 'personal' then
    if new.status = 'active'
      and coalesce(new.metadata ->> 'payment_status', '') <> 'paid' then
      raise exception 'Personal listings must be paid before activation.'
        using errcode = 'P0001';
    end if;

    return new;
  end if;

  if not public.can_create_product(new.store_id) then
    raise exception 'Active subscription listing limit reached for this store.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_personal_listing_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.listing_type = 'personal'
    and new.status = 'active'
    and coalesce(new.metadata ->> 'payment_status', '') <> 'paid' then
    raise exception 'Personal listings must be paid before activation.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_personal_listing_activation on public.products;

create trigger enforce_personal_listing_activation
before update of status, metadata on public.products
for each row execute function public.enforce_personal_listing_activation();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_storage_select_public"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "product_images_storage_insert_authenticated"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "product_images_storage_update_owner"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and owner = auth.uid()
)
with check (
  bucket_id = 'product-images'
  and owner = auth.uid()
);

create policy "product_images_storage_delete_owner"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and owner = auth.uid()
);
