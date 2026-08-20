alter type public.order_status add value if not exists 'archived';

drop policy if exists "orders_delete_store_owner_or_admin" on public.orders;
drop policy if exists "orders_delete_admin_only" on public.orders;
create policy "orders_delete_admin_only"
on public.orders for delete
using (public.is_admin());

drop policy if exists "order_items_delete_store_owner_or_admin" on public.order_items;
drop policy if exists "order_items_delete_admin_only" on public.order_items;
create policy "order_items_delete_admin_only"
on public.order_items for delete
using (public.is_admin());

create or replace function public.prevent_unsafe_seller_order_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if public.owns_store(old.store_id) then
    if old.id is distinct from new.id
      or old.store_id is distinct from new.store_id
      or old.customer_id is distinct from new.customer_id
      or old.user_id is distinct from new.user_id
      or old.order_number is distinct from new.order_number
      or old.payment_status is distinct from new.payment_status
      or old.subtotal_amount is distinct from new.subtotal_amount
      or old.discount_amount is distinct from new.discount_amount
      or old.shipping_amount is distinct from new.shipping_amount
      or old.tax_amount is distinct from new.tax_amount
      or old.total_amount is distinct from new.total_amount
      or old.currency is distinct from new.currency
      or old.shipping_address is distinct from new.shipping_address
      or old.billing_address is distinct from new.billing_address
      or old.notes is distinct from new.notes
      or old.metadata is distinct from new.metadata
      or old.created_at is distinct from new.created_at then
      raise exception 'ORDER_UPDATE_FORBIDDEN'
        using errcode = '42501';
    end if;

    if new.status::text not in ('canceled', 'archived') then
      raise exception 'ORDER_STATUS_NOT_ALLOWED'
        using errcode = '42501';
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_seller_order_status_update on public.orders;
create trigger enforce_seller_order_status_update
before update on public.orders
for each row
execute function public.prevent_unsafe_seller_order_update();
