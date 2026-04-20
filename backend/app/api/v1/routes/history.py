from fastapi import APIRouter, Response, status

from app.schemas.history import HistoryListResponse, HistoryRecord, HistoryRecordCreate
from app.services.history_service import HistoryService


router = APIRouter()
service = HistoryService()


@router.get("/history", response_model=HistoryListResponse)
def list_history() -> HistoryListResponse:
    return service.list_records()


@router.post("/history", response_model=HistoryRecord, status_code=status.HTTP_201_CREATED)
def create_history(payload: HistoryRecordCreate) -> HistoryRecord:
    return service.create_record(payload)


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history(history_id: str) -> Response:
    service.delete_record(history_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
