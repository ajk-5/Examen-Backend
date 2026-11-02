#!/usr/bin/env sh

set -eu

backup_file="${1:-backups/studio_riff.dump}"
database_user="${POSTGRES_USER:-studio}"
database_name="${POSTGRES_DB:-studio_riff}"

mkdir -p "$(dirname "$backup_file")"

docker compose exec -T postgres \
  pg_dump -U "$database_user" -d "$database_name" -Fc > "$backup_file"

echo "Backup created: $backup_file"
