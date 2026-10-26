#!/usr/bin/env bash
set -euo pipefail
# Usage: stage-marketplace-vds.sh <existing-standalone-app> <new-release-directory> <frontend-build.tar.gz>
backend_source=$(realpath "$1")
release_directory=$2
frontend_archive=$(realpath "$3")
[[ "$backend_source" == /srv/alisveris/releases/*/app ]] || { echo 'Unexpected backend source'; exit 1; }
[[ "$release_directory" == /srv/alisveris/releases/* ]] || { echo 'Unexpected release directory'; exit 1; }
[[ -f "$backend_source/server.js" && -f "$backend_source/app.env" ]] || { echo 'Backend runtime or environment missing'; exit 1; }
[[ ! -e "$release_directory" ]] || { echo 'Release already exists; inspect it instead of overwriting'; exit 1; }
[[ $(df --output=avail -k /srv/alisveris/releases | tail -1) -gt 307200 ]] || { echo 'Insufficient disk space'; exit 1; }
script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mkdir -p "$release_directory/app/backend" "$release_directory/app/frontend" "$release_directory/app/deploy"
cp -a "$backend_source/." "$release_directory/app/backend/"
cp "$backend_source/app.env" "$release_directory/app/app.env"
chmod 600 "$release_directory/app/app.env"
tar -xzf "$frontend_archive" -C "$release_directory/app/frontend" --no-same-owner
cp "$script_directory/marketplace-gateway.mjs" "$script_directory/marketplace-vds.config.cjs" "$release_directory/app/deploy/"
printf '%s\n' "$backend_source" > "$release_directory/backend-source.txt"
echo "Prepared $release_directory/app; production process has not been changed."
