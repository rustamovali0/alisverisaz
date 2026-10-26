# Marketplace frontend deployment

The approved ALISVERIS.AZ frontend lives in `frontend/`. It is an isolated React/TypeScript/Vite app; its dependency graph and TypeScript settings are separate from the existing Next.js backend.

## Routes and production data

The Node gateway serves the new frontend for normal `GET /` and `HEAD /` requests. The app navigates with hash routes (`/#catalog`, `/#favorites`, `/#checkout`, `/#dashboard`). Its compiled assets and images live under `/marketplace/`, preventing collisions with Next.js public files.

The frontend is the approved **demo**: sample products and browser-local cart/profile/orders. It does not submit real orders, accept real payments or authenticate users. The role dropdown is only a preview. Existing Next.js login, admin, API, callback, subdomain and product routes continue to use the existing backend with its existing authorization. Next server actions and RSC requests to `/` are passed through to that backend. This deployment does not migrate the database or expose environment values in the static bundle.

## Validation

```bash
node --test deploy/marketplace-gateway.test.mjs
npm ci --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
```

The gateway has integration coverage for static paths, traversal protection, cache/MIME headers, HEAD, disallowed asset writes, API request bodies, auth cookies, auth/admin routes, server actions and RSC requests. CI runs these checks separately from the existing backend checks.

## VDS release structure

```text
/srv/alisveris/releases/<release>/
  backend-source.txt
  app/
    app.env                    # server-only; never commit
    backend/                   # copy of the current standalone Next.js release
    frontend/                  # Vite dist output
    deploy/
      marketplace-gateway.mjs
      marketplace-vds.config.cjs
```

The currently deployed standalone backend is copied because it is newer than the backend on the repository's main branch. Rebuilding that older backend source would discard production fixes. The new release preserves the deployed runtime and all its public assets. Subsequent backend work should first reconcile that source history.

PM2 keeps the name `alisveris-vds`; the gateway listens on `127.0.0.1:3004`, and its supervised Next.js child on loopback `[::ffff:127.0.0.1]:3405` (also reachable over `127.0.0.1`). Nginx and HTTPS stay on their existing configuration. Port 3005 was already occupied and is not used by this release. The mapped loopback address avoids NextURL canonicalizing a plain `127.0.0.1` origin to `localhost`, which otherwise turns locale rewrites into external rewrites and causes redirect loops in the deployed standalone build. Both listeners remain restricted to loopback. Startup waits for the backend to listen; backend failure terminates the gateway so PM2 can restart the complete app.

## Staging and switching

1. Build the frontend locally and archive the contents of `frontend/dist/`.
2. Upload that archive and the three deployment files to a temporary directory on the VDS.
3. Run `stage-marketplace-vds.sh <current-app-directory> <new-release-directory> <frontend-archive>`.
4. Start the gateway temporarily with `PORT=3104 MARKETPLACE_BACKEND_PORT=3105 node --env-file=app.env deploy/marketplace-gateway.mjs` from the new app directory. Verify homepage, assets and existing backend routes. Stop this staging process afterwards.
5. Save a **server-only, mode 600** rollback PM2 configuration for the currently running process, preserving its environment. Verify the running PID/cwd still match the release inspected before switching.
6. Replace only the `alisveris-vds` PM2 entry with `deploy/marketplace-vds.config.cjs` from the new release. Verify local port 3004, HTTPS, backend routes and stable PM2 uptime; then `pm2 save`.

The previous release stays intact. If health checks fail, remove the new `alisveris-vds` entry and start the saved rollback configuration, then verify HTTPS and save PM2 state. Do not remove old releases as part of a frontend rollout.

PM2 loads `.mjs` files through its own container, so the gateway recognizes `pm_exec_path` as its entrypoint as well as a normal Node CLI entrypoint. A launcher integration test reproduces this loading mode. Always stage the final command under PM2 on ports 3104/3105 before replacing the production PM2 entry.
