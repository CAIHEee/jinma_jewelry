#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${1:-$SCRIPT_DIR/../../dist/offline_backup}"
OFFLINE_DIR="${2:-$SCRIPT_DIR/../../dist/offline_bundle}"
PROJECT_NAME="jinma_jewelry_system"

MYSQL_ROOT_PASSWORD="$(grep '^MYSQL_ROOT_PASSWORD=' "$OFFLINE_DIR/.env.docker" | cut -d= -f2-)"

if [[ ! -f "$BACKUP_DIR/jinma.sql" ]]; then
  echo "Missing $BACKUP_DIR/jinma.sql" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_DIR/backend_data.tar.gz" ]]; then
  echo "Missing $BACKUP_DIR/backend_data.tar.gz" >&2
  exit 1
fi

docker compose --env-file "$OFFLINE_DIR/.env.docker" -f "$OFFLINE_DIR/docker-compose.yml" up -d

docker compose \
  --env-file "$OFFLINE_DIR/.env.docker" \
  -f "$OFFLINE_DIR/docker-compose.yml" \
  exec -T mysql \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" jinma < "$BACKUP_DIR/jinma.sql"

docker run --rm \
  -v "${PROJECT_NAME}_backend_data:/data" \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/backend_data.tar.gz -C /data"

docker compose --env-file "$OFFLINE_DIR/.env.docker" -f "$OFFLINE_DIR/docker-compose.yml" restart

echo "Restore completed."

