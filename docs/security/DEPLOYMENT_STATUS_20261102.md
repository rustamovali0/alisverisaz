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
