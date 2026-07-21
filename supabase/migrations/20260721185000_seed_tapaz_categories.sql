begin;

with tap_categories(name, slug, parent_slug, description, sort_order) as (
  values
    ('Elektronika', 'elektronika', null, 'Tap.az kateqoriyası: Elektronika', 1),
    ('Ev və bağ üçün', 'ev-ve-bag-ucun', null, 'Tap.az kateqoriyası: Ev və bağ üçün', 2),
    ('Nəqliyyat', 'neqliyyat', null, 'Tap.az kateqoriyası: Nəqliyyat', 3),
    ('Daşınmaz əmlak', 'dasinmaz-emlak', null, 'Tap.az kateqoriyası: Daşınmaz əmlak', 4),
    ('Xidmətlər və biznes', 'xidmetler', null, 'Tap.az kateqoriyası: Xidmətlər və biznes', 5),
    ('Şəxsi əşyalar', 'sexsi-esyalar', null, 'Tap.az kateqoriyası: Şəxsi əşyalar', 6),
    ('Hobbi və asudə', 'hobbi-ve-asude', null, 'Tap.az kateqoriyası: Hobbi və asudə', 7),
    ('Uşaq aləmi', 'usaqlar-ucun', null, 'Tap.az kateqoriyası: Uşaq aləmi', 8),
    ('Heyvanlar', 'heyvanlar', null, 'Tap.az kateqoriyası: Heyvanlar', 9),
    ('İş elanları', 'is-elanlari', null, 'Tap.az kateqoriyası: İş elanları', 10),
    ('Mağazalar', 'magazalar', null, 'Tap.az kataloq linki: Mağazalar', 11),
    ('Telefonlar', 'telefonlar', 'elektronika', 'Tap.az alt kateqoriyası: Telefonlar', 12),
    ('Məişət texnikası', 'meiset-texnikasi', 'ev-ve-bag-ucun', 'Tap.az alt kateqoriyası: Məişət texnikası', 13),
    ('Ehtiyat hissələri və aksesuarlar', 'ehtiyat-hisseleri-ve-aksesuarlar', 'neqliyyat', 'Tap.az alt kateqoriyası: Ehtiyat hissələri və aksesuarlar', 14),
    ('Məktəblilər üçün', 'mektebliler-ucun', 'usaqlar-ucun', 'Tap.az alt kateqoriyası: Məktəblilər üçün', 15)
)
insert into public.categories (name, slug, description, sort_order, is_active)
select name, slug, description, sort_order, true
from tap_categories
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

with tap_categories(slug, parent_slug) as (
  values
    ('telefonlar', 'elektronika'),
    ('meiset-texnikasi', 'ev-ve-bag-ucun'),
    ('ehtiyat-hisseleri-ve-aksesuarlar', 'neqliyyat'),
    ('mektebliler-ucun', 'usaqlar-ucun')
)
update public.categories child
set
  parent_id = parent.id,
  updated_at = now()
from tap_categories
join public.categories parent on parent.slug = tap_categories.parent_slug
where child.slug = tap_categories.slug;

commit;
