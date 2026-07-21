begin;

update public.categories
set is_active = false, updated_at = now()
where slug in (
  'xidmetler',
  'xidmetler-ve-biznes',
  'is-elanlari',
  'dasinmaz-emlak',
  'neqliyyat',
  'ev-ve-bag-ucun',
  'ehtiyat-hisseleri-ve-aksesuarlar',
  'sexsi-esyalar',
  'hobbi-ve-asude',
  'meiset-texnikasi',
  'telefonlar',
  'usaq-alemi',
  'usaqlar-ucun',
  'heyvanlar',
  'mektebliler-ucun',
  'magazalar'
);

with product_categories(name, slug, parent_slug, description, sort_order) as (
  values
    ('Elektronika', 'elektronika', null, 'Telefon, kompüter, TV, audio və elektron aksesuarlar', 10),
    ('Ev və Bağ', 'ev-ve-bag', null, 'Ev, mətbəx, dekor, bağ və məişət məhsulları', 20),
    ('Moda', 'moda', null, 'Geyim, ayaqqabı, çanta, saat və aksesuarlar', 30),
    ('Gözəllik və Baxım', 'gozellik-ve-baxim', null, 'Kosmetika, dəri, saç və şəxsi baxım məhsulları', 40),
    ('Ana və Uşaq', 'ana-ve-usaq', null, 'Ana, körpə və uşaqlar üçün yeni məhsullar', 50),
    ('İdman və Outdoor', 'idman-ve-outdoor', null, 'İdman, fitness, turizm və outdoor məhsulları', 60),
    ('Avto Məhsulları', 'avto-mehsullari', null, 'Avtomobil üçün yeni aksesuar və qulluq məhsulları', 70),
    ('Tikinti və Alətlər', 'tikinti-ve-aletler', null, 'Təmir, tikinti, elektrik və əl alətləri', 80),
    ('Ofis və Dəftərxana', 'ofis-ve-defterxana', null, 'Ofis avadanlığı, dəftərxana və məktəb ləvazimatları', 90),
    ('Kitablar', 'kitablar', null, 'Kitablar və tədris materialları', 100),
    ('Ev Heyvanları', 'ev-heyvanlari', null, 'Ev heyvanları üçün yem, aksesuar və baxım məhsulları', 110),
    ('Qida və İçkilər', 'qida-ve-ickiler', null, 'Qida məhsulları, içkilər və şirniyyatlar', 120),

    ('Smartfonlar', 'smartfonlar', 'elektronika', 'Elektronika alt kateqoriyası', 1010),
    ('Noutbuklar', 'noutbuklar', 'elektronika', 'Elektronika alt kateqoriyası', 1020),
    ('Planşetlər', 'plansetler', 'elektronika', 'Elektronika alt kateqoriyası', 1030),
    ('Kompüterlər', 'komputerler', 'elektronika', 'Elektronika alt kateqoriyası', 1040),
    ('Monitorlar', 'monitorlar', 'elektronika', 'Elektronika alt kateqoriyası', 1050),
    ('TV və Audio', 'tv-ve-audio', 'elektronika', 'Elektronika alt kateqoriyası', 1060),
    ('Oyun Konsolları', 'oyun-konsollari', 'elektronika', 'Elektronika alt kateqoriyası', 1070),
    ('Smart Saatlar', 'smart-saatlar', 'elektronika', 'Elektronika alt kateqoriyası', 1080),
    ('Aksesuarlar', 'elektronika-aksesuarlari', 'elektronika', 'Elektronika alt kateqoriyası', 1090),

    ('Mebel', 'mebel', 'ev-ve-bag', 'Ev və bağ alt kateqoriyası', 2010),
    ('Mətbəx', 'metbex', 'ev-ve-bag', 'Ev və bağ alt kateqoriyası', 2020),
    ('Hamam', 'hamam', 'ev-ve-bag', 'Ev və bağ alt kateqoriyası', 2030),
    ('Yataq Otağı', 'yataq-otagi', 'ev-ve-bag', 'Ev və bağ alt kateqoriyası', 2040),
    ('Ev Dekoru', 'ev-dekoru', 'ev-ve-bag', 'Ev və bağ alt kateqoriyası', 2050),
    ('İşıqlandırma', 'isiqlandirma', 'ev-ve-bag', 'Ev və bağ alt kateqoriyası', 2060),
    ('Bağ Məhsulları', 'bag-mehsullari', 'ev-ve-bag', 'Ev və bağ alt kateqoriyası', 2070),
    ('Məişət Texnikası', 'meiset-texnikasi-yeni', 'ev-ve-bag', 'Ev və bağ alt kateqoriyası', 2080),

    ('Qadın Geyimləri', 'qadin-geyimleri', 'moda', 'Moda alt kateqoriyası', 3010),
    ('Kişi Geyimləri', 'kisi-geyimleri', 'moda', 'Moda alt kateqoriyası', 3020),
    ('Uşaq Geyimləri', 'usaq-geyimleri', 'moda', 'Moda alt kateqoriyası', 3030),
    ('Ayaqqabı', 'ayaqqabi', 'moda', 'Moda alt kateqoriyası', 3040),
    ('Çanta', 'canta', 'moda', 'Moda alt kateqoriyası', 3050),
    ('Saat', 'saat', 'moda', 'Moda alt kateqoriyası', 3060),
    ('Zinət Əşyaları', 'zinet-esyalari', 'moda', 'Moda alt kateqoriyası', 3070),
    ('Aksesuarlar', 'moda-aksesuarlari', 'moda', 'Moda alt kateqoriyası', 3080),

    ('Makiyaj', 'makiyaj', 'gozellik-ve-baxim', 'Gözəllik və baxım alt kateqoriyası', 4010),
    ('Dəri Baxımı', 'deri-baximi', 'gozellik-ve-baxim', 'Gözəllik və baxım alt kateqoriyası', 4020),
    ('Saç Baxımı', 'sac-baximi', 'gozellik-ve-baxim', 'Gözəllik və baxım alt kateqoriyası', 4030),
    ('Ətirlər', 'etirler', 'gozellik-ve-baxim', 'Gözəllik və baxım alt kateqoriyası', 4040),
    ('Şəxsi Baxım', 'sexsi-baxim', 'gozellik-ve-baxim', 'Gözəllik və baxım alt kateqoriyası', 4050),
    ('Sağlamlıq Məhsulları', 'saglamliq-mehsullari', 'gozellik-ve-baxim', 'Gözəllik və baxım alt kateqoriyası', 4060),

    ('Körpə Geyimləri', 'korpe-geyimleri', 'ana-ve-usaq', 'Ana və uşaq alt kateqoriyası', 5010),
    ('Uşaq Arabaları', 'usaq-arabalari', 'ana-ve-usaq', 'Ana və uşaq alt kateqoriyası', 5020),
    ('Oyuncaqlar', 'oyuncaqlar', 'ana-ve-usaq', 'Ana və uşaq alt kateqoriyası', 5030),
    ('Qidalanma', 'usaq-qidalanma', 'ana-ve-usaq', 'Ana və uşaq alt kateqoriyası', 5040),
    ('Uşaq Mebeli', 'usaq-mebeli', 'ana-ve-usaq', 'Ana və uşaq alt kateqoriyası', 5050),
    ('Məktəb Ləvazimatları', 'mekteb-levazimatlari', 'ana-ve-usaq', 'Ana və uşaq alt kateqoriyası', 5060),

    ('Fitness', 'fitness', 'idman-ve-outdoor', 'İdman və outdoor alt kateqoriyası', 6010),
    ('İdman Geyimləri', 'idman-geyimleri', 'idman-ve-outdoor', 'İdman və outdoor alt kateqoriyası', 6020),
    ('İdman Ayaqqabıları', 'idman-ayaqqabilari', 'idman-ve-outdoor', 'İdman və outdoor alt kateqoriyası', 6030),
    ('Velosipedlər', 'velosipedler', 'idman-ve-outdoor', 'İdman və outdoor alt kateqoriyası', 6040),
    ('Kamp və Turizm', 'kamp-ve-turizm', 'idman-ve-outdoor', 'İdman və outdoor alt kateqoriyası', 6050),
    ('Outdoor Aksesuarları', 'outdoor-aksesuarlari', 'idman-ve-outdoor', 'İdman və outdoor alt kateqoriyası', 6060),

    ('Avto Aksesuarlar', 'avto-aksesuarlar', 'avto-mehsullari', 'Avto məhsulları alt kateqoriyası', 7010),
    ('Avto Elektronika', 'avto-elektronika', 'avto-mehsullari', 'Avto məhsulları alt kateqoriyası', 7020),
    ('Yağlar və Mayelər', 'yaglar-ve-mayeler', 'avto-mehsullari', 'Avto məhsulları alt kateqoriyası', 7030),
    ('Təkər və Disk Aksesuarları', 'teker-ve-disk-aksesuarlari', 'avto-mehsullari', 'Avto məhsulları alt kateqoriyası', 7040),
    ('Avto Qulluq', 'avto-qulluq', 'avto-mehsullari', 'Avto məhsulları alt kateqoriyası', 7050),

    ('Elektrik Alətləri', 'elektrik-aletleri', 'tikinti-ve-aletler', 'Tikinti və alətlər alt kateqoriyası', 8010),
    ('Əl Alətləri', 'el-aletleri', 'tikinti-ve-aletler', 'Tikinti və alətlər alt kateqoriyası', 8020),
    ('Təmir Materialları', 'temir-materiallari', 'tikinti-ve-aletler', 'Tikinti və alətlər alt kateqoriyası', 8030),
    ('Santexnika', 'santexnika', 'tikinti-ve-aletler', 'Tikinti və alətlər alt kateqoriyası', 8040),
    ('Boya və Aksesuarlar', 'boya-ve-aksesuarlar', 'tikinti-ve-aletler', 'Tikinti və alətlər alt kateqoriyası', 8050),
    ('Bağ Alətləri', 'bag-aletleri', 'tikinti-ve-aletler', 'Tikinti və alətlər alt kateqoriyası', 8060),

    ('Dəftərxana', 'defterxana', 'ofis-ve-defterxana', 'Ofis və dəftərxana alt kateqoriyası', 9010),
    ('Ofis Texnikası', 'ofis-texnikasi', 'ofis-ve-defterxana', 'Ofis və dəftərxana alt kateqoriyası', 9020),
    ('Printer və Kartriclər', 'printer-ve-kartricler', 'ofis-ve-defterxana', 'Ofis və dəftərxana alt kateqoriyası', 9030),
    ('Məktəb Çantaları', 'mekteb-cantalari', 'ofis-ve-defterxana', 'Ofis və dəftərxana alt kateqoriyası', 9040),
    ('Kağız Məhsulları', 'kagiz-mehsullari', 'ofis-ve-defterxana', 'Ofis və dəftərxana alt kateqoriyası', 9050),

    ('Bədii Ədəbiyyat', 'bedii-edebiyyat', 'kitablar', 'Kitablar alt kateqoriyası', 10010),
    ('Uşaq Kitabları', 'usaq-kitablari', 'kitablar', 'Kitablar alt kateqoriyası', 10020),
    ('Təhsil və Test', 'tehsil-ve-test', 'kitablar', 'Kitablar alt kateqoriyası', 10030),
    ('Biznes Kitabları', 'biznes-kitablari', 'kitablar', 'Kitablar alt kateqoriyası', 10040),
    ('Xarici Dildə Kitablar', 'xarici-dilde-kitablar', 'kitablar', 'Kitablar alt kateqoriyası', 10050),

    ('Yemlər', 'yemler', 'ev-heyvanlari', 'Ev heyvanları alt kateqoriyası', 11010),
    ('Aksesuarlar', 'ev-heyvanlari-aksesuarlari', 'ev-heyvanlari', 'Ev heyvanları alt kateqoriyası', 11020),
    ('Gigiyena', 'gigiyena', 'ev-heyvanlari', 'Ev heyvanları alt kateqoriyası', 11030),
    ('Oyuncaqlar', 'heyvan-oyuncaqlari', 'ev-heyvanlari', 'Ev heyvanları alt kateqoriyası', 11040),
    ('Baxım Məhsulları', 'heyvan-baxim-mehsullari', 'ev-heyvanlari', 'Ev heyvanları alt kateqoriyası', 11050),

    ('Ərzaq', 'erzaq', 'qida-ve-ickiler', 'Qida və içkilər alt kateqoriyası', 12010),
    ('İçkilər', 'ickiler', 'qida-ve-ickiler', 'Qida və içkilər alt kateqoriyası', 12020),
    ('Şirniyyat', 'sirniyyat', 'qida-ve-ickiler', 'Qida və içkilər alt kateqoriyası', 12030),
    ('Qəhvə və Çay', 'qehve-ve-cay', 'qida-ve-ickiler', 'Qida və içkilər alt kateqoriyası', 12040),
    ('Sağlam Qida', 'saglam-qida', 'qida-ve-ickiler', 'Qida və içkilər alt kateqoriyası', 12050)
)
insert into public.categories (name, slug, description, sort_order, is_active)
select name, slug, description, sort_order, true
from product_categories
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

with product_categories(slug, parent_slug) as (
  select slug, parent_slug
  from (
    values
      ('smartfonlar', 'elektronika'), ('noutbuklar', 'elektronika'), ('plansetler', 'elektronika'), ('komputerler', 'elektronika'), ('monitorlar', 'elektronika'), ('tv-ve-audio', 'elektronika'), ('oyun-konsollari', 'elektronika'), ('smart-saatlar', 'elektronika'), ('elektronika-aksesuarlari', 'elektronika'),
      ('mebel', 'ev-ve-bag'), ('metbex', 'ev-ve-bag'), ('hamam', 'ev-ve-bag'), ('yataq-otagi', 'ev-ve-bag'), ('ev-dekoru', 'ev-ve-bag'), ('isiqlandirma', 'ev-ve-bag'), ('bag-mehsullari', 'ev-ve-bag'), ('meiset-texnikasi-yeni', 'ev-ve-bag'),
      ('qadin-geyimleri', 'moda'), ('kisi-geyimleri', 'moda'), ('usaq-geyimleri', 'moda'), ('ayaqqabi', 'moda'), ('canta', 'moda'), ('saat', 'moda'), ('zinet-esyalari', 'moda'), ('moda-aksesuarlari', 'moda'),
      ('makiyaj', 'gozellik-ve-baxim'), ('deri-baximi', 'gozellik-ve-baxim'), ('sac-baximi', 'gozellik-ve-baxim'), ('etirler', 'gozellik-ve-baxim'), ('sexsi-baxim', 'gozellik-ve-baxim'), ('saglamliq-mehsullari', 'gozellik-ve-baxim'),
      ('korpe-geyimleri', 'ana-ve-usaq'), ('usaq-arabalari', 'ana-ve-usaq'), ('oyuncaqlar', 'ana-ve-usaq'), ('usaq-qidalanma', 'ana-ve-usaq'), ('usaq-mebeli', 'ana-ve-usaq'), ('mekteb-levazimatlari', 'ana-ve-usaq'),
      ('fitness', 'idman-ve-outdoor'), ('idman-geyimleri', 'idman-ve-outdoor'), ('idman-ayaqqabilari', 'idman-ve-outdoor'), ('velosipedler', 'idman-ve-outdoor'), ('kamp-ve-turizm', 'idman-ve-outdoor'), ('outdoor-aksesuarlari', 'idman-ve-outdoor'),
      ('avto-aksesuarlar', 'avto-mehsullari'), ('avto-elektronika', 'avto-mehsullari'), ('yaglar-ve-mayeler', 'avto-mehsullari'), ('teker-ve-disk-aksesuarlari', 'avto-mehsullari'), ('avto-qulluq', 'avto-mehsullari'),
      ('elektrik-aletleri', 'tikinti-ve-aletler'), ('el-aletleri', 'tikinti-ve-aletler'), ('temir-materiallari', 'tikinti-ve-aletler'), ('santexnika', 'tikinti-ve-aletler'), ('boya-ve-aksesuarlar', 'tikinti-ve-aletler'), ('bag-aletleri', 'tikinti-ve-aletler'),
      ('defterxana', 'ofis-ve-defterxana'), ('ofis-texnikasi', 'ofis-ve-defterxana'), ('printer-ve-kartricler', 'ofis-ve-defterxana'), ('mekteb-cantalari', 'ofis-ve-defterxana'), ('kagiz-mehsullari', 'ofis-ve-defterxana'),
      ('bedii-edebiyyat', 'kitablar'), ('usaq-kitablari', 'kitablar'), ('tehsil-ve-test', 'kitablar'), ('biznes-kitablari', 'kitablar'), ('xarici-dilde-kitablar', 'kitablar'),
      ('yemler', 'ev-heyvanlari'), ('ev-heyvanlari-aksesuarlari', 'ev-heyvanlari'), ('gigiyena', 'ev-heyvanlari'), ('heyvan-oyuncaqlari', 'ev-heyvanlari'), ('heyvan-baxim-mehsullari', 'ev-heyvanlari'),
      ('erzaq', 'qida-ve-ickiler'), ('ickiler', 'qida-ve-ickiler'), ('sirniyyat', 'qida-ve-ickiler'), ('qehve-ve-cay', 'qida-ve-ickiler'), ('saglam-qida', 'qida-ve-ickiler')
  ) as rows(slug, parent_slug)
)
update public.categories child
set parent_id = parent.id, updated_at = now()
from product_categories
join public.categories parent on parent.slug = product_categories.parent_slug
where child.slug = product_categories.slug;

update public.categories root
set parent_id = null, updated_at = now()
where root.slug in (
  'elektronika',
  'ev-ve-bag',
  'moda',
  'gozellik-ve-baxim',
  'ana-ve-usaq',
  'idman-ve-outdoor',
  'avto-mehsullari',
  'tikinti-ve-aletler',
  'ofis-ve-defterxana',
  'kitablar',
  'ev-heyvanlari',
  'qida-ve-ickiler'
);

commit;
