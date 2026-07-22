alter table if exists public.product_messages
  add column if not exists reply_message text,
  add column if not exists reply_by uuid references auth.users(id) on delete set null,
  add column if not exists reply_at timestamptz;

create index if not exists product_messages_reply_at_idx
  on public.product_messages (reply_at desc)
  where reply_at is not null;
