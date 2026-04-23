from __future__ import annotations

import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BACKEND_ENV_PATH = ROOT / "backend" / ".env"
DOCKER_TEMPLATE_PATH = ROOT / "deploy" / "docker" / ".env.docker.example"


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate .env.docker from backend/.env and template defaults.")
    parser.add_argument("--output", required=True, help="Output .env.docker path")
    parser.add_argument("--backend-image", default="jinma-backend:offline", help="Backend image tag to write")
    parser.add_argument("--nginx-image", default="jinma-nginx:offline", help="Nginx image tag to write")
    args = parser.parse_args()

    template_values = parse_env_file(DOCKER_TEMPLATE_PATH)
    backend_values = parse_env_file(BACKEND_ENV_PATH)
    output_path = Path(args.output).resolve()

    merged = dict(template_values)
    merged.update(
        {
            "BACKEND_IMAGE": args.backend_image,
            "NGINX_IMAGE": args.nginx_image,
            "APP_ALLOWED_ORIGINS": backend_values.get("APP_ALLOWED_ORIGINS", merged.get("APP_ALLOWED_ORIGINS", "")),
            "APP_ALLOWED_ORIGIN_REGEX": backend_values.get("APP_ALLOWED_ORIGIN_REGEX", merged.get("APP_ALLOWED_ORIGIN_REGEX", "")),
            "AUTH_SECRET_KEY": backend_values.get("AUTH_SECRET_KEY", merged.get("AUTH_SECRET_KEY", "")),
            "ROOT_USERNAME": backend_values.get("ROOT_USERNAME", merged.get("ROOT_USERNAME", "root")),
            "ROOT_DISPLAY_NAME": backend_values.get("ROOT_DISPLAY_NAME", merged.get("ROOT_DISPLAY_NAME", "系统管理员")),
            "ROOT_EMAIL": backend_values.get("ROOT_EMAIL", merged.get("ROOT_EMAIL", "root@example.com")),
            "ROOT_DEFAULT_PASSWORD": backend_values.get("ROOT_DEFAULT_PASSWORD", merged.get("ROOT_DEFAULT_PASSWORD", "")),
            "AI_DEFAULT_PROVIDER": backend_values.get("AI_DEFAULT_PROVIDER", merged.get("AI_DEFAULT_PROVIDER", "flux")),
            "AI_UPSTREAM_PLATFORM": backend_values.get("AI_UPSTREAM_PLATFORM", merged.get("AI_UPSTREAM_PLATFORM", "apiyi")),
            "APIYI_API_KEY": backend_values.get("APIYI_API_KEY", merged.get("APIYI_API_KEY", "")),
            "APIYI_BASE_URL": backend_values.get("APIYI_BASE_URL", merged.get("APIYI_BASE_URL", "")),
            "APIYI_OPENAI_BASE_URL": backend_values.get("APIYI_OPENAI_BASE_URL", merged.get("APIYI_OPENAI_BASE_URL", "")),
            "APIYI_GEMINI_BASE_URL": backend_values.get("APIYI_GEMINI_BASE_URL", merged.get("APIYI_GEMINI_BASE_URL", "")),
            "TTAPI_API_KEY": backend_values.get("TTAPI_API_KEY", merged.get("TTAPI_API_KEY", "")),
            "TTAPI_FLUX_BASE_URL": backend_values.get("TTAPI_FLUX_BASE_URL", merged.get("TTAPI_FLUX_BASE_URL", "")),
            "TTAPI_OPENAI_BASE_URL": backend_values.get("TTAPI_OPENAI_BASE_URL", merged.get("TTAPI_OPENAI_BASE_URL", "")),
            "TTAPI_TIMEOUT_SECONDS": backend_values.get("TTAPI_TIMEOUT_SECONDS", merged.get("TTAPI_TIMEOUT_SECONDS", "120")),
            "TTAPI_POLL_INTERVAL_SECONDS": backend_values.get("TTAPI_POLL_INTERVAL_SECONDS", merged.get("TTAPI_POLL_INTERVAL_SECONDS", "2.5")),
            "TTAPI_POLL_ATTEMPTS": backend_values.get("TTAPI_POLL_ATTEMPTS", merged.get("TTAPI_POLL_ATTEMPTS", "24")),
            "AI_MAX_FUSION_IMAGES": backend_values.get("AI_MAX_FUSION_IMAGES", merged.get("AI_MAX_FUSION_IMAGES", "6")),
            "QUEUE_NAME": backend_values.get("QUEUE_NAME", merged.get("QUEUE_NAME", "jinma-ai")),
            "QUEUE_JOB_TIMEOUT_SECONDS": backend_values.get("QUEUE_JOB_TIMEOUT_SECONDS", merged.get("QUEUE_JOB_TIMEOUT_SECONDS", "900")),
            "QUEUE_RESULT_TTL_SECONDS": backend_values.get("QUEUE_RESULT_TTL_SECONDS", merged.get("QUEUE_RESULT_TTL_SECONDS", "3600")),
            "QUEUE_USER_MAX_ACTIVE_JOBS": backend_values.get("QUEUE_USER_MAX_ACTIVE_JOBS", merged.get("QUEUE_USER_MAX_ACTIVE_JOBS", "1")),
            "QUEUE_ROOT_MAX_ACTIVE_JOBS": backend_values.get("QUEUE_ROOT_MAX_ACTIVE_JOBS", merged.get("QUEUE_ROOT_MAX_ACTIVE_JOBS", "3")),
            "CACHE_JOB_STATUS_TTL_SECONDS": backend_values.get("CACHE_JOB_STATUS_TTL_SECONDS", merged.get("CACHE_JOB_STATUS_TTL_SECONDS", "21600")),
            "CACHE_JOB_DEDUPE_TTL_SECONDS": backend_values.get("CACHE_JOB_DEDUPE_TTL_SECONDS", merged.get("CACHE_JOB_DEDUPE_TTL_SECONDS", "120")),
            "CACHE_MODEL_CATALOG_TTL_SECONDS": backend_values.get("CACHE_MODEL_CATALOG_TTL_SECONDS", merged.get("CACHE_MODEL_CATALOG_TTL_SECONDS", "300")),
            "CACHE_AUTH_ME_TTL_SECONDS": backend_values.get("CACHE_AUTH_ME_TTL_SECONDS", merged.get("CACHE_AUTH_ME_TTL_SECONDS", "60")),
        }
    )

    database_url = backend_values.get("DATABASE_URL", "")
    if "/127.0.0.1:" in database_url or "@127.0.0.1:" in database_url or "@localhost:" in database_url:
        merged["MYSQL_DATABASE"] = database_url.rsplit("/", 1)[-1] if "/" in database_url else merged.get("MYSQL_DATABASE", "jinma")

    lines = [f"{key}={value}" for key, value in merged.items()]
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Generated {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

