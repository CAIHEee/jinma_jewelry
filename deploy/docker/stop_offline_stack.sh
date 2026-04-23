#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

docker compose --env-file "$SCRIPT_DIR/.env.docker" -f "$SCRIPT_DIR/docker-compose.yml" down

