from fastapi import APIRouter

from app.api.v1.routes import ai, assets, history, system


api_router = APIRouter()
api_router.include_router(system.router, tags=["system"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(history.router, tags=["history"])
api_router.include_router(assets.router, tags=["assets"])
