# Marketplace quality audit — 16 October 2026

This change was prepared from `main` at `832997c`. Production was inspected at https://alisveris.az. No production deployment, database migration, real order, email, or account creation was performed.

## Changes

- Replace the 560px mobile hero with readable copy and an immediately visible search field. Keep CMS hero images and custom text, remove duplicate calls to action, the unmeasured “30 seconds” claim and the promotional AI tile.
- Show category links in a wrapping grid, place recent products before stores, and exclude empty stores from the featured area.
- Localize the new homepage copy in Azerbaijani, English and Russian; replace backend implementation language in public product descriptions and dashboard empty states.
- Open the selected store from search suggestions. Replace existing `q` values instead of appending duplicate parameters; preserve other filters and result anchors. Keep the search input's accessible name stable when its clear button appears, support Escape, and constrain suggestion height.
- Prevent a product card's keyboard handler from intercepting Enter/Space on its child controls. Correct the product page's Stores breadcrumb destination. Allow mobile pinch zoom.
- Pin Next.js to patched 16.3.8 and update the lockfile's source-map-js to 1.2.2. Keep the existing Tailwind major version.
- Expand route smoke coverage and discover a current store/product for response timing checks. A 404 or redirect no longer counts as a successful performance result.

## Verification

| Check | Result |
| --- | --- |
| Vitest | 22 files, 146 tests passed (including 5 new search URL regressions) |
| TypeScript | Passed |
| Production build | Passed; 742 static generation entries |
| Production HTTP smoke | 56/56 passed |
| Local production-build HTTP smoke | 56/56 passed, isolated fixtures |
| Production response timing | All 7 checks passed; 5 samples each |
| Production dependency audit (`--omit=dev`) | 0 advisories |
| Full dependency audit | 7 remaining: 5 high, 2 moderate in Tailwind's development tool chain |
| Diff whitespace | Passed |

The live response medians were: home 323ms, products 347ms, stores 220ms, cart 203ms, login 211ms, current store 292ms, current product 288ms. These are HTTP response timings from this machine, not browser Core Web Vitals or a load test.

Browser checks used the Codex in-app browser. The changed app was tested with a local read-only Supabase fixture service, placeholder credentials and no production database connection. Fixture product names/images are not production content. Checks covered 320px and 390px phone layouts, 768px tablet and 1440px desktop layouts, light/dark rendering, English homepage copy, menu opening/closing, store suggestion navigation, Escape/clear search, and Enter-to-add-to-cart without navigating away. No horizontal page overflow was observed at the measured sizes. Search's lower edge was at approximately 335px on the 390px phone viewport. The rendered viewport no longer forbids zoom.

## Remaining work before claiming a complete end-to-end sign-off

- Full `npm audit --audit-level=moderate` still fails on the seven development advisories. Existing CI runs this command before tests/build and will therefore fail until the tool chain is upgraded. No audit suppression or weakened CI gate was added. The braces advisory currently has no patched release; removing that dependency requires a separately verified build-tool migration. See [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [selector parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
- Authenticated seller/admin operations, CAPTCHA, password-reset email delivery, payments, order placement/cancellation/refunds and database concurrency were not exercised. They require test accounts and an isolated database/payment environment.
- Production currently displays test-like product titles, missing product photos, and social handles/phone numbers that need owner verification. No real contact details or product content were invented.
- Existing PRs #1 and #2 were inspected, not merged or edited. This PR is based on main, and its homepage changes overlap the alternative homepage proposal in #2.
