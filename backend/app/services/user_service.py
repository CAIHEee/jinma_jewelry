from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select

from app.core.permissions import MODULE_KEYS, MODULE_LABELS
from app.core.security import hash_password
from app.db.session import SessionLocal, init_db
from app.models.user import User
from app.models.user_module_permission import UserModulePermission
from app.schemas.admin import AdminUser, AdminUserCreate, AdminUserListResponse, AdminUserUpdate, UserPermissionUpdateRequest
from app.schemas.auth import CurrentUserResponse, ModulePermissionItem


class UserService:
    def __init__(self) -> None:
        init_db()

    def to_permission_items(self, user: User) -> list[ModulePermissionItem]:
        current = {permission.module_key: bool(permission.is_enabled) for permission in user.module_permissions}
        return [
            ModulePermissionItem(
                module_key=key,
                label=MODULE_LABELS[key],
                is_enabled=True if user.role == "root" else current.get(key, False),
            )
            for key in MODULE_KEYS
        ]

    def to_current_user(self, user: User) -> CurrentUserResponse:
        return CurrentUserResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            email=user.email,
            role=user.role,
            is_disabled=bool(user.is_disabled),
            permissions=self.to_permission_items(user),
        )

    def to_admin_user(self, user: User) -> AdminUser:
        return AdminUser(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            email=user.email,
            role=user.role,
            is_disabled=bool(user.is_disabled),
            created_at=user.created_at,
            permissions=self.to_permission_items(user),
        )

    def list_users(self) -> AdminUserListResponse:
        with SessionLocal() as session:
            users = session.execute(select(User).order_by(User.created_at.desc())).scalars().all()
            for user in users:
                user.module_permissions
            return AdminUserListResponse(items=[self.to_admin_user(user) for user in users])

    def create_user(self, payload: AdminUserCreate) -> AdminUser:
        with SessionLocal() as session:
            existing = session.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
            if existing is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists.")

            user = User(
                username=payload.username,
                role="user",
                display_name=payload.display_name,
                email=payload.email,
                password_hash=hash_password(payload.password),
                is_disabled=1 if payload.is_disabled else 0,
            )
            session.add(user)
            session.flush()
            now = datetime.now(timezone.utc)
            session.add_all(
                [
                    UserModulePermission(
                        user_id=user.id,
                        module_key=module_key,
                        is_enabled=False,
                        created_at=now,
                        updated_at=now,
                    )
                    for module_key in MODULE_KEYS
                ]
            )
            session.commit()
            session.refresh(user)
            user.module_permissions
            return self.to_admin_user(user)

    def update_user(self, user_id: str, payload: AdminUserUpdate) -> AdminUser:
        with SessionLocal() as session:
            user = session.get(User, user_id)
            if user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
            if user.role == "root" and payload.is_disabled:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Root user cannot be disabled.")

            if payload.username and payload.username != user.username:
                existing = session.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
                if existing is not None:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists.")
                user.username = payload.username

            if payload.display_name is not None:
                user.display_name = payload.display_name
            if payload.email is not None:
                user.email = payload.email
            if payload.is_disabled is not None:
                user.is_disabled = 1 if payload.is_disabled else 0

            session.commit()
            session.refresh(user)
            user.module_permissions
            return self.to_admin_user(user)

    def reset_password(self, user_id: str, password: str) -> None:
        with SessionLocal() as session:
            user = session.get(User, user_id)
            if user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
            user.password_hash = hash_password(password)
            session.commit()

    def update_permissions(self, user_id: str, payload: UserPermissionUpdateRequest) -> list[ModulePermissionItem]:
        with SessionLocal() as session:
            user = session.get(User, user_id)
            if user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
            if user.role == "root":
                return self.to_permission_items(user)

            existing = {item.module_key: item for item in user.module_permissions}
            now = datetime.now(timezone.utc)
            for item in payload.items:
                if item.module_key not in MODULE_KEYS:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown module key: {item.module_key}")
                target = existing.get(item.module_key)
                if target is None:
                    target = UserModulePermission(
                        user_id=user.id,
                        module_key=item.module_key,
                        created_at=now,
                        updated_at=now,
                    )
                    session.add(target)
                    existing[item.module_key] = target
                target.is_enabled = bool(item.is_enabled)
                target.updated_at = now
            session.commit()
            session.refresh(user)
            user.module_permissions
            return self.to_permission_items(user)
