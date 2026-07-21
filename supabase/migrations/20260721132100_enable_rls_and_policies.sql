create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.owns_store(store_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.stores
    where id = store_uuid
      and owner_id = auth.uid()
  );
$$;

create or replace function public.owns_product(product_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = product_uuid
      and s.owner_id = auth.uid()
  );
$$;

create or replace function public.owns_order(order_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = order_uuid
      and s.owner_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.deposits enable row level security;
alter table public.payments enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_generations enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own"
on public.profiles for insert
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role in ('customer', 'seller')
  )
);

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = public.current_user_role()
  )
);

create policy "profiles_delete_admin"
on public.profiles for delete
using (public.is_admin());

create policy "stores_select_owner_or_admin"
on public.stores for select
using (owner_id = auth.uid() or public.is_admin());

create policy "stores_insert_owner_or_admin"
on public.stores for insert
with check (owner_id = auth.uid() or public.is_admin());

create policy "stores_update_owner_or_admin"
on public.stores for update
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "stores_delete_owner_or_admin"
on public.stores for delete
using (owner_id = auth.uid() or public.is_admin());

create policy "subscription_plans_select_authenticated"
on public.subscription_plans for select
to authenticated
using (is_active or public.is_admin());

create policy "subscription_plans_manage_admin"
on public.subscription_plans for all
using (public.is_admin())
with check (public.is_admin());

create policy "subscriptions_select_store_owner_or_admin"
on public.subscriptions for select
using (public.owns_store(store_id) or public.is_admin());

create policy "subscriptions_manage_admin"
on public.subscriptions for all
using (public.is_admin())
with check (public.is_admin());

create policy "categories_select_authenticated"
on public.categories for select
to authenticated
using (is_active or public.is_admin());

create policy "categories_manage_admin"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

create policy "products_select_store_owner_or_admin"
on public.products for select
using (public.owns_store(store_id) or public.is_admin());

create policy "products_insert_store_owner_or_admin"
on public.products for insert
with check (public.owns_store(store_id) or public.is_admin());

create policy "products_update_store_owner_or_admin"
on public.products for update
using (public.owns_store(store_id) or public.is_admin())
with check (public.owns_store(store_id) or public.is_admin());

create policy "products_delete_store_owner_or_admin"
on public.products for delete
using (public.owns_store(store_id) or public.is_admin());

create policy "product_images_select_store_owner_or_admin"
on public.product_images for select
using (public.owns_product(product_id) or public.is_admin());

create policy "product_images_insert_store_owner_or_admin"
on public.product_images for insert
with check (public.owns_product(product_id) or public.is_admin());

create policy "product_images_update_store_owner_or_admin"
on public.product_images for update
using (public.owns_product(product_id) or public.is_admin())
with check (public.owns_product(product_id) or public.is_admin());

create policy "product_images_delete_store_owner_or_admin"
on public.product_images for delete
using (public.owns_product(product_id) or public.is_admin());

create policy "customers_select_self_store_owner_or_admin"
on public.customers for select
using (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "customers_insert_self_store_owner_or_admin"
on public.customers for insert
with check (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "customers_update_self_store_owner_or_admin"
on public.customers for update
using (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "customers_delete_store_owner_or_admin"
on public.customers for delete
using (public.owns_store(store_id) or public.is_admin());

create policy "orders_select_customer_store_owner_or_admin"
on public.orders for select
using (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "orders_insert_customer_store_owner_or_admin"
on public.orders for insert
with check (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "orders_update_store_owner_or_admin"
on public.orders for update
using (public.owns_store(store_id) or public.is_admin())
with check (public.owns_store(store_id) or public.is_admin());

create policy "orders_delete_store_owner_or_admin"
on public.orders for delete
using (public.owns_store(store_id) or public.is_admin());

create policy "order_items_select_order_participant_or_admin"
on public.order_items for select
using (
  public.owns_order(order_id)
  or public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

create policy "order_items_insert_store_owner_or_admin"
on public.order_items for insert
with check (public.owns_order(order_id) or public.is_admin());

create policy "order_items_update_store_owner_or_admin"
on public.order_items for update
using (public.owns_order(order_id) or public.is_admin())
with check (public.owns_order(order_id) or public.is_admin());

create policy "order_items_delete_store_owner_or_admin"
on public.order_items for delete
using (public.owns_order(order_id) or public.is_admin());

create policy "deposits_select_owner_or_admin"
on public.deposits for select
using (
  owner_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "deposits_insert_owner_or_admin"
on public.deposits for insert
with check (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and public.owns_store(store_id)
  )
);

create policy "deposits_update_admin"
on public.deposits for update
using (public.is_admin())
with check (public.is_admin());

create policy "deposits_delete_admin"
on public.deposits for delete
using (public.is_admin());

create policy "payments_select_customer_store_owner_or_admin"
on public.payments for select
using (
  public.owns_store(store_id)
  or public.is_admin()
  or exists (
    select 1
    from public.customers c
    where c.id = payments.customer_id
      and c.user_id = auth.uid()
  )
);

create policy "payments_insert_store_owner_or_admin"
on public.payments for insert
with check (public.owns_store(store_id) or public.is_admin());

create policy "payments_update_store_owner_or_admin"
on public.payments for update
using (public.owns_store(store_id) or public.is_admin())
with check (public.owns_store(store_id) or public.is_admin());

create policy "payments_delete_admin"
on public.payments for delete
using (public.is_admin());

create policy "favorites_select_own_or_admin"
on public.favorites for select
using (user_id = auth.uid() or public.is_admin());

create policy "favorites_insert_own"
on public.favorites for insert
with check (user_id = auth.uid());

create policy "favorites_delete_own_or_admin"
on public.favorites for delete
using (user_id = auth.uid() or public.is_admin());

create policy "reviews_select_own_store_owner_or_admin"
on public.reviews for select
using (
  user_id = auth.uid()
  or public.owns_product(product_id)
  or public.is_admin()
);

create policy "reviews_insert_own"
on public.reviews for insert
with check (user_id = auth.uid());

create policy "reviews_update_own_store_owner_or_admin"
on public.reviews for update
using (
  user_id = auth.uid()
  or public.owns_product(product_id)
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.owns_product(product_id)
  or public.is_admin()
);

create policy "reviews_delete_own_or_admin"
on public.reviews for delete
using (user_id = auth.uid() or public.is_admin());

create policy "notifications_select_own_or_admin"
on public.notifications for select
using (user_id = auth.uid() or public.is_admin());

create policy "notifications_insert_admin"
on public.notifications for insert
with check (public.is_admin());

create policy "notifications_update_own_or_admin"
on public.notifications for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "notifications_delete_own_or_admin"
on public.notifications for delete
using (user_id = auth.uid() or public.is_admin());

create policy "ai_generations_select_owner_store_owner_or_admin"
on public.ai_generations for select
using (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "ai_generations_insert_owner_or_store_owner"
on public.ai_generations for insert
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and (store_id is null or public.owns_store(store_id))
  )
);

create policy "ai_generations_update_owner_store_owner_or_admin"
on public.ai_generations for update
using (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.owns_store(store_id)
  or public.is_admin()
);

create policy "ai_generations_delete_owner_or_admin"
on public.ai_generations for delete
using (user_id = auth.uid() or public.is_admin());
