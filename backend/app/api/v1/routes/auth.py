from fastapi import APIRouter, Depends, Response

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.user import User
from app.schemas.auth import CurrentUserResponse, LoginRequest, LoginResponse
from app.services.auth_service import AuthService


router = APIRouter()
service = AuthService()
settings = get_settings()


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response) -> LoginResponse:
    result = service.login(payload.username, payload.password)
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=result.access_token,
        httponly=True,
        samesite="lax",
        max_age=settings.auth_token_expire_hours * 3600,
    )
    return result


@router.post("/auth/logout")
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(settings.auth_cookie_name)
    return {"status": "ok"}


@router.get("/auth/me", response_model=CurrentUserResponse)
def current_user(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    return service.current_user(current_user)
