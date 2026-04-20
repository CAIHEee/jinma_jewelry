def run_fusion_job(job_id: str) -> dict[str, str]:
    return {
        "job_id": job_id,
        "status": "pending_worker",
    }
