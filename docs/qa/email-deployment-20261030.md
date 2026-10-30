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
