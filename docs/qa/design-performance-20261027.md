# ALISVERIS.AZ — dizayn və gecikmə düzəlişləri

27 oktyabr 2026. Native Next.js tətbiqi, mövcud Supabase və VDS.

## Düzəlişlər

- Ana səhifədə satıcı bannerinin 35% opacity-si götürüldü. Mağaza bannerlərində blur placeholder söndürüldü; digər şəkillərin standart davranışı saxlanıldı.
- 320px-də rusca stok yazısı səbəbindən kəsilən qiymət ayrıca sətirə keçirildi. Uzun kateqoriya və alt menyu adları qonşu sahəyə daşmır.
- Footer keçidləri və səbət köməkçi mətninin kontrastı artırıldı. Mobil mağaza keçidləri və sosial düymələr 44px oldu.
- `htmlLimitedBots: /.*/` götürüldü: adi brauzerlər metadata-nı gözləmədən ilkin məzmunu ala bilir. Next.js-in standart bot/SEO davranışı tətbiq olunur.
- CSP-yə konfiqurasiyada göstərilmiş Supabase origin-i və onun websocket ünvanı əlavə olundu. Canlı backend `api.alisveris.az` olduğu halda əvvəlki CSP yalnız `*.supabase.co` bağlantılarına icazə verirdi.
- İlk sessiya yoxlaması `INITIAL_SESSION` hadisəsi ilə təkrar başlamır. Birlikdə gələn focus/visibility hadisələri eyni sorğunu bölüşür. Sessiya dəyişməsi və tablararası yoxlama saxlanıldı.
- Public girişdə server cookie-si və profil yenə təsdiqlənir. Təsdiqlənmiş profil dərhal paylaşılır, əlavə profil sorğusu və tam document reload çıxarıldı. RAdmin cookie-sinin ayrılığı saxlanıldı.
- Qeydiyyat və yeni məhsuldan sonra `replace` ilə paralel lazımsız `refresh` çıxarıldı.
- Panelin müstəqil sorğuları paralel işləyir; mağaza və sistem ayarları yalnız cari React server sorğusu daxilində deduplikasiya olunur. İstifadəçilər arasında profil/rol cache-i yaradılmayıb.
- Yeni məhsulun şəkil limiti artıq oxunmuş effective limitdən yoxlanılır. Şəkil qeydləri toplu insert edilir. Təsdiq bildirişi/e-poçtu məhsul saxlanandan sonra `after` ilə göndərilir və cavabı 15 saniyəlik SMTP timeout-a bağlamır.
- Məhsul formasında ikiqat göndərmə kilidi, bağlantı xətası üçün istifadəçiyə bildiriş və ayrıca loading vəziyyəti var.
- Satıcının telefon/WhatsApp məlumatı dəyişməyibsə hər girişdə eyni mağaza yenidən yazılmır.

- Bildirişlərin ilkin oxunması ayrıca private/no-store GET endpoint-inə keçirildi və guest sessiyada sorğu buraxılmır. Baxış statistikası `after` ilə cavabdan sonra yazılır; bunlar login və məhsul saxlama Server Action növbəsini gözlətmir.
- Məhsul kartlarında pointer/focus/touch niyyəti üzrə öncədən yükləmə, satıcıda yeni məhsul formasının öncədən yüklənməsi əlavə edildi.

## Yoxlama nəticələri

- 41 test faylı, **264 test keçdi**. İlk yeddi regression testi: ilkin sessiya sorğusunun paylaşılması, focus/visibility deduplikasiyası, gecikmiş guest cavabının giriş profilini əvəz etməməsi, məhsul təsdiq bildirişinin cavabı bloklamaması, məhsul/şəkil limiti və mağaza mülkiyyətinin qorunması.
- Daha yeddi regression testi bildirişlərin yalnız verified user_id ilə oxunmasını, private cache başlığını, guest/DB-error sərhədlərini, statistikanın cavabı bloklamamasını və satıcının öz baxışının sayılmamasını yoxlayır.
- TypeScript və production build keçdi.
- Beş səhifə × doqquz en = **45 adaptiv yoxlama**: ana səhifə, məhsullar, ngallery mağazası, login, register; 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920px. Üfüqi daşma və kəsilən qiymət tapılmadı.
- Mobil login boş email/şifrəni qəbul etmir; auth səhifələrində utility/category menyusu gizlidir.
- Banner üçün ölçülən opacity 1, filter none. Footer keçidinin ölçülən kontrastı light 6.19:1, dark 10.25:1. Kontrast DOM rəngi və fonuna əsaslanır; şəkil üzərində hər piksel üçün audit deyil.
- VDS daxilindən hər route/versiya üçün beş növbəli HTTP sorğusu ölçüldü (60 sorğu). Serverin median tam cavabı təxminən 124–247ms intervalında idi; dəyişikliklər bütün server route-larında eyni faiz sürətlənmə göstərmir. Əsas qazanc təkrarlanan sorğu, tam reload və SMTP gözləməsinin axından çıxarılmasıdır.
- Əvvəlki xarici HTTP ölçməsində ayrı-ayrı 4–12 saniyəlik gecikmələr də görüldü. VDS lokal ölçmələri ilə fərq şəbəkə/CDN hissəsini ayrıca göstərir; bu nəticə bütün şəbəkələr üçün gecikməsiz işləmə zəmanəti deyil.

## Sərhədlər və sübutlar

Bu dəyişiklikdə real satıcının şifrəsi ilə giriş, real məhsul yaratmaq, sifariş/ödəniş və xarici mesaj göndərmək icra edilməyib. Uğurlu giriş və məhsul yaratma backend sərhədləri mock edilmiş regression testləri ilə yoxlanılıb. Browser yoxlaması real UI və oxuma əməliyyatları ilə aparılıb; mövcud buyer sessiyası saxlanılıb.

`design-after.json`, `design-dark-after.json`, `navigation-before.json`, `latency-server-comparison.json` və canlı deployment yoxlamaları hesabatın yanındadır. Əvvəlki geniş təhlükəsizlik/checkout hesabatı ayrıca saxlanılıb; bu hesabat həmin yoxlamaları yenidən icra edilmiş kimi təqdim etmir.

Texniki istinad: [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after), [streaming metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming-metadata).

## Canlı nəticələr

İlk deploy `14f1b55` mənbəsindən 27 oktyabr 13:26 UTC-də aktivləşdi. 25 native runtime, 57 route/auth redirect, 6 locale və 9 təhlükəsizlik HTTP yoxlaması keçdi. Sessiya mövcud QA alıcısı ilə qorundu. Eyni brauzer vasitəsi ilə ilkin keçidlər 721–1689ms idi; ilk deploy-dan sonra öncədən yüklənmiş əsas bölmə keçidləri 129–156ms ölçüldü (dörd nümunə, alət overhead-i daxil, mobil/soyuq yükləmə zəmanəti deyil).

Xarici HTTP təkrarında `/products` median 1333ms ilə 1000ms büdcəsini keçmədi; bir `/stores` nümunəsi 10489ms oldu. Digər səhifələrin medianları 337–534ms idi. Bu qalan cold-request/şəbəkə dəyişkənliyi açıq nəticədir; bütün gecikmələrin sıfırlandığı iddia edilmir. Brauzerin öncədən yüklənmiş keçidi ilə bütöv soyuq HTTP cavabı fərqli ölçülərdir. Nəticələr `latency-http-after.txt` və `navigation-after.json` fayllarındadır.
