# Cloudflare — yoxlanılmış vəziyyət və manual sazlama

Audit: 2026-11-02. Normal DNS/HEAD yoxlaması: `bailey.ns.cloudflare.com`, `bayan.ns.cloudflare.com`; sayt cavabında `server: cloudflare` və `cf-ray` var. Bu, marketplace trafikinin proxy üzərindən keçdiyini təsdiqləyir. WAF/Bot qaydalarının və planın aktivliyi public cavabdan müəyyən edilmir. API tokeni yoxdur; hesab/panel dəyişdirilməyib.

## Sıra və plan imkanları

1. Zone → DNS → Records: əsas sayt və uyğun `www` üçün Proxied statusunu yoxlayın. `api`, `images`, subdomain və digər vhost-ları ayrıca inventarlaşdırın. MX/SMTP qeydlərini proxy etməyin. DNS-only hostlara Cloudflare HTTP WAF tətbiq olunmur.
2. SSL/TLS → Overview: origin sertifikatı/hostname uyğunluğu yoxlanıldıqdan sonra Full (strict). Flexible işlətməyin. Edge Certificates → Always Use HTTPS; Minimum TLS 1.2, TLS 1.3. HSTS includeSubDomains/preload-u ayrıca subdomain auditindən əvvəl aktivləşdirməyin.
3. Security → WAF / Security rules → Managed rules: mövcud plandakı qayda dəstini yoxlayın. Free-də **Free Managed Ruleset** var; tam Managed/OWASP dəstlərini aktiv hesab etməyin. Pro və yuxarı planlar əlavə imkan verir; paneldə availability yoxlanılmalıdır.
4. Security → Bots: Free üçün Bot Fight Mode mövcuddursa checkout/Auth, SEO verified bots və üçüncü tərəf callback-lərini staging ilə yoxlayaraq aktivləşdirin. Super Bot Fight Mode/Bot Management eyni məhsul deyil və plan məhdudiyyəti var. Global “Under Attack Mode” gündəlik rejim deyil; insident zamanı təsiri ölçülərək tətbiq olunur.
5. Rate limiting: hazırkı rəsmi cədvəldə Free 1, Pro 2, Business 5 qayda göstərilir; ifadə sahələri və sayma/mitigation müddətləri fərqlidir. Free qaydanı ən riskli Auth yoluna ayırın; bütün login/register/reset yollarının eyni qaydaya sığmasını paneldə yoxlayın. API/UI Server Actions POST-ları adi `/login` səhifəsinə gedir; yalnız `/api/auth` qorumaq kifayət deyil. Backend `/auth/v1/*` ayrıca hostdur.
6. Custom rules: yüksək şübhəli trafik üçün əvvəlcə Managed Challenge. Bütün POST-ları challenge etməyin: Supabase refresh, webhook, checkout və tətbiqin fetch sorğuları pozula bilər. Telegram istisnası yalnız konkret yol/metod üçün olmalıdır; serverdə secret yoxlaması qalır. Verified botları SEO üçün kor-koranə bloklamayın.
7. Turnstile → Add widget: production/staging üçün ayrıca widget, dəqiq hostname siyahısı, managed mode. App üçün site/secret cütünü yalnız env vasitəsilə qurun. `AUTH_CAPTCHA_MODE=supabase` zamanı Auth tokenini GoTrue bir dəfə doğrulayır; digər formalar application Siteverify ilə doğrulanır. Siteverify tokeni 5 dəqiqəlik və birdəfəlikdir. Supabase Auth-da native CAPTCHA aktivləşdirilmədən direct Auth API müdafiə edilmiş sayılmır.
8. Cache Rules: `/api/auth/*`, `/api/notifications`, `/auth/*`, `/reset-password`, `/radmin*`, `/dashboard*`, `/store/dashboard*` və bütün POST-larda cache bypass. Recovery URL/query/cookie-ni log/analytics-ə göndərməyin. HTML üçün “Cache Everything” tətbiq etməyin.
9. Origin müdafiəsi: əvvəl etibarlı real-IP konfiqurasiyasını staging-də sınayın. Sonra yalnız audit edilmiş HTTP vhost üçün Cloudflare mənbə CIDR allowlist/AOP hazırlayın. Bütün 80/443 portlarına avtomatik firewall allowlist tətbiq etməyin: eyni VDS-də DNS-only API/media və başqa saytlar ola bilər. SSH/22 və idarəetmə tuneli dəyişdirilmir.

## Risk və rollback

Əvvəl bütün mövcud qaydaları export edin. Hər dəyişiklikdən sonra yalnız aşağı həcmli normal giriş/qeydiyyat/səbət/çatdırılma/mail-link sınağı aparın. Yeni qaydanı ayrıca adlandırın. Problem olsa yeni qaydanı disable edin; bütün qorumanı söndürməyin. TLS konfiqurasiyasını əvvəlki verified rejimə qaytarın; Flexible-a keçməyin. Origin firewall qaydasını yalnız ikinci açıq SSH/provider konsolu və vaxtlı rollback mexanizmi ilə dəyişin.

Rəsmi mənbələr: [WAF availability](https://developers.cloudflare.com/waf/), [rate limiting plans](https://developers.cloudflare.com/waf/rate-limiting-rules/), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Cloudflare IP lists](https://www.cloudflare.com/ips/). Plan imkanları dəyişə bilər; quraşdırma vaxtı paneli yoxlayın.
