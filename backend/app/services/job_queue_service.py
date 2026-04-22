from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
import httpx
from redis import Redis
from rq import Queue
from rq.job import Job
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

        self._reconcile_with_rq(job_id)

        with SessionLocal() as session:
            job = session.get(GenerationJob, job_id)
            if job is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在。")
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
            result_json=self._dump_json(self._compact_result(result)),
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
            self.mark_failed(job_id, self._format_exception_message(exc))
            raise
        try:
            self.mark_succeeded(job_id, result)
        except Exception as exc:  # noqa: BLE001
            self.mark_failed(job_id, self._format_exception_message(exc))
            raise

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
        normalized_error = self._format_exception_message(job.error_message) if job.error_message else None
        result = self._load_json(job.result_json)
        return GenerationJobStatusResponse(
            job_id=job.id,
            feature=job.feature_key,
            status=job.status,  # type: ignore[arg-type]
            model=job.model,
            prompt=job.prompt,
            message=self._status_message(job.status, error_message=normalized_error),
            error_message=normalized_error,
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

    def _reconcile_with_rq(self, job_id: str) -> None:
        with SessionLocal() as session:
            job = session.get(GenerationJob, job_id)
            if job is None or job.status == "succeeded":
                return

        if job.status == "failed" and job.error_message:
            return

        try:
            redis = Redis.from_url(self.settings.queue_redis_url)
            rq_job = Job.fetch(job.rq_job_id, connection=redis)
        except Exception:  # noqa: BLE001
            return

        rq_status = rq_job.get_status(refresh=True)
        if rq_status == "failed":
            message = self._format_exception_message(rq_job.exc_info or RuntimeError("任务执行失败"))
            self._update_job(
                job.id,
                status="failed",
                error_message=message[:4000],
                completed_at=datetime.now(timezone.utc),
            )
        elif rq_status in {"finished", "stopped", "canceled"} and job.status != "succeeded":
            self._update_job(
                job.id,
                status="failed",
                error_message="任务已结束，但数据库结果状态未正确落库。",
                completed_at=datetime.now(timezone.utc),
            )

    def _dump_json(self, payload: dict[str, Any] | None) -> str | None:
        if payload is None:
            return None
        return json.dumps(payload, ensure_ascii=False)

    def _load_json(self, payload: str | None) -> dict[str, Any] | None:
        if not payload:
            return None
        loaded = json.loads(payload)
        return loaded if isinstance(loaded, dict) else None

    def _compact_result(self, payload: dict[str, Any]) -> dict[str, Any]:
        compact = dict(payload)
        if "raw_response" in compact:
            compact["raw_response"] = None
        return compact

    def _format_exception_message(self, exc: object) -> str:
        if isinstance(exc, str):
            message = exc.strip()
            if not message:
                return "任务执行失败。"
            if "Data too long for column 'result_json'" in message:
                return "任务结果写入数据库失败：result_json 字段长度不足。"
            if "ReadTimeout" in message or "httpx.ReadTimeout" in message:
                return "上游模型服务请求超时，请稍后重试。"
            if "Traceback" in message:
                lines = [line.strip() for line in message.splitlines() if line.strip()]
                if lines:
                    for line in reversed(lines):
                        if "Error:" in line or "Exception:" in line or "Timeout" in line:
                            return line[:4000]
                    return "任务执行失败。"
            return message[:4000]
        if isinstance(exc, HTTPException):
            detail = exc.detail
            if isinstance(detail, str) and detail.strip():
                return detail[:4000]
            return f"HTTP {exc.status_code} 错误。"
        if isinstance(exc, httpx.TimeoutException):
            return "上游模型服务请求超时，请稍后重试。"
        if isinstance(exc, Exception):
            message = str(exc).strip()
            if message:
                return message[:4000]
            return f"{exc.__class__.__name__} occurred."
        return "任务执行失败。"

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
