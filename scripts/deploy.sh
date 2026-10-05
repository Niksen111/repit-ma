#!/usr/bin/env bash
set -euo pipefail

version=${1:?Pass a release version}
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+-RELEASE$ ]] || exit 1
cd /opt/repit-ma
exec 9>.deploy.lock
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
export APP_VERSION="$version"
docker compose -f compose.yaml config --quiet
# Pull before stopping the app, so registry failures do not interrupt service.
docker compose -f compose.yaml pull app

# Stop writes before backing up SQLite, including its WAL and uploaded files.
mkdir -p backups
backup="backups/data-$(date -u +%Y%m%dT%H%M%SZ)-$version.tar.gz"
docker compose -f compose.yaml stop app
trap 'docker compose -f compose.yaml start app' EXIT
tar -czf "$backup" data
docker compose -f compose.yaml up -d --no-deps app
trap - EXIT

ready=false
for attempt in {1..60}; do
  if curl --fail --silent --max-time 5 http://127.0.0.1:8080/ > /dev/null; then
    ready=true
    break
  fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  echo "Application did not become ready. Backup: $backup"
  docker compose -f compose.yaml logs --tail 80 app
  exit 1
fi
curl --fail --silent --show-error --max-time 15 https://repit-ma.ru/ > /dev/null

# Preserve other environment settings and record the successfully deployed version.
touch .env
sed '/^APP_VERSION=/d' .env > .env.deploy.tmp
printf 'APP_VERSION=%s\n' "$version" >> .env.deploy.tmp
chmod --reference=.env .env.deploy.tmp
mv .env.deploy.tmp .env
echo "Deployed $version. Backup: $backup"
