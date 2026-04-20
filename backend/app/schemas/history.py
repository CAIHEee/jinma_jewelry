from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


HistoryKind = Literal[
    "text_to_image",
    "fusion",
    "image_edit",
    "sketch_to_realistic",
    "grayscale_relief",
    "multi_view",
    "multi_view_split",
    "upscale",
    "depth",
    "stl_export",
]


class HistoryRecordCreate(BaseModel):
    kind: HistoryKind
    title: str = Field(min_length=1)
    model: str
    provider: str
    status: str
    prompt: str
    user_id: str | None = None
    job_id: str | None = None
    image_url: str | None = None
    storage_url: str | None = None
    metadata: dict[str, object] | None = None


class HistoryRecord(BaseModel):
    id: str
    kind: HistoryKind
    title: str
    model: str
    provider: str
    status: str
    prompt: str
    user_id: str | None = None
    job_id: str | None = None
    image_url: str | None = None
    storage_url: str | None = None
    preview_url: str | None = None
    metadata: dict[str, object] | None = None
    created_at: datetime


class HistoryListResponse(BaseModel):
    items: list[HistoryRecord]
