from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import get_current_user, require_module
from app.models.user import User
from app.schemas.history import HistoryListResponse, HistoryRecord, HistoryRecordCreate
from app.services.history_service import HistoryService


router = APIRouter()
service = HistoryService()


@router.get("/history", response_model=HistoryListResponse)
def list_history(
    include_all: bool = Query(default=False),
    current_user: User = Depends(require_module("history")),
) -> HistoryListResponse:
    return service.list_records(current_user=current_user, include_all=include_all)


@router.post("/history", response_model=HistoryRecord, status_code=status.HTTP_201_CREATED)
def create_history(payload: HistoryRecordCreate, current_user: User = Depends(get_current_user)) -> HistoryRecord:
    return service.create_record(payload, current_user=current_user)


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history(history_id: str, current_user: User = Depends(require_module("history"))) -> Response:
    service.delete_record(history_id, current_user=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
