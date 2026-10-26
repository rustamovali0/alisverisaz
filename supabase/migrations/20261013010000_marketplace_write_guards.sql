begin;

-- RLS row ownership alone does not authorize changes to moderation or entitlements.
create or replace function public.guard_marketplace_store_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  protected_key text;
begin
  if public.is_admin() or auth.role() = 'service_role' then return new; end if;
  if new.owner_id is distinct from auth.uid() then
    raise exception 'STORE_WRITE_FORBIDDEN' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.status::text <> 'draft' then
      raise exception 'STORE_APPROVAL_REQUIRED' using errcode = '42501';
    end if;
  elsif new.owner_id is distinct from old.owner_id or new.status is distinct from old.status then
    raise exception 'STORE_MODERATION_FORBIDDEN' using errcode = '42501';
  end if;
  foreach protected_key in array array['product_limit_override', 'images_per_product_limit_override'] loop
    if tg_op = 'INSERT' then
      if new.settings ? protected_key then
        raise exception 'STORE_ENTITLEMENT_FORBIDDEN' using errcode = '42501';
      end if;
    elsif (new.settings -> protected_key) is distinct from (old.settings -> protected_key) then
      raise exception 'STORE_ENTITLEMENT_FORBIDDEN' using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.guard_marketplace_store_write() from public, anon, authenticated;
create trigger guard_marketplace_store_write before insert or update on public.stores
for each row execute function public.guard_marketplace_store_write();

create or replace function public.guard_marketplace_product_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  protected_key text;
begin
  if public.is_admin() or auth.role() = 'service_role' then return new; end if;
  if new.listing_type::text <> 'store' or not exists (
    select 1 from public.stores s where s.id = new.store_id
    and s.owner_id = auth.uid() and s.status::text = 'active'
  ) then
    raise exception 'APPROVED_STORE_REQUIRED' using errcode = '42501';
  end if;
  if new.owner_id is distinct from auth.uid() then
    raise exception 'PRODUCT_OWNER_FORBIDDEN' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.store_id is distinct from old.store_id or new.owner_id is distinct from old.owner_id
      or new.listing_type is distinct from old.listing_type then
      raise exception 'PRODUCT_TRANSFER_FORBIDDEN' using errcode = '42501';
    end if;
    if (old.metadata ->> 'approval_status' = 'rejected' or old.metadata ->> 'admin_hidden' = 'true')
      and new.status::text = 'active' then
      raise exception 'PRODUCT_MODERATION_FORBIDDEN' using errcode = '42501';
    end if;
  end if;
  foreach protected_key in array array['admin_hidden', 'approved_by', 'approved_at', 'rejected_by', 'rejected_at', 'rejection_note'] loop
    if tg_op = 'INSERT' then
      if new.metadata ? protected_key then
        raise exception 'PRODUCT_MODERATION_FORBIDDEN' using errcode = '42501';
      end if;
    elsif (new.metadata -> protected_key) is distinct from (old.metadata -> protected_key) then
      raise exception 'PRODUCT_MODERATION_FORBIDDEN' using errcode = '42501';
    end if;
  end loop;
  if tg_op = 'UPDATE' and (new.metadata -> 'approval_status') is distinct from (old.metadata -> 'approval_status') then
    raise exception 'PRODUCT_MODERATION_FORBIDDEN' using errcode = '42501';
  elsif tg_op = 'INSERT' and coalesce(new.metadata ->> 'approval_status', 'none') not in ('none', 'pending') then
    raise exception 'PRODUCT_MODERATION_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_marketplace_product_write() from public, anon, authenticated;
create trigger guard_marketplace_product_write before insert or update on public.products
for each row execute function public.guard_marketplace_product_write();

notify pgrst, 'reload schema';
commit;
