# ALISVERIS.AZ — Frontend demo

Azərbaycan dilində, beynəlxalq e-ticarət saytlarının vizual üslubunda hazırlanmış çoxsatıcılı marketplace frontend-i.

## İşə salma

```bash
npm ci
npm run dev
```

Production yoxlaması və yığımı:

```bash
npm test
npm run lint
npm run build
```

`dist/` qovluğunu istənilən statik hostingdə yerləşdirmək mümkündür. Marşrutlar hash ilə işləyir, ayrıca server rewrite qaydası tələb etmir.

## Görünüşlər

- Ana səhifə: kampaniyalar, kateqoriyalar, məhsullar, mağazalar və bülleten.
- Kataloq: axtarış, URL-də saxlanan filtrlər, qiymət yoxlaması, sıralama, səhifələmə, kart/siyahı görünüşü və mobil filtr drawer-i.
- Məhsul: şəkil, qiymət, rəng/ölçü seçimləri, say, stok limiti, sevimli, səbət, mağaza, rəy və sual-cavab tabları.
- Səbət və checkout: mağazaya görə qruplaşdırma, sayın dəyişməsi, ünvan, çatdırılma, demo ödəniş, endirim kodu və sifariş təsdiqi.
- Alıcı kabineti: profil, ünvanlar, sifarişlər, ləğv etmə, mesajlar və bildirişlər.
- Satıcı paneli: icmal, məhsul əlavə/redaktə/silmə, status, stok, CSV import/ixrac, sifarişlər, mağaza forması, analitika və VIP planları.
- Administrator/RAdmin: məhsul, mağaza, kateqoriya, istifadəçi və sistem ayarlarının demo görünüşləri.

Panel rejimlərini dəyişmək üçün səhifənin ən aşağısındakı **Baxış rejimi** siyahısından istifadə edin. “Satıcı ol” düyməsi də satıcı panelini açır. Checkout üçün `DEMO10` kodu 10% endirim verir.

## Məlumat və məhdudiyyətlər

Bu, istifadəçinin istədiyi kimi yalnız frontend dizaynıdır. Backend, Supabase, real giriş, real səlahiyyət yoxlaması, real ödəniş, WhatsApp mesaj göndərilməsi, e-poçt və subdomain infrastrukturu qoşulmayıb. Rol seçimi təhlükəsizlik mexanizmi deyil, dizayn önizləməsidir.

Səbət, sevimlilər, profil, ünvanlar, məhsul redaktələri, mesajlar və demo sifarişlər localStorage-da bu brauzer üçün saxlanılır. Şifrələr saxlanılmır. Səbət, sevimlilər və demo sessiya eyni origin-də açılmış tablarda sinxronlaşır. Dizayn formalarına real və həssas məlumatlar daxil etmək lazım deyil.

Məhsul şəkillərinin yüklənməsi önizləmə üçündür; vitrin üçün mövcud nümunə şəkillərindən seçim edilir. CSV importu `Ad,Qiymet,Stok,Kateqoriya` sütunlarını qəbul edir, qiymət/stok/kateqoriyanı yoxlayır və məhsulları qaralama kimi əlavə edir. Excel XLSX formatı bu frontend versiyasında daxil deyil.

Analitika yalnız bu brauzerdə yaradılmış demo sifarişlərdən hesablanır. Nümunə məhsul qiymətləri, mağazalar və rəylər real satış göstəriciləri deyil.

## Texnologiyalar

React 19, TypeScript, Vite, Lucide, Vitest, ESLint. İnterfeys 320–1920px ölçülərə uyğunlaşdırılıb. Modal focus trap, Escape, label-lar, fokus göstəriciləri və reduced-motion dəstəyi var.

Şəkil mənbələri və generasiya brief-i üçün `ASSETS.md`, yoxlama qeydləri üçün `QA.md` faylına baxın.
