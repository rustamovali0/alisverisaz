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

## Yoxlama nəticələri

- 40 test faylı, **257 test keçdi**. Yeddi yeni test: ilkin sessiya sorğusunun paylaşılması, focus/visibility deduplikasiyası, gecikmiş guest cavabının giriş profilini əvəz etməməsi, məhsul təsdiq bildirişinin cavabı bloklamaması, məhsul/şəkil limiti və mağaza mülkiyyətinin qorunması.
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
