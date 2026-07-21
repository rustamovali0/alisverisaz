# alisveris.az

Marketplace SaaS platformasi ucun Next.js 15 App Router skeleti.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui strukturu
- Supabase
- Framer Motion
- SweetAlert2

## Baslamaq

```bash
npm install
npm run dev
```

Supabase deyerleri `.env.local` faylinda qurulub. Yeni muhitlerde `.env.example` faylini esas goturun ve real key-leri lokal/hosting environment-larina elave edin.

## Struktur

- `src/app` - App Router routes, layout, loading/error/not-found states
- `src/components` - UI, common state ve layout komponentleri
- `src/lib` - config, Supabase clients, error handling ve utilities
- `src/types` - paylasilan TypeScript tipleri
