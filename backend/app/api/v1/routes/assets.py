from fastapi import APIRouter, File, Form, Response, UploadFile, status
from fastapi.responses import FileResponse

from app.schemas.assets import AssetListResponse, AssetRecord
from app.services.asset_service import AssetService


router = APIRouter()
service = AssetService()


@router.get("/assets", response_model=AssetListResponse)
def list_assets() -> AssetListResponse:
    return service.list_records()


@router.post("/assets/upload", response_model=AssetRecord, status_code=status.HTTP_201_CREATED)
async def upload_asset(
    file: UploadFile = File(...),
    module_kind: str = Form(...),
    source_kind: str = Form(default="manual_upload"),
) -> AssetRecord:
    return await service.create_input_asset(file=file, module_kind=module_kind, source_kind=source_kind)


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: str) -> Response:
    service.delete_record(asset_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/assets/local/{object_key:path}", response_class=FileResponse)
def get_local_asset(object_key: str) -> FileResponse:
    return service.get_local_asset_response(object_key)


@router.get("/assets/content")
def get_asset_content(storage_url: str, filename: str | None = None) -> Response:
    return service.get_asset_content_response(storage_url=storage_url, filename=filename)
