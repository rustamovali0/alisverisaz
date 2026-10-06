# Authentication Investigation

Reported symptom: a seller signs in, then returns to the login screen.

## Reproduced Defects

1. Refreshed cookies were written to the browser but the localized rewrite still
   forwarded the old Cookie header to Server Components. The regression test
   initially received `session=expired` instead of `session=fresh`. Session updates
   now run on the rewrite response and preserve route/locale headers.
2. Session reads explicitly named optional profile columns. A missing
   `session_revoked_at` column caused the session reader to return null although
   login and middleware could read the role. Profiles are now read using their
   existing columns. Revocation remains enforced when its timestamp exists.
3. Profile lookup errors were treated as customer accounts, and login could report
   success after the lookup failed. Login now fails with an actionable message;
   middleware keeps login accessible instead of sending the account back to a
   protected dashboard.
4. Localized admin paths selected the public auth cookie. Middleware now removes
   the locale prefix before choosing the admin session.
5. Login promoted customers to sellers using user-editable approval metadata.
   This allowed authorization escalation. Login now uses the database profile role;
   seller approval must be performed through the authorized admin flow.
6. Middleware redirected revoked sessions away from login while Server Components
   rejected them. Both layers now check the same revocation rule; middleware clears
   the old local session and lets the login form render.

## Database

Apply `supabase/migrations/20261006231500_auth_session_schema.sql` in Supabase SQL
Editor if the session revocation column is missing. It is safe to run repeatedly
and does not change account roles or erase existing revocation timestamps.

## Verification And Limits

Regression coverage lives in `tests/session-refresh.test.ts`,
`tests/session.test.ts`, `tests/proxy.test.ts` and `tests/auth-actions.test.ts`.
The existing suite also covers password recovery, auth hydration, rate limits,
redirect validation and authorization boundaries.

These are local tests with controlled Supabase responses. Production environment
variables, the affected seller credentials and live database logs were not
available. The defects are reproduced, but the exact production trigger and a
successful login on that seller account still require live verification after
deployment. No production database changes were applied from this checkout.

Reference: https://supabase.com/docs/guides/auth/server-side/creating-a-client
