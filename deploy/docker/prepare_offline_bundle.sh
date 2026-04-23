#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/dist/offline_bundle}"
BACKEND_IMAGE="${BACKEND_IMAGE:-jinma-backend:offline}"
NGINX_IMAGE="${NGINX_IMAGE:-jinma-nginx:offline}"

mkdir -p "$OUTPUT_DIR"

python "$ROOT_DIR/deploy/docker/generate_env_docker.py" \
  --output "$OUTPUT_DIR/.env.docker" \
  --backend-image "$BACKEND_IMAGE" \
  --nginx-image "$NGINX_IMAGE"

docker compose \
  --env-file "$OUTPUT_DIR/.env.docker" \
  -f "$ROOT_DIR/docker-compose.yml" \
  -f "$ROOT_DIR/docker-compose.build.yml" \
  build

docker save -o "$OUTPUT_DIR/jinma-images.tar" \
  "$BACKEND_IMAGE" \
  "$NGINX_IMAGE" \
  "mysql:8.4" \
  "redis:7-alpine"

cp "$ROOT_DIR/docker-compose.yml" "$OUTPUT_DIR/docker-compose.yml"
cp "$ROOT_DIR/README.md" "$OUTPUT_DIR/README.md"
cp "$ROOT_DIR/deploy/docker/start_offline_stack.sh" "$OUTPUT_DIR/start_offline_stack.sh"
cp "$ROOT_DIR/deploy/docker/stop_offline_stack.sh" "$OUTPUT_DIR/stop_offline_stack.sh"
chmod +x "$OUTPUT_DIR/start_offline_stack.sh" "$OUTPUT_DIR/stop_offline_stack.sh"

echo "Offline bundle created at: $OUTPUT_DIR"
echo "Files:"
echo "  - $OUTPUT_DIR/jinma-images.tar"
echo "  - $OUTPUT_DIR/.env.docker"
echo "  - $OUTPUT_DIR/docker-compose.yml"
echo "  - $OUTPUT_DIR/start_offline_stack.sh"
echo "  - $OUTPUT_DIR/stop_offline_stack.sh"

