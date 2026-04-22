from __future__ import annotations

from collections.abc import Callable

from fastapi import Cookie, Depends, Header, HTTPException, status

from app.core.config import get_settings
from app.core.permissions import MODULE_KEYS, MODULE_LABELS
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.models.user_module_permission import UserModulePermission


settings = get_settings()


def _extract_token(authorization: str | None, cookie_token: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return cookie_token


def _build_permissions(user: User) -> dict[str, bool]:
    if user.role == "root":
        return {key: True for key in MODULE_KEYS}
    return {permission.module_key: bool(permission.is_enabled) for permission in user.module_permissions}


def get_current_user(
    authorization: str | None = Header(default=None),
    cookie_token: str | None = Cookie(default=None, alias=settings.auth_cookie_name),
) -> User:
    token = _extract_token(authorization, cookie_token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

    with SessionLocal() as session:
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
        if user.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is deleted.")
        if user.is_disabled:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled.")
        user.module_permissions
        session.expunge(user)
        return user


def require_root(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "root":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Root access required.")
    return current_user


def require_module(module_key: str) -> Callable[[User], User]:
    if module_key not in MODULE_LABELS:
        raise ValueError(f"Unknown module key: {module_key}")

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == "root":
            return current_user

        permissions = _build_permissions(current_user)
        if not permissions.get(module_key, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No permission for module: {module_key}.",
            )
        return current_user

    return _checker


def permissions_for_user(user: User) -> list[UserModulePermission]:
    return list(user.module_permissions)
