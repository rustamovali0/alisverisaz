begin;

with category_seed(name, slug, parent_slug, description, sort_order) as (
  values
    ('Səyahət və Baqaj', 'seyahat-ve-baqaj', null, 'Çamadan, səyahət çantası və yol aksesuarları', 130),
    ('Hobbi və Yaradıcılıq', 'hobbi-ve-yaradiciliq', null, 'Yaradıcılıq, musiqi, kolleksiya və əyləncə məhsulları', 140),
    ('Hədiyyə və Bayram', 'hediyye-ve-bayram', null, 'Hədiyyələr, bayram bəzəkləri və tədbir məhsulları', 150),

    ('Printer və Skanerlər', 'printer-ve-skanerler', 'elektronika', 'Printer, skaner və çoxfunksiyalı cihazlar', 1100),
    ('Proyektorlar', 'proyektorlar', 'elektronika', 'Proyektor, ekran və təqdimat avadanlığı', 1110),
    ('Şəbəkə Avadanlığı', 'sebeke-avadanligi', 'elektronika', 'Router, modem, switch və şəbəkə aksesuarları', 1120),
    ('Məlumat Daşıyıcıları', 'melumat-dasiyicilari', 'elektronika', 'SSD, HDD, yaddaş kartı və USB daşıyıcıları', 1130),
    ('Qulaqlıqlar', 'qulaqliqlar', 'elektronika', 'Simli və simsiz qulaqlıqlar', 1140),
    ('Dinamik və Mikrofonlar', 'dinamik-ve-mikrofonlar', 'elektronika', 'Səsucaldan, mikrofon və studiya aksesuarları', 1150),
    ('Foto və Video', 'foto-ve-video', 'elektronika', 'Fotoaparat, kamera, obyektiv və aksesuarlar', 1160),
    ('Dronlar', 'dronlar', 'elektronika', 'Dron, ehtiyat hissələri və aksesuarlar', 1170),
    ('Təhlükəsizlik Sistemləri', 'tehlukesizlik-sistemleri', 'elektronika', 'Müşahidə kamerası, siqnalizasiya və sensorlar', 1180),

    ('Qonaq Otağı', 'qonaq-otagi', 'ev-ve-bag', 'Qonaq otağı mebeli və aksesuarları', 2090),
    ('Masa və Stullar', 'masa-ve-stullar', 'ev-ve-bag', 'Yemək və iş masaları, stullar', 2100),
    ('Ev Tekstili', 'ev-tekstili', 'ev-ve-bag', 'Yataq dəsti, pərdə, dəsmal və tekstil', 2110),
    ('Təmizlik Məhsulları', 'temizlik-mehsullari', 'ev-ve-bag', 'Ev təmizliyi üçün vasitə və avadanlıq', 2120),
    ('Saxlama və Təşkilat', 'saxlama-ve-teskilat', 'ev-ve-bag', 'Rəf, qutu, asılqan və təşkilat məhsulları', 2130),
    ('Qab-qacaq', 'qab-qacaq', 'ev-ve-bag', 'Süfrə, bişirmə və servis məhsulları', 2140),
    ('Kiçik Məişət Texnikası', 'kicik-meiset-texnikasi', 'ev-ve-bag', 'Mətbəx və ev üçün kiçik məişət cihazları', 2150),
    ('Böyük Məişət Texnikası', 'boyuk-meiset-texnikasi', 'ev-ve-bag', 'Soyuducu, paltaryuyan, soba və iri cihazlar', 2160),
    ('İsitmə və Soyutma', 'isitme-ve-soyutma', 'ev-ve-bag', 'Kondisioner, qızdırıcı və iqlim cihazları', 2170),

    ('Üst Geyimləri', 'ust-geyimleri', 'moda', 'Palto, gödəkçə və üst geyimləri', 3090),
    ('Şalvar və Cins', 'salvar-ve-cins', 'moda', 'Şalvar, cins və şortlar', 3100),
    ('Alt Geyim və Ev Geyimi', 'alt-geyim-ve-ev-geyimi', 'moda', 'Alt geyim, pijama və ev geyimi', 3110),
    ('Kostyum və Klassik Geyim', 'kostyum-ve-klassik-geyim', 'moda', 'Kostyum və klassik geyimlər', 3120),
    ('Eynəklər', 'eynekler', 'moda', 'Optik və gün eynəkləri', 3130),
    ('Kəmər və Pulqabı', 'kemer-ve-pulqabi', 'moda', 'Kəmər, pulqabı və kiçik aksesuarlar', 3140),
    ('Baş Geyimləri', 'bas-geyimleri', 'moda', 'Papaq, şərf və baş geyimləri', 3150),

    ('Dırnaq Baxımı', 'dirnaq-baximi', 'gozellik-ve-baxim', 'Manikür, pedikür və dırnaq məhsulları', 4070),
    ('Ağız və Diş Baxımı', 'agiz-ve-dis-baximi', 'gozellik-ve-baxim', 'Ağız gigiyenası və diş baxımı', 4080),
    ('Bədən Baxımı', 'beden-baximi', 'gozellik-ve-baxim', 'Bədən üçün qulluq və gigiyena məhsulları', 4090),
    ('Kişi Baxımı', 'kisi-baximi', 'gozellik-ve-baxim', 'Kişilər üçün baxım və təraş məhsulları', 4100),
    ('Baxım Cihazları', 'baxim-cihazlari', 'gozellik-ve-baxim', 'Fen, trimmer, epilyator və digər cihazlar', 4110),

    ('Bez və Gigiyena', 'bez-ve-gigiyena', 'ana-ve-usaq', 'Körpə bezləri və gigiyena məhsulları', 5070),
    ('Beşik və Yataq', 'besik-ve-yataq', 'ana-ve-usaq', 'Körpə beşiyi, yatağı və tekstili', 5080),
    ('Uşaq Təhlükəsizliyi', 'usaq-tehlukesizliyi', 'ana-ve-usaq', 'Avtomobil oturacağı və təhlükəsizlik məhsulları', 5090),
    ('Uşaq Elektronikası', 'usaq-elektronikasi', 'ana-ve-usaq', 'Baby monitor və uşaqlar üçün elektronika', 5100),
    ('Hamiləlik və Analıq', 'hamilelik-ve-analiq', 'ana-ve-usaq', 'Hamiləlik və analıq dövrü məhsulları', 5110),

    ('Futbol', 'futbol', 'idman-ve-outdoor', 'Futbol topları, forma və avadanlıq', 6070),
    ('Basketbol və Voleybol', 'basketbol-ve-voleybol', 'idman-ve-outdoor', 'Basketbol və voleybol məhsulları', 6080),
    ('Su İdmanı', 'su-idmani', 'idman-ve-outdoor', 'Üzgüçülük və su idmanı məhsulları', 6090),
    ('Balıqçılıq', 'baliqciliq', 'idman-ve-outdoor', 'Balıqçılıq alətləri və aksesuarları', 6100),
    ('Raket İdmanları', 'raket-idmanlari', 'idman-ve-outdoor', 'Tennis, badminton və stolüstü tennis', 6110),
    ('Qış İdmanı', 'qis-idmani', 'idman-ve-outdoor', 'Xizək, snoubord və qış aksesuarları', 6120),

    ('Ehtiyat Hissələri', 'avto-ehtiyat-hisseleri', 'avto-mehsullari', 'Avtomobil ehtiyat hissələri', 7060),
    ('Akkumulyatorlar', 'akkumulyatorlar', 'avto-mehsullari', 'Avtomobil və motosiklet akkumulyatorları', 7070),
    ('Avto İşıqlandırma', 'avto-isiqlandirma', 'avto-mehsullari', 'Fara, lampa və işıqlandırma aksesuarları', 7080),
    ('Salon Aksesuarları', 'salon-aksesuarlari', 'avto-mehsullari', 'Oturacaq üzlüyü, ayaqaltı və salon məhsulları', 7090),
    ('Motosiklet Aksesuarları', 'motosiklet-aksesuarlari', 'avto-mehsullari', 'Motosiklet üçün geyim, dəbilqə və aksesuarlar', 7100),

    ('Elektrik Materialları', 'elektrik-materiallari', 'tikinti-ve-aletler', 'Kabel, rozetka, açar və elektrik malları', 8070),
    ('Bərkidicilər', 'berkidiciler', 'tikinti-ve-aletler', 'Vint, mismar, dübel və digər bərkidicilər', 8080),
    ('Ölçü Cihazları', 'olcu-cihazlari', 'tikinti-ve-aletler', 'Lazer, metr, tərəzi və ölçü cihazları', 8090),
    ('Qapı və Pəncərə', 'qapi-ve-pencere', 'tikinti-ve-aletler', 'Qapı, pəncərə və furnitura', 8100),
    ('İzolyasiya', 'izolyasiya', 'tikinti-ve-aletler', 'İstilik, səs və su izolyasiya materialları', 8110),
    ('İş Geyimi və Təhlükəsizlik', 'is-geyimi-ve-tehlukesizlik', 'tikinti-ve-aletler', 'Qoruyucu geyim və iş təhlükəsizliyi məhsulları', 8120),

    ('Ofis Mebeli', 'ofis-mebeli', 'ofis-ve-defterxana', 'Ofis masası, kreslo və saxlama mebeli', 9060),
    ('Rəsm Ləvazimatları', 'resm-levazimatlari', 'ofis-ve-defterxana', 'Rəsm, dizayn və yaradıcılıq ləvazimatları', 9070),
    ('Arxiv və Təşkilat', 'arxiv-ve-teskilat', 'ofis-ve-defterxana', 'Qovluq, arxiv qutusu və ofis təşkilatı', 9080),

    ('Şəxsi İnkişaf', 'sexsi-inkisaf-kitablari', 'kitablar', 'Şəxsi inkişaf və psixologiya kitabları', 10060),
    ('Komiks və Manqa', 'komiks-ve-manqa', 'kitablar', 'Komikslər, manqa və qrafik romanlar', 10070),
    ('Dini Kitablar', 'dini-kitablar', 'kitablar', 'Dini və mənəvi ədəbiyyat', 10080),
    ('Elmi və Texniki Kitablar', 'elmi-ve-texniki-kitablar', 'kitablar', 'Elm, texnologiya və peşə ədəbiyyatı', 10090),

    ('İt Məhsulları', 'it-mehsullari', 'ev-heyvanlari', 'İtlər üçün yem, aksesuar və baxım', 11060),
    ('Pişik Məhsulları', 'pisik-mehsullari', 'ev-heyvanlari', 'Pişiklər üçün yem, aksesuar və baxım', 11070),
    ('Quş Məhsulları', 'qus-mehsullari', 'ev-heyvanlari', 'Quş yemi, qəfəs və aksesuarlar', 11080),
    ('Akvarium', 'akvarium', 'ev-heyvanlari', 'Akvarium, balıq yemi və avadanlıq', 11090),
    ('Daşıma və Yataq', 'heyvan-dasima-ve-yataq', 'ev-heyvanlari', 'Daşıma çantası, qəfəs və yataqlar', 11100),

    ('Süd Məhsulları', 'sud-mehsullari', 'qida-ve-ickiler', 'Süd, pendir, qatıq və digər süd məhsulları', 12060),
    ('Ət və Kolbasa', 'et-ve-kolbasa', 'qida-ve-ickiler', 'Ət, kolbasa və delikates məhsulları', 12070),
    ('Meyvə və Tərəvəz', 'meyve-ve-terevez', 'qida-ve-ickiler', 'Təzə meyvə, tərəvəz və göyərti', 12080),
    ('Hazır Qida', 'hazir-qida', 'qida-ve-ickiler', 'Hazır yeməklər və yarımfabrikatlar', 12090),
    ('Ədviyyat və Souslar', 'edviyyat-ve-souslar', 'qida-ve-ickiler', 'Ədviyyat, sous və dadlandırıcılar', 12100),
    ('Orqanik Məhsullar', 'orqanik-mehsullar', 'qida-ve-ickiler', 'Orqanik və təbii qida məhsulları', 12110),

    ('Çamadanlar', 'camadanlar', 'seyahat-ve-baqaj', 'Kabin, orta və böyük ölçülü çamadanlar', 13010),
    ('Səyahət Çantaları', 'seyahat-cantalari', 'seyahat-ve-baqaj', 'Yol, həftəsonu və idman çantaları', 13020),
    ('Bel və Çiyin Çantaları', 'bel-ve-ciyin-cantalari', 'seyahat-ve-baqaj', 'Bel, çiyin və gündəlik yol çantaları', 13030),
    ('Səyahət Aksesuarları', 'seyahat-aksesuarlari', 'seyahat-ve-baqaj', 'Çamadan üzlüyü, kilid, yastıq və təşkilatçı', 13040),
    ('Sənəd və Noutbuk Çantaları', 'sened-ve-noutbuk-cantalari', 'seyahat-ve-baqaj', 'Sənəd, biznes və noutbuk çantaları', 13050),

    ('Əl İşləri', 'el-isleri', 'hobbi-ve-yaradiciliq', 'Toxuculuq, tikmə və əl işi məhsulları', 14010),
    ('Musiqi Alətləri', 'musiqi-aletleri', 'hobbi-ve-yaradiciliq', 'Musiqi alətləri və aksesuarları', 14020),
    ('Kolleksiya', 'kolleksiya', 'hobbi-ve-yaradiciliq', 'Kolleksiya əşyaları və albomlar', 14030),
    ('Stolüstü Oyunlar', 'stolustu-oyunlar', 'hobbi-ve-yaradiciliq', 'Stolüstü oyun, pazl və kart oyunları', 14040),
    ('Modelçilik', 'modelcilik', 'hobbi-ve-yaradiciliq', 'Model, maket və hobbi dəstləri', 14050),

    ('Hədiyyə Dəstləri', 'hediyye-destleri', 'hediyye-ve-bayram', 'Hazır hədiyyə qutuları və dəstlər', 15010),
    ('Güllər və Buketlər', 'guller-ve-buketler', 'hediyye-ve-bayram', 'Canlı və dekorativ gül kompozisiyaları', 15020),
    ('Bayram Bəzəkləri', 'bayram-bezekleri', 'hediyye-ve-bayram', 'Yeni il, ad günü və bayram dekoru', 15030),
    ('Şarlar və Tədbir', 'sarlari-ve-tedbir', 'hediyye-ve-bayram', 'Şar, masa dekoru və tədbir məhsulları', 15040),
    ('Suvenirlər', 'suvenirler', 'hediyye-ve-bayram', 'Xatirə və suvenir məhsulları', 15050)
)
insert into public.categories (name, slug, description, sort_order, is_active)
select name, slug, description, sort_order, true
from category_seed
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

with category_parents(slug, parent_slug) as (
  select slug, parent_slug
  from (
    values
      ('printer-ve-skanerler','elektronika'),('proyektorlar','elektronika'),('sebeke-avadanligi','elektronika'),('melumat-dasiyicilari','elektronika'),('qulaqliqlar','elektronika'),('dinamik-ve-mikrofonlar','elektronika'),('foto-ve-video','elektronika'),('dronlar','elektronika'),('tehlukesizlik-sistemleri','elektronika'),
      ('qonaq-otagi','ev-ve-bag'),('masa-ve-stullar','ev-ve-bag'),('ev-tekstili','ev-ve-bag'),('temizlik-mehsullari','ev-ve-bag'),('saxlama-ve-teskilat','ev-ve-bag'),('qab-qacaq','ev-ve-bag'),('kicik-meiset-texnikasi','ev-ve-bag'),('boyuk-meiset-texnikasi','ev-ve-bag'),('isitme-ve-soyutma','ev-ve-bag'),
      ('ust-geyimleri','moda'),('salvar-ve-cins','moda'),('alt-geyim-ve-ev-geyimi','moda'),('kostyum-ve-klassik-geyim','moda'),('eynekler','moda'),('kemer-ve-pulqabi','moda'),('bas-geyimleri','moda'),
      ('dirnaq-baximi','gozellik-ve-baxim'),('agiz-ve-dis-baximi','gozellik-ve-baxim'),('beden-baximi','gozellik-ve-baxim'),('kisi-baximi','gozellik-ve-baxim'),('baxim-cihazlari','gozellik-ve-baxim'),
      ('bez-ve-gigiyena','ana-ve-usaq'),('besik-ve-yataq','ana-ve-usaq'),('usaq-tehlukesizliyi','ana-ve-usaq'),('usaq-elektronikasi','ana-ve-usaq'),('hamilelik-ve-analiq','ana-ve-usaq'),
      ('futbol','idman-ve-outdoor'),('basketbol-ve-voleybol','idman-ve-outdoor'),('su-idmani','idman-ve-outdoor'),('baliqciliq','idman-ve-outdoor'),('raket-idmanlari','idman-ve-outdoor'),('qis-idmani','idman-ve-outdoor'),
      ('avto-ehtiyat-hisseleri','avto-mehsullari'),('akkumulyatorlar','avto-mehsullari'),('avto-isiqlandirma','avto-mehsullari'),('salon-aksesuarlari','avto-mehsullari'),('motosiklet-aksesuarlari','avto-mehsullari'),
      ('elektrik-materiallari','tikinti-ve-aletler'),('berkidiciler','tikinti-ve-aletler'),('olcu-cihazlari','tikinti-ve-aletler'),('qapi-ve-pencere','tikinti-ve-aletler'),('izolyasiya','tikinti-ve-aletler'),('is-geyimi-ve-tehlukesizlik','tikinti-ve-aletler'),
      ('ofis-mebeli','ofis-ve-defterxana'),('resm-levazimatlari','ofis-ve-defterxana'),('arxiv-ve-teskilat','ofis-ve-defterxana'),
      ('sexsi-inkisaf-kitablari','kitablar'),('komiks-ve-manqa','kitablar'),('dini-kitablar','kitablar'),('elmi-ve-texniki-kitablar','kitablar'),
      ('it-mehsullari','ev-heyvanlari'),('pisik-mehsullari','ev-heyvanlari'),('qus-mehsullari','ev-heyvanlari'),('akvarium','ev-heyvanlari'),('heyvan-dasima-ve-yataq','ev-heyvanlari'),
      ('sud-mehsullari','qida-ve-ickiler'),('et-ve-kolbasa','qida-ve-ickiler'),('meyve-ve-terevez','qida-ve-ickiler'),('hazir-qida','qida-ve-ickiler'),('edviyyat-ve-souslar','qida-ve-ickiler'),('orqanik-mehsullar','qida-ve-ickiler'),
      ('camadanlar','seyahat-ve-baqaj'),('seyahat-cantalari','seyahat-ve-baqaj'),('bel-ve-ciyin-cantalari','seyahat-ve-baqaj'),('seyahat-aksesuarlari','seyahat-ve-baqaj'),('sened-ve-noutbuk-cantalari','seyahat-ve-baqaj'),
      ('el-isleri','hobbi-ve-yaradiciliq'),('musiqi-aletleri','hobbi-ve-yaradiciliq'),('kolleksiya','hobbi-ve-yaradiciliq'),('stolustu-oyunlar','hobbi-ve-yaradiciliq'),('modelcilik','hobbi-ve-yaradiciliq'),
      ('hediyye-destleri','hediyye-ve-bayram'),('guller-ve-buketler','hediyye-ve-bayram'),('bayram-bezekleri','hediyye-ve-bayram'),('sarlari-ve-tedbir','hediyye-ve-bayram'),('suvenirler','hediyye-ve-bayram')
  ) as rows(slug, parent_slug)
)
update public.categories child
set parent_id = parent.id, updated_at = now()
from category_parents
join public.categories parent on parent.slug = category_parents.parent_slug
where child.slug = category_parents.slug;

update public.categories
set parent_id = null, updated_at = now()
where slug in ('seyahat-ve-baqaj', 'hobbi-ve-yaradiciliq', 'hediyye-ve-bayram');

commit;
