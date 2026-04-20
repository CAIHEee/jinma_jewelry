from __future__ import annotations

from dataclasses import dataclass
from importlib import import_module
from typing import Any
from urllib.parse import quote

from fastapi import HTTPException, status

from app.core.config import get_settings


@dataclass(frozen=True)
class StoredObject:
    object_key: str
    storage_url: str


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return self.settings.oss_enabled

    def upload_bytes(
        self,
        *,
        object_key: str,
        content: bytes,
        content_type: str,
    ) -> StoredObject:
        bucket = self._build_bucket()
        headers = {"Content-Type": content_type}
        result = bucket.put_object(object_key, content, headers=headers)
        status_code = getattr(result, "status", None)
        if status_code and int(status_code) >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to upload asset to OSS, status={status_code}.",
            )
        return StoredObject(
            object_key=object_key,
            storage_url=f"oss://{self.settings.oss_bucket}/{object_key}",
        )

    def delete_object(self, object_key: str) -> None:
        bucket = self._build_bucket()
        result = bucket.delete_object(object_key)
        status_code = getattr(result, "status", None)
        if status_code and int(status_code) >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to delete asset from OSS, status={status_code}.",
            )

    def generate_access_url(self, storage_url: str | None) -> str | None:
        if not storage_url:
            return None
        if storage_url.startswith("local://"):
            object_key = storage_url.removeprefix("local://")
            quoted_key = "/".join(quote(part) for part in object_key.split("/"))
            return f"/api/v1/assets/local/{quoted_key}"
        if not storage_url.startswith("oss://"):
            return storage_url
        if not self.is_configured():
            return None

        bucket_name, object_key = self.parse_storage_url(storage_url)
        if bucket_name != self.settings.oss_bucket:
            return None

        bucket = self._build_bucket()
        signed_url = bucket.sign_url("GET", object_key, self.settings.oss_signed_url_expire_seconds)
        return signed_url.replace("http://", "https://", 1)

    def build_public_fallback_url(self, object_key: str) -> str:
        quoted_key = quote(object_key)
        return f"https://{self.settings.oss_bucket}.{self.settings.oss_endpoint}/{quoted_key}"

    def parse_storage_url(self, storage_url: str) -> tuple[str, str]:
        if not storage_url.startswith("oss://"):
            raise ValueError(f"Unsupported storage URL: {storage_url}")
        path = storage_url.removeprefix("oss://")
        bucket_name, _, object_key = path.partition("/")
        if not bucket_name or not object_key:
            raise ValueError(f"Invalid storage URL: {storage_url}")
        return bucket_name, object_key

    def _build_bucket(self) -> Any:
        if not self.is_configured():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OSS storage is not fully configured.",
            )

        try:
            oss2 = import_module("oss2")
        except ModuleNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OSS SDK is not installed. Please install oss2.",
            ) from exc

        auth = oss2.Auth(self.settings.oss_access_key_id, self.settings.oss_access_key_secret)
        endpoint = self.settings.oss_endpoint
        if not endpoint.startswith(("http://", "https://")):
            endpoint = f"https://{endpoint}"
        return oss2.Bucket(auth, endpoint, self.settings.oss_bucket)
