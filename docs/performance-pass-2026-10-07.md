# Navigation and public data performance pass

## Baseline

- Public data already uses Next server caches; keep server-rendered data for SEO and avoid a second client-only loading waterfall.
- Product lists used manual effects, reset their data and refetched on filters/remounts. Search inputs maintained separate caches per instance.
- Dashboard mount effects prefetched every section, including routes that read private data.
- Public product requests could return 52 items; the stores page requested 120 stores before pagination.
- R2 images were raw img elements despite a configured images.alisveris.az Next optimizer allowlist.
- No database Realtime subscriptions found. Auth state listeners are not database subscriptions and remain necessary.

## Changes

- Per-render server / stable browser TanStack Query provider. Public browser staleTime 60 seconds, gcTime 10 minutes, one retry, no focus refetch.
- Product and related-product infinite queries use server initial data, scoped cache keys, cancellation, cursor pagination and cached return navigation.
- Popular searches and debounced suggestions share TanStack caches. Query errors do not overwrite successful list data.
- Product mutations invalidate product, related and search caches. Hover/focus on the home product link prefetches the same query used by the destination list.
- Dashboard prefetch runs on intent instead of eager mount loops. Next Link remains soft navigation; auth post-login reload is intentionally not changed because cookies and server session must agree.
- Product list default and maximum: 24. Store directory: 24 visible + one lookahead, offset in server cache key, deterministic created_at/id ordering, previous/next links, no new count query.
- Explicit profile columns replace wildcard selection. The optional revoked-session column has a narrowly scoped old-schema fallback; permission/network failures remain errors.
- Home/store directory/product card images use next/image, responsive sizes, stable aspect ratios, lazy loading and a lightweight neutral blur placeholder. This placeholder is not an actual image-derived LQIP.
- R2 and local assets are optimized; unknown external origins are passed through unoptimized rather than broadly allowing arbitrary optimization URLs.
- Next image minimum cache TTL one day; uploads use new object URLs. Owner-only branding editor loads dynamically.
- Product route loading now reserves a two-column mobile/four-column desktop product layout instead of a small spinner.

## Verification

- Unit tests cover request deduplication, scoped cache keys, seeded data reuse, background failure preservation, API bounds and optional profile schema handling.
- Local browser fixture at 390/1440: two store switches then returning to the first store issue only two requests total; images render, responsive srcset exists, no horizontal overflow, no browser exceptions.
- The same fixture mounts two actual MarketplaceSearch components. Searching camera and focusing the other synchronized input issues one search request, not two (three total requests including the two store queries).
- The fixture intercepts API and image optimizer responses; it does not prove production R2 optimizer latency, live Supabase request reduction or authenticated flows.
- Build compiled and passed build TypeScript, then stopped during page collection because local NEXT_PUBLIC_SUPABASE_URL is not configured.

## Remaining Work / Constraints

- Server reads, authorization, server actions and their existing Next caches are deliberately not moved into React Query. Browser Turnstile configuration and session verification remain security-specific requests.
- Remaining admin lists require individual pagination and mutation-invalidation reviews; this is not a claim that every administrative workflow was migrated or live-tested.
- Remaining media/detail image components have not all been migrated. No Cloudflare paid features or account settings were activated. Next image optimization may consume hosting-provider transformation quotas, independently of Supabase.
- Store-card count aggregation currently scans a bounded list of product store_ids. A database aggregate RPC could remove that payload in a separate schema migration; current counts were not silently replaced with inaccurate estimates.
- CLS/LCP and quota improvements need before/after production measurements. No speed or free-tier guarantee is made.
- The previously reported product-create error and store-first redesign remain separate unfinished requests.

Implementation references: [TanStack defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [infinite query initial data](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useInfiniteQuery), [Next Image](https://nextjs.org/docs/app/api-reference/components/image).
