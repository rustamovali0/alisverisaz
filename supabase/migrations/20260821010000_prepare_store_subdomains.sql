begin;

create or replace function public.slugify_store_name(input text)
returns text
language plpgsql
immutable
as $$
declare
  value text;
begin
  value := translate(
    coalesce(input, 'store'),
    'ƏÖÜĞŞÇİIəöüğşıç',
    'EOUGSCIIeougsic'
  );
  value := lower(value);
  value := regexp_replace(value, '[^a-z0-9]+', '-', 'g');
  value := trim(both '-' from value);

  return coalesce(nullif(value, ''), 'store');
end;
$$;

create or replace function public.set_store_slug()
returns trigger
language plpgsql
as $$
declare
  reserved_slugs constant text[] := array[
    'www',
    'api',
    'admin',
    'radmin',
    'auth',
    'login',
    'app',
    'dashboard',
    'seller',
    'store',
    'mail',
    'smtp',
    'cdn',
    'images',
    'static',
    'assets',
    'support',
    'help',
    'status',
    'checkout',
    'cart',
    'account',
    'payments',
    'products',
    'register',
    'privacy',
    'terms',
    'about',
    'contact',
    'faq',
    'guide',
    'rules'
  ];
  base_slug text;
  next_slug text;
  counter integer := 1;
begin
  if new.slug is not null and length(trim(new.slug)) > 0 then
    base_slug := public.slugify_store_name(new.slug);
  else
    base_slug := public.slugify_store_name(new.name);
  end if;

  if base_slug = any(reserved_slugs) then
    base_slug := base_slug || '-store';
  end if;

  next_slug := base_slug;

  while exists (
    select 1
    from public.stores
    where slug = next_slug
      and id is distinct from new.id
  ) loop
    counter := counter + 1;
    next_slug := base_slug || '-' || counter;
  end loop;

  new.slug := next_slug;
  return new;
end;
$$;

drop trigger if exists stores_set_slug on public.stores;

create trigger stores_set_slug
before insert or update of name, slug on public.stores
for each row
execute function public.set_store_slug();

do $$
begin
  alter table public.stores
    add constraint stores_slug_not_reserved
    check (
      slug not in (
        'www',
        'api',
        'admin',
        'radmin',
        'auth',
        'login',
        'app',
        'dashboard',
        'seller',
        'store',
        'mail',
        'smtp',
        'cdn',
        'images',
        'static',
        'assets',
        'support',
        'help',
        'status',
        'checkout',
        'cart',
        'account',
        'payments',
        'products',
        'register',
        'privacy',
        'terms',
        'about',
        'contact',
        'faq',
        'guide',
        'rules'
      )
    ) not valid;
exception
  when duplicate_object then null;
end $$;

commit;
