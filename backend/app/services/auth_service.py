from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select

from app.core.permissions import MODULE_KEYS
from app.core.security import create_access_token, verify_password
from app.core.security import hash_password
from app.db.session import SessionLocal, init_db
from app.models.user import User
from app.models.user_module_permission import UserModulePermission
from app.schemas.auth import CurrentUserResponse, LoginResponse, RegisterRequest
from app.services.user_service import UserService


class AuthService:
    def __init__(self) -> None:
        init_db()
        self.user_service = UserService()

    def login(self, username: str, password: str) -> LoginResponse:
        with SessionLocal() as session:
            user = session.execute(select(User).where(User.username == username)).scalar_one_or_none()
            if user is None or not verify_password(password, user.password_hash):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")
            if user.deleted_at is not None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is deleted.")
            if user.is_disabled:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled.")
            user.module_permissions
            token, expires_at = create_access_token(user.id)
            return LoginResponse(
                access_token=token,
                expires_at=expires_at,
                user=self.user_service.to_current_user(user),
            )

    def register(self, payload: RegisterRequest) -> LoginResponse:
        username = payload.username.strip()
        if not username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required.")

        with SessionLocal() as session:
            existing = session.execute(select(User).where(User.username == username)).scalar_one_or_none()
            if existing is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists.")

            user = User(
                username=username,
                role="user",
                display_name=payload.display_name.strip() if payload.display_name else None,
                email=payload.email.strip() if payload.email else None,
                password_hash=hash_password(payload.password),
                is_disabled=0,
            )
            session.add(user)
            session.flush()
            session.add_all(
                [
                    UserModulePermission(
                        user_id=user.id,
                        module_key=module_key,
                        is_enabled=True,
                    )
                    for module_key in MODULE_KEYS
                ]
            )
            session.commit()
            session.refresh(user)
            user.module_permissions
            token, expires_at = create_access_token(user.id)
            return LoginResponse(
                access_token=token,
                expires_at=expires_at,
                user=self.user_service.to_current_user(user),
            )

    def current_user(self, user: User) -> CurrentUserResponse:
        return self.user_service.to_current_user(user)
