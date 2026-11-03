# Alisveris.az marketpleys yenilənməsi

Tətbiq buraxılışı `2b6e513d60b3a8df9f80c2b4c9e5157913fb61dd` · `codex/marketplace-modernization`

## 1. Audit

VDS-də işləyən tətbiq Next.js 16 App Router və React 19 istifadə edir. Əsas giriş nöqtələri `src/app/[locale]/page.tsx`, `products/page.tsx`, mağaza marşrutları və məhsul detalıdır. Vite prototipindən istifadə edilmir. Əsas problem eyni səkkiz məhsulun banner, seçim və məhsul axınında təkrarlanması idi. Axtarış təkliflərində klaviatura seçimi və kateqoriya nəticəsi çatışmırdı. Menyu redaktoru canlı PostgreSQL-də olmayan CMS cədvəllərini oxuyurdu.

## 2. Əsas dəyişikliklər

| Sahə | Fayllar |
| --- | --- |
| Ana səhifə | `src/app/[locale]/page.tsx`, `src/lib/home/product-sections.ts`, `src/components/home/home-experience.tsx` |
| Kataloq | `src/app/[locale]/products/page.tsx`, `src/lib/cart/data.ts`, `src/lib/catalog/filters.ts`, `src/components/search/marketplace-search.tsx` |
| Kartlar və vitrin | `src/components/cart/product-marketplace.tsx`, `src/components/cart/store-page.tsx`-də mövcud mağaza marşrutuna inteqrasiya |
| Alış şərtləri | `src/lib/store-settings/actions.ts`, `src/components/dashboard/store-settings-form.tsx`, `src/app/[locale]/[storeSlug]/products/[productId]/page.tsx` |
| RAdmin | `src/app/radmin.css`, `src/components/admin/`, `src/lib/cms/`, `src/lib/promotions/`, `src/lib/admin/storage/` |
| Hüquqi səhifələr | `src/components/help/legal-document.tsx`, `legal-document.module.css`, `help-content-pages.tsx` |

Tam fayl siyahısı üçün `git diff --stat d9f9982..2b6e513`.

## 3. Yeni komponentlər

`StorePolicies` məhsulda və mağazada eyni şərtləri göstərir. `LegalDocument` mövcud hüquqi mətni və bölmə keçidlərini təqdim edir. RAdmin yaddaş səhifəsi server ölçülərini göstərir və administratora ölçünü yeniləməyə imkan verir.

## 4. Məhsul müxtəlifliyi

Server maksimum 24 aktiv, stokda və ya stok izləməsi söndürülmüş elanı götürür. VIP, icarə və endirim kolleksiyaları əvvəl ayrılır. Seçim zamanı təkrarlanan mağaza və kateqoriyaya daha aşağı üstünlük verilir. Elan identifikatoru digər vitrinlərdən çıxarılır. Kifayət qədər məhsul qaldıqda kateqoriya kolleksiyası açılır. Boş kolleksiyalar göstərilmir. Staging-də 9 elan 9 fərqli məhsul keçidi verdi.

## 5. Axtarış və filtrlər

Azərbaycan hərflərinin normallaşdırılması və noutbuk, notbuk, laptop sinonimləri əlavə edildi. Başlıq uyğunluğu standart axtarış sıralamasında nəzərə alınır. Kateqoriya, mağaza və məhsul təklifləri real qeydlərdən gəlir. Oxlar, Enter və Escape işləyir. Mağaza filtri və endirim, VIP, icarə və satış seçimləri URL-də saxlanır. Server qiymət filtrlərini, sıralamanı və səhifələməni tətbiq edir. Endirim sıralaması faizlə hesablanır və mövcud VIP üstünlüyü saxlanır.

## 6. Məhsul kartları

Ortaq məhsul kartından təkrar bulanıq şəkil qatı çıxarıldı. Klaviatura fokusu və brend rənginə uyğun hover əlavə edildi. Mövcud stok, endirim, VIP, icarə, variant seçimi və səbət komponentləri istifadə edilir. İcarəyə aid qiymət vahidi uydurulmur.

## 7. Mağaza və məhsul detalları

Satıcı mövcud mağaza ayarlarından çatdırılma, qaytarma və zəmanət mətnlərini əlavə edə və silə bilər. Yalnız doldurulan şərtlər göstərilir. Məhsul qalereyasının mövcud thumbnail, lightbox və swipe axını istifadə edilir. Ana səhifədə mağaza adı yanındakı şərtsiz qalxan işarəsi çıxarıldı. Mağaza və məhsul sayı bazadan gəlir. Bütün məhsullar, yenilər, endirim və VIP keçidləri mağazaya məxsus kataloqda açılır.

## 8. Verilənlər bazası

Mağaza şərtləri mövcud `stores.settings` sahəsində, menyu düzəlişləri mövcud `platform_settings` cədvəlində saxlanır. Önə çıxarma mövcud 90 günlük limitdən istifadə edir. Ay paketi 30 gün kimi hesablanır və müddət təsdiq tarixindən başlayır. Mövcud ömürlük elanlar saxlanır.

`20261103180000_admin_storage_usage.sql` PostgreSQL ölçüsü üçün ayrıca, yalnız `service_role`-a açıq funksiya əlavə edir. PGlite-də rol icazələri sınaqdan keçib. Bu migration canlı bazada tətbiq edilməyib. Funksiya mövcud deyilsə, panel ölçünün əlçatan olmadığını göstərir.

## 9. Testlər

TypeScript, production build, secret scan, 92 faylda 618 test, VDS staging və canlı tətbiqin daxili portunda 28 smoke yoxlaması və Danger ssenariləri keçdi. Brauzerdə noutbuk sinonimi, ox düyməsi, Escape, Enter, URL filtri, qonaq səbəti və TexnoKlik-in iki real VIP məhsulu yoxlanıldı. Mobil aşağı panel 375 px-də ayrıca açılıb bağlanaraq sınaqdan keçirildi. Kataloq və hüquqi sənəd 320, 375, 430, 768, 1024, 1440 və 1920 px-də yoxlanıldı. Üfüqi daşma görünmədi.

## 10. Test sərhədləri

Real hesabla ödəniş, sifariş, satıcı mesajı, favorilərin hesablararası sinxronizasiyası və admin təsdiqi üzrə canlı sınaq aparılmadı. Core Web Vitals ölçülmədi. Ayrı Supabase Cloud layihəsinin yaddaşı bu panelin ölçü mənbəyi deyil. R2 və Supabase Storage rəqəmləri əlaqəli açarın oxuma icazəsindən asılıdır və böyük siyahı qismən ölçülə bilər.

## 11. Açıq qalan hissələr

Şəhər, məhsul vəziyyəti və reytinq üzrə filtr və tam mağaza reputasiyası bu buraxılışda tamamlanmayıb. Axtarış mövcud parametrli PostgREST sorğusundan istifadə edir və PostgreSQL mətn indeksi əlavə edilməyib. Ana səhifə redaktorunda banner, kateqoriyalar və seçilmiş mağazaların saxlanan sırası vitrində tətbiq edilir. Redaktordakı bütün görünüş seçimləri ilə ayrıca admin sessiyasında sınaq aparılmayıb. Yeni mətnlərin hamısı EN və RU dillərinə çevrilməyib.

## 12. Buraxılış və geri dönüş

Son tətbiq buraxılışı VDS-də aktivdir. VDS buraxılış qovluğu `/srv/alisveris/releases/marketplace-discovery-20261103/app`. Əvvəlki buraxılış `/srv/alisveris/releases/marketplace-modernization-20261103/app`. Tətbiq üçün mərhələli keçid skripti əvvəlki PM2 konfiqurasiyasını saxlayır və sağlamlıq yoxlaması uğursuz olarsa avtomatik geri qayıdır. PostgreSQL ölçü funksiyası ayrıca tətbiq oluna bilər. Onun geri dönüşü `drop function if exists public.admin_storage_usage();` əmri ilə edilir.
