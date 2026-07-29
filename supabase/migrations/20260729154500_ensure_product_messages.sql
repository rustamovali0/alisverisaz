create table if not exists public.product_messages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  sender_phone text,
  message text not null,
  reply_message text,
  reply_by uuid references auth.users(id) on delete set null,
  reply_at timestamptz,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_messages_status_check check (status in ('new', 'read', 'archived')),
  constraint product_messages_sender_name_length check (char_length(sender_name) between 2 and 120),
  constraint product_messages_sender_phone_length check (sender_phone is null or char_length(sender_phone) <= 40),
  constraint product_messages_message_length check (char_length(message) between 2 and 2000)
);

alter table public.product_messages
  add column if not exists reply_message text,
  add column if not exists reply_by uuid references auth.users(id) on delete set null,
  add column if not exists reply_at timestamptz;

create index if not exists product_messages_product_id_idx on public.product_messages(product_id);
create index if not exists product_messages_store_id_idx on public.product_messages(store_id);
create index if not exists product_messages_created_at_idx on public.product_messages(created_at desc);
create index if not exists product_messages_status_idx on public.product_messages(status);
create index if not exists product_messages_reply_at_idx on public.product_messages(reply_at desc);

drop trigger if exists set_product_messages_updated_at on public.product_messages;

create trigger set_product_messages_updated_at
before update on public.product_messages
for each row execute function public.set_updated_at();

alter table public.product_messages enable row level security;

drop policy if exists "product_messages_select_store_owner_or_admin" on public.product_messages;
drop policy if exists "product_messages_insert_public" on public.product_messages;
drop policy if exists "product_messages_update_store_owner_or_admin" on public.product_messages;

create policy "product_messages_select_store_owner_or_admin"
on public.product_messages for select
using (
  public.is_admin()
  or sender_id = auth.uid()
  or exists (
    select 1
    from public.stores s
    where s.id = product_messages.store_id
      and s.owner_id = auth.uid()
  )
);

create policy "product_messages_insert_public"
on public.product_messages for insert
with check (
  (sender_id is null or sender_id = auth.uid())
  and exists (
    select 1
    from public.products p
    where p.id = product_messages.product_id
      and p.store_id = product_messages.store_id
      and p.status = 'active'
  )
);

create policy "product_messages_update_store_owner_or_admin"
on public.product_messages for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.stores s
    where s.id = product_messages.store_id
      and s.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.stores s
    where s.id = product_messages.store_id
      and s.owner_id = auth.uid()
  )
);
