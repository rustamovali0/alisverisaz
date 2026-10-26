begin;
alter table public.products add column if not exists sku text;
create unique index if not exists products_store_sku_unique on public.products(store_id, upper(sku)) where sku is not null;
create table public.product_import_requests (
  store_id uuid not null references public.stores(id),
  request_id uuid not null,
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (store_id, request_id)
);
alter table public.product_import_requests enable row level security;
revoke all on public.product_import_requests from public, anon, authenticated;

create function public.import_store_products(store_uuid uuid, request_uuid uuid, import_mode text, rows_json jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_uuid uuid;
  settings_json jsonb;
  previous public.product_import_requests%rowtype;
  item jsonb;
  existing public.products%rowtype;
  added integer := 0;
  updated integer := 0;
  skipped integer := 0;
  response jsonb;
  payload_json jsonb := jsonb_build_object('mode', import_mode, 'rows', rows_json);
begin
  if auth.uid() is null or import_mode not in ('create', 'update') or jsonb_typeof(rows_json) <> 'array'
    or jsonb_array_length(rows_json) not between 1 and 200 or octet_length(rows_json::text) > 2097152 then
    raise exception 'INVALID_IMPORT' using errcode = '22023';
  end if;
  select owner_id, settings into owner_uuid, settings_json from public.stores
    where id = store_uuid and status::text = 'active' and owner_id = auth.uid() for update;
  if not found then raise exception 'APPROVED_STORE_REQUIRED' using errcode = '42501'; end if;
  if not pg_try_advisory_xact_lock(hashtextextended('import:' || store_uuid::text, 0)) then
    raise exception 'IMPORT_BUSY';
  end if;
  select * into previous from public.product_import_requests where store_id = store_uuid and request_id = request_uuid;
  if found then
    if previous.payload <> payload_json then raise exception 'IMPORT_REQUEST_CONFLICT'; end if;
    return previous.result;
  end if;
  if (select count(*) from public.product_import_requests where store_id = store_uuid and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'IMPORT_RATE_LIMIT';
  end if;
  insert into public.product_import_requests(store_id, request_id, payload) values(store_uuid, request_uuid, payload_json);
  for item in select value from jsonb_array_elements(rows_json) loop
    if coalesce(item->>'sku', '') !~ '^[A-Z0-9][A-Z0-9._-]{0,63}$'
      or length(coalesce(item->>'name','')) not between 1 and 200
      or coalesce(item->>'price','') !~ '^\d{1,8}(\.\d{1,2})?$'
      or length(coalesce(item->>'description','')) > 4000 then raise exception 'INVALID_IMPORT_ROW'; end if;
    if settings_json->>'profitTrackingEnabled' = 'true' and coalesce(item->>'cost','') !~ '^\d{1,8}(\.\d{1,2})?$' then
      raise exception 'COST_REQUIRED';
    end if;
    select * into existing from public.products where store_id = store_uuid and upper(sku) = item->>'sku' for update;
    if (import_mode = 'create' and found) or (import_mode = 'update' and not found) then
      skipped := skipped + 1; continue;
    end if;
    if import_mode = 'create' then
      insert into public.products(store_id, owner_id, listing_type, sku, name, slug, price_amount, cost_amount, stock_quantity, description, category_id, status, metadata)
      values (store_uuid, owner_uuid, 'store', item->>'sku', item->>'name', gen_random_uuid()::text,
        (item->>'price')::numeric, coalesce((item->>'cost')::numeric, 0), coalesce((item->>'stock')::integer, 0),
        item->>'description', (item->>'categoryId')::uuid, 'active', jsonb_build_object('stockTrackingEnabled', item->>'stock' is not null));
      added := added + 1;
    else
      -- Do not change status, ownership, variant data or moderation during import updates.
      update public.products set name=item->>'name', price_amount=(item->>'price')::numeric,
        cost_amount=coalesce((item->>'cost')::numeric, cost_amount), stock_quantity=coalesce((item->>'stock')::integer, 0),
        description=item->>'description', category_id=(item->>'categoryId')::uuid,
        metadata=coalesce(metadata,'{}') || jsonb_build_object('stockTrackingEnabled',item->>'stock' is not null)
      where id=existing.id;
      updated := updated + 1;
    end if;
  end loop;
  response := jsonb_build_object('added',added,'updated',updated,'skipped',skipped,'errors',0);
  update public.product_import_requests set result=response where store_id=store_uuid and request_id=request_uuid;
  return response;
end;
$$;
revoke all on function public.import_store_products(uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.import_store_products(uuid,uuid,text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
