## Live marketplace design integration

The production homepage now runs inside the existing Next.js marketplace. The approved green storefront uses real product/category/store data, existing Supabase authentication, customer/seller/RAdmin routes, cart and checkout actions, messages, reviews, notifications and current payment methods. The Vite `frontend/` directory is retained as the approved visual prototype; it is not the production commerce runtime.

Deploy the standalone Next build with `deploy/live-marketplace-vds.config.cjs`, a server-local `app.env`, `.next/static/`, `public/`, and Linux-compatible Sharp packages. The process binds `::ffff:127.0.0.1:3004`. Verify a staging instance using `QA_HOST=alisveris.az node deploy/verify-live-marketplace.mjs http://127.0.0.1:3104`. Keep the previous release and PM2 configuration for rollback. The older gateway documentation below describes the previous deployment.

Catalog filters are evaluated on the server before pagination, with globally prioritized active VIP products and prices after discount. Compact public candidate records are read in batches and cached for 30 seconds; only selected product cards are hydrated. At larger catalog sizes this candidate stage should move into an indexed database query/RPC. No database migration is required for this UI integration.

# alisveris.az

Azərbaycanda məhsulların, mağazaların və sifarişlərin idarə edilməsi üçün marketplace.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui strukturu
- Supabase
- Framer Motion
- Custom alert/toast UI

## Baslamaq

```bash
npm ci
cp .env.example .env.local
# .env.local daxilində layihəyə uyğun dəyərləri doldurun
npm run dev
```

Supabase dəyərlərini `.env.local` və ya hostinq mühitində qurun. `.env.example` yalnız nümunə dəyərlər saxlayır. Admin emeliyyatlari ucun `SUPABASE_SECRET_KEY` ve ya `SUPABASE_SERVICE_ROLE_KEY` mutleqdir.

## Struktur

- `src/app` - App Router routes, layout, loading/error/not-found states
- `src/components` - UI, common state ve layout komponentleri
- `src/lib` - config, Supabase clients, error handling ve utilities
- `src/types` - paylasilan TypeScript tipleri

## Yeni marketplace frontend-i

Təsdiqlənmiş yeni dizayn `frontend/` qovluğundadır. Lokal önizləmə: `npm ci --prefix frontend && npm run dev --prefix frontend`. VDS-də əsas səhifəyə qoşulma, mövcud backend marşrutları və geri qaytarma qaydası üçün [deployment qeydlərinə](docs/marketplace-frontend-vds.md) baxın.
## Yoxlamalar

```bash
npm test
npm run typecheck
npm run build
npm run qa:smoke -- https://alisveris.az
npm run qa:perf -- https://alisveris.az
```

Smoke yoxlaması açıq səhifələri, giriş yönləndirmələrini və icazəsiz API sorğularının rədd edilməsini yoxlayır. Performans yoxlaması server cavabının tam alınma müddətini ölçür; brauzer göstəricilərini və hesabla edilən alış-veriş axınlarını əvəz etmir.
