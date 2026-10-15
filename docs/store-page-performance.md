# Mağaza səhifəsi: performans və Google Maps

## Tətbiq edilən optimallaşdırmalar

- Mağaza və ilk məhsul səhifəsi sorğusu artıq kateqoriya, tema və hesab sorğuları ilə paralel başlayır.
- İctimai satış nöqtələri `store:<id>` cache teqi ilə 5 dəqiqə keşlənir. Satıcı və ya admin satış nöqtəsini dəyişəndə mövcud `invalidateStorePublicData` həmin teqi yeniləyir.
- İlk məhsul səhifəsi serverdən gələn nəticədən istifadə edir; React Query onu 30 saniyə təzə sayır və fokus dəyişəndə dərhal yenidən sorğu göndərmir.
- Axtarış təklifləri 250 ms debounce istifadə edir, TanStack Query-nin `signal` dəyərini `fetch`-ə ötürür və köhnəlmiş sorğunu ləğv edir. Təkliflər 10 saniyə keşlənir, uğursuz sorğu avtomatik təkrarlanmır.
- Məhsul kartları `next/image`, düzgün `sizes` və lazy loading istifadə etməyə davam edir. İlk məhsul məlumatı server render ilə gəlir; bütün kart şəkilləri preload edilmir.
- Interaktiv xəritə ayrıca client chunk-dur. İlkin mağaza səhifəsində iframe render edilmir. İstifadəçi “Səhifədə xəritəni aç” düyməsini sıxanda iframe və onun Google resursları yüklənir. Xarici Google Maps və marşrut keçidləri saxlanılır.

## Google Maps açarı

Mövcud xəritə `google.com/maps` iframe-i ilə qurulur; layihədə Google Maps JavaScript API loader-i, `@googlemaps/js-api-loader`, `@react-google-maps/api` və ya browser-ə ötürülən Google Maps API açarı istifadə edilmir. Bu dəyişiklik açar əlavə etmir və mövcud `.env` dəyərlərini göstərmir.

Gələcəkdə browser-də Google Maps JavaScript API açarı istifadə olunarsa, həmin açar texniki olaraq client-ə görünəcək. O, server sirri kimi təqdim edilməməli və server-only açarlarla eyni dəyər olmamalıdır. Google Cloud Console-da aşağıdakı məhdudiyyətlər qurulmalıdır:

1. Açarı yalnız lazım olan Maps API-ləri ilə məhdudlaşdırın.
2. Application restrictions bölməsində yalnız HTTPS referrer-ləri əlavə edin: `https://alisveris.az/*`, `https://*.alisveris.az/*` və ayrıca test mühiti üçün `https://rtest.alisveris.az/*`.
3. Lokal inkişaf üçün yalnız zəruri, məhdud localhost qaydası əlavə edin; geniş wildcard istifadə etməyin.
4. Quota, xəta və qeyri-adi istifadə alert-lərini Google Cloud Console-da yoxlayın.
5. Server-only API açarlarını `NEXT_PUBLIC_*` dəyişənlərində saxlamayın.

## Ölçmə qaydası

Bu commitdə uydurma əvvəl/sonra Web Vitals rəqəmi yoxdur. Dəyişiklikdən sonra eyni şəbəkə və cihaz şəraitində aşağıdakılar ölçülməlidir:

- Chrome DevTools Network: ilk mağaza açılışında Google Maps iframe sorğularının sayı `0` olmalıdır; xəritə düyməsindən sonra yalnız həmin vaxt başlamalıdır.
- Lighthouse: LCP, INP, CLS, TTFB və initial JavaScript ölçülməlidir.
- Network waterfall: mağaza HTML/RSC, məhsul endpoint-i və şəkil sorğularının vaxtları qeydə alınmalıdır.
- Mobil viewport-da xəritə düyməsi, iframe açılışı, geri naviqasiya və sürətli təkrar kliklər yoxlanmalıdır.

Qiymət və stokun qısa müddətli client cache-i 30 saniyəni keçmir; checkout zamanı server tərəfli yoxlama yenə məcburidir.
