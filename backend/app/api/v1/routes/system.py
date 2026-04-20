from fastapi import APIRouter

from app.core.config import get_settings


router = APIRouter()


@router.get("/system/summary")
def system_summary() -> dict[str, object]:
    settings = get_settings()
    return {
        "name": settings.app_name,
        "environment": settings.app_env,
        "providers": [settings.ai_default_provider],
        "storage": {
            "provider": settings.oss_provider,
            "bucket": settings.oss_bucket,
            "endpoint": settings.oss_endpoint,
            "region": settings.oss_region,
            "enabled": settings.oss_enabled,
        },
        "features": [
            "text_to_image",
            "image_edit",
            "multi_view",
            "multi_image_fusion",
        ],
    }
