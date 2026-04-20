import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from fastapi import HTTPException, status
from sqlalchemy import desc, select

from app.db.session import SessionLocal, init_db
from app.models.generation_record import GenerationRecord
from app.schemas.history import HistoryListResponse, HistoryRecord, HistoryRecordCreate
from app.services.storage_service import StorageService


class HistoryService:
    def __init__(self) -> None:
        self.storage_dir = Path(__file__).resolve().parents[2] / "data"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.legacy_storage_path = self.storage_dir / "history_records.json"
        self.storage_service = StorageService()
        self._bootstrapped_legacy = False
        init_db()

    def list_records(self) -> HistoryListResponse:
        self._bootstrap_from_legacy_file()
        with SessionLocal() as session:
            statement = select(GenerationRecord).order_by(desc(GenerationRecord.created_at))
            records = session.execute(statement).scalars().all()
        items = [self._with_preview_url(self._to_schema(record)) for record in records]
        items = self._dedupe_items(items)
        return HistoryListResponse(items=items)

    def create_record(self, payload: HistoryRecordCreate) -> HistoryRecord:
        self._bootstrap_from_legacy_file()
        with SessionLocal() as session:
            record = GenerationRecord(
                user_id=payload.user_id,
                job_id=payload.job_id,
                kind=payload.kind,
                title=payload.title,
                model=payload.model,
                provider=payload.provider,
                status=payload.status,
                prompt=payload.prompt,
                image_url=payload.image_url,
                storage_url=payload.storage_url,
                metadata_json=self._dump_metadata(payload.metadata),
            )
            session.add(record)
            session.commit()
            session.refresh(record)
        return self._with_preview_url(self._to_schema(record))

    def delete_record(self, history_id: str) -> None:
        self._bootstrap_from_legacy_file()
        with SessionLocal() as session:
            record = session.get(GenerationRecord, history_id)
            if record is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History record not found.")

            metadata = self._load_metadata(record.metadata_json)
            for storage_url in self._collect_generated_storage_urls(record.storage_url, metadata):
                self._delete_storage_url(storage_url)

            session.delete(record)
            session.commit()

    def _bootstrap_from_legacy_file(self) -> None:
        if self._bootstrapped_legacy or not self.legacy_storage_path.exists():
            self._bootstrapped_legacy = True
            return

        with SessionLocal() as session:
            has_records = session.execute(select(GenerationRecord.id).limit(1)).first() is not None
            if has_records:
                self._bootstrapped_legacy = True
                return

            payload = json.loads(self.legacy_storage_path.read_text(encoding="utf-8"))
            for item in payload:
                record = HistoryRecord.model_validate(item)
                session.add(
                    GenerationRecord(
                        id=record.id,
                        kind=record.kind,
                        title=record.title,
                        model=record.model,
                        provider=record.provider,
                        status=record.status,
                        prompt=record.prompt,
                        image_url=record.image_url,
                        storage_url=record.storage_url,
                        metadata_json=self._dump_metadata(record.metadata),
                        created_at=record.created_at,
                        updated_at=record.created_at,
                    )
                )
            session.commit()
        self._bootstrapped_legacy = True

    def _to_schema(self, record: GenerationRecord) -> HistoryRecord:
        return HistoryRecord(
            id=record.id,
            kind=record.kind,  # type: ignore[arg-type]
            title=record.title,
            model=record.model,
            provider=record.provider,
            status=record.status,
            prompt=record.prompt,
            user_id=record.user_id,
            job_id=record.job_id,
            image_url=record.image_url,
            storage_url=record.storage_url,
            preview_url=None,
            metadata=self._load_metadata(record.metadata_json),
            created_at=self._normalize_datetime(record.created_at),
        )

    def _dump_metadata(self, metadata: dict[str, object] | None) -> str | None:
        if metadata is None:
            return None
        return json.dumps(metadata, ensure_ascii=False)

    def _load_metadata(self, metadata_json: str | None) -> dict[str, object] | None:
        if not metadata_json:
            return None
        loaded = json.loads(metadata_json)
        if isinstance(loaded, dict):
            return loaded
        return None

    def _normalize_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is not None:
            return value
        return value.replace(tzinfo=timezone.utc)

    def _build_asset_content_url(self, storage_url: str, filename: str | None = None) -> str:
        query: dict[str, str] = {"storage_url": storage_url}
        if filename:
            query["filename"] = filename
        return f"/api/v1/assets/content?{urlencode(query)}"

    def _with_preview_url(self, item: HistoryRecord) -> HistoryRecord:
        preview_url = self._build_asset_content_url(item.storage_url, item.title) if item.storage_url else item.image_url
        return item.model_copy(
            update={
                "preview_url": preview_url,
                "metadata": self._with_source_preview_metadata(item.metadata),
            }
        )

    def _dedupe_items(self, items: list[HistoryRecord]) -> list[HistoryRecord]:
        seen: set[str] = set()
        deduped: list[HistoryRecord] = []

        for item in items:
            dedupe_key = self._build_dedupe_key(item)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            deduped.append(item)

        return deduped

    def _with_source_preview_metadata(self, metadata: dict[str, object] | None) -> dict[str, object] | None:
        if metadata is None:
            return None

        enriched = dict(metadata)

        source_storage_url = enriched.get("source_image_storage_url")
        if isinstance(source_storage_url, str) and source_storage_url:
            enriched["source_image_url"] = self._build_asset_content_url(source_storage_url)

        normalized_images: list[dict[str, object]] = []
        source_images = enriched.get("source_images")
        if isinstance(source_images, list):
            for item in source_images:
                if not isinstance(item, dict):
                    continue

                next_item = dict(item)
                storage_url = next_item.get("storage_url")
                if isinstance(storage_url, str) and storage_url:
                    filename = next_item.get("filename") if isinstance(next_item.get("filename"), str) else None
                    next_item["preview_url"] = self._build_asset_content_url(storage_url, filename)
                elif isinstance(next_item.get("source_image_url"), str):
                    next_item["preview_url"] = next_item["source_image_url"]
                normalized_images.append(next_item)

            enriched["source_images"] = normalized_images

        items = enriched.get("items")
        if isinstance(items, list):
            normalized_items: list[dict[str, object]] = []
            for item in items:
                if not isinstance(item, dict):
                    continue

                next_item = dict(item)
                storage_url = next_item.get("storage_url")
                if isinstance(storage_url, str) and storage_url:
                    filename = next_item.get("view") if isinstance(next_item.get("view"), str) else None
                    next_item["preview_url"] = self._build_asset_content_url(storage_url, filename)
                    next_item["image_url"] = next_item["preview_url"]
                normalized_items.append(next_item)

            enriched["items"] = normalized_items

        if "source_image_url" not in enriched and normalized_images:
            first_preview = normalized_images[0].get("preview_url")
            if isinstance(first_preview, str) and first_preview:
                enriched["source_image_url"] = first_preview

        return enriched

    def _collect_generated_storage_urls(
        self,
        storage_url: str | None,
        metadata: dict[str, object] | None,
    ) -> list[str]:
        urls: list[str] = []
        if isinstance(storage_url, str) and storage_url:
            urls.append(storage_url)

        items = metadata.get("items") if isinstance(metadata, dict) else None
        if isinstance(items, list):
            for item in items:
                if not isinstance(item, dict):
                    continue
                item_storage_url = item.get("storage_url")
                if isinstance(item_storage_url, str) and item_storage_url:
                    urls.append(item_storage_url)

        deduped: list[str] = []
        seen: set[str] = set()
        for item in urls:
            if item in seen:
                continue
            seen.add(item)
            deduped.append(item)
        return deduped

    def _delete_storage_url(self, storage_url: str) -> None:
        if storage_url.startswith("oss://"):
            try:
                _, object_key = self.storage_service.parse_storage_url(storage_url)
                self.storage_service.delete_object(object_key)
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to delete generated asset from OSS: {exc}",
                ) from exc
            return

        if storage_url.startswith("local://"):
            local_path = self._resolve_local_object_path(storage_url.removeprefix("local://"))
            if local_path.exists():
                local_path.unlink()

    def _build_dedupe_key(self, item: HistoryRecord) -> str:
        resolved_kind = self._resolve_kind(item)
        preview_url = item.preview_url or item.storage_url or item.image_url or ""

        if resolved_kind == "multi_view_split":
            metadata = item.metadata or {}
            source_image_url = str(metadata.get("source_image_url") or "")
            split_x = str(metadata.get("split_x_ratio") or "")
            split_y = str(metadata.get("split_y_ratio") or "")
            gap_x = str(metadata.get("gap_x_ratio") or "")
            gap_y = str(metadata.get("gap_y_ratio") or "")
            return "|".join([resolved_kind, item.model, source_image_url or preview_url, split_x, split_y, gap_x, gap_y])

        return "|".join([resolved_kind, item.title, item.model, item.provider, item.prompt, preview_url])

    def _resolve_kind(self, item: HistoryRecord) -> str:
        normalized_title = item.title.strip().lower()
        normalized_prompt = item.prompt.strip().lower()
        metadata = item.metadata or {}
        has_split_metadata = (
            bool(metadata.get("split_x_ratio"))
            or bool(metadata.get("split_y_ratio"))
            or bool(metadata.get("gap_x_ratio"))
            or bool(metadata.get("gap_y_ratio"))
            or bool(metadata.get("items"))
        )

        if (
            item.kind in {"multi_view_split", "split_multi_view"}
            or "multi-view split" in normalized_title
            or "多视图切图" in normalized_title
            or "split four-grid multi-view" in normalized_prompt
            or has_split_metadata
        ):
            return "multi_view_split"

        return item.kind

    def _resolve_local_object_path(self, object_key: str) -> Path:
        normalized_parts = [part for part in Path(object_key).parts if part not in {"", ".", ".."}]
        local_path = self.storage_dir / "local_assets"
        candidate = local_path.joinpath(*normalized_parts)
        resolved_root = local_path.resolve()
        resolved_path = candidate.resolve()
        if not str(resolved_path).startswith(str(resolved_root)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid local asset path.")
        return resolved_path
