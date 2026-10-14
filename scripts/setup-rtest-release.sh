#!/usr/bin/env bash
set -euo pipefail
umask 077

# Creates a password-protected, isolated VDS test environment. It does not
# alter the production database, containers, PM2 process, or Nginx server.
test "$(id -u)" -eq 0

BASE=/srv/alisveris/releases/rtest-premium-20261014
SOURCE_DB=alisveris_candidate_20261010
TEST_DB=alisveris_rtest_20261014
MIGRATION=/home/deploy/20261014010000_repair_navigation_cms.sql
ACTIVATOR=/home/deploy/activate-vds-release.cjs
TEST_HOST=rtest.alisveris.az
TEST_PORT=3100
AUTH_PORT=9997
REST_PORT=3005

: "${RTEST_HTTP_PASSWORD:?Set a temporary test password in the terminal first.}"
RTEST_PASSWORD="$RTEST_HTTP_PASSWORD"
test -s "$BASE/source/package.json"
test -d "$BASE/source/node_modules"
test -s "$MIGRATION"
test -s "$ACTIVATOR"

BACKUP=/root/alisveris-backups/rtest-setup-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP"

# A repeat setup must stop the old isolated clients before replacing their
# database. Nothing in this block addresses the production process or DB.
runuser -u deploy -- pm2 delete alisveris-rtest >/dev/null 2>&1 || true
docker rm -f alisveris-auth-rtest alisveris-rest-rtest >/dev/null 2>&1 || true

runuser -u postgres -- pg_dump --format=custom --dbname="$SOURCE_DB" > "$BACKUP/source-database.dump"
pg_restore --list "$BACKUP/source-database.dump" >/dev/null
runuser -u postgres -- dropdb --if-exists "$TEST_DB"
runuser -u postgres -- createdb --template=template0 "$TEST_DB"
runuser -u postgres -- pg_restore --no-owner --no-privileges --single-transaction \
  --exit-on-error --dbname="$TEST_DB" < "$BACKUP/source-database.dump"
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -d "$TEST_DB" < "$MIGRATION"

install -m 600 /dev/null /etc/nginx/.htpasswd-rtest
printf 'rtest:%s\n' "$(openssl passwd -apr1 "$RTEST_HTTP_PASSWORD")" > /etc/nginx/.htpasswd-rtest
unset RTEST_HTTP_PASSWORD

AUTH_ENV=$(mktemp)
REST_ENV=$(mktemp)
trap 'rm -f "$AUTH_ENV" "$REST_ENV"' EXIT

docker inspect alisveris-auth-candidate --format '{{range .Config.Env}}{{println .}}{{end}}' > "$AUTH_ENV"
docker inspect alisveris-rest-candidate --format '{{range .Config.Env}}{{println .}}{{end}}' > "$REST_ENV"
sed -i "s#/${SOURCE_DB}\([?]\|$\)#/${TEST_DB}\1#g" "$AUTH_ENV" "$REST_ENV"
# Test registrations are confirmed automatically and must not send real email.
sed -i '/^GOTRUE_SMTP_/d; /^GOTRUE_MAILER_AUTOCONFIRM=/d' "$AUTH_ENV"

AUTH_IMAGE=$(docker inspect alisveris-auth-candidate --format '{{.Config.Image}}')
REST_IMAGE=$(docker inspect alisveris-rest-candidate --format '{{.Config.Image}}')

docker run -d --name alisveris-auth-rtest --restart unless-stopped --network host \
  --env-file "$AUTH_ENV" \
  -e GOTRUE_API_PORT="$AUTH_PORT" \
  -e GOTRUE_SITE_URL="https://${TEST_HOST}" \
  -e GOTRUE_URI_ALLOW_LIST="https://${TEST_HOST}/*" \
  -e GOTRUE_MAILER_AUTOCONFIRM=true \
  "$AUTH_IMAGE" >/dev/null

docker run -d --name alisveris-rest-rtest --restart unless-stopped --network host \
  --env-file "$REST_ENV" \
  -e PGRST_SERVER_PORT="$REST_PORT" \
  "$REST_IMAGE" >/dev/null

cp "$BASE/app.env" "$BASE/rtest.app.env"
sed -i "s#^NEXT_PUBLIC_APP_URL=.*#NEXT_PUBLIC_APP_URL=https://${TEST_HOST}#" "$BASE/rtest.app.env"
sed -i "s#^NEXT_PUBLIC_SUPABASE_URL=.*#NEXT_PUBLIC_SUPABASE_URL=https://${TEST_HOST}#" "$BASE/rtest.app.env"
# The public test environment deliberately does not challenge testers with
# Cloudflare Turnstile. The production environment and its keys are untouched.
sed -i '/^NEXT_PUBLIC_TURNSTILE_SITE_KEY=/d; /^TURNSTILE_SECRET_KEY=/d' "$BASE/rtest.app.env"
# Rtest must not send production notifications or write to the production R2
# bucket. Existing public image URLs in the cloned data remain readable.
sed -i '/^SMTP_/d; /^TELEGRAM_/d; /^R2_ACCOUNT_ID=/d; /^R2_ACCESS_KEY_ID=/d; /^R2_SECRET_ACCESS_KEY=/d; /^R2_BUCKET_NAME=/d; /^R2_PUBLIC_URL=/d' "$BASE/rtest.app.env"
chmod 600 "$BASE/rtest.app.env"
cp "$BASE/rtest.app.env" "$BASE/app.env"
chown deploy:deploy "$BASE/rtest.app.env" "$BASE/app.env"

# NEXT_PUBLIC values are embedded into the client bundle, so prepare a fresh
# standalone build only after the rtest-specific environment exists.
runuser -u deploy -- bash -s -- "$BASE" <<'SH'
set -euo pipefail
BASE="$1"
cd "$BASE/source"

rm -rf .next "$BASE/app"
node --env-file="$BASE/rtest.app.env" ./node_modules/next/dist/bin/next build

mkdir -p "$BASE/app"
cp -a .next/standalone/. "$BASE/app/"
mkdir -p "$BASE/app/.next"
cp -a .next/static "$BASE/app/.next/static"
if [ -d public ]; then
  cp -a public "$BASE/app/public"
fi
SH
cp "$BASE/rtest.app.env" "$BASE/app.env"
chmod 600 "$BASE/app.env"
chown deploy:deploy "$BASE/app.env"
test -s "$BASE/app/server.js"

cat > /etc/nginx/sites-available/alisveris-rtest <<NGINX
server {
  listen 80;
  server_name ${TEST_HOST};
  return 301 https://\$host\$request_uri;
}

server {
  listen 443 ssl;
  server_name ${TEST_HOST};
  ssl_certificate /etc/letsencrypt/live/alisveris.az/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/alisveris.az/privkey.pem;
  auth_basic "Alisveris test";
  auth_basic_user_file /etc/nginx/.htpasswd-rtest;
  satisfy any;
  allow 127.0.0.1;
  deny all;
  client_header_buffer_size 16k;
  large_client_header_buffers 4 32k;
  client_max_body_size 12m;

  location /auth/v1/ {
    proxy_pass http://127.0.0.1:${AUTH_PORT}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto https;
  }

  location /rest/v1/ {
    proxy_pass http://127.0.0.1:${REST_PORT}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto https;
  }

  location / {
    proxy_pass http://127.0.0.1:${TEST_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_buffering off;
    proxy_buffer_size 32k;
    proxy_buffers 8 32k;
  }
}
NGINX

ln -sfn /etc/nginx/sites-available/alisveris-rtest /etc/nginx/sites-enabled/alisveris-rtest
nginx -t
systemctl reload nginx
runuser -u deploy -- node "$ACTIVATOR" "$BASE" alisveris-rtest "$TEST_PORT" "$TEST_HOST"

curl --fail --silent --show-error --resolve "${TEST_HOST}:443:127.0.0.1" \
  -u rtest:"$RTEST_PASSWORD" \
  -o /dev/null "https://${TEST_HOST}/"
unset RTEST_PASSWORD

echo "RTEST READY: https://${TEST_HOST}"
echo "Use username rtest and the password supplied as RTEST_HTTP_PASSWORD."
echo "Test database: ${TEST_DB}"
