alter table public.products
  add column if not exists cost_amount numeric(12, 2) not null default 0;

create index if not exists products_store_status_cost_idx
  on public.products (store_id, status, cost_amount);
