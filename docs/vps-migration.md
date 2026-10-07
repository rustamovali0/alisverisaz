# Alisveris.az: Vercel-dən VPS-ə keçid

## 1. Plan və sərhədlər

1. Ubuntu 22.04/24.04 VPS hazırlayın. İlk server üçün 2 vCPU / 4 GB RAM praktik başlanğıcdır; real trafiklə ölçün.
2. Next.js SSR, API routes və Server Actions-u VPS-də işlədin.
3. Supabase DB-ni köçürməyin: auth və yazmalar əvvəlki kimi qalsın. Oxuma kodu VPS-də işləyir, Redis miss zamanı Supabase-ə müraciət edir.
4. Redis yalnız mövcud tag-lı ictimai oxuma keşini saxlayır. Sessiya, sifariş, mesaj və admin məlumatları ortaq keşə yazılmır.
5. R2 bucket, URL və `images.alisveris.az` DNS record-u dəyişmir.
6. DNS dəyişməzdən əvvəl hosts/curl ilə test edin. Sonra apex, www və mağaza wildcard DNS-i VPS-ə yönləndirin.
7. Login, yazmalar və Telegram təsdiqləndikdən sonra Vercel deploy/integrasiyasını dayandırın. Rollback müddətində onu silməyin.

Bu paket serverə quraşdırılmayıb. VPS IP/SSH və Cloudflare girişləri olmadan canlı keçid aparılmır.

## 2. Ubuntu hazırlığı

Root/sudo istifadəçisi ilə, SSH sessiyasını açıq saxlayaraq:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx redis-server git curl ca-certificates build-essential ufw unattended-upgrades python3-venv
sudo adduser deploy
sudo install -d -o deploy -g deploy /srv/alisveris/releases /srv/alisveris/repo
sudo install -d -o deploy -g deploy -m 700 /etc/alisveris
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo systemctl enable --now nginx redis-server
```

SSH başqa portdadırsa firewall-da əvvəl həmin portu açın. `deploy` üçün SSH public key əlavə edib ikinci sessiyada yoxlayın. Bundan sonra root/password login-i söndürün; əvvəl etməyin.

Node 22-ni rəsmi Node.js distributivindən və ya NodeSource-un təsdiqlənmiş repo təlimatı ilə quraşdırın. Aşağıdakı skripti əvvəl yoxlayın:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource-setup.sh
less /tmp/nodesource-setup.sh
sudo bash /tmp/nodesource-setup.sh
sudo apt install -y nodejs
node --version
sudo npm install -g pm2
```

Redis `/etc/redis/redis.conf`: `bind 127.0.0.1 ::1`, `protected-mode yes`, `maxmemory 256mb`, `maxmemory-policy allkeys-lru`. Yalnız disposable keşdirsə `save ""` və `appendonly no` seçilə bilər. Redis portunu internetə açmayın. Eyni VPS-də etibarsız tətbiqlər varsa ACL/password da əlavə edin.

```bash
sudo systemctl restart redis-server
redis-cli ping
```

## 3. Environment və build

`deploy` istifadəçisi ilə:

```bash
git clone https://github.com/rustamovali0/alisverisaz.git /srv/alisveris/repo/app
cd /srv/alisveris/repo/app
cp .env.example /etc/alisveris/app.env
chmod 600 /etc/alisveris/app.env
nano /etc/alisveris/app.env
```

Mövcud production environment dəyərlərini Vercel-dən təhlükəsiz ötürün. Secret-ləri Git-ə, mesajlara və loglara yazmayın. Dəyərlər:

```dotenv
NEXT_PUBLIC_APP_URL=https://alisveris.az
NEXT_PUBLIC_STORE_ROOT_DOMAIN=alisveris.az
REDIS_URL=redis://127.0.0.1:6379
REDIS_CACHE_NAMESPACE=alisveris:public:v1
```

Supabase publishable URL/key, server-only secret key, R2, SMTP, Turnstile və Telegram dəyişənlərini də doldurun. `NEXT_PUBLIC_*` build zamanı daxil edilir; dəyişəndə rebuild lazımdır. Redis URL həm build, həm runtime-da olmalıdır ki, cacheHandler konfiqurasiyası aktiv olsun.

```bash
npm ci
npm test
node --test deploy/redis-cache-handler.test.cjs
npm run typecheck
node --env-file=/etc/alisveris/app.env node_modules/next/dist/bin/next build
RELEASE="/srv/alisveris/releases/$(git rev-parse --short HEAD)-$(date +%s)"
mkdir -p "$RELEASE"
cp -a .next/standalone/. "$RELEASE/"
mkdir -p "$RELEASE/.next"
cp -a .next/static "$RELEASE/.next/static"
cp -a public "$RELEASE/public"
mkdir -p "$RELEASE/deploy"
cp deploy/redis-cache-handler.cjs "$RELEASE/deploy/"
```

Standalone tracing-in `redis` və Next cache handler modulunu daxil etdiyini test edin:

```bash
cd "$RELEASE"
node -e "require('./deploy/redis-cache-handler.cjs')"
HOSTNAME=127.0.0.1 PORT=3001 NODE_ENV=production node --env-file=/etc/alisveris/app.env server.js
```

Başqa terminalda `curl -I http://127.0.0.1:3001/`, məhsul/mağaza API-lərini və şəkilləri yoxlayın. Test serverini Ctrl-C ilə bağlayın. Uğurlu testdən sonra:

```bash
ln -sfn "$RELEASE" /srv/alisveris/current
pm2 startOrRestart /srv/alisveris/repo/app/deploy/ecosystem.config.cjs --update-env
pm2 save
pm2 startup
```

`pm2 startup` çıxışındakı sudo əmrini icra edin. `pm2 install pm2-logrotate` ilə log rotasiyası əlavə edin. Növbəti deploy-da əvvəlki release yolunu saxlayın; build uğursuz olarsa current-a toxunmayın. Bu tək-process modelində restart qısa fasilə yaradır, zero-downtime deyil. Rollback: current symlink-i əvvəlki release-ə çevirib `pm2 restart alisveris` edin. Next daxili cache handler API-si istifadə olunur: Next upgrade-lərində bu testləri yenidən işlədin.

## 4. Domain, wildcard SSL və Nginx

Wildcard sertifikat DNS-01 tələb edir. Cloudflare-də yalnız bu zone üçün `Zone:DNS:Edit` icazəli API token yaradın; global API key istifadə etməyin.

```bash
sudo python3 -m venv /opt/certbot
sudo /opt/certbot/bin/pip install certbot certbot-dns-cloudflare
sudo install -d -m 700 /root/.secrets
sudo nano /root/.secrets/cloudflare.ini
sudo chmod 600 /root/.secrets/cloudflare.ini
```

Faylın məzmunu: `dns_cloudflare_api_token = TOKEN`.

```bash
sudo /opt/certbot/bin/certbot certonly --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/cloudflare.ini --dns-cloudflare-propagation-seconds 60 -d alisveris.az -d '*.alisveris.az'
sudo cp /srv/alisveris/repo/app/deploy/nginx.conf /etc/nginx/sites-available/alisveris
sudo ln -s /etc/nginx/sites-available/alisveris /etc/nginx/sites-enabled/alisveris
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo /opt/certbot/bin/certbot renew --dry-run
```

Systemd timer və ya root cron ilə gündə iki dəfə renewal işlədin:

```cron
17 3,15 * * * /opt/certbot/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'
```

Əvvəl `curl --resolve alisveris.az:443:VPS_IP https://alisveris.az/` və mağaza subdomainini yoxlayın. Sonra `@`, `www`, `*` record-larını VPS IP-yə yönləndirin; köhnə Vercel CNAME/AAAA ziddiyyətlərini aradan qaldırın. IPv6 qurulmayıbsa AAAA qoymayın. **images.alisveris.az R2 record-u toxunulmaz qalır.** Cloudflare proxy istifadə edilirsə SSL `Full (strict)` olsun; HTML/API-lərə `Cache Everything` tətbiq etməyin.

Nginx original Host və HTTPS məlumatını Next-ə ötürür; subdomain routing və auth cookies üçün vacibdir. Global HTTP cache əlavə edilmir, ona görə bir istifadəçinin şəxsi SSR cavabı digərinə verilmir.

## 5. Redis strategiyası və kod

- `next.config.ts`: standalone output; REDIS_URL varsa Redis incremental cache handler və memory cache off.
- `deploy/redis-cache-handler.cjs`: yalnız tanınmış ictimai tag-lı FETCH entries Redis-dədir. SSR page cache Next-in lokal fayl qatında qalır.
- `src/lib/cache/public-cache.ts`: hazırkı `unstable_cache` və `revalidateTag` çağırışları dəyişmədən yeni handler-dən istifadə edir. Auth/writes refactor edilmir.
- Məhsullar və mağazalar hazırda 30 saniyə fresh, CMS/kateqoriyalar 300 saniyə fresh-dir. Redis retention fresh müddətinin iki qatı, maksimum 24 saatdır; Next fresh/stale semantikasını özü tətbiq edir.
- Hər invalidation ictimai epoch-u dəyişir. Bu konservativ olaraq bütün ictimai Redis keşini etibarsız edir; əlaqəli olmayan məlumatı da yenidən oxuya bilər, amma itirilmiş tag indeksləri problemi yoxdur. Köhnə epoch keys TTL ilə təmizlənir.
- Redis timeout/failure read-i Supabase-ə buraxır. Invalidation uğursuzluğu loglanır; maksimum TTL qədər köhnə məlumat qala bilər. Redis monitorinqi mütləqdir.
- Mövcud `/api/marketplace/products` kimi relative API URL-ləri DNS keçidindən sonra avtomatik VPS-ə gedir. SSR öz server funksiyalarını çağırır, özünə əlavə HTTP sorğusu göndərmir.
- Axtarış və cache qatından keçməyən şəxsi/admin oxumalar bu işdə avtomatik keşlənmir. Bütün read-lərin Supabase-dən yox olması üçün ayrıca DB replication/migration lazımdır; bu plan onu etmir.
- TanStack Query browser cache, pagination və R2 next/image optimizasiyası əvvəlki kimi saxlanır.

## 6. Keçid testi və monitorinq

DNS-dən əvvəl və sonra: guest/seller/user login, refresh sonrası session, logout, password reset, mağaza/subdomain, məhsul əlavə/redaktə, sifariş, mesaj, R2 upload, Telegram webhook, radmin test edin. Supabase Auth Site URL/redirect allowlist-i canonical domain və lazım olan callback/subdomain URL-lərinə uyğun saxlayın. Turnstile domain siyahısını yoxlayın. SMTP və Telegram üçün outbound bağlantını yoxlayın.

```bash
pm2 status
pm2 logs alisveris --lines 100
sudo journalctl -u redis-server --since '10 minutes ago'
redis-cli INFO stats
redis-cli INFO memory
sudo tail -n 100 /var/log/nginx/error.log
```

Eyni public list sorğusunu iki dəfə çağırıb Redis hit artımını, məhsul edit-dən sonra yenilənən cavabı ölçün. Disk/RAM, 5xx, Redis eviction/miss və TLS expiry üçün alert əlavə edin. VPS konfiqurasiya/secret backup-ları şifrəli saxlayın; Supabase DB backup ayrı məsuliyyətdir. Redis source of truth deyil.

Rəsmi mənbələr: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [cacheHandler](https://nextjs.org/docs/app/api-reference/config/next-config-js/incrementalCacheHandlerPath), [Redis Node client](https://redis.io/docs/latest/develop/clients/nodejs/connect/), [Certbot Cloudflare DNS](https://certbot-dns-cloudflare.readthedocs.io/).
