# Marketplace audit and implementation ledger

Branch: `feature/marketplace-security-import-storage`. Production changes are prohibited.

## Architecture verified from source

Next.js 16 / React 19 server actions and routes use Supabase clients to call Auth and
PostgREST. SDK branding does not determine hosting: the previous deployment uses
self-hosted GoTrue and PostgREST against PostgreSQL 17. R2 stores images; Sharp
converts uploads to WebP. Redis caches public data. Production has not been
inspected or changed for this task. Historical capacity is not a current measurement.

## Priorities

| Priority | Severity | Finding / work | State |
|---|---|---|---|
| P0 | High | Store-owner RLS permits updates without immutable approval/limit fields | Implement database guard, test direct REST |
| P0 | High | Product moderation metadata may be changed through direct REST | Implement immutable moderation and ownership guard |
| P0 | High | Personal listing creation contradicts official-store-only policy | Audit all entry points before disabling |
| P0 | High | Existing product-limit advisory lock needs real concurrent verification | Existing mechanism; do not duplicate |
| P0 | High | Checkout variants, cancellation and stock restoration | Audit pending |
| P0 | Medium | Existing product approval toggle contradicts approved-store publishing | Implementation pending |
| P1 | High | XLSX/CSV import including atomic idempotency and bounded parsing | Pending |
| P1 | High | Hybrid storage reservations, disk budget and ownership | Pending |
| P1 | Medium | Exact product comparison, analytics and responsive/accessibility | Pending |
| P2 | Medium | Encrypted off-site backups and restore rehearsal | Pending; external destination required |

## Existing work preserved

The checkout had uncommitted seller UI, optional-stock/profit, auth hydration and
Nginx changes already deployed in the previous task. They remain intact. An
unrelated emptied `20261002110000_promotion_requests.sql` migration must not be
committed or reverted as part of this work.

## Verification policy

Unit/source tests are not substitutes for PostgreSQL concurrency or authenticated
browser tests. Mark unexecuted checks explicitly. Never use production credentials
for local builds or tests. New migrations are additive files; no production apply.

## Delivery gates

Audit -> implementation -> isolated database and browser tests -> lint/typecheck/
unit/build -> reviewed feature-branch commits -> pull request. No automatic merge,
production deployment, paid service, or data deletion.
