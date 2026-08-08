alter table if exists public.store_locations
  add column if not exists map_link text;

alter table if exists public.store_locations
  add column if not exists show_address boolean not null default true,
  add column if not exists show_metro boolean not null default true,
  add column if not exists show_bus boolean not null default true,
  add column if not exists show_map boolean not null default true;

alter table if exists public.store_locations
  drop constraint if exists store_locations_map_link_length;

alter table if exists public.store_locations
  add constraint store_locations_map_link_length
  check (map_link is null or char_length(map_link) <= 1000);

create index if not exists store_locations_map_link_idx
  on public.store_locations(store_id)
  where map_link is not null;

create index if not exists products_store_id_perf_idx
  on public.products(store_id);

create index if not exists products_category_id_perf_idx
  on public.products(category_id);

create index if not exists products_created_at_perf_idx
  on public.products(created_at desc);

create index if not exists products_price_amount_perf_idx
  on public.products(price_amount);

create index if not exists products_status_perf_idx
  on public.products(status);

create index if not exists orders_user_id_perf_idx
  on public.orders(user_id);

create index if not exists orders_store_id_perf_idx
  on public.orders(store_id);

create index if not exists orders_created_at_perf_idx
  on public.orders(created_at desc);

create index if not exists favorites_user_id_perf_idx
  on public.favorites(user_id);

create index if not exists favorites_product_id_perf_idx
  on public.favorites(product_id);

create index if not exists reviews_product_id_perf_idx
  on public.reviews(product_id);

do $$
begin
  if to_regclass('public.cart_items') is not null then
    execute 'create index if not exists cart_items_user_id_perf_idx on public.cart_items(user_id)';
    execute 'create index if not exists cart_items_product_id_perf_idx on public.cart_items(product_id)';
  end if;

  if to_regclass('public.notifications') is not null then
    execute 'create index if not exists notifications_user_id_perf_idx on public.notifications(user_id)';
  end if;

  if to_regclass('public.messages') is not null then
    execute 'create index if not exists messages_conversation_id_perf_idx on public.messages(conversation_id)';
  end if;

  if to_regclass('public.product_messages') is not null then
    execute 'create index if not exists product_messages_product_id_perf_idx on public.product_messages(product_id)';
    execute 'create index if not exists product_messages_sender_user_id_perf_idx on public.product_messages(sender_user_id)';
    execute 'create index if not exists product_messages_store_id_perf_idx on public.product_messages(store_id)';
  end if;
end $$;
