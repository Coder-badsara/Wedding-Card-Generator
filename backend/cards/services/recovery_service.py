from pathlib import Path
from django.utils import timezone
from django.conf import settings
import psutil

MAX_HEARTBEAT_AGE_SECONDS = 180 # 3 minutes

def is_worker_alive(pid: int) -> bool:
    if not pid:
        return False
    try:
        return psutil.pid_exists(pid)
    except Exception:
        return False

def check_and_recover_batch(batch) -> None:
    """
    Checks if a batch currently marked as PROCESSING has become stale or crashed.
    If so, transitions it to FAILED and cleans temporary files.
    """
    if batch.status == 'PROCESSING':
        now = timezone.now()
        last_seen = batch.heartbeat_at or batch.started_at

        if last_seen:
            age_seconds = (now - last_seen).total_seconds()
            worker_alive = is_worker_alive(batch.worker_pid)

            if not worker_alive or age_seconds > MAX_HEARTBEAT_AGE_SECONDS:
                batch.status = 'FAILED'
                batch.completed_at = now
                if not worker_alive:
                    batch.error_message = "Worker process terminated unexpectedly."
                else:
                    batch.error_message = f"Worker stalled (no heartbeat for {int(age_seconds)}s)."
                batch.save(update_fields=['status', 'completed_at', 'error_message'])

                # Cleanup any orphaned temp files
                batch_dir = Path(settings.MEDIA_ROOT) / "projects" / str(batch.project.id) / "batches" / str(batch.id)
                temp_dir = batch_dir / "temp"
                if temp_dir.exists():
                    for f in temp_dir.glob("*.tmp"):
                        try:
                            f.unlink()
                        except Exception:
                            pass
