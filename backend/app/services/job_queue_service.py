from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from redis import Redis
from rq import Queue
from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.generation_job import GenerationJob
from app.models.user import User
from app.schemas.ai import FusionRequestMetadata, MultiViewSplitRequest, ReferenceImageRequestMetadata, TextToImageRequest
from app.schemas.jobs import GenerationJobAccepted, GenerationJobStatusResponse
from app.services.ai_service import AIService


ACTIVE_JOB_STATUSES = ("queued", "running", "uploading")


class JobQueueService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def ensure_can_enqueue(self, *, current_user: User) -> None:
        limit = self.settings.queue_root_max_active_jobs if current_user.role == "root" else self.settings.queue_user_max_active_jobs
        with SessionLocal() as session:
            active_count = session.scalar(
                select(func.count())
                .select_from(GenerationJob)
                .where(GenerationJob.user_id == current_user.id, GenerationJob.status.in_(ACTIVE_JOB_STATUSES))
            ) or 0
        if active_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="当前已有任务生成中，请等待完成后再提交。",
            )

    def enqueue_job(
        self,
        *,
        current_user: User,
        feature_key: str,
        model: str | None,
        prompt: str | None,
        request_payload: dict[str, Any],
    ) -> GenerationJobAccepted:
        self.ensure_can_enqueue(current_user=current_user)
        queue = self._build_queue()
        now = datetime.now(timezone.utc)

        with SessionLocal() as session:
            job = GenerationJob(
                user_id=current_user.id,
                queue_name=self.settings.queue_name,
                rq_job_id="",
                feature_key=feature_key,
                model=model,
                prompt=prompt,
                status="queued",
                request_json=self._dump_json(request_payload),
                created_at=now,
                updated_at=now,
            )
            session.add(job)
            session.flush()
            job.rq_job_id = job.id
            session.commit()
            job_id = job.id

        try:
            queue.enqueue(
                "app.tasks.ai_jobs.run_generation_job",
                job_id,
                job_id=job_id,
                job_timeout=self.settings.queue_job_timeout_seconds,
                result_ttl=self.settings.queue_result_ttl_seconds,
            )
        except Exception as exc:  # noqa: BLE001
            self.mark_failed(job_id, f"任务入队失败: {exc}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"任务队列不可用: {exc}",
            ) from exc

        return GenerationJobAccepted(
            job_id=job_id,
            status="queued",
            feature=feature_key,
            message="任务已进入队列。",
        )

    def get_job(self, *, job_id: str, current_user: User) -> GenerationJobStatusResponse:
        with SessionLocal() as session:
            job = session.get(GenerationJob, job_id)
            if job is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在。")
            if current_user.role != "root" and job.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权查看该任务。")
            session.expunge(job)
        return self._to_schema(job)

    def mark_running(self, job_id: str) -> None:
        self._update_job(job_id, status="running", started_at=datetime.now(timezone.utc), error_message=None)

    def mark_uploading(self, job_id: str) -> None:
        self._update_job(job_id, status="uploading")

    def mark_succeeded(self, job_id: str, result: dict[str, Any]) -> None:
        completed_at = datetime.now(timezone.utc)
        self._update_job(
            job_id,
            status="succeeded",
            result_json=self._dump_json(result),
            error_message=None,
            completed_at=completed_at,
        )

    def mark_failed(self, job_id: str, error_message: str) -> None:
        completed_at = datetime.now(timezone.utc)
        self._update_job(
            job_id,
            status="failed",
            error_message=error_message[:4000],
            completed_at=completed_at,
        )

    def run_job(self, job_id: str) -> None:
        with SessionLocal() as session:
            job = session.get(GenerationJob, job_id)
            if job is None:
                raise RuntimeError(f"Job {job_id} not found.")
            user = session.get(User, job.user_id)
            if user is None:
                raise RuntimeError(f"User {job.user_id} not found for job {job_id}.")
            request_payload = self._load_json(job.request_json) or {}
            session.expunge(user)

        self.mark_running(job_id)
        try:
            result = asyncio.run(self._execute_job(job_id=job_id, feature_key=job.feature_key, request_payload=request_payload, current_user=user))
        except Exception as exc:  # noqa: BLE001
            self.mark_failed(job_id, str(exc))
            raise
        self.mark_succeeded(job_id, result)

    async def _execute_job(
        self,
        *,
        job_id: str,
        feature_key: str,
        request_payload: dict[str, Any],
        current_user: User,
    ) -> dict[str, Any]:
        service = AIService()
        stage_callback = lambda stage: self._handle_stage_callback(job_id, stage)

        if feature_key == "text_to_image":
            request = TextToImageRequest.model_validate(request_payload["request"])
            result = await service.generate_text_to_image(request, current_user=current_user, stage_callback=stage_callback)
            return result.model_dump(mode="json")

        if feature_key == "multi_image_fusion":
            metadata = FusionRequestMetadata.model_validate(request_payload["metadata"])
            result = await service.fuse_images(
                files=[],
                metadata=metadata,
                current_user=current_user,
                source_image_urls=request_payload.get("source_image_urls") or None,
                stage_callback=stage_callback,
            )
            return result.model_dump(mode="json")

        if feature_key == "multi_view_split":
            payload = MultiViewSplitRequest.model_validate(request_payload["payload"])
            result = await service.split_multi_view_image(payload, current_user=current_user, stage_callback=stage_callback)
            return result.model_dump(mode="json")

        metadata = ReferenceImageRequestMetadata.model_validate(request_payload["metadata"])
        source_image_urls = request_payload.get("source_image_urls") or []

        if feature_key == "multi_view":
            result = await service.generate_multi_view(
                file=None,
                metadata=metadata,
                current_user=current_user,
                source_image_url=source_image_urls[0] if source_image_urls else None,
                stage_callback=stage_callback,
            )
            return result.model_dump(mode="json")

        if len(source_image_urls) > 1:
            result = await service.transform_reference_images(
                files=[],
                metadata=metadata,
                current_user=current_user,
                source_image_urls=source_image_urls,
                stage_callback=stage_callback,
            )
            return result.model_dump(mode="json")

        result = await service.transform_reference_image(
            file=None,
            metadata=metadata,
            current_user=current_user,
            source_image_url=source_image_urls[0] if source_image_urls else None,
            stage_callback=stage_callback,
        )
        return result.model_dump(mode="json")

    def _handle_stage_callback(self, job_id: str, stage: str) -> None:
        if stage == "uploading":
            self.mark_uploading(job_id)

    def _to_schema(self, job: GenerationJob) -> GenerationJobStatusResponse:
        result = self._load_json(job.result_json)
        return GenerationJobStatusResponse(
            job_id=job.id,
            feature=job.feature_key,
            status=job.status,  # type: ignore[arg-type]
            model=job.model,
            prompt=job.prompt,
            message=self._status_message(job.status, error_message=job.error_message),
            error_message=job.error_message,
            result=result,
            created_at=self._normalize_datetime(job.created_at),
            started_at=self._normalize_datetime(job.started_at) if job.started_at else None,
            completed_at=self._normalize_datetime(job.completed_at) if job.completed_at else None,
        )

    def _update_job(self, job_id: str, **fields: Any) -> None:
        with SessionLocal() as session:
            job = session.get(GenerationJob, job_id)
            if job is None:
                return
            for key, value in fields.items():
                setattr(job, key, value)
            job.updated_at = datetime.now(timezone.utc)
            session.commit()

    def _build_queue(self) -> Queue:
        try:
            redis = Redis.from_url(self.settings.queue_redis_url)
            redis.ping()
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Redis unavailable at {self.settings.queue_redis_url}") from exc
        return Queue(name=self.settings.queue_name, connection=redis)

    def _dump_json(self, payload: dict[str, Any] | None) -> str | None:
        if payload is None:
            return None
        return json.dumps(payload, ensure_ascii=False)

    def _load_json(self, payload: str | None) -> dict[str, Any] | None:
        if not payload:
            return None
        loaded = json.loads(payload)
        return loaded if isinstance(loaded, dict) else None

    def _status_message(self, status_value: str, *, error_message: str | None) -> str:
        mapping = {
            "queued": "任务排队中。",
            "running": "任务执行中。",
            "uploading": "结果上传与落库中。",
            "succeeded": "任务已完成。",
            "failed": error_message or "任务执行失败。",
        }
        return mapping.get(status_value, "任务状态未知。")

    def _normalize_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is not None:
            return value
        return value.replace(tzinfo=timezone.utc)
