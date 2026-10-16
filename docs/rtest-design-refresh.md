# Rtest Design Refresh

The redesign is gated by `NEXT_PUBLIC_RTEST_DESIGN=atelier`. The rtest builder sets this flag; production keeps the existing components and theme.

## Implemented

- New compact header, category menu, mobile drawer and search composition.
- New full-width photographic home hero and compact category strip.
- Restyled shared product cards, compact store rows and seller section.
- New footer, form presentation and authentication layout.
- Scoped light/dark tokens, forest-green actions, restrained yellow accents and smaller icons.
- Existing data fetching, auth actions, cart storage, routing and product pagination are reused.

## Second Iteration

- Replaced the large first-screen hero with a compact catalogue heading and categories. The photographic banner is below products and stores.
- Reduced product card image height, padding and desktop title/price sizing; five columns at desktop widths from 1200px, two on mobile.
- Product detail now has an unframed gallery/purchase composition, separated seller block, description section and anchor navigation to reviews. Existing variant, cart, WhatsApp and review components remain in place.
- All new styling remains restricted to the rtest design flag.

## Asset

`public/design/atelier-shopping.webp` was generated with the built-in image generation tool and optimized with Sharp to 2000 x 667, 83,656 bytes. The prompt requested a continuous light studio photograph with headphones, a speaker, shopping bag, sneakers and folded clothing on the right, clear copy space on the left, and no logos or text. Original generation: `/Users/alirustamov/.codex/generated_images/01a0fd1e-9ece-77f0-871a-f1df9a88f5ac/exec-34c67e21-a1d6-42d3-8533-1c5fa88e7b53.png`.

## Verification

- Local unit tests: 34 files, 186 tests passed.
- Local TypeScript check passed.
- Rtest Next.js build passed (749 generated pages) and application health returned HTTP 200 after activation.
- Public HTTPS smoke checks: 44/44 passed. The first sandboxed attempt could not access the network; the approved network-enabled rerun passed.
- Browser: home overflow checks passed at 320, 375, 390, 768 and 1440 pixels. Desktop and mobile home screenshots were inspected.
- Mobile drawer open/close, guest cart add/remove, filter expansion and login layout were checked. No browser console errors were captured during these checks.
- A stretched login checkbox found during visual testing was fixed by restricting text-input sizing to non-checkbox/radio inputs.
- These are targeted checks, not exhaustive authenticated visual regression coverage for every page.
- The existing rtest Auth service failure prevents claiming authenticated seller/admin end-to-end coverage. No production database changes are part of this redesign.
- Secret environment export was blocked by the security review. No environment secrets were copied into the repository or local preview.
