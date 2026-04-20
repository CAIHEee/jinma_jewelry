from datetime import datetime

from pydantic import BaseModel


class AssetRecord(BaseModel):
    id: str
    name: str
    source_kind: str
    module_kind: str | None = None
    storage_url: str
    preview_url: str | None = None
    mime_type: str | None = None
    file_size: int | None = None
    metadata: dict[str, object] | None = None
    created_at: datetime


class AssetListResponse(BaseModel):
    items: list[AssetRecord]
