from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import ModulePermissionItem


class AdminUserBase(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    display_name: str | None = Field(default=None, max_length=128)
    email: str | None = None
    is_disabled: bool = False


class AdminUserCreate(AdminUserBase):
    password: str = Field(min_length=6)


class AdminUserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=64)
    display_name: str | None = Field(default=None, max_length=128)
    email: str | None = None
    is_disabled: bool | None = None


class AdminUser(BaseModel):
    id: str
    username: str
    display_name: str | None = None
    email: str | None = None
    role: str
    is_disabled: bool
    created_at: datetime
    permissions: list[ModulePermissionItem]


class AdminUserListResponse(BaseModel):
    items: list[AdminUser]


class AdminSystemStatus(BaseModel):
    backend_status: str
    database_status: str
    storage_mode: str
    storage_path: str
    oss_compat_enabled: bool
    environment: str


class UserPermissionUpdateItem(BaseModel):
    module_key: str
    is_enabled: bool


class UserPermissionUpdateRequest(BaseModel):
    items: list[UserPermissionUpdateItem]
