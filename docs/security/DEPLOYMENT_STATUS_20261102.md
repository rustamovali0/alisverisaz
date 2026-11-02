# Deployment vəziyyəti — 2 noyabr 2026

Saat **14:18 Asia/Baku** yoxlaması yalnız oxuma ilə aparıldı. Bu mərhələdə yeni backup, restore, migration və ya production switch başladılmadı.

- Production `header-hover-20261101/app` release-ində, `alisveris-vds`, port 3004, PID 2607893, 0 restart ilə işləyir.
- Təhlükəsizlik release-i `enterprise-security-20261102/app`, yalnız loopback 3104 staging-dədir. 25 smoke yoxlaması keçib; ayrıca izolə Redis-də 40 paralel testin 5-i qəbul, 35-i rədd edilib.
- Sayt, Auth health və database REST oxusu HTTP 200 qaytarıb. Production PostgreSQL recovery rejimində deyil; status anında aktiv backup/migration işi görünməyib.
- `security_consume_rate`, profile security trigger və MFA configuration hələ production bazasında yoxdur: üç təhlükəsizlik migration-ı tətbiq edilməyib.
- Mövcud əsas Auth container-i 30 oktyabrdan işləyir, 0 restart; açıq signup hələ bağlıdır. Yeni CAPTCHA/Auth konfiqurasiyası aktivləşdirilməyib.
- `pg_dump`, `pg_basebackup`, `pg_restore`, `openssl` və gzip backup prosesi tapılmayıb. Yoxlanılan layihə backup qovluqlarında 2 noyabr üçün yeni database backup-ı yoxdur.
- Tapılan 19 köhnə arxivdən 18-i TOC və tam `pg_restore --file=/dev/null` oxunma/decode yoxlamasından keçib; 1-i 0 baytdır və bərpa üçün yararsızdır. Bunlar 9–15 oktyabr tarixlidir, bəziləri yalnız schema/test snapshot-ıdır. Heç biri cari 2 noyabr məlumatlarının backup-ı kimi təsdiqlənməyib.
- İzolə bazaya həqiqi restore testi edilməyib. Arxivin oxunması onun cari məlumatları tam bərpa edəcəyinə zəmanət deyil.

`Preparing database backup` mərhələsində hazırda işləyən/ilişən job sübutu yoxdur; yeni backup başladıldığını təsdiqləyən fayl və ya uğur marker-i tapılmayıb. Production keçidi hələ prerequisite/backup mərhələsini gözləyir. Növbəti təhlükəsizlik deployment addımı cari bazadan yeni backup, yoxlama və Nginx/Auth/limiter uyğunluğunun tamamlanmasıdır; bu status yoxlaması onları təkrarlamayıb.

İstifadəçinin sonrakı disk təmizləmə tapşırığı ayrıca [release retention siyasəti](RELEASE_RETENTION.md) ilə icra olunur. Database backup-ları bu təmizləmədə silinmir.

## Disk təmizləməsi tamamlandı — 19:07 Asia/Baku

- Canonical installer/source checksum fərqi düzəldildi və qoruma saxlanıldı. İlk uyğunsuz cəhd silinmə və cron dəyişikliyindən əvvəl dayanmışdı.
- Quraşdırıcı statusu `complete`: 12 köhnə release və 7 istifadə olunmayan legacy build/dependency surəti silindi.
- Faktiki boşalan yer **2 361 569 280 bayt** (təxminən 2,20 GiB); ölçülmüş boş yer **16 253 464 576 bayt**. `df -h /`: 47% istifadə, təxminən 16G boş.
- Root-owned `0750` cleanup script və root-owned cron yoxlanılıb. `cron` active; gündəlik `23:17 UTC` = **03:17 Asia/Baku**. Logrotate konfiqurasiyası quraşdırılıb.
- `branded-email-20261030`, `header-hover-20261101`, `enterprise-security-20261102`, `rtest-premium-20261014` və saved PM2 `vps-test` qorunub. Pending deployment pin-i saxlanır.
- Cleanup sonrası sayt, Auth health və limit=0 database REST SELECT yoxlamaları 200 qaytarıb. Əsas tətbiq PID 2607893, RTest PID 211116 və staging PID 2699199 dəyişməyib; hərəsində 0 restart.
- Database backup-ları, database və Auth ayarları dəyişdirilməyib. Təmizləmə təkrarlanmayıb; nəticə faylı və canlı servislər yalnız oxunub.
- **Təhlükəsizlik tətbiq release-i hələ production-a keçirilməyib.** Bu mərhələdə yalnız maintenance retention aktivləşdirilib; yeni backup və üç təhlükəsizlik migration-ı bu əməliyyatda başladılmayıb.

## Canlıya keçidin davamı — root hazırlıq mərhələsi

- `prepare-redis.mjs` ilə ayrıca `alisveris-security-redis` PM2 prosesi yaradılıb və online yoxlanıb. Loopback 16379, 64 MB, `noeviction`, authenticated, AOF/everysec. Mövcud cache Redis və production app dəyişməyib.
- Candidate private env native `AUTH_CAPTCHA_MODE=supabase`, trusted nginx və ayrıca limiter üçün hazırdır. Turnstile açarlarının mövcudluğu, məlum test sitekey olmadıqları yoxlanıb; dəyərləri çıxarılmayıb.
- Yoxlanmış [guarded rollout](GUARDED_ROLLOUT.md) root operator üçün serverə yüklənib. Yerli/server payload checksum-ları eynidir. Əlavə 7 rollout safety və 4 authenticated-backup testi keçib; əvvəlki 10 retention testi yenidən keçib.
- `rollout.py prepare` üçün operator sorğusu verilib. Son oxuma anında `rollout-result.json` yoxdur: yeni backup/isolated restore/migration/Auth activation və production switch-in tamamlanması hələ təsdiqlənməyib.
- Əvvəl `prepare`, sonra off-server backup authentication və ayrıca `activate` tələb olunur. Heç bir mərhələ mövcud journal vəziyyətini yoxlamadan təkrarlanmır. Uğur marker-i alınana qədər release staging kimi qiymətləndirilir.

## İlk root hazırlıq nəticəsi — 17:14 UTC

- `rollout.py prepare` nəticəsi `prepare-failed`, mərhələ `isolated-restore-migration-auth`: müvəqqəti Auth health timeout. Canlı app/Auth/nginx aktivləşdirilməyib.
- Cari archive **1 283 934 bayt**, SHA256 receipt-də saxlanılıb. Backup creation, TOC/decode və disposable restore/SQL mərhələləri Auth health yoxlamasından əvvəl istisnasız keçib; bütün prepare mərhələsi uğurlu kimi qiymətləndirilmir.
- İlkin skript temporary container-in logunu silinməzdən əvvəl saxlamadığı üçün konkret startup səbəbi receipt-də yoxdur. Startup log retention/redacted diagnostic və fallback alias isolation əlavə edildi; xəta aradan qalxmış kimi təqdim edilmir.
- `resume-prepare` yalnız mövcud archive hash-i və dəyişməmiş live/candidate vəziyyəti ilə davam edir. `pg_dump` və production DDL çağırmır. Operator üçün serverdə exact script hash-i və sintaksis yoxlanıb. 4 yeni regression testi daxil olmaqla **21 Python testi** keçib.
- Son read-only yoxlamada app PID 2607893 və Auth 9998 health dəyişməyib, hər ikisi HTTP 200. Native Auth version v2.197.0. Tətbiq hələ əvvəlki release-dədir.
- Əvvəlki ops commit `bce88de` üçün GitHub Actions run `41478291127` **success**; yeni resume patch-in CI nəticəsi ayrıca izlənməlidir.

## İzolə Auth səbəbi müəyyən edildi — 17:38 UTC receipt

- Davam cəhdində eyni backup SHA256 təsdiqlənib, yeni dump yaradılmayıb. Startup logunda `schema_migrations` cədvəlinin `public` sxemində yaradılmasına `42501` icazə xətası görünür. Temporary Auth 9 restart edib; finally blokunda həmin temporary container/database silinib.
- Bu, yeni adlı restore bazasının Auth login `search_path`/namespace konfiqurasiyası ilə bağlıdır. Kod yalnız disposable hədəfdə database/role `search_path=auth,public` və Auth connection URL/namespace ayarlarını uyğunlaşdırır. Restore edilmiş `auth.schema_migrations` mövcudluğu və Auth rolunun həmin schema/table icazələri yoxlanır. `public` üçün əlavə CREATE grant yoxdur; production role/database defaults dəyişmir.
- Düzəlişdə **24 Python + 4 Node crypto testi** keçib. Lokal/server canonical `rollout.py` checksum-u eynidir, sintaksis yoxlanıb. Əvvəlki uğursuz cəhdin hash marker-i silinməyib; yeni, fərqli script yalnız bütün state/backup guard-ları yenidən keçəndən sonra sınağa buraxılır.
- Operatora eyni `resume-prepare` komandası yeni script ilə verilib. Root sınağı uğur marker-i qaytarmayınca native Auth health/CAPTCHA və canlı deployment tamamlanmış hesab edilmir.
- Son read-only yoxlamada main PID 2607893, staging PID 2699199 dəyişməyib. Main HTTP və Auth health 200; main app hələ `header-hover-20261101/app`-dir.
