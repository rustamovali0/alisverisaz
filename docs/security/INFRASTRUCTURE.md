# VDS konfiqurasiya qeydləri

2026-11-02 read-only yoxlama: Nginx/Redis/UFW systemd service-ləri active, Fail2ban inactive; **UFW service active olması firewall qaydalarının təsdiqi deyil**. SSH 22 və HTTP 80/443 public listen edir. App 3004, Redis 6379 və PostgreSQL 5432 loopback-dədir. Root domain Cloudflare-proxied-dir; adi bir HEAD sorğusunda origin IP-yə SNI/Host ilə birbaşa giriş də `200 nginx` qaytarıb. Deməli CDN bypass hazırda mümkündür. API/media DNS də Cloudflare ünvanlarına çözülüb; bütün başqa vhost/subdomain-lər yoxlanılmayıb.

**18:13 UTC yenilənmə:** əsas marketplace Nginx real-IP/coarse limit konfiqurasiyası,
ayrıca authenticated AOF/noeviction Redis, native Auth və yeni tətbiq release-i
root operator ilə aktivləşdirildi. Release retention/logrotate bundan əvvəl
quraşdırılıb. [Yekun production hesabatı](PRODUCTION_DEPLOYMENT_20261102.md)
faktiki vəziyyəti göstərir. Firewall/SSH/DNS dəyişdirilməyib; Fail2ban, resource
alert timer və OS update nümunələri operator review tələb edir.

- Nginx real-IP mənbələri rəsmi CF CIDR-lərindən; app üçün X-Real-IP/XFF overwrite və visitor True-Client-IP/X-Vercel header-lərinin təmizlənməsi. Port 3004 public-a açılmır.
- Auth POST-ları 60/dəq coarse ingress + app-də hesab səviyyəsində 5/15 dəq; dynamic catalogue SSR səhifələri də ayrıca coarse limitə daxildir. Paylaşılan IP-lər üçün burst saxlanılır; staging-də trafikə uyğunlaşdırın.
- Origin allowlist yalnız review edilmiş vhost-lara. Eyni VDS-də digər xidmətlər və ACME yenilənməsi nəzərə alınmalıdır. UFW qaydalarını automat dəyişməyin; SSH idarəetmə CIDR-i sabit deyilsə onu təsadüfən bağlamayın. Provider console və vaxtlı rollback hazır olsun.
- SSH: deploy açarı ilə giriş təsdiqlənib. Root password/keyboard login-i yalnız alternativ root/console yolu yoxlanıldıqdan sonra məhdudlaşdırın. Root şifrəsi əvvəlki istifadəçi ekran görüntüsündə görünmüşdü: dəyəri burada təkrarlanmır; ayrıca rotasiya edilməlidir. Mövcud açarlar və poçt/DB açarları yenidən istifadə edilmişdirsə providerdə inventory/rotation planı qurun.
- Fail2ban SSH jail-i root tərəfindən enable/test; Cloudflare proxied HTTP loglarına origin `$remote_addr` yanlış yazılıbsa HTTP jail-də CF IP-lərini ban etməyin.
- Ubuntu updates: əvvəl snapshot/backup recovery yoxlaması, paket siyahısı, maintenance window. OS major upgrade bu task-da edilmir. Unattended security updates ayrıca root review. Container image digest və Docker socket/mount-ları root auditindən keçməlidir; non-root/read-only filesystem yalnız image və writable data-path uyumluluğu yoxlanıldıqdan sonra.
- Nginx/PM2 sanitised loglar 401/403/429/5xx sayımına, tətbiqin JSON `type=security` hadisələri rate/CAPTCHA/storage/upload/MFA səbəblərinə xidmət edir. Query, raw cookies, body və auth header-lərini access logdan çıxarın. Backend GoTrue/Kong loglarını da ayrıca yoxlayın.
- `resource-check.py`: Linux-da disk <10%, RAM <10%, CPU load >2×CPU, Nginx inactive olduqda JSON warning/exit2; success zamanı səssizdir. Timer/alerts root tərəfindən qoşulmalıdır; yeni ödənişli xidmət və məktub göndərişi yoxdur.
- Redis cache eviction rate counter-lərini silə bilər: bu deployment-də ayrıca authenticated 16379 limiter, noeviction və AOF/everysec aktivləşdirilib; shared cache 6379 dəyişməyib. Capacity/ACL review və restart/recovery məşqi ayrıca davam edir. Redis L7 rate limiter volumetric DDoS müdafiəsi deyil.
