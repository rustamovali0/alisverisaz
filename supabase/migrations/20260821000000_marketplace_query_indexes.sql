create extension if not exists pg_trgm;

create index if not exists products_marketplace_status_created_id_idx
on public.products (status, created_at desc, id desc);

create index if not exists products_marketplace_category_status_created_id_idx
on public.products (category_id, status, created_at desc, id desc);

create index if not exists products_marketplace_store_status_created_id_idx
on public.products (store_id, status, created_at desc, id desc);

create index if not exists products_marketplace_status_price_id_idx
on public.products (status, price_amount, id);

create index if not exists products_name_trgm_idx
on public.products using gin (name gin_trgm_ops);

create index if not exists products_description_trgm_idx
on public.products using gin (description gin_trgm_ops);

create index if not exists product_images_product_sort_idx
on public.product_images (product_id, is_primary desc, sort_order asc);

create index if not exists orders_store_created_id_idx
on public.orders (store_id, created_at desc, id desc);

create index if not exists orders_user_created_id_idx
on public.orders (user_id, created_at desc, id desc);

create index if not exists subscriptions_store_status_created_idx
on public.subscriptions (store_id, status, created_at desc);
