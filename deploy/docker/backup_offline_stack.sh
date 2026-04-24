#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${1:-$SCRIPT_DIR/../../dist/offline_backup}"
PROJECT_NAME="jinma_jewelry_system"

mkdir -p "$OUTPUT_DIR"

MYSQL_ROOT_PASSWORD="$(grep '^MYSQL_ROOT_PASSWORD=' "$SCRIPT_DIR/../../dist/offline_bundle/.env.docker" | cut -d= -f2-)"

docker compose \
  --env-file "$SCRIPT_DIR/../../dist/offline_bundle/.env.docker" \
  -f "$SCRIPT_DIR/../../dist/offline_bundle/docker-compose.yml" \
  exec -T mysql \
  mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" jinma > "$OUTPUT_DIR/jinma.sql"

docker run --rm \
  -v "${PROJECT_NAME}_backend_data:/data" \
  -v "$OUTPUT_DIR:/backup" \
  alpine \
  tar czf /backup/backend_data.tar.gz -C /data .

echo "Backup completed:"
echo "  - $OUTPUT_DIR/jinma.sql"
echo "  - $OUTPUT_DIR/backend_data.tar.gz"

