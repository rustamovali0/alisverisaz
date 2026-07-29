create table if not exists public.help_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  href text not null,
  page_type text not null default 'support',
  eyebrow text not null,
  title text not null,
  description text not null,
  summary text not null,
  sections jsonb not null default '[]'::jsonb,
  related_slugs text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  is_active boolean not null default true,
  status text not null default 'published',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_pages_slug_unique unique (slug),
  constraint help_pages_href_unique unique (href),
  constraint help_pages_page_type_check check (page_type in ('support', 'legal', 'guide', 'info')),
  constraint help_pages_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  href text not null,
  category_slug text not null,
  category text not null,
  title text not null,
  summary text not null,
  steps jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  related_slugs text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  is_active boolean not null default true,
  status text not null default 'published',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_articles_slug_unique unique (slug),
  constraint help_articles_href_unique unique (href),
  constraint help_articles_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists public.help_faqs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  category_slug text not null,
  category text not null,
  question text not null,
  answer text not null,
  related_slugs text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  is_active boolean not null default true,
  status text not null default 'published',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_faqs_slug_unique unique (slug),
  constraint help_faqs_status_check check (status in ('draft', 'published', 'archived'))
);

drop trigger if exists set_help_pages_updated_at on public.help_pages;
create trigger set_help_pages_updated_at
before update on public.help_pages
for each row execute function public.set_updated_at();

drop trigger if exists set_help_articles_updated_at on public.help_articles;
create trigger set_help_articles_updated_at
before update on public.help_articles
for each row execute function public.set_updated_at();

drop trigger if exists set_help_faqs_updated_at on public.help_faqs;
create trigger set_help_faqs_updated_at
before update on public.help_faqs
for each row execute function public.set_updated_at();

create index if not exists help_pages_public_idx
on public.help_pages (status, is_active, sort_order);

create index if not exists help_articles_public_idx
on public.help_articles (status, is_active, category_slug, sort_order);

create index if not exists help_faqs_public_idx
on public.help_faqs (status, is_active, category_slug, sort_order);

alter table public.help_pages enable row level security;
alter table public.help_articles enable row level security;
alter table public.help_faqs enable row level security;

drop policy if exists "help_pages_select_published" on public.help_pages;
create policy "help_pages_select_published"
on public.help_pages for select
to anon, authenticated
using ((status = 'published' and is_active) or public.is_admin());

drop policy if exists "help_pages_manage_admin" on public.help_pages;
create policy "help_pages_manage_admin"
on public.help_pages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "help_articles_select_published" on public.help_articles;
create policy "help_articles_select_published"
on public.help_articles for select
to anon, authenticated
using ((status = 'published' and is_active) or public.is_admin());

drop policy if exists "help_articles_manage_admin" on public.help_articles;
create policy "help_articles_manage_admin"
on public.help_articles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "help_faqs_select_published" on public.help_faqs;
create policy "help_faqs_select_published"
on public.help_faqs for select
to anon, authenticated
using ((status = 'published' and is_active) or public.is_admin());

drop policy if exists "help_faqs_manage_admin" on public.help_faqs;
create policy "help_faqs_manage_admin"
on public.help_faqs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

with page_seed (
  slug,
  href,
  page_type,
  eyebrow,
  title,
  description,
  summary,
  sections,
  related_slugs,
  sort_order
) as (
  values
    (
      'help',
      '/help',
      'support',
      'Kömək mərkəzi',
      'Kömək Mərkəzi',
      'Alışveriş.az istifadəçiləri üçün əsas qaydalar, təlimatlar və dəstək marşrutları.',
      'Hesab, elan, alış, satış və təhlükəsizlik mövzularını bir yerdə toplayan əsas giriş səhifəsi.',
      $json$[
        {"heading":"Haradan başlamaq lazımdır","paragraphs":["Əvvəlcə axtardığın mövzunu seç: giriş, hesab, satış, alış və ya təhlükəsizlik.","Hüquqi şərtlər üçün ayrıca sənədləri, praktik suallar üçün FAQ və məqalələri oxu."],"bullets":["Yeni istifadəçisənsə, qeydiyyat və təhlükəsizliklə başla.","Satıcıdırsa, məhsul yerləşdirmə və mağaza təlimatlarını oxu.","Problem varsa, əlaqə və dəstək bölməsinə keç."]},
        {"heading":"Dəstək kanalı","paragraphs":["Texniki problem, hesab riski və qayda pozuntusu üçün əlaqə səhifəsindən müraciət göndər."]}
      ]$json$::jsonb,
      array['faq','articles','contact','terms'],
      10
    ),
    (
      'faq',
      '/faq',
      'support',
      'Sürətli cavablar',
      'FAQ',
      'Ən çox verilən suallara qısa və praktik cavablar.',
      'Qeydiyyat, elan, satış, alış, mesaj və təhlükəsizlik mövzularında 100+ sual-cavab.',
      $json$[
        {"heading":"FAQ necə istifadə olunur","paragraphs":["Sualı oxu, vəziyyətini tap və cavabdakı addımları sırayla yoxla.","Eyni problem təkrarlanırsa əlaqəli məqaləyə keç."]},
        {"heading":"Məsləhət","paragraphs":["Hesab təhlükəsizliyi, ödəniş və şübhəli davranışlarda yalnız rəsmi məlumatları əsas götür."]}
      ]$json$::jsonb,
      array['help','articles','contact','privacy'],
      20
    ),
    (
      'terms',
      '/terms',
      'legal',
      'Hüquqi sənəd',
      'İstifadəçi Razılaşması',
      'Platformadan istifadə qaydalarını və tərəflərin məsuliyyətini izah edən əsas sənəd.',
      'Qeydiyyat, hesab təhlükəsizliyi, elan yerləşdirmə, qadağan edilən məhsullar və mübahisə həllini əhatə edən hüquqi çərçivə.',
      $json$[
        {"heading":"Ümumi müddəalar","paragraphs":["Bu razılaşma platformadan istifadə edən hər kəs üçün tətbiq olunur.","Platforma marketplace məntiqi ilə işləyir və istifadəçi ilə satıcı arasında vasitəçi rolunu oynayır."]},
        {"heading":"Terminlər","paragraphs":["Məhsul, elan, satıcı, alıcı, hesab, mağaza və sifariş terminləri bu sənəddə əlaqəli şəkildə istifadə olunur."],"bullets":["Satıcı: məhsul yerləşdirən istifadəçi.","Alıcı: məhsula baxan və sifariş verən istifadəçi.","Platforma: Alışveriş.az veb tətbiqi və ona bağlı xidmətlər."]},
        {"heading":"Qeydiyyat və hesab təhlükəsizliyi","paragraphs":["Qeydiyyat məlumatlarının doğruluğuna istifadəçi cavabdehdir.","Şifrə, sessiya və cihazlar təhlükəsiz saxlanmalıdır."]},
        {"heading":"Satıcı və alıcı öhdəlikləri","paragraphs":["Satıcı real məhsul məlumatı təqdim etməli, alıcı isə platformadan qanuni və dürüst istifadə etməlidir."]},
        {"heading":"Məsuliyyət və dəyişikliklər","paragraphs":["Platforma qaydaları yenilənə bilər və dəyişikliklər dərc edildiyi andan qüvvədə olur."]}
      ]$json$::jsonb,
      array['privacy','rules','contact','faq'],
      30
    ),
    (
      'privacy',
      '/privacy',
      'legal',
      'Hüquqi sənəd',
      'Məxfilik Siyasəti',
      'Hansı məlumatların toplandığını, necə qorunduğunu və nə üçün istifadə olunduğunu izah edir.',
      'Şəxsi məlumatlar, sessiyalar, loglar, cookie-lər və üçüncü tərəf xidmətləri ilə bağlı məxfilik çərçivəsi.',
      $json$[
        {"heading":"Hansı məlumatlar toplanır","paragraphs":["Qeydiyyat, giriş, sifariş, mesajlaşma və dəstək müraciətləri zamanı təqdim edilən məlumatlar toplanır."],"bullets":["Ad, soyad, email, telefon və profil məlumatları.","Sessiya və cihaz məlumatları.","Log və təhlükəsizlik qeydləri."]},
        {"heading":"Niyə toplanır","paragraphs":["Məlumatlar hesabı idarə etmək, təhlükəsizliyi təmin etmək, sifarişləri emal etmək və istifadəçi təcrübəsini yaxşılaşdırmaq üçün istifadə olunur."]},
        {"heading":"Cookie və sessiyalar","paragraphs":["Cookie-lər sessiya idarəsi, dil seçimi, təhlükəsizlik yoxlamaları və rahat istifadə üçün işlədilir."]},
        {"heading":"İstifadəçi hüquqları","paragraphs":["İstifadəçi məlumatlarına baxmaq, düzəliş istəmək, silinmə tələb etmək və bəzi emal növlərinə etiraz etmək hüququna malikdir."]}
      ]$json$::jsonb,
      array['terms','rules','contact','faq'],
      40
    ),
    (
      'rules',
      '/rules',
      'legal',
      'Marketplace siyasəti',
      'Marketplace Qaydaları',
      'Elan yerləşdirmə, məhsul təsviri və davranış standartlarını müəyyən edən əməliyyat qaydaları.',
      'Spam, saxta məhsul, müəllif hüququ, marka pozuntusu və istifadəçi davranışı üçün praktiki nəzarət qaydaları.',
      $json$[
        {"heading":"Elan qaydaları","paragraphs":["Elan başlığı konkret, təsviri isə tam olmalıdır. Təkrar və aldadıcı elanlar moderasiyada geri qaytarıla bilər."]},
        {"heading":"Şəkil və məzmun qaydaları","paragraphs":["Şəkillər real məhsulu göstərməli, təsvir isə məhsulun vəziyyətini gizlətməməlidir."]},
        {"heading":"Qadağan olunan davranışlar","paragraphs":["Spam, fırıldaqçılıq, saxta məhsul, marka pozuntusu, bot fəaliyyəti və istifadəçini çaşdıran davranışlar qadağandır."]},
        {"heading":"Şikayət prosesi","paragraphs":["Qayda pozuntusu barədə şikayət göndərilə bilər və müraciət sübutlara əsasən yoxlanır."]}
      ]$json$::jsonb,
      array['terms','privacy','faq','contact'],
      50
    ),
    (
      'guide/new-listing',
      '/guide/new-listing',
      'guide',
      'Satış təlimatı',
      'Yeni Elan Təlimatı',
      'Məhsulu düzgün yerləşdirmək üçün addım-addım qısa təlimat.',
      'Başlıqdan şəkillərə, qiymətdən stok məlumatına qədər yeni elanın necə hazırlanacağını izah edir.',
      $json$[
        {"heading":"Başlamazdan əvvəl","paragraphs":["Məhsulun vəziyyətini, şəkillərini və əsas məlumatlarını əvvəlcədən hazırla."]},
        {"heading":"Başlıq və təsvir","paragraphs":["Başlıq qısa, aydın və məhsulu dəqiq təsvir etməlidir."]},
        {"heading":"Şəkillər","paragraphs":["Ən az bir əsas şəkil və mümkün olduqda müxtəlif bucaqlardan əlavə fotolar yüklə."]},
        {"heading":"Dərcdən sonra","paragraphs":["Elan dərc olunduqdan sonra mesajları, statusu və istifadəçi reaksiyalarını izləmək faydalıdır."]}
      ]$json$::jsonb,
      array['guide/seller','help','rules','faq'],
      60
    ),
    (
      'guide/seller',
      '/guide/seller',
      'guide',
      'Satıcı təlimatı',
      'Satıcı Təlimatı',
      'Mağaza idarəetməsi, məhsul nəzarəti və sifariş axını üçün əsas iş qaydaları.',
      'Satıcı profili, məhsul idarəetməsi, mesajlar və sifariş cavablandırma prosesini praktik şəkildə izah edir.',
      $json$[
        {"heading":"Mağaza profilini tamamla","paragraphs":["Mağaza adı, təsviri, loqosu və əlaqə məlumatları düzgün və ardıcıl olmalıdır."]},
        {"heading":"Məhsul axını","paragraphs":["Yeni məhsulları kateqoriyaya uyğun yerləşdir və stok, qiymət dəyişikliklərini gecikdirmə."]},
        {"heading":"Mesajlara cavab","paragraphs":["Mesajları vaxtında cavablandırmaq satış ehtimalını artırır."]},
        {"heading":"Reytinq və rəy","paragraphs":["Rəylər mağaza reputasiyasının bir hissəsidir və həll yönümlü idarə olunmalıdır."]}
      ]$json$::jsonb,
      array['guide/new-listing','guide/buyer','help','contact'],
      70
    ),
    (
      'guide/buyer',
      '/guide/buyer',
      'guide',
      'Alıcı təlimatı',
      'Alıcı Təlimatı',
      'Məhsul tapmaqdan sifarişi tamamlayana qədər rahat alış axını üçün qısa bələdçi.',
      'Axtarış, müqayisə, səbət, mesaj və sifariş mərhələlərində diqqət yetirilməli məqamları izah edir.',
      $json$[
        {"heading":"Axtarış və müqayisə","paragraphs":["Məhsul adını, kateqoriyanı və ya mağazanı axtararaq nəticələri daralt."]},
        {"heading":"Satıcı ilə əlaqə","paragraphs":["Suallarını sifarişdən əvvəl yazmaq riskləri azaldır."]},
        {"heading":"Səbət və sifariş","paragraphs":["Səbətdə məhsulları, ünvanı və əlaqə məlumatlarını son dəfə yoxla."]},
        {"heading":"Təhlükəsizlik","paragraphs":["Şübhəli linklərə klik etmə və şəxsi məlumatları platformadan kənarda paylaşma."]}
      ]$json$::jsonb,
      array['faq','help','rules','contact'],
      80
    ),
    (
      'about',
      '/about',
      'info',
      'Platforma haqqında',
      'Layihə Haqqında',
      'Alışveriş.az-ın məqsədi, iş modeli və istifadəçiyə verdiyi dəyər.',
      'Marketplace məntiqi ilə qurulan platformanın bazar yanaşmasını və xidmət fəlsəfəsini təqdim edir.',
      $json$[
        {"heading":"Missiya","paragraphs":["Alışveriş.az məhsul satmaq, mağaza idarə etmək və alıcı ilə satıcını bir platformada birləşdirmək üçün qurulub."]},
        {"heading":"Necə işləyir","paragraphs":["Satıcı məhsul yerləşdirir, alıcı axtarış və filtr vasitəsilə məhsulu tapır, tərəflər platforma üzərindən əlaqə saxlayır."]},
        {"heading":"Etibar modeli","paragraphs":["Düzgün elan məzmunu, moderasiya və istifadəçi reputasiyası şəffaf təcrübə yaratmağa kömək edir."]}
      ]$json$::jsonb,
      array['help','rules','contact','terms'],
      90
    ),
    (
      'contact',
      '/contact',
      'support',
      'Dəstək kanalı',
      'Əlaqə və Dəstək',
      'Sorğunu, texniki problemini və ya hüquqi sualını komanda ilə paylaş.',
      'Platforma ilə bağlı rəsmi əlaqə kanalları, cavab gözləntisi və müraciət formatı.',
      $json$[
        {"heading":"Nə üçün yazmaq olar","paragraphs":["Hesab problemi, təhlükəsizlik narahatlığı, şikayət, texniki xəta, məzmun düzəlişi və əməkdaşlıq müraciəti üçün əlaqə saxla."]},
        {"heading":"Müraciət forması","paragraphs":["Məktubunda qısa mövzu, problem təsviri, ekran görüntüsü və varsa sifariş və ya elan identifikatoru göstər."]},
        {"heading":"Cavab müddəti","paragraphs":["Müraciətin növündən asılı olaraq cavab müddəti dəyişə bilər. Təhlükəsizlik mövzuları daha tez yoxlanır."]}
      ]$json$::jsonb,
      array['help','faq','privacy','terms'],
      100
    )
)
insert into public.help_pages (
  slug,
  href,
  page_type,
  eyebrow,
  title,
  description,
  summary,
  sections,
  related_slugs,
  sort_order,
  status,
  is_active
)
select
  slug,
  href,
  page_type,
  eyebrow,
  title,
  description,
  summary,
  sections,
  related_slugs,
  sort_order,
  'published',
  true
from page_seed
on conflict (slug) do update
set
  href = excluded.href,
  page_type = excluded.page_type,
  eyebrow = excluded.eyebrow,
  title = excluded.title,
  description = excluded.description,
  summary = excluded.summary,
  sections = excluded.sections,
  related_slugs = excluded.related_slugs,
  sort_order = excluded.sort_order,
  status = excluded.status,
  is_active = excluded.is_active,
  updated_at = now();

with category_seed (
  category_slug,
  category,
  summary,
  topic_slugs,
  topic_titles
) as (
  values
    ('giris-qeydiyyat','Giriş və qeydiyyat','Hesaba daxil olma, yeni hesab açma və təhlükəsiz giriş üsulları.',array['email-ile-qeydiyyat','telefonla-giris','sifre-sifirlama','email-tesdiqi','telefon-yenileme','aktiv-sessiyalar','hesab-berpasi','dublikat-hesab','melumat-tehlukesizliyi','sifre-telebleri'],array['Email ilə qeydiyyat','Telefonla giriş','Şifrə sıfırlama','Email təsdiqi','Telefon yeniləmə','Aktiv sessiyalar','Hesab bərpası','Dublikat hesab','Məlumat təhlükəsizliyi','Şifrə tələbləri']),
    ('hesabim','Hesabım','Profil, bildiriş və məxfilik ayarlarını idarə etmək üçün məqalələr.',array['profil-shekli-deyismek','ad-soyad-redaktesi','bildiris-ayarlari','dil-secimi','unvan-saxlamaq','favori-aktivleri','hesab-baglamaq','telefonu-yenilemek','emaili-deyismek','sessiyalari-yoxlamaq'],array['Profil şəkli dəyişmək','Ad və soyad redaktəsi','Bildiriş ayarları','Dil seçimi','Ünvan saxlamaq','Favori aktivləri','Hesab bağlamaq','Telefonu yeniləmək','Emaili dəyişmək','Sessiyaları yoxlamaq']),
    ('satici-magazasi','Satıcı mağazası','Mağaza profili, komanda və satış axınının idarə olunması.',array['magaza-profili','logo-yuklemek','banner-elave-etmek','tesvir-yazmaq','is-saatlari','satici-statusu','sifaris-idare-etmek','komanda-uzvleri','magaza-url','magaza-qaydalar'],array['Mağaza profili yaratmaq','Logo yükləmək','Banner əlavə etmək','Təsvir yazmaq','İş saatları','Satıcı statusu','Sifariş idarə etmək','Komanda üzvləri','Mağaza URL-i','Mağaza qaydaları']),
    ('alis-prosesi','Alış prosesi','Axtarış, səbət, sifariş və satıcı ilə əlaqə mərhələləri.',array['mehsul-axtarmaq','sebete-elave-etmek','sebeti-temizlemek','sifaris-yaratmaq','saticiya-yazmaq','sifarisi-izlemek','elaqe-melumatlari','sifarisi-legv-etmek','qebz-yuklemek','sikayet-gondermek'],array['Məhsul axtarmaq','Səbətə əlavə etmək','Səbəti təmizləmək','Sifariş yaratmaq','Satıcıya yazmaq','Sifarişi izləmək','Əlaqə məlumatı yoxlamaq','Sifarişi ləğv etmək','Qəbz yükləmək','Şikayət göndərmək']),
    ('satis-prosesi','Satış prosesi','Məhsul yerləşdirməkdən sifarişlərə cavab verməyə qədər satış axını.',array['yeni-mehsul-elave-etmek','qiymet-teyin-etmek','stok-bildirmek','sekil-sirasi','mehsul-tesviri','kategoriya-secim','moderasiya-statusu','mesajlara-cavab','rey-izlemek','mehsulu-arxivlemek'],array['Yeni məhsul əlavə etmək','Qiymət təyin etmək','Stok bildirmək','Şəkil sırası','Məhsul təsviri','Kategoriya seçmək','Moderasiya statusu','Mesajlara cavab vermək','Rəy izləmək','Məhsulu arxivləşdirmək']),
    ('mehsullar','Məhsullar','Məhsul başlığı, atribut, variant və redaktə qaydaları.',array['dogru-basliq','atribut-elave-etmek','variant-doldurmaq','etiket-secmek','mehsulu-yenilemek','mehsulu-silmek','kutlevi-redakte','status-deyismek','stok-izleri','sekil-optimizasiya'],array['Düzgün başlıq yazmaq','Atribut əlavə etmək','Variantları doldurmaq','Etiket seçmək','Məhsulu yeniləmək','Məhsulu silmək','Kütləvi redaktə','Status dəyişmək','Stok izləri','Şəkil optimallaşdırmaq']),
    ('kateqoriyalar','Kateqoriyalar','Kateqoriya seçimi, axtarış və struktur səhvlərinin düzəldilməsi.',array['kateqoriya-secimi','alt-kateqoriya','yanlis-kateqoriya','filtrle-daraltmaq','kateqoriya-teklifi','bos-kateqoriya','axtarisdan-kecmek','mobil-gorunum','yeni-kateqoriya-sorgusu','kateqoriya-sehvleri'],array['Kateqoriya seçmək','Alt kateqoriya tapmaq','Yanlış kateqoriya düzəltmək','Filtrlə daraltmaq','Kateqoriya təklifi','Boş kateqoriya','Axtarışdan keçmək','Mobil kateqoriya görünüşü','Yeni kateqoriya sorğusu','Kateqoriya səhvləri']),
    ('favoriler','Favorilər','Sevdiyin məhsulları saxlamaq və sonradan izləmək üçün məsləhətlər.',array['mehsulu-favoriye-elave','favoriden-silmek','siyahini-bolmek','sonradan-baxmaq','satici-favorileri','sinxronizasiya','favori-bildirisi','bos-siyahi','qeyri-aktiv-mehsul','qisa-yol'],array['Məhsulu favoriyə əlavə etmək','Favoridən silmək','Siyahını bölmək','Sonradan baxmaq','Satıcı favoritləri','Sinxronizasiya','Favori bildirişi','Boş siyahı','Qeyri-aktiv məhsul','Qısa yol yaratmaq']),
    ('bildirisler','Bildirişlər','Oxunmamış xəbərdarlıqlar və bildiriş axınının idarəsi.',array['bildirisleri-acmaq','oxunmus-bildirisler','email-bildirisleri','mesaj-xeberdarligi','sifaris-bildirisleri','tehlukesizlik-bildirisleri','sessiz-rejim','arxiv','badge-sayi','bildirisi-silmek'],array['Bildirişləri açmaq','Oxunmuş bildirişlər','Email bildirişləri','Mesaj xəbərdarlıqları','Sifariş bildirişləri','Təhlükəsizlik bildirişləri','Səssiz rejim','Arxiv','Badge sayı','Bildirişi silmək']),
    ('chat-sistemi','Çat sistemi','Satıcı və alıcı arasında təhlükəsiz yazışma axını.',array['mesaj-baslatmaq','fayl-gondermek','cavab-gecikmesi','sohbeti-arxivlemek','spam-bildirmek','istifadecini-bloklamaq','mesaj-axtarmaq','mubahise-helli','sifarisle-elaqelendirmek','chat-tehlukesizliyi'],array['Mesaj başlatmaq','Fayl göndərmək','Cavab gecikməsi','Söhbəti arxivləmək','Spam bildirmək','İstifadəçini bloklamaq','Mesaj axtarmaq','Mübahisə həlli','Sifarişlə əlaqələndirmək','Çat təhlükəsizliyi']),
    ('yeni-elan','Yeni elan','Yeni elan hazırlamaq, yoxlamaq və dərc etmək üçün praktik mövzular.',array['elan-formunu-acmaq','basliq-hazirlamaq','tesvir-qurmaq','esas-sekil-secmek','qiymeti-yoxlamaq','stok-sahesi','onizleme','derc-etmek','moderasiya-gozlemek','elan-yenilemek'],array['Elan formunu açmaq','Başlıq hazırlamaq','Təsvir qurmaq','Əsas şəkil seçmək','Qiyməti yoxlamaq','Stok sahəsi','Önizləmə','Dərc etmək','Moderasiya gözləmək','Elanı yeniləmək']),
    ('hesab-tehlukesizliyi','Hesab təhlükəsizliyi','Şifrə, sessiya və şübhəli girişlərlə bağlı təhlükəsizlik addımları.',array['guclu-sifre','subheli-giris','sessiya-baglamaq','cihaz-yoxlamaq','email-xeberdarligi','telefon-qorunmasi','hesab-ele-kecib','token-yenilenmesi','melumat-paylasimi','tehlukesiz-cixis'],array['Güclü şifrə yaratmaq','Şübhəli giriş','Sessiya bağlamaq','Cihaz yoxlamaq','Email xəbərdarlığı','Telefon qorunması','Hesab ələ keçibsə','Token yenilənməsi','Məlumat paylaşımı','Təhlükəsiz çıxış']),
    ('hesabin-silinmesi','Hesabın silinməsi','Hesabı bağlamaq, data silinməsi və alternativ seçimlər barədə məlumatlar.',array['hesabi-baglamaq','silme-sorgusu','data-ixraci','aktiv-sifarisler','magaza-baglamaq','profili-gizletmek','silme-muddeti','hesabi-berpa-etmek','abunelikleri-yoxlamaq','son-yoxlama'],array['Hesabı bağlamaq','Silmə sorğusu','Data ixracı','Aktiv sifarişlər','Mağaza bağlamaq','Profili gizlətmək','Silmə müddəti','Hesabı bərpa etmək','Abunəlikləri yoxlamaq','Son yoxlama']),
    ('profil','Profil','İstifadəçi və satıcı profilinin düzgün təqdim olunması.',array['profil-melumati','public-gorunum','profil-sekli','qisa-tesvir','elaqe-gorunurluyu','satici-profil','reyler-gorunusu','profil-linki','melumat-gizliliyi','profil-yoxlamasi'],array['Profil məlumatı','Public görünüm','Profil şəkli','Qısa təsvir','Əlaqə görünürlüğü','Satıcı profili','Rəylər görünüşü','Profil linki','Məlumat gizliliyi','Profil yoxlaması']),
    ('sikayet','Şikayət','Məhsul, mesaj, istifadəçi və mağaza ilə bağlı şikayət göndərmək.',array['mehsul-sikayeti','satici-sikayeti','alici-sikayeti','mesaj-sikayeti','saxta-mehsul','brend-pozuntusu','spam-sikayeti','sifaris-problemi','sikayet-statusu','sikayeti-yenilemek'],array['Məhsul şikayəti','Satıcı şikayəti','Alıcı şikayəti','Mesaj şikayəti','Saxta məhsul','Brend pozuntusu','Spam şikayəti','Sifariş problemi','Şikayət statusu','Şikayəti yeniləmək']),
    ('hesabat-verme','Hesabat vermə','Qayda pozuntusu, təhlükəsizlik riski və texniki xəta barədə hesabatlar.',array['texniki-xeta','odenis-riski','tehlukesizlik-riski','qayda-pozuntusu','yanlis-melumat','kateqoriya-problemi','moderasiya-hesabati','hesabat-nomresi','cavab-muddeti','elave-subut'],array['Texniki xəta','Ödəniş riski','Təhlükəsizlik riski','Qayda pozuntusu','Yanlış məlumat','Kateqoriya problemi','Moderasiya hesabatı','Hesabat nömrəsi','Cavab müddəti','Əlavə sübut'])
),
topic_rows as (
  select
    category_slug,
    category,
    summary as category_summary,
    topic_slug,
    topic_title,
    ordinality::integer as local_order,
    row_number() over (order by category_slug, ordinality)::integer as global_order
  from category_seed
  cross join lateral unnest(topic_slugs, topic_titles) with ordinality as topic(topic_slug, topic_title, ordinality)
),
article_rows as (
  select
    category_slug || '-' || topic_slug as slug,
    '/help/articles/' || category_slug || '-' || topic_slug as href,
    category_slug,
    category,
    topic_title as title,
    topic_title || ' üçün qısa, praktik və əməli addımlar.' as summary,
    jsonb_build_array(
      'Mövzuya uyğun səhifəni və ya panel bölməsini aç.',
      topic_title || ' üçün lazımi məlumatları diqqətlə yoxla.',
      'Dəyişiklikləri ardıcıllıqla tamamla və nəticəni yadda saxla.',
      'Problem təkrarlanarsa əlaqəli məqaləyə və ya dəstək bölməsinə keç.'
    ) as steps,
    jsonb_build_array(
      'Məlumatları aktual və doğru saxla.',
      'Təhlükəsizlik və hesabla bağlı mövzularda şübhəli linklərdən istifadə etmə.'
    ) as notes,
    global_order as sort_order,
    array_remove(
      array[
        lag(category_slug || '-' || topic_slug) over (partition by category_slug order by local_order),
        lead(category_slug || '-' || topic_slug) over (partition by category_slug order by local_order)
      ],
      null
    ) as related_slugs
  from topic_rows
)
insert into public.help_articles (
  slug,
  href,
  category_slug,
  category,
  title,
  summary,
  steps,
  notes,
  related_slugs,
  sort_order,
  status,
  is_active
)
select
  slug,
  href,
  category_slug,
  category,
  title,
  summary,
  steps,
  notes,
  related_slugs,
  sort_order,
  'published',
  true
from article_rows
on conflict (slug) do update
set
  href = excluded.href,
  category_slug = excluded.category_slug,
  category = excluded.category,
  title = excluded.title,
  summary = excluded.summary,
  steps = excluded.steps,
  notes = excluded.notes,
  related_slugs = excluded.related_slugs,
  sort_order = excluded.sort_order,
  status = excluded.status,
  is_active = excluded.is_active,
  updated_at = now();

with article_source as (
  select
    slug,
    category_slug,
    category,
    title,
    row_number() over (order by category_slug, sort_order)::integer as sort_order,
    array_remove(
      array[
        lag(slug) over (partition by category_slug order by sort_order),
        lead(slug) over (partition by category_slug order by sort_order)
      ],
      null
    ) as related_slugs
  from public.help_articles
  where status = 'published'
    and is_active
)
insert into public.help_faqs (
  slug,
  category_slug,
  category,
  question,
  answer,
  related_slugs,
  sort_order,
  status,
  is_active
)
select
  slug,
  category_slug,
  category,
  case
    when title ilike '%maq' or title ilike '%mək' then title || ' necə edilir?'
    else title || ' barədə nə etməliyəm?'
  end as question,
  category || ' bölməsində ' || lower(title) || ' üçün əvvəlcə uyğun səhifəni aç, məlumatları yoxla və addımları ardıcıllıqla tamamla. Problem davam edərsə, əlaqəli məqaləyə bax və ya dəstək bölməsinə müraciət et.' as answer,
  related_slugs,
  sort_order,
  'published',
  true
from article_source
on conflict (slug) do update
set
  category_slug = excluded.category_slug,
  category = excluded.category,
  question = excluded.question,
  answer = excluded.answer,
  related_slugs = excluded.related_slugs,
  sort_order = excluded.sort_order,
  status = excluded.status,
  is_active = excluded.is_active,
  updated_at = now();

