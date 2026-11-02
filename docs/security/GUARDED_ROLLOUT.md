# 2 noyabr təhlükəsizlik release-i üçün konkret keçid

**Bu keçid artıq 18:13:52 UTC-də tamamlanıb.** Cari status və sübutlar
[production hesabatındadır](PRODUCTION_DEPLOYMENT_20261102.md). Aşağıdakı əmrlər
icra edilmiş prosedurun sənədidir; uğurlu deployment-i təkrarlamaq üçün deyil.

Bu prosedur yalnız `enterprise-security-20261102/app`, self-hosted
`alisveris_candidate_20261010` bazası və mövcud `9998` Auth servisinə aiddir.
Supabase Cloud `fxfycfkwodywmnzgkyvl` dəyişdirilmir. Yeni firewall, SSH, DNS və
ödənişli Cloudflare xidməti aktivləşdirilmir.

## Hazırlıq

`prepare-redis.mjs` deploy hesabı ilə ayrıca `127.0.0.1:16379` limiter-i yaradır:
64 MB, `noeviction`, AOF/everysec, random parol, private 0600 fayllar,
PM2 supervisor. State release-lərdən kənarda
`/home/deploy/alisveris-security-state/redis` saxlanır. Mövcud cache Redis-ə
toxunmur. State artıq varsa əmri təkrarlamaq əvəzinə yoxlayın.

Root operator yoxlanmış payload ilə:

```sh
python3 /home/deploy/alisveris-security-setup/rollout.py prepare
```

Skript əvvəlki tətbiq/primary Auth/database/schema vəziyyətini yoxlayır; backup
prosesi işləyirsə yenisini yaratmır. Payload hash-lərini təsdiqləyir, root-private
snapshot götürür. Cari PostgreSQL-dən custom archive hazırlanır, TOC və bütün
arxiv decode edilir, sonra random adlı ayrıca bazaya tam restore olunur.
Restore bazasında üç migration vahid transaction, 5s lock timeout və 45s
statement timeout ilə sınanır. Workers bu bazaya bağlanmır. Eyni immutable Auth
image-i 19998 loopback portunda, ayrı JWT secret və söndürülmüş SMTP ilə
yoxlanır. CAPTCHA-sız bir lokal müraciət CAPTCHA xətası almalıdır. Müvəqqəti
container/baza yoxlamadan sonra silinir; production məlumatları bərpa edilmir.

Nginx-in tam müvəqqəti konfiqurasiyası `nginx -t` ilə yoxlanır. Cloudflare
CIDR-ləri official API-dən alınır; yalnız göstərilən CIDR-lərə etibar edilir.
Əsas marketplace vhost-unda upstream IP header-ləri overwrite edilir.
RTest/backend vhost-ları, TLS sertifikatları və upstream ünvanları saxlanır.

Backup AES-256-GCM + RSA-OAEP/SHA256 ilə şifrələnir. Serverdə yalnız public
wrapping key var. Şəxsi recovery key operatorun Mac-ində repo xaricində 0600
fayldır. Tam ciphertext authentication keçmədən plaintext silinmir.
Serverdə root-private encrypted nüsxə qalır; deploy yalnız şifrəli export-u
oxuya bilir. Mövcud köhnə DB backup-ları dəyişdirilmir.

## Serverdən kənar yoxlama və canlıya keçid

Operatorun Mac-ində mövcud private recovery qovluğu ilə avtomatik verification:

```sh
node deploy/security/verify-offserver.mjs /absolute/private/recovery-directory
```

Bu lokal köməkçi root receipt-in `prepared` olmasını tələb edir. Mövcud deploy
SSH açarı ilə yalnız ciphertext/metadata/receipt endirir, private recovery key-i
heç vaxt serverə ötürmür. GCM authentication, ciphertext/metadata hash-i,
plaintext ölçü/hash-i yoxlanır; yalnız uğurdan sonra off-server verification
receipt-i serverə yüklənir. Müvəqqəti plaintext private 0600-dır və finally-də
silinir. Bu köməkçi özü production deployment başlatmır.

Şifrəli `database.dump.enc` və onun `.json` metadata-sını ayrıca private recovery
qovluğuna endirin. Ciphertext/metadata SHA256-larını `rollout-result.json` ilə
müqayisə edin, yerli şəxsi açarla authenticate edin və plaintext SHA256-nı
hazırlıq nəticəsi ilə yoxlayın. Private key serverə/Git-ə yüklənmir. Bu ayrıca
yoxlamanın hash receipt-i `offserver-verified.json` kimi serverə ötürülür.

```sh
node deploy/security/backup-crypto.mjs verify /private/path/database.dump.enc /private/path/private.pem
```

Bu CLI yalnız authenticate edir, plaintext çıxarmır. Plaintext hash müqayisəsi
üçün `verifyBackup` export-unu root olmayan lokal prosesdə private müvəqqəti
fayla çağırın, hash-lədikdən sonra həmin faylı silin.

```sh
python3 /home/deploy/alisveris-security-setup/rollout.py activate
```

Aktivləşdirmə prepared backup-ın altı saatdan yeni olmasını, off-server receipt-i,
Auth/nginx/candidate fayl hash-lərini və dəyişməmiş production PID-ni tələb edir.
Üç additive SQL migration bir transaction-da tətbiq edilir; admin MFA flag-i
OFF qalır. Nginx sintaksisdən sonra graceful reload edilir. Auth eyni immutable
image, database/JWT/SMTP/provider konfiqurasiyası ilə klonlanır; yalnız native
Turnstile və email-confirmed signup aktivləşdirilir. Sonra tətbiq 3004-ə
keçirilir və 25 read-only smoke yoxlaması çalışır. Real sifariş, məktub və hesab
yaradılmır. PM2 save edilir, köhnə Auth stopped vəziyyətdə rollback üçün qalır.

## Dayanma və rollback

İlkin `prepare` müvəqqəti Auth health mərhələsində dayanarsa və mövcud
`database.dump` hash-i receipt ilə eyni qalarsa, ayrıca yoxlanmış davam əmri var:

```sh
python3 /home/deploy/alisveris-security-setup/rollout.py resume-prepare
```

Bu əməl `pg_dump` çağırmır və production migration tətbiq etmir. Mövcud arxivi
oxuyur, canlı PID/Auth/ingress/candidate vəziyyətinin dəyişmədiyini yoxlayır və
yalnız disposable restore/Auth sınağını yenidən qurur. Eyni resume script hash-i
ikinci dəfə qəbul edilmir: növbəti cəhddən əvvəl diagnostic yoxlanmalıdır.
Müvəqqəti Auth-un DB URL və port fallback alias-ləri də izolə hədəfə qoyulur.
Xəta logu container silinməzdən əvvəl root-private saxlanır; receipt-dəki qısa
diaqnostikadan env dəyərləri, URL-lər, email və JWT çıxarılır.

İzolə Auth üçün restore edilmiş `auth.schema_migrations` tarixçəsi məcburidir.
`pg_dump`-dan yeni adlı database-ə restore per-database login `search_path`
ayarlarını avtomatik köçürmür. Ona görə yalnız disposable database və onun Auth
rolu üçün `search_path=auth,public` qoyulur; eyni seçim yalnız temporary Auth-un
connection URL/namespace ayarlarına da yazılır. Mövcud `auth` schema/table
icazələri `SET LOCAL ROLE` ilə yoxlanır. Production database/role defaults
dəyişmir, `public` üçün CREATE və digər yeni grant verilmir.

`prepare` və `activate` state journal ilə işləyir. Eyni mərhələ tamamlanıbsa və
ya uğursuzdursa təkrar backup/DDL/switch etmirlər. Əvvəl nəticəni yoxlayın:

```sh
python3 /home/deploy/alisveris-security-setup/rollout.py status
```

Canlı keçid zamanı xəta olsa app private əvvəlki PM2 config-ə, Auth əvvəlki
container-ə, Nginx isə əvvəlki konfiqurasiyaya qaytarılır. Additive migration-lar
və OFF MFA flag-i qalır; core RLS söndürülmür, database backup-ı production
sifarişlərinin üzərinə restore edilmir. Status `rolled-back` və ya xüsusi
müdaxilə lazımdırsa `rollback-needs-attention` olur. Root-private diaqnostikada
credential ola biləcəyi üçün onu çata/Git-ə çıxarmayın.

Uğurlu keçiddən sonrakı manual rollback: əvvəl app-ni
`/srv/alisveris/releases/enterprise-security-20261102/rollback.config.cjs` ilə
bərpa edin; yeni Auth-u dayandırıb əvvəlkini başladın; root-private
`site.before.conf` və konfiqurasiya snapshot-una əsasən ingress-i bərpa edib
`nginx -t` və reload edin. Admin MFA activation ayrıca enrollment və recovery
yoxlamasından sonra edilir; bu rollout mövcud hesabları məcburi MFA ilə bağlamır.

## Sərhədlər

Cloudflare plan WAF/Bot qaydaları və origin firewall restriction ayrıca
`CONFIGURATION REQUIRED` qalır. Bu rollout onların aktiv olduğunu iddia etmir.
CSP namizəd siyasəti Report-Only-dir. Tam checkout, real email inbox və istifadəçi
MFA enrollment E2E-sinin yerinə yalnız read-only canlı smoke işlədilir.
