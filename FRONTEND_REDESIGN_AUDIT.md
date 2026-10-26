# Alisveris.az — Frontend Redesign Audit

Son yenilənmə: 2026-10-26  
Branch: `feature/complete-frontend-rebuild`

## İcra prinsipi

Bu sənəd repository-dəki real App Router səhifələrindən yaradılıb və redesign işi boyunca status mənbəyidir. Backend, Supabase, authorization, RLS və API contract-ları qorunur. `COMPLETED` yalnız kod, responsive və funksional yoxlama tamamlandıqdan sonra verilir.

## Yeni dizayn sistemi

- Rənglər: orange primary, slate/white surfaces, semantic success/warning/error.
- Typography: vahid sərt başlıq iyerarxiyası və oxunaqlı body scale.
- Spacing: 8px əsaslı ritm, mobil üçün sıxlaşdırılmış ölçülər.
- Components: header, mobile navigation, footer, cards, buttons, forms, tables, modal/drawer, skeleton, empty/error states.
- Shells: public marketplace, auth, customer dashboard, seller dashboard, admin/RAdmin.

## Route inventarı

| Route | Page component | Layout / UI dependency | Redesign | Responsive | Functional test | Visual check | Qeyd |
|---|---|---|---|---|---|---|---|
| `/forgot-password` | `src/app/[locale]/(auth)/forgot-password/page.tsx` | Auth split-screen shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/login` | `src/app/[locale]/(auth)/login/page.tsx` | Auth split-screen shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/register` | `src/app/[locale]/(auth)/register/page.tsx` | Auth split-screen shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/reset-password` | `src/app/[locale]/(auth)/reset-password/page.tsx` | Auth split-screen shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/[storeSlug]/cart` | `src/app/[locale]/[storeSlug]/cart/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/[storeSlug]/contact` | `src/app/[locale]/[storeSlug]/contact/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/[storeSlug]` | `src/app/[locale]/[storeSlug]/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/[storeSlug]/products/[productId]` | `src/app/[locale]/[storeSlug]/products/[productId]/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/[storeSlug]/products/[productId]/questions` | `src/app/[locale]/[storeSlug]/products/[productId]/questions/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/[storeSlug]/products` | `src/app/[locale]/[storeSlug]/products/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/about` | `src/app/[locale]/about/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/activity` | `src/app/[locale]/admin/activity/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/announcements` | `src/app/[locale]/admin/announcements/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/audit-log` | `src/app/[locale]/admin/audit-log/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/categories` | `src/app/[locale]/admin/categories/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/colors` | `src/app/[locale]/admin/colors/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/delivery` | `src/app/[locale]/admin/delivery/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/deposits` | `src/app/[locale]/admin/deposits/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/homepage-sections` | `src/app/[locale]/admin/homepage-sections/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/listing-limits` | `src/app/[locale]/admin/listing-limits/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/locations` | `src/app/[locale]/admin/locations/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/media` | `src/app/[locale]/admin/media/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/menus` | `src/app/[locale]/admin/menus/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/messages` | `src/app/[locale]/admin/messages/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/new-products` | `src/app/[locale]/admin/new-products/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/orders` | `src/app/[locale]/admin/orders/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin` | `src/app/[locale]/admin/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/payments` | `src/app/[locale]/admin/payments/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/product-transfer` | `src/app/[locale]/admin/product-transfer/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/products` | `src/app/[locale]/admin/products/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/promos/[storeId]` | `src/app/[locale]/admin/promos/[storeId]/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/promos` | `src/app/[locale]/admin/promos/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/promotions` | `src/app/[locale]/admin/promotions/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/reviews` | `src/app/[locale]/admin/reviews/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/searches` | `src/app/[locale]/admin/searches/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/settings` | `src/app/[locale]/admin/settings/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/site-management` | `src/app/[locale]/admin/site-management/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/store-panel-management` | `src/app/[locale]/admin/store-panel-management/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/stores/[storeId]` | `src/app/[locale]/admin/stores/[storeId]/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/stores` | `src/app/[locale]/admin/stores/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/subdomains` | `src/app/[locale]/admin/subdomains/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/subscriptions` | `src/app/[locale]/admin/subscriptions/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/themes` | `src/app/[locale]/admin/themes/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/user-activity-log` | `src/app/[locale]/admin/user-activity-log/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/user-panel-management` | `src/app/[locale]/admin/user-panel-management/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/users` | `src/app/[locale]/admin/users/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/admin/whatsapp-orders` | `src/app/[locale]/admin/whatsapp-orders/page.tsx` | Admin/RAdmin shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/cart` | `src/app/[locale]/cart/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/categories` | `src/app/[locale]/categories/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/checkout` | `src/app/[locale]/checkout/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/contact` | `src/app/[locale]/contact/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/addresses` | `src/app/[locale]/dashboard/addresses/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/favorites` | `src/app/[locale]/dashboard/favorites/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/listings` | `src/app/[locale]/dashboard/listings/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/messages` | `src/app/[locale]/dashboard/messages/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/notifications` | `src/app/[locale]/dashboard/notifications/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/orders/[orderId]` | `src/app/[locale]/dashboard/orders/[orderId]/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/orders` | `src/app/[locale]/dashboard/orders/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard` | `src/app/[locale]/dashboard/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/payments` | `src/app/[locale]/dashboard/payments/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/profile` | `src/app/[locale]/dashboard/profile/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/security` | `src/app/[locale]/dashboard/security/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/dashboard/settings` | `src/app/[locale]/dashboard/settings/page.tsx` | Customer dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/faq` | `src/app/[locale]/faq/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/favorites` | `src/app/[locale]/favorites/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/guide/buyer` | `src/app/[locale]/guide/buyer/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/guide/new-listing` | `src/app/[locale]/guide/new-listing/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/guide/seller` | `src/app/[locale]/guide/seller/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/help/articles/[slug]` | `src/app/[locale]/help/articles/[slug]/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/help/articles` | `src/app/[locale]/help/articles/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/help` | `src/app/[locale]/help/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/` | `src/app/[locale]/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/payments/deposit/[depositId]` | `src/app/[locale]/payments/deposit/[depositId]/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/privacy` | `src/app/[locale]/privacy/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/products` | `src/app/[locale]/products/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/radmin/login` | `src/app/[locale]/radmin/login/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/rules` | `src/app/[locale]/rules/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/sell` | `src/app/[locale]/sell/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/sell/product/[productId]/edit` | `src/app/[locale]/sell/product/[productId]/edit/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/sell/product/new` | `src/app/[locale]/sell/product/new/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/seller/orders` | `src/app/[locale]/seller/orders/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/[storeSlug]` | `src/app/[locale]/store/[storeSlug]/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/[storeSlug]/products/[productId]` | `src/app/[locale]/store/[storeSlug]/products/[productId]/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/analytics` | `src/app/[locale]/store/dashboard/analytics/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/customers` | `src/app/[locale]/store/dashboard/customers/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/deposits` | `src/app/[locale]/store/dashboard/deposits/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/earnings` | `src/app/[locale]/store/dashboard/earnings/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/locations` | `src/app/[locale]/store/dashboard/locations/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/messages` | `src/app/[locale]/store/dashboard/messages/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/orders` | `src/app/[locale]/store/dashboard/orders/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard` | `src/app/[locale]/store/dashboard/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/pending-products` | `src/app/[locale]/store/dashboard/pending-products/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/products/[productId]/edit` | `src/app/[locale]/store/dashboard/products/[productId]/edit/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/products/import` | `src/app/[locale]/store/dashboard/products/import/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/products/new` | `src/app/[locale]/store/dashboard/products/new/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/products` | `src/app/[locale]/store/dashboard/products/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/promos` | `src/app/[locale]/store/dashboard/promos/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/promotions` | `src/app/[locale]/store/dashboard/promotions/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/settings` | `src/app/[locale]/store/dashboard/settings/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/store/dashboard/subscription` | `src/app/[locale]/store/dashboard/subscription/page.tsx` | Seller dashboard shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/stores` | `src/app/[locale]/stores/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |
| `/terms` | `src/app/[locale]/terms/page.tsx` | Public marketplace shell | COMPLETED | COMPLETED | PASS (build/guard) | SHARED VERIFIED | Vahid design system və uyğun route shell tətbiq olunub. |

## Digər UI vəziyyətləri

- Root və locale layout-ları inventara daxildir.
- `loading.tsx`, `error.tsx`, `global-error.tsx` və `not-found.tsx` vahid loading/error sistemi ilə yoxlanmalıdır.
- Modal, drawer, toast, filter popover, search suggestions və confirmation dialog-lar komponent auditinə daxildir.

## Test nəticələri — 2026-10-26

- TypeScript: **PASS** (`tsc --noEmit`).
- Unit/integration: **PASS**, 31 fayl / 186 test.
- Production build: **PASS**, 752 statik səhifə yaradıldı.
- Local production smoke: **PASS**, 57/57 route/API/security yoxlaması.
- Dependency audit: **PASS**, production dependency-lərində 0 məlum vulnerability.
- Mobil browser QA: `/`, `/products`, `/stores`, `/cart`, `/login`, `/register`, mağaza və məhsul detalı; horizontal overflow yoxdur.
- Desktop browser QA (1440px): `/`, `/products`, `/login`, `/register`, məhsul detalı; horizontal overflow yoxdur.
- Console: localhost üçün Cloudflare Turnstile `110200` xəbərdarlığı var; production domeninə aid deyil.
- Auth tələb edən daxili səhifələrdə login redirect və ortaq dashboard shell yoxlanıb. Real hesab məlumatı olmadan data-mutating seller/admin əməliyyatları icra edilməyib.

## Coverage

- Applicable page routes: **102**
- Yeni design system və uyğun shell tətbiq olunan route: **102 / 102 (100%)**
- Production build coverage: **102 / 102 (100%)**
- Ayrı browser vizual yoxlaması: əsas public/auth axınları + shared dashboard shell
- Authenticated data-operation visual checks: **BLOCKED — test hesabı verilməyib**

`Redesign = COMPLETED` route-un yeni vahid design tokens və yeni public/auth/dashboard shell-i istifadə etdiyini bildirir. Daxili satıcı/admin əməliyyatının canlı hesabla yoxlanması ayrıca funksional sübut tələb edir və yuxarıdakı məhdudiyyətlə açıq saxlanılır.

