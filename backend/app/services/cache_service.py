from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from redis import Redis

from app.core.config import Settings, get_settings


class RedisCacheService:
    KEY_PREFIX = "jinma"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def get_json(self, key: str) -> Any | None:
        redis = self._build_redis()
        if redis is None:
            return None
        try:
            raw = redis.get(key)
            if raw is None:
                return None
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            return json.loads(raw)
        except Exception:  # noqa: BLE001
            return None

    def set_json(self, key: str, value: Any, ttl_seconds: int | None = None) -> bool:
        redis = self._build_redis()
        if redis is None:
            return False
        try:
            payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
            if ttl_seconds and ttl_seconds > 0:
                redis.set(key, payload, ex=ttl_seconds)
            else:
                redis.set(key, payload)
            return True
        except Exception:  # noqa: BLE001
            return False

    def set_if_absent(self, key: str, value: Any, ttl_seconds: int | None = None) -> bool:
        redis = self._build_redis()
        if redis is None:
            return False
        try:
            payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
            return bool(redis.set(key, payload, ex=ttl_seconds, nx=True))
        except Exception:  # noqa: BLE001
            return False

    def delete(self, *keys: str) -> None:
        if not keys:
            return
        redis = self._build_redis()
        if redis is None:
            return
        try:
            redis.delete(*keys)
        except Exception:  # noqa: BLE001
            return

    def expire(self, key: str, ttl_seconds: int) -> bool:
        redis = self._build_redis()
        if redis is None:
            return False
        try:
            return bool(redis.expire(key, ttl_seconds))
        except Exception:  # noqa: BLE001
            return False

    def job_status_key(self, job_id: str) -> str:
        return f"{self.KEY_PREFIX}:job-status:{job_id}"

    def job_dedupe_key(self, user_id: str, request_hash: str) -> str:
        return f"{self.KEY_PREFIX}:job-dedupe:{user_id}:{request_hash}"

    def model_catalog_key(self) -> str:
        return f"{self.KEY_PREFIX}:model-catalog"

    def auth_me_key(self, user_id: str) -> str:
        return f"{self.KEY_PREFIX}:auth-me:{user_id}"

    def delete_auth_me(self, user_id: str) -> None:
        self.delete(self.auth_me_key(user_id))

    @staticmethod
    @lru_cache(maxsize=1)
    def _redis_client(redis_url: str) -> Redis:
        return Redis.from_url(redis_url)

    def _build_redis(self) -> Redis | None:
        try:
            redis = self._redis_client(self.settings.queue_redis_url)
            redis.ping()
            return redis
        except Exception:  # noqa: BLE001
            return None


@lru_cache(maxsize=1)
def get_cache_service() -> RedisCacheService:
    return RedisCacheService()
