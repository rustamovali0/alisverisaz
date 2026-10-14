#!/usr/bin/env bash
set -euo pipefail
umask 077

# Run only as root on the VDS. It never writes to the source database.
test "$(id -u)" -eq 0

SOURCE_DB="${1:-alisveris_candidate_20261010}"
STAMP="$(date +%Y%m%d%H%M%S)"
QA_DB="alisveris_radmin_qa_${STAMP}"
TMP_DUMP="$(mktemp /root/alisveris-radmin-qa.XXXXXX.dump)"

cleanup() {
  rm -f "$TMP_DUMP"
  runuser -u postgres -- dropdb --if-exists "$QA_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

runuser -u postgres -- psql -X -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT 1 FROM pg_database WHERE datname = :'db'" \
  -v db="$SOURCE_DB" >/dev/null

runuser -u postgres -- pg_dump --format=custom --dbname="$SOURCE_DB" > "$TMP_DUMP"
runuser -u postgres -- createdb --template=template0 "$QA_DB"
runuser -u postgres -- pg_restore --no-owner --no-privileges --single-transaction \
  --exit-on-error --dbname="$QA_DB" < "$TMP_DUMP"

runuser -u postgres -- psql -X -d "$QA_DB" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $$
DECLARE
  suffix text := substr(md5(clock_timestamp()::text), 1, 12);
  category_id uuid;
  announcement_id uuid;
  menu_id uuid;
  item_id uuid;
BEGIN
  INSERT INTO public.categories (name, slug, is_active, sort_order)
  VALUES ('QA kategoriya ' || suffix, 'qa-category-' || suffix, true, 999999)
  RETURNING id INTO category_id;

  UPDATE public.categories
  SET name = 'QA kateqoriya yeniləndi ' || suffix,
      is_active = false
  WHERE id = category_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = category_id AND is_active = false
  ) THEN
    RAISE EXCEPTION 'CATEGORY_CREATE_UPDATE_FAILED';
  END IF;

  DELETE FROM public.categories WHERE id = category_id;

  INSERT INTO public.platform_settings (key, value)
  VALUES ('qa-radmin-' || suffix, jsonb_build_object('enabled', true))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  IF NOT EXISTS (
    SELECT 1 FROM public.platform_settings
    WHERE key = 'qa-radmin-' || suffix
      AND value @> '{"enabled": true}'::jsonb
  ) THEN
    RAISE EXCEPTION 'PLATFORM_SETTINGS_WRITE_FAILED';
  END IF;

  INSERT INTO public.delivery_settings (
    key, pickup_enabled, courier_enabled, region_enabled,
    baku_price, region_price, pickup_estimate, courier_estimate, region_estimate
  ) VALUES (
    'qa-radmin-' || suffix, true, true, false,
    0, 5, 'QA pickup', 'QA courier', 'QA region'
  ) ON CONFLICT (key) DO UPDATE SET baku_price = EXCLUDED.baku_price;

  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_settings WHERE key = 'qa-radmin-' || suffix
  ) THEN
    RAISE EXCEPTION 'DELIVERY_SETTINGS_WRITE_FAILED';
  END IF;

  INSERT INTO public.announcements (title, body, type, target, is_active)
  VALUES ('QA announcement ' || suffix, 'Temporary isolated QA record', 'info', 'all', true)
  RETURNING id INTO announcement_id;

  UPDATE public.announcements SET is_active = false WHERE id = announcement_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.announcements WHERE id = announcement_id AND is_active = false
  ) THEN
    RAISE EXCEPTION 'ANNOUNCEMENT_WRITE_FAILED';
  END IF;

  SELECT id INTO menu_id FROM public.navigation_menus ORDER BY created_at NULLS LAST, id LIMIT 1;

  IF menu_id IS NOT NULL THEN
    INSERT INTO public.navigation_items (
      menu_id, title, href, icon_name, sort_order, is_active, is_system
    ) VALUES (
      menu_id, 'QA navigation ' || suffix, '/qa-' || suffix, 'circle', 999999, true, false
    ) RETURNING id INTO item_id;

    UPDATE public.navigation_items SET title = 'QA navigation updated ' || suffix WHERE id = item_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.navigation_items
      WHERE id = item_id AND title = 'QA navigation updated ' || suffix
    ) THEN
      RAISE EXCEPTION 'NAVIGATION_WRITE_FAILED';
    END IF;

    DELETE FROM public.navigation_items WHERE id = item_id;
  END IF;
END $$;

ROLLBACK;
SQL

echo "RADMIN CLONE WRITE QA: OK"
echo "Source database: $SOURCE_DB"
echo "The temporary clone and dump are being removed."
