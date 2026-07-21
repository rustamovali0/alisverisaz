create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'seller', 'admin');
create type public.store_status as enum ('draft', 'active', 'suspended', 'closed');
create type public.billing_interval as enum ('month', 'year');
create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired'
);
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'canceled',
  'refunded'
);
create type public.payment_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
);
create type public.deposit_status as enum (
  'pending',
  'approved',
  'rejected',
  'canceled'
);
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.ai_generation_status as enum (
  'pending',
  'completed',
  'failed'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  logo_url text,
  cover_url text,
  status public.store_status not null default 'draft',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_unique unique (slug)
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_amount numeric(12, 2) not null default 0,
  currency char(3) not null default 'AZN',
  billing_interval public.billing_interval not null default 'month',
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_name_unique unique (name),
  constraint subscription_plans_price_non_negative check (price_amount >= 0)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  canceled_at timestamptz,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_period_valid check (
    ends_at is null or ends_at > starts_at
  )
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_unique unique (slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  sku text,
  price_amount numeric(12, 2) not null,
  compare_at_price_amount numeric(12, 2),
  currency char(3) not null default 'AZN',
  stock_quantity integer not null default 0,
  status public.product_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_store_slug_unique unique (store_id, slug),
  constraint products_price_non_negative check (price_amount >= 0),
  constraint products_compare_price_non_negative check (
    compare_at_price_amount is null or compare_at_price_amount >= 0
  ),
  constraint products_stock_non_negative check (stock_quantity >= 0)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  full_name text,
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  order_number text not null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  subtotal_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  currency char(3) not null default 'AZN',
  shipping_address jsonb,
  billing_address jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_store_order_number_unique unique (store_id, order_number),
  constraint orders_amounts_non_negative check (
    subtotal_amount >= 0
    and discount_amount >= 0
    and shipping_amount >= 0
    and tax_amount >= 0
    and total_amount >= 0
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_sku text,
  quantity integer not null,
  unit_price_amount numeric(12, 2) not null,
  total_amount numeric(12, 2) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_amounts_non_negative check (
    unit_price_amount >= 0 and total_amount >= 0
  )
);

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency char(3) not null default 'AZN',
  status public.deposit_status not null default 'pending',
  method text,
  reference text,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deposits_amount_positive check (amount > 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  provider text not null,
  provider_payment_id text,
  amount numeric(12, 2) not null,
  currency char(3) not null default 'AZN',
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_positive check (amount > 0)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint favorites_user_product_unique unique (user_id, product_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null,
  comment text,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_product_user_unique unique (product_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  prompt text not null,
  result jsonb,
  model text,
  status public.ai_generation_status not null default 'pending',
  tokens_used integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_generations_tokens_non_negative check (
    tokens_used is null or tokens_used >= 0
  )
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_stores_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create trigger set_subscription_plans_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_product_images_updated_at
before update on public.product_images
for each row execute function public.set_updated_at();

create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger set_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

create trigger set_deposits_updated_at
before update on public.deposits
for each row execute function public.set_updated_at();

create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger set_favorites_updated_at
before update on public.favorites
for each row execute function public.set_updated_at();

create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create trigger set_ai_generations_updated_at
before update on public.ai_generations
for each row execute function public.set_updated_at();

create unique index profiles_email_unique_idx
on public.profiles (lower(email))
where email is not null;

create index stores_owner_id_idx on public.stores (owner_id);
create index stores_status_idx on public.stores (status);

create index subscriptions_store_id_idx on public.subscriptions (store_id);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index subscriptions_status_idx on public.subscriptions (status);
create unique index subscriptions_one_current_per_store_idx
on public.subscriptions (store_id)
where status in ('trialing', 'active', 'past_due');

create index categories_parent_id_idx on public.categories (parent_id);
create index categories_is_active_idx on public.categories (is_active);

create index products_store_id_idx on public.products (store_id);
create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create unique index products_store_sku_unique_idx
on public.products (store_id, sku)
where sku is not null;

create index product_images_product_id_idx on public.product_images (product_id);
create unique index product_images_one_primary_per_product_idx
on public.product_images (product_id)
where is_primary;

create index customers_store_id_idx on public.customers (store_id);
create index customers_user_id_idx on public.customers (user_id);
create unique index customers_store_email_unique_idx
on public.customers (store_id, lower(email))
where email is not null;

create index orders_store_id_idx on public.orders (store_id);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_user_id_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create index deposits_store_id_idx on public.deposits (store_id);
create index deposits_owner_id_idx on public.deposits (owner_id);
create index deposits_status_idx on public.deposits (status);

create index payments_order_id_idx on public.payments (order_id);
create index payments_store_id_idx on public.payments (store_id);
create index payments_customer_id_idx on public.payments (customer_id);
create index payments_status_idx on public.payments (status);

create index favorites_user_id_idx on public.favorites (user_id);
create index favorites_product_id_idx on public.favorites (product_id);

create index reviews_product_id_idx on public.reviews (product_id);
create index reviews_user_id_idx on public.reviews (user_id);
create index reviews_order_item_id_idx on public.reviews (order_item_id);
create index reviews_status_idx on public.reviews (status);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_read_at_idx on public.notifications (read_at);

create index ai_generations_user_id_idx on public.ai_generations (user_id);
create index ai_generations_store_id_idx on public.ai_generations (store_id);
create index ai_generations_status_idx on public.ai_generations (status);
