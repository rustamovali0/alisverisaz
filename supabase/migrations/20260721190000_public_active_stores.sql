begin;

drop policy if exists "stores_select_active_public" on public.stores;

create policy "stores_select_active_public"
on public.stores for select
using (status = 'active');

commit;
