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

## Yoxlamalar

```bash
npm test
npm run typecheck
npm run build
npm run qa:smoke -- https://alisveris.az
npm run qa:perf -- https://alisveris.az
```

Smoke yoxlaması açıq səhifələri, giriş yönləndirmələrini və icazəsiz API sorğularının rədd edilməsini yoxlayır. Performans yoxlaması server cavabının tam alınma müddətini ölçür; brauzer göstəricilərini və hesabla edilən alış-veriş axınlarını əvəz etmir.
