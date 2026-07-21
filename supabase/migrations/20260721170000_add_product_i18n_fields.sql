alter table public.products
add column name_translations jsonb not null default '{}'::jsonb,
add column description_translations jsonb not null default '{}'::jsonb,
add column seo_title_translations jsonb not null default '{}'::jsonb,
add column seo_description_translations jsonb not null default '{}'::jsonb;

create index products_name_translations_gin_idx
on public.products using gin (name_translations);
