from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings


settings = get_settings()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"pbkdf2_sha256${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        algorithm, salt_b64, digest_b64 = password_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = base64.urlsafe_b64decode(salt_b64.encode())
    expected = base64.urlsafe_b64decode(digest_b64.encode())
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return hmac.compare_digest(actual, expected)


def create_access_token(user_id: str) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.auth_token_expire_hours)
    payload = f"{user_id}:{int(expires_at.timestamp())}"
    signature = hmac.new(settings.auth_secret_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    token = base64.urlsafe_b64encode(f"{payload}:{signature}".encode("utf-8")).decode("utf-8")
    return token, expires_at


def decode_access_token(token: str) -> str | None:
    try:
        raw = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        user_id, expires_at_raw, signature = raw.rsplit(":", 2)
        payload = f"{user_id}:{expires_at_raw}"
        expected_signature = hmac.new(
            settings.auth_secret_key.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_signature):
            return None
        if int(expires_at_raw) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return user_id
    except Exception:  # noqa: BLE001
        return None
