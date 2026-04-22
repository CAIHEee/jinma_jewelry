from app.services.job_queue_service import JobQueueService


def run_generation_job(job_id: str) -> None:
    JobQueueService().run_job(job_id)
