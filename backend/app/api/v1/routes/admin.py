from pathlib import Path

from fastapi import APIRouter, Depends, status
from sqlalchemy import text

from app.api.deps import require_root
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.admin import AdminSystemStatus, AdminUser, AdminUserCreate, AdminUserListResponse, AdminUserUpdate, UserPermissionUpdateRequest
from app.schemas.auth import ModulePermissionItem, PasswordResetRequest
from app.services.user_service import UserService


router = APIRouter()
service = UserService()
settings = get_settings()
LOCAL_STORAGE_PATH = (Path(__file__).resolve().parents[4] / "data" / "local_assets").as_posix()


@router.get("/admin/users", response_model=AdminUserListResponse)
def list_users(_: User = Depends(require_root)) -> AdminUserListResponse:
    return service.list_users()


@router.get("/admin/system-status", response_model=AdminSystemStatus)
def get_system_status(_: User = Depends(require_root)) -> AdminSystemStatus:
    database_status = "ok"
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
    except Exception:
        database_status = "error"

    return AdminSystemStatus(
        backend_status="ok",
        database_status=database_status,
        storage_mode="local_disk",
        storage_path=LOCAL_STORAGE_PATH,
        oss_compat_enabled=settings.oss_enabled,
        environment=settings.app_env,
    )


@router.post("/admin/users", response_model=AdminUser, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminUserCreate, _: User = Depends(require_root)) -> AdminUser:
    return service.create_user(payload)


@router.patch("/admin/users/{user_id}", response_model=AdminUser)
def update_user(user_id: str, payload: AdminUserUpdate, _: User = Depends(require_root)) -> AdminUser:
    return service.update_user(user_id, payload)


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, _: User = Depends(require_root)) -> None:
    service.soft_delete_user(user_id)


@router.post("/admin/users/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(user_id: str, payload: PasswordResetRequest, _: User = Depends(require_root)) -> None:
    service.reset_password(user_id, payload.password)


@router.put("/admin/users/{user_id}/permissions", response_model=list[ModulePermissionItem])
def update_permissions(
    user_id: str,
    payload: UserPermissionUpdateRequest,
    _: User = Depends(require_root),
) -> list[ModulePermissionItem]:
    return service.update_permissions(user_id, payload)
