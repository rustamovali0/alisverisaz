# Website and RAdmin audit, 2026-10-06

## Verified

- 116 automated tests passed (16 files); TypeScript passed.
- 44 live HTTP smoke checks passed on https://www.alisveris.az.
- Public home, products, stores, cart, login and password-request pages respond without the generic error screen.
- 32 static RAdmin section routes require admin login. Seller product/order routes require login.
- Product API responds; unauthenticated Telegram webhook and untrusted-origin search writes are rejected.
- The apex domain redirects to www; test the canonical www origin to avoid interpreting that redirect as a page failure.

## Fixes

- Site settings read failures now return an action error instead of continuing with empty settings.
- Failure to remove an old R2 asset after saving no longer turns a successful save into an error page.
- Site management invalidates its correct route after saving.
- Client catches failed site-settings actions and displays a recoverable error.

## SQL

Run `supabase/diagnostics/20261006_required_schema.sql` first in Supabase SQL Editor. It is read-only and returns missing objects. It checks 46 literal table references, 3 RPC names, and 8 known critical columns. It does not validate every column, RPC signature, grant, policy or dynamic reference.

`supabase/migrations/20261006235000_repair_admin_required_schema.sql` repairs the previously screenshot-confirmed missing `profiles.requested_role`, `profiles.seller_application_status`, `store_panel_settings.updated_by`, and `promotion_requests`, plus session revocation support. It creates promotion indexes, policies and grants and reloads the PostgREST schema cache. Requires the existing core/CMS schema, `public.is_admin()` and `public.set_updated_at()`. If the promotion table exists with a partially incompatible schema, inspect it before running: CREATE TABLE IF NOT EXISTS does not repair existing columns.

The existing promotion migration is currently empty in the working tree. That external change was left untouched; a separate repair migration preserves a usable SQL copy.

Additional diagnostic failures should be repaired with the matching existing migrations, not by blindly replaying historical migrations:

- Telegram controls/session registry: `20260827110000_telegram_admin_bot_controls.sql`; password session phase: `20261005090000_telegram_password_session_phase.sql` (after the intermediate Telegram phase migrations).
- Search terms and search RPC: `20260825110000_popular_searches.sql`.
- Atomic checkout RPC: `20260820193000_atomic_checkout_orders.sql`.
- Effective limits RPC: `20260821006000_business_rules_limits_and_disabled_deposits.sql`.
- Seller promo codes: `20260831130000_seller_promo_codes.sql`.
- Delivery: `20260820223000_delivery_system.sql`.
- Support messages: `20260813120000_support_messages.sql`.

## Not verified

No live database connection or authenticated admin/seller session was available. These checks do not prove successful login, seller approval, uploads, admin writes, real email delivery, Telegram approval, checkout or reset-link completion. SQL was not executed against the live database.

Production build compiled and typechecked, but page-data collection stopped because local `NEXT_PUBLIC_SUPABASE_URL` is absent. This is an environment limitation, not a verified deployment failure. Visual and interaction testing of every section is still outstanding.
