from pathlib import Path

from fastapi import APIRouter

from app.core.config import get_settings


router = APIRouter()
LOCAL_STORAGE_PATH = (Path(__file__).resolve().parents[4] / "data" / "local_assets").as_posix()


@router.get("/system/summary")
def system_summary() -> dict[str, object]:
    settings = get_settings()
    return {
        "name": settings.app_name,
        "environment": settings.app_env,
        "providers": [settings.ai_default_provider],
        "storage": {
            "provider": "local_disk",
            "path": LOCAL_STORAGE_PATH,
            "oss_compat_enabled": settings.oss_enabled,
        },
        "features": [
            "text_to_image",
            "image_edit",
            "multi_view",
            "multi_image_fusion",
        ],
    }
