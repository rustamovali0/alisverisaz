begin;

create or replace function public.slugify_store_name(input text)
returns text
language plpgsql
immutable
as $$
declare
  value text;
begin
  value := lower(coalesce(input, 'store'));
  value := translate(
    value,
    'əöüğşıçƏÖÜĞŞIÇ',
    'eougsicEOUGSIC'
  );
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
  base_slug text;
  next_slug text;
  counter integer := 1;
begin
  if new.slug is not null and length(trim(new.slug)) > 0 then
    new.slug := public.slugify_store_name(new.slug);
    return new;
  end if;

  base_slug := public.slugify_store_name(new.name);
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

commit;
