create table if not exists public.seller_promo_codes (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  code text not null,
  code_normalized text not null,
  discount_percent numeric(5, 2) not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_active boolean not null default true,
  promo_notification_sent_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_promo_codes_code_length check (char_length(btrim(code)) between 1 and 40),
  constraint seller_promo_codes_code_normalized_check check (code_normalized = upper(btrim(code))),
  constraint seller_promo_codes_discount_range check (discount_percent >= 1 and discount_percent <= 100),
  constraint seller_promo_codes_date_order check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists seller_promo_codes_seller_code_unique
on public.seller_promo_codes (seller_id, code_normalized)
where deleted_at is null;

create index if not exists seller_promo_codes_seller_idx
on public.seller_promo_codes (seller_id, created_at desc)
where deleted_at is null;

create index if not exists seller_promo_codes_active_idx
on public.seller_promo_codes (seller_id, code_normalized, is_active, starts_at, ends_at)
where deleted_at is null;

drop trigger if exists set_seller_promo_codes_updated_at on public.seller_promo_codes;
create trigger set_seller_promo_codes_updated_at
before update on public.seller_promo_codes
for each row execute function public.set_updated_at();

alter table public.seller_promo_codes enable row level security;

drop policy if exists "seller_promo_codes_select_owner_or_admin" on public.seller_promo_codes;
create policy "seller_promo_codes_select_owner_or_admin"
on public.seller_promo_codes for select
using (
  public.is_admin()
  or seller_id = auth.uid()
);

drop policy if exists "seller_promo_codes_insert_owner_or_admin" on public.seller_promo_codes;
create policy "seller_promo_codes_insert_owner_or_admin"
on public.seller_promo_codes for insert
with check (
  public.is_admin()
  or (
    seller_id = auth.uid()
    and (
      store_id is null
      or exists (
        select 1
        from public.stores stores
        where stores.id = seller_promo_codes.store_id
          and stores.owner_id = auth.uid()
      )
    )
  )
);

drop policy if exists "seller_promo_codes_update_owner_or_admin" on public.seller_promo_codes;
create policy "seller_promo_codes_update_owner_or_admin"
on public.seller_promo_codes for update
using (
  public.is_admin()
  or seller_id = auth.uid()
)
with check (
  public.is_admin()
  or (
    seller_id = auth.uid()
    and (
      store_id is null
      or exists (
        select 1
        from public.stores stores
        where stores.id = seller_promo_codes.store_id
          and stores.owner_id = auth.uid()
      )
    )
  )
);

drop policy if exists "seller_promo_codes_delete_owner_or_admin" on public.seller_promo_codes;
create policy "seller_promo_codes_delete_owner_or_admin"
on public.seller_promo_codes for delete
using (
  public.is_admin()
  or seller_id = auth.uid()
);
