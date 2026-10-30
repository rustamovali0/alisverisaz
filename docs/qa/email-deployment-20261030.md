# E-poçt sisteminin yerləşdirilməsi — 30 oktyabr 2026

## Canlı nəticə

- Domen `https://alisveris.az` yerli normal DNS həlli və Cloudflare üzərindən 200 qaytarır. Əvvəlki registrar NS uyğunsuzluğu düzəldilib.
- VDS tətbiqi `/srv/alisveris/releases/email-system-20261029/app`, PM2 `alisveris-vds`, port 3004, yerləşdirilmiş mənbə `f61ff32b20972bdcf50c1b93707a870768ae7267`.
- Hər iki e-poçt miqrasiyası istifadəçinin root sessiyasında tətbiq edilib. Beş şablon var; göndəriş ayrıca aktivləşdirilib.
- Supabase Auth sağlamlıq endpoint-i 200 qaytarır. Hostinger SMTP TLS/login yoxlanılıb. Göndərən `ALİSVERİS.AZ <no-reply@alisveris.az>`, autentifikasiya qutusu `admin@alisveris.az`-dır.
- Sahibin `admin@alisveris.az` ünvanına bir quraşdırma məktubu növbələnib: `sent`, bir cəhd, provider Message-ID və sent_at mövcuddur. Bu, SMTP qəbuludur; inbox/bounce təsdiqi deyil.
- Self-hosted worker ayrıca `/home/deploy/alisveris-email-service` qovluğundadır. Konfiqurasiya 0600, qovluq 0700; heç bir HTTP dispatch portu açılmayıb. Root cron dəqiqəlik flock çağırışı və məhdud logrotate qurub. Cron xidməti ayrıca yoxlanılıb.
- Cloud `fxfycfkwodywmnzgkyvl` layihəsində yalnız sabit `1` qaytaran RPC var. Production server ilk sorğunu uğurla göndərib. Son uğur 0600 state faylında saxlanır; sonrakı sorğu beş gün tamamlananda olacaq. Pause edilməmək zəmanəti yoxdur. Cloud layihəsinə production məlumatları köçürülməyib.
- İstifadə olunmayan 52 release silinib, 12,25 GB boşaldılıb. Təmizləmədən dərhal sonra 13,60 GB boş yer / 52% istifadə görüldü. Aktiv tətbiqlər və DB qorunub.

## Yoxlamalar

- 314 test, 46 fayl; TypeScript və production build uğurlu; Deno adapteri typecheck keçib.
- Native staging: 25 yoxlama. Native aktivləşdirmə: 25 yoxlama; 9 məhsul səhifələmə ilə görünüb.
- E-poçt üçün 12 əlavə staging yoxlaması: anon üçün dörd şəxsi cədvələ giriş bağlıdır; service role ilə settings və beş şablon görünür; beş public Auth şablonu 200-dür; recovery TokenHash var; RAdmin səhifəsi daxil olmamış istifadəçini login-ə yönləndirir.
- Canlı aktivləşdirmədən sonra delivery enabled, sahibin test məktubu sent və Auth health 200 yoxlanılıb. Worker boş növbə ilə ayrıca uğurla başlayıb.
- Brauzerdə canlı homepage və şifrə bərpası səhifəsi açılıb. RAdmin composer-in lokal desktop/390px mobil maketində hazır şablon, mətn dəyişənləri, alıcı sayı ilə təsdiq və ləğv davranışı sınaqdan keçirilib. Lokal maket məktub göndərməyib.

## Hüdudlar

Həqiqi müştərilərə kütləvi test kampaniyası və real sifariş yaradılmayıb. Tam recovery → yeni şifrə → köhnə sessiyanın bağlanması real inbox ilə bu yerləşdirmədə tamamlanmayıb; bunun üçün sahibin bərpa məktubunu açıb yeni şifrəni özü daxil etməsi lazımdır. Auth, password validation və sessiya revoke davranışı avtomatlaşdırılmış testlərlə yoxlanılıb. SMTP sent inbox-a çatma və oxunma zəmanəti vermir.

Şifrələr, service key-lər və tam server environment-ləri bu hesabata və Git-ə yazılmayıb. PR #9, açıq PR #8 üzərində ayrıca dəyişiklik kimi hazırlanıb; merge edilməyib.

## Gün ərzində əlavə edilən dizayner və kampaniyalar

19 avtomatik şablon, başlıq/mətn/düymə redaktəsi, təhlükəsiz canlı önizləmə və altı HEX rəng ayarı əlavə edilib. RAdmin-in Önə çıxarma bölməsində mağaza üzrə ayrıca kampaniya icazəsi var; standart olaraq heç bir real mağazaya icazə açılmayıb. Sahiblik, aktiv önə çıxarma, revocation, marketing opt-in, idempotency və 24 saatlıq limit test olunub.

341 test / 51 fayl, TypeScript, production build və Deno yoxlaması keçib. Yeni release-lər staging və canlı aktivləşdirmədə 25 yoxlamadan keçib. Admin-in əvvəlki quraşdırma və cron test məktubları readonly IMAP ilə Inbox-da tapılıb; DKIM pass təsdiqlənib. Cron məktubu manual worker çağırılmadan 35 saniyəyə göndərib.

Canlı RAdmin-də alıcı/satıcı/birgə auditoriyalar 6/4/10 olaraq yoxlanılıb, bütün təsdiqlər ləğv edilib. Marketing opt-in olmayan auditoriya üçün göndəriş bloklanıb. Nümunə “Yeni tapıntılar — alış-veriş kampaniyası” şablonu UI-dən saxlanılıb, real istifadəçilərə göndərilməyib. Newsletter-də banner, məzmun bölmələri, kateqoriya keçidləri, mağaza/məhsul CTA-sı, yardım və məxfilik/razılaşma/footer keçidləri var. Önizləmə real renderer ilə eynidir. 390px yoxlamasında üfüqi daşma yoxdur. Cloudflare HTML transformasiyası no-transform ilə dayandırıldıqdan sonra yeni RAdmin yüklənməsində hydration xətası görünməyib.

## Recovery redirect and optional seller images

The recovery confirmation route used `request.url` as its redirect origin. On the live reverse proxy this produced `https://[::ffff:7f00:1]:3004/...`, preventing the browser from opening the reset form after OTP verification. Recovery, OAuth callbacks and recovery-email generation now share the configured public origin; request Host/Forwarded headers cannot choose an auth destination. Expired/missing tokens still return to the public forgot-password page, with no-store and no-referrer headers.

Seller registration no longer requires either image. Validated `File` objects live in the parent form state and are explicitly added to FormData. This preserves them across step unmounts, browser form resets and retries without relying on DataTransfer support. Images remain subject to the existing 5 MB and real-image checks; submission waits for validation. Each image can also be removed.

Validation: 357 tests across 53 files passed, TypeScript passed and the production build passed. New route tests cover valid mocked OTP, expired/missing tokens, loopback request origins and spoofed Host headers. Server-action tests cover neither image, logo only, banner only and both, preserving pending seller approval. A local browser fixture using the real registration components and mocked network actions verified all four image combinations, back/next persistence and retry persistence. It created no account and sent no mail. Reproduce with `node scripts/qa-registration-ui.mjs` and serve `../registration-ui-preview` locally after a build.

The native VDS staging runtime passed 25 marketplace checks (9 public products) and specific recovery/callback redirects and reset-form checks. Localized `/az/auth/confirm` first canonicalizes to `/auth/confirm`; both paths then use the public origin. No genuine user recovery token was logged or consumed during these checks, and no user's password was changed. A previously clicked real email may already have consumed its one-time token; request a fresh recovery email for the owner-controlled final password entry.
