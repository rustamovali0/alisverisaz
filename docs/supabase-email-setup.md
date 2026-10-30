# ALİSVERİS.AZ e-poçt sistemi

29 oktyabr 2026. Göndərən `ALİSVERİS.AZ <no-reply@alisveris.az>`, SMTP hesabı isə bu aliasın bağlı olduğu `admin@alisveris.az` qutusudur. Hostinger SMTP girişi ayrıca yoxlanılıb. Şifrə repozitoriyada saxlanmır. Yeni sistemin göndəriş açarları miqrasiyalarda standart olaraq söndürülüb; yalnız yoxlanılmış server quraşdırması onları aktivləşdirir.

## Quruluş

Şifrə bərpasını **Supabase Auth** göndərir. Next.js tətbiqində artıq ayrıca SMTP/generateLink göndəricisi yoxdur. Supabase recovery şablonundakı TokenHash `/auth/confirm` route-unda `verifyOtp` ilə yoxlanılır, public cookie yazılır və yeni şifrə səhifəsi açılır. Link başqa cihazda da PKCE cookie-si olmadan işləyir. Yanlış/vaxtı bitmiş link yenidən bərpa səhifəsinə yönəlir. Cavablar hesabın mövcudluğunu açıqlamır; rate limit qalır. Şifrə yeniləndikdə əvvəlki sessiyalar revoke edilir və global signOut çağırılır. Şifrə və recovery tokeni e-poçt növbəsinə, analitikaya və ya göndəriş jurnalına yazılmır.

Əməliyyat e-poçtları **Supabase Postgres → email_outbox → server worker** axını ilə işləyir. Trigger eyni DB transaction daxilində növbə yazır: rollback edilmiş sifariş üçün e-poçt qalmır. SMTP şəbəkə işi sifariş sorğusunu gözlətmir. Sifariş məzmunu worker-də serverdəki cari məhsul/qiymət məlumatlarından oxunur; client qiymətindən istifadə edilmir.

| Hadisə | Alıcı |
|---|---|
| Yeni sayt/WhatsApp sifariş müraciəti | Müştəri və həmin mağazanın satıcısı; uyğun guest email varsa qonaq da |
| Təsdiq, hazırlıq, göndəriş, çatdırılma, ləğv | Hər iki tərəf |
| Sifarişin ödəniş statusu dəyişməsi | Hər iki tərəf; kart provayderi əlavə edilmir |
| Qeydiyyat | Yeni alıcı/satıcı profili və ayrıca `admin@alisveris.az` bildirişi |
| Satıcı hesabının təsdiqi, mağaza statusu | Satıcı |
| Yeni müştəri mesajı və satıcı cavabı | Müvafiq qarşı tərəf |
| Yeni rəy, 5 və aşağı stoka keçid | Satıcı |
| Məhsul moderasiyası, VIP nəticəsi, sistem bildirişi | Mövcud `notifications` qeydinə uyğun hesab |
| Promo kod və kampaniya | Yalnız ayrıca marketing seçimini aktiv etmiş istifadəçi |
| Şifrə/e-poçt dəyişmə təhlükəsizlik məktubu | Supabase Auth-un təhlükəsizlik şablonları; sonradan aktivləşdirilir |

Administrator ünvanları avtomatik kütləvi alıcı siyahısına daxil edilmir. WhatsApp müraciəti “ödəniş təsdiqi” kimi təqdim edilmir. Daxili arxivləmə statusu müştəriyə yeni məktub yaratmır. Sifariş xülasəsində mağaza, məhsullar, miqdar, çatdırılma və AZN yekunu var. Keçidlər yalnız tətbiqin öz domeninə qurulur; HTML escape edilir. Məktubda şəxsi mesajın tam mətni göstərilmir.

Müştəri və satıcı ayarlarına e-poçt seçimləri əlavə olunub. `email_preferences` RLS ilə yalnız sahibinə açıqdır. Adi əməliyyat bildirişləri söndürülə bilər; marketing standart olaraq bağlıdır. Şifrə bərpası və təhlükəsizlik məktubları bu seçimin arxasında gizlədilmir. Worker göndərmə anında seçim, cari email və sifariş sahibliyini yenidən yoxlayır.

## Aktivləşdirmə sırası

1. Hər iki SQL miqrasiyası canlı self-hosted DB-yə atomik tətbiq edilir (`deploy/email-worker/install-schema.py`). Göndəriş hələ bağlı qalır; keçmiş hadisələr backfill edilmir.
2. Yoxlanılmış Next.js release yerləşdirilir. Miqrasiyasız deploy edilməməlidir: köhnə birbaşa SMTP funksiyaları artıq yoxdur.
3. `deploy/email-worker/activate.py` mövcud Hostinger SMTP hesabını TLS ilə yoxlayır, yeni tətbiqin public Auth şablonlarını yoxlayır, GoTrue SMTP/TokenHash recovery və təhlükəsizlik məktublarını aktivləşdirir. Auth sağlam açılmasa əvvəlki konteyner bərpa edilir. Qeydiyyat auto-confirm rejimi dəyişdirilmir.
4. Self-hosted Node adapteri üçün ayrıca runtime asılılıqları, qorunan config, dəqiqəlik flock scheduler və məhdud logrotate qurulur. Worker və DB göndəriş açarları açılır. Bir dəfəlik test yalnız `admin@alisveris.az` ünvanına növbələnir.
5. Sahibin inbox-unda çatma və recovery → yeni şifrə → əvvəlki sessiyanın bağlanması ayrıca yoxlanılır. Test üçün real müştərilərə kampaniya və sifariş yaradılmır.

SPF, DKIM, DMARC və MX qeydləri Hostinger panelinin dəyərləri ilə Cloudflare-də qurulub. Hostinger-də `no-reply` ayrıca mailbox deyil, `admin` qutusunun aliasıdır. Şifrə Supabase Auth konteynerində və qorunan server worker konfiqurasiyasında olur; frontend-ə və Git-ə yazılmır.

Alternativ managed Edge yerləşdirməsi üçün `email-dispatch` funksiyası verilib. Gateway JWT yoxlaması bağlı deyil (`verify_jwt=true`); service JWT-si ilə yanaşı 32+ simvolluq dispatch secret tələb edir. Bu alternativ hazırkı self-hosted backend-i Cloud layihəsinə miqrasiya etmir. `email-config.example.toml` yalnız istinad nümunəsidir.

## Növbənin davranışı və nəzarət

- `email_outbox` və settings cədvəli anon/authenticated rollarına bağlıdır. Claim/ack RPC-ləri yalnız service_role üçündür. İstifadəçi növbəyə saxta alıcı yaza bilməz.
- Event key yeni sifarişin buyer/seller məktublarını təkrarlanmadan yaradır. Eyni statusun təkrar yazılması məktub yaratmır. Məktub işi `SKIP LOCKED`, 10 dəqiqəlik lease və təsadüfi ack token ilə götürülür. Köhnə worker yeni worker-in işini təsdiqləyə bilmir.
- Xəta zamanı 30 saniyədən başlayan exponential backoff, maksimum 6 cəhd, 7 gün expiry var. Sonra failed olur. Şəbəkə işi yarımçıq qalsa lease müddətindən sonra yenidən sınanır. Email söndürülərsə və ya ünvan/seçim dəyişərsə queued iş skipped olur.
- SMTP ən azı bir dəfə göndəriş semantikasıdır: server məktubu qəbul etdikdən sonra ack itərsə təkrar məktub mümkündür. Sabit Message-ID istifadə olunur, amma SMTP üçün “exactly once inbox delivery” zəmanəti verilmir. `sent` SMTP-nin qəbul etməsi deməkdir, inbox-a çatma/bounce təsdiqi deyil. Provayder məlum olduqda onun bounce webhook-u ayrıca uyğunlaşdırılmalıdır.
- Monitoring üçün service SQL: `select id,kind,status,attempt_count,last_error_code,created_at from public.email_outbox order by created_at desc limit 100;`. Payload və ünvanları ümumi loga çıxarmayın. Saxlama müddəti/backlog təmizləmə siyasəti aktivləşdirmədə ayrıca müəyyənləşdirilir; silmə işi avtomatik yaradılmayıb.
- Təcili dayandırma: DB `enabled=false`, Function `EMAIL_DELIVERY_ENABLED=false`, scheduler pause. Recovery/Auth məktubları ayrıca Supabase Auth parametrləri ilə idarə olunur.

## Təkrar yoxlama

```sh
npm test
npm run typecheck
npm run build
npx deno check --config supabase/functions/email-dispatch/deno.json supabase/functions/email-dispatch/index.ts
```

PGlite testləri trigger transaction/rollback, buyer/seller ayrılığı, opt-in/RLS, private RPC icazələri, stale lease və 6-cəhd sərhədini icra edir. Worker testləri secret/disabled guard, serverdəki alıcı, HTML/subject sanitizasiyası, backoff ACK və xülasəni yoxlayır. Bu testlər SMTP/inbox çatmasını və real şifrə dəyişməsini əvəz etmir.

Mənbələr: [Supabase Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [SSR recovery](https://supabase.com/docs/guides/auth/passwords), [Edge SMTP nümunəsi](https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/send-email-smtp).

## Canlı self-hosted backend və RAdmin

Saytın backend-i `https://api.alisveris.az`-dır. Ayrıca `fxfycfkwodywmnzgkyvl` Cloud layihəsinə saytın istifadəçiləri və sifarişləri köçürülmür. Canlı sistemdə Edge runtime əvəzinə eyni paylaşılan handler-i `scripts/email-worker.mjs` Node adapteri çağırır. `scripts/build-email-worker.mjs` worker-i paketləyir; `deploy/email-worker/package-lock.json` onun ayrıca runtime asılılıqlarını kilidləyir. `/home/deploy/alisveris-email-service/config.json` yalnız serverdə, deploy istifadəçisi üçün 0600 icazəsində saxlanır. Cron dəqiqədə bir `flock` ilə başlayır; məktub göndərmək üçün açıq HTTP endpoint yaradılmır. Jurnal yalnız say və xəta kodlarını saxlayır, logrotate ilə məhdudlaşır.

Root mərhələləri: `deploy/email-worker/install-schema.py` hər iki SQL miqrasiyasını yoxlama cəmləri ilə atomik tətbiq edir; sonra tətbiq yerləşdirilir; `deploy/email-worker/activate.py` əvvəl SMTP TLS/login və public şablonları yoxlayır, mövcud GoTrue konteynerinin konfiqurasiyasını qoruyaraq SMTP-ni aktivləşdirir. Yeni Auth sağlam açılmasa əvvəlki konteyner bərpa edilir. Qeydiyyatın mövcud auto-confirm davranışı dəyişdirilmir. Bir dəfəlik quraşdırma məktubu yalnız sahibin `admin@alisveris.az` ünvanına növbələnir. Həqiqi müştərilərə test kampaniyası və test sifarişi yaradılmır.

`/radmin/email` ayrıca RAdmin sessiyası tələb edir. Alıcılar, satıcılar, hər ikisi və maksimum 1000 seçilmiş hesab hədəflənə bilər. Göndərməzdən əvvəl cari icazələrə uyğun alıcı sayı göstərilir və təsdiq alınır. Təkrar sorğu eyni request ID ilə ikinci kampaniya yaratmır. Şablonlar serverdə saxlanır; `{ad}`, `{magaza}`, `{sayt}` dəyişənləri mətn olaraq əvəzlənir, HTML icra edilmir. Marketing göndərişi yalnız opt-in hesabları əhatə edir. Servis məktublarında da transactional seçim qorunur. Tarixçə səhifələnən alıcı statuslarını göstərir; `sent` SMTP qəbuludur, inbox zəmanəti deyil.

## Ayrı Cloud layihəsi üçün beşgünlük sorğu

`supabase/setup/cloud-keepalive.sql` yalnız `fxfycfkwodywmnzgkyvl` layihəsində sabit `1` qaytaran, məlumat oxumayan RPC yaradır. `src/instrumentation.ts` serveri başlatdıqda `src/lib/supabase/keepalive.ts` işə düşür. Feature flag açıqdırsa son uğurlu vaxt qorunan `/srv/alisveris/state/cloud-keepalive.json` faylında saxlanır; restart intervalı sıfırlamır. Saatlıq yoxlama beş gün tamamlananda tək query göndərir. Xəta/pause zamanı uğurlu vaxt yenilənmir və bir saat sonra yenidən sınanır. Yalnız publishable/anon açarı qəbul edilir, service_role rədd edilir. Paralel proseslər fayl kilidi ilə qorunur. Bunun üçün Codex avtomatlaşdırması və ya istifadəçinin kompüterinin açıq qalması tələb olunmur. Beşgünlük sorğu Supabase Free layihəsinin pause edilməyəcəyinə zəmanət vermir.

Test edilmiş schema, RLS və kampaniya davranışı lokal PGlite bazasında icra edilir. Canlı inbox və tam reset dövrü ayrıca yoxlamadır; avtomatlaşdırılmış test nəticələri real məktubun çatma sübutu hesab edilmir.
