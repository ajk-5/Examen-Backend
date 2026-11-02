#!/usr/bin/env sh

set -eu

backup_file="${1:-backups/studio_riff.dump}"
restore_database="${2:-studio_riff_restore}"
database_user="${POSTGRES_USER:-studio}"

if [ ! -f "$backup_file" ]; then
  echo "Backup not found: $backup_file" >&2
  exit 1
fi

docker compose exec -T postgres \
  dropdb -U "$database_user" --if-exists "$restore_database"
docker compose exec -T postgres \
  createdb -U "$database_user" "$restore_database"
docker compose exec -T postgres \
  pg_restore -U "$database_user" -d "$restore_database" --no-owner < "$backup_file"

echo "Backup restored in database: $restore_database"
