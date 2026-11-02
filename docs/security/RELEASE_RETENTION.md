# VDS release təmizləmə siyasəti

Məqsəd: artıq istifadə edilməyən release-ləri və köhnə build surətlərini silmək, disk artımını məhdudlaşdırmaq. Database, PostgreSQL faylları, R2/media, persistent state, SMTP/Auth ayarları və database backup-ları bu işin hədəfi deyil.

- Gündəlik **03:17 Asia/Baku** — server Etc/UTC olduğuna görə cron `17 23 * * *`.
- Heç bir release ilk **48 saatda** silinmir.
- Bütün PM2 runtime/saved konfiqurasiyaları, işlək proseslər, Nginx/systemd/cron istinadları qorunur.
- Hər işlək release-in **birbaşa əvvəlki rollback** versiyası saxlanır. Bütün köhnə rollback zənciri avtomatik qorunmur.
- Symlink və giriş faylları ilə bağlı runtime asılılıqları transitiv qorunur; hər silinmədən əvvəl canlı istinadlar yenidən yoxlanır.
- `/etc/alisveris/cleanup-pins.json` içindəki pending deployment-lər reboot və staging prosesinin dayanmasından sonra da saxlanır. Uğurlu `deployment-result.json` yarandıqdan sonra bu xüsusi pin aradan qalxır; işlək versiya normal qaydalarla qorunur.
- Aktiv release daxilində yalnız `build-before-repair-<rəqəm>` və `nested-dependencies-backup-<rəqəm>` formatlı, 48 saatdan köhnə və runtime tərəfindən istifadə edilməyən qovluqlar hədəfdir. `source`, işlək `app`, database/state/media qovluqları silinmir.
- Hardlink-lərin yalnız son nüsxəsi silinəndə boşalacaq bloklar hesablanır. Faktiki boş yer əməliyyatdan sonra ölçülür.
- Root job kodu `/usr/local/sbin/alisveris-release-cleanup.py` ünvanında root-owned `0750` olur; deploy istifadəçisi onu dəyişə bilmir. Eyni vaxtda ikinci job lock ilə bloklanır. Qeyri-müəyyən inventarda iş təhlükəsiz dayanır.
- PM2 Alisveris logları üçün mövcud siyasət yoxdursa 20 MB / 14 rotasiya / sıxılma konfiqurasiyası əlavə olunur. Cari proseslərin dayandırılmasına ehtiyac yoxdur.

Yoxlama (heç nə silmir):

```sh
python3 /usr/local/sbin/alisveris-release-cleanup.py
```

Son nəticə `/home/deploy/alisveris-disk-cleanup-result.json`, quraşdırma nəticəsi `/home/deploy/alisveris-security-setup/cleanup-install-result.json`, günlük `/var/log/alisveris-release-cleanup.log`-dadır. Job config-in əvvəlki nüsxəsi `/root/alisveris-maintenance-config-20261102/` altında saxlanır. Silinən lazımsız release-lər həmin qovluğa köçürülmür.

Təmizləmə konfiqurasiyasını geri qaytarmaq üçün cron-u disable edin və əvvəlki root-owned job config-ini nəzərdən keçirin. Bu, silinmiş köhnə release-ləri bərpa etmir; məqsəd işlək release və birbaşa rollback-i silməməkdir. Ləğv edilmiş pending deployment pin-i yalnız operator qərarı ilə çıxarılmalıdır.

Tests: `python3 -m unittest discover -s deploy/security -p test_release_cleanup.py` — rollback, yaş limiti, hardlinks, istifadə edilən build surətləri, symlink asılılıqları və pending release qoruması üçün 10 test.

## Skriptlərin düzgün yayımlanması

Repository-dəki `install_cleanup.py` serverdəki **`install-cleanup.py`** adı ilə yayımlanmalıdır. Adları əl ilə qarışdırmamaq üçün lokal checkout-da `python3 deploy/security/publish_cleanup.py` işlədin. Bu alət əvvəl lokal installer/source checksum cütünü, sonra yüklənmiş hər iki faylın hash-ini yoxlayır və yalnız canonical adları yeniləyir. Root əməliyyatı icra etmir.

2 noyabr quraşdırma cəhdində köhnə tireli installer ilə yeni underscore adlı nüsxə qarışmışdı; checksum guard silinmədən əvvəl dayandı. Yayımlama aləti və regression testi bu ad/hash uyğunsuzluğunu yoxlayır. Guard saxlanılıb.

Quraşdırılma yoxlaması: 2 noyabr 2026, 19:07 Asia/Baku — nəticə `complete`, 12 release + 7 build surəti silinib, 2 361 569 280 bayt boşalıb. Cron active, həmin təmizləmə addımında əsas tətbiq/RTest/staging restart olmayıb; sayt/Auth/database oxu yoxlamaları 200 keçib. Sonrakı təhlükəsizlik application rollout-u 22:13 Asia/Baku-da tamamlanıb; cari main `enterprise-security-20261102`, birbaşa rollback `header-hover-20261101`-dir. Bu rollout sonrası cleanup yenidən çalışdırılmayıb.
