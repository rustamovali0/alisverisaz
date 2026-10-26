update public.stores
set description = null, updated_at = now()
where lower(regexp_replace(trim(description), '\s+', ' ', 'g')) in (
  'satıcı mağazası',
  'satici magazasi'
);
