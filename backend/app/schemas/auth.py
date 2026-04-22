from datetime import datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=6)
    display_name: str | None = Field(default=None, max_length=128)
    email: str | None = None


class ModulePermissionItem(BaseModel):
    module_key: str
    label: str
    is_enabled: bool


class CurrentUserResponse(BaseModel):
    id: str
    username: str
    display_name: str | None = None
    email: str | None = None
    role: str
    is_disabled: bool
    permissions: list[ModulePermissionItem]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: CurrentUserResponse


class PasswordResetRequest(BaseModel):
    password: str = Field(min_length=6)
