from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select

from app.core.security import create_access_token, verify_password
from app.db.session import SessionLocal, init_db
from app.models.user import User
from app.schemas.auth import CurrentUserResponse, LoginResponse
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
            if user.is_disabled:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled.")
            user.module_permissions
            token, expires_at = create_access_token(user.id)
            return LoginResponse(
                access_token=token,
                expires_at=expires_at,
                user=self.user_service.to_current_user(user),
            )

    def current_user(self, user: User) -> CurrentUserResponse:
        return self.user_service.to_current_user(user)
