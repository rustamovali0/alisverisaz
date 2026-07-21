begin;

with tap_categories(name, slug, parent_slug, description, sort_order) as (
  values
    ('Elektronika', 'elektronika', null, 'Elektronika məhsulları və aksesuarları', 10),
    ('Ev və bağ üçün', 'ev-ve-bag-ucun', null, 'Ev, bağ və dekor məhsulları', 20),
    ('Nəqliyyat', 'neqliyyat', null, 'Avtomobil və nəqliyyat elanları', 30),
    ('Ehtiyat hissələri və aksesuarlar', 'ehtiyat-hisseleri-ve-aksesuarlar', null, 'Nəqliyyat üçün ehtiyat hissələri və aksesuarlar', 40),
    ('Daşınmaz əmlak', 'dasinmaz-emlak', null, 'Ev, obyekt və torpaq elanları', 50),
    ('Xidmətlər və biznes', 'xidmetler-ve-biznes', null, 'Xidmət və biznes təklifləri', 60),
    ('Şəxsi əşyalar', 'sexsi-esyalar', null, 'Geyim, aksesuar və şəxsi istifadə məhsulları', 70),
    ('Hobbi və asudə', 'hobbi-ve-asude', null, 'Hobbi, idman və asudə məhsulları', 80),
    ('Məişət texnikası', 'meiset-texnikasi', null, 'Ev üçün məişət texnikası', 90),
    ('Telefonlar', 'telefonlar', null, 'Telefon və mobil aksesuarlar', 100),
    ('Uşaq aləmi', 'usaq-alemi', null, 'Uşaqlar üçün məhsullar', 110),
    ('Heyvanlar', 'heyvanlar', null, 'Heyvanlar və heyvan məhsulları', 120),
    ('İş elanları', 'is-elanlari', null, 'Vakansiya və iş elanları', 130),
    ('Məktəblilər üçün', 'mektebliler-ucun', null, 'Məktəbli məhsulları və ləvazimatları', 140),
    ('Mağazalar', 'magazalar', null, 'Platformadakı mağazalar', 150),
    ('Audio və video', 'audio-ve-video', 'elektronika', 'Elektronika alt kateqoriyası', 1010),
    ('Kompüter aksesuarları', 'komputer-aksesuarlari', 'elektronika', 'Elektronika alt kateqoriyası', 1020),
    ('Oyunlar, pultlar və proqramlar', 'oyunlar-pultlar-ve-proqramlar', 'elektronika', 'Elektronika alt kateqoriyası', 1030),
    ('Masaüstü kompüterlər', 'masaustu-komputerler', 'elektronika', 'Elektronika alt kateqoriyası', 1040),
    ('Komponentlər və monitorlar', 'komponentler-ve-monitorlar', 'elektronika', 'Elektronika alt kateqoriyası', 1050),
    ('Planşet və elektron kitablar', 'planset-ve-elektron-kitablar', 'elektronika', 'Elektronika alt kateqoriyası', 1060),
    ('Noutbuklar və netbuklar', 'noutbuklar-ve-netbuklar', 'elektronika', 'Elektronika alt kateqoriyası', 1070),
    ('Ofis avadanlığı və istehlak materialları', 'ofis-avadanligi-ve-istehlak-materiallari', 'elektronika', 'Elektronika alt kateqoriyası', 1080),
    ('Telefonlar', 'elektronika-telefonlar', 'elektronika', 'Elektronika alt kateqoriyası', 1090),
    ('Fototexnika', 'fototexnika', 'elektronika', 'Elektronika alt kateqoriyası', 1100),
    ('Nömrələr və SIM-kartlar', 'nomreler-ve-sim-kartlar', 'elektronika', 'Elektronika alt kateqoriyası', 1110),
    ('Smart saat və qolbaqlar', 'smart-saat-ve-qolbaqlar', 'elektronika', 'Elektronika alt kateqoriyası', 1120),
    ('Kabellər və adapterlər', 'kabeller-ve-adapterler', 'komputer-aksesuarlari', 'Kompüter aksesuarları alt kateqoriyası', 2010),
    ('Klaviaturalar və kompüter siçanları', 'klaviaturalar-ve-komputer-sicanlari', 'komputer-aksesuarlari', 'Kompüter aksesuarları alt kateqoriyası', 2020),
    ('UPS', 'ups', 'komputer-aksesuarlari', 'Kompüter aksesuarları alt kateqoriyası', 2030),
    ('USB flaş və yaddaş kartları', 'usb-flas-ve-yaddas-kartlari', 'komputer-aksesuarlari', 'Kompüter aksesuarları alt kateqoriyası', 2040),
    ('Web kameralar', 'web-kameralar', 'komputer-aksesuarlari', 'Kompüter aksesuarları alt kateqoriyası', 2050),
    ('Digər', 'komputer-aksesuarlari-diger', 'komputer-aksesuarlari', 'Kompüter aksesuarları alt kateqoriyası', 2060)
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
    ('audio-ve-video', 'elektronika'),
    ('komputer-aksesuarlari', 'elektronika'),
    ('oyunlar-pultlar-ve-proqramlar', 'elektronika'),
    ('masaustu-komputerler', 'elektronika'),
    ('komponentler-ve-monitorlar', 'elektronika'),
    ('planset-ve-elektron-kitablar', 'elektronika'),
    ('noutbuklar-ve-netbuklar', 'elektronika'),
    ('ofis-avadanligi-ve-istehlak-materiallari', 'elektronika'),
    ('elektronika-telefonlar', 'elektronika'),
    ('fototexnika', 'elektronika'),
    ('nomreler-ve-sim-kartlar', 'elektronika'),
    ('smart-saat-ve-qolbaqlar', 'elektronika'),
    ('kabeller-ve-adapterler', 'komputer-aksesuarlari'),
    ('klaviaturalar-ve-komputer-sicanlari', 'komputer-aksesuarlari'),
    ('ups', 'komputer-aksesuarlari'),
    ('usb-flas-ve-yaddas-kartlari', 'komputer-aksesuarlari'),
    ('web-kameralar', 'komputer-aksesuarlari'),
    ('komputer-aksesuarlari-diger', 'komputer-aksesuarlari')
)
update public.categories child
set
  parent_id = parent.id,
  updated_at = now()
from tap_categories
join public.categories parent on parent.slug = tap_categories.parent_slug
where child.slug = tap_categories.slug;

update public.categories root
set parent_id = null, updated_at = now()
where root.slug in (
  'elektronika',
  'ev-ve-bag-ucun',
  'neqliyyat',
  'ehtiyat-hisseleri-ve-aksesuarlar',
  'dasinmaz-emlak',
  'xidmetler-ve-biznes',
  'sexsi-esyalar',
  'hobbi-ve-asude',
  'meiset-texnikasi',
  'telefonlar',
  'usaq-alemi',
  'heyvanlar',
  'is-elanlari',
  'mektebliler-ucun',
  'magazalar'
);

commit;
