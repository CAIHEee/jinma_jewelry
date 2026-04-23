from fastapi import APIRouter, Depends, Response

from app.api.deps import get_current_user, get_current_user_id
from app.core.config import get_settings
from app.models.user import User
from app.schemas.auth import CurrentUserResponse, LoginRequest, LoginResponse, RegisterRequest
from app.services.auth_service import AuthService
from app.services.cache_service import get_cache_service


router = APIRouter()
service = AuthService()
settings = get_settings()
cache_service = get_cache_service()


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response) -> LoginResponse:
    result = service.login(payload.username, payload.password)
    cache_service.delete_auth_me(result.user.id)
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=result.access_token,
        httponly=True,
        samesite="lax",
        max_age=settings.auth_token_expire_hours * 3600,
    )
    return result


@router.post("/auth/register", response_model=LoginResponse)
def register(payload: RegisterRequest, response: Response) -> LoginResponse:
    result = service.register(payload)
    cache_service.delete_auth_me(result.user.id)
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
def current_user(user_id: str = Depends(get_current_user_id)) -> CurrentUserResponse:
    cached = cache_service.get_json(cache_service.auth_me_key(user_id))
    if cached is not None:
        return CurrentUserResponse.model_validate(cached)

    response = service.current_user_by_id(user_id)
    cache_service.set_json(
        cache_service.auth_me_key(user_id),
        response.model_dump(mode="json"),
        ttl_seconds=settings.cache_auth_me_ttl_seconds,
    )
    return response
