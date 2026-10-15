-- Exact public product counts for store cards. Product previews remain limited
-- in the application, but counts and category availability come from PostgreSQL.
create or replace function public.get_public_store_product_counts(
  p_store_ids uuid[],
  p_category_id uuid default null
)
returns table (
  store_id uuid,
  product_count bigint,
  category_ids uuid[]
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    product.store_id,
    count(*)::bigint as product_count,
    coalesce(
      array_agg(distinct product.category_id) filter (where product.category_id is not null),
      '{}'::uuid[]
    ) as category_ids
  from public.products as product
  join public.stores as store on store.id = product.store_id
  where product.store_id = any(p_store_ids)
    and product.status = 'active'
    and store.status = 'active'
    and (p_category_id is null or product.category_id = p_category_id)
  group by product.store_id;
$$;

revoke all on function public.get_public_store_product_counts(uuid[], uuid) from public;
grant execute on function public.get_public_store_product_counts(uuid[], uuid)
  to anon, authenticated, service_role;

create index if not exists products_public_store_count_idx
  on public.products (store_id, category_id)
  where status = 'active';
