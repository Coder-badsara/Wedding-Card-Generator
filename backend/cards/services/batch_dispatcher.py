import os
import sys
import subprocess
from pathlib import Path
from django.conf import settings

def dispatch_batch_worker(batch_id: str) -> None:
    """
    Launches an independent OS process to execute the batch.
    Output is redirected to media/.../logs/worker.log with UTF-8 encoding.
    """
    from ..models import GenerationBatch
    batch = GenerationBatch.objects.get(id=batch_id)

    log_dir = Path(settings.MEDIA_ROOT) / "projects" / str(batch.project.id) / "batches" / str(batch.id) / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file_path = log_dir / "worker.log"
    log_file = open(log_file_path, "a", encoding="utf-8")

    cmd = [sys.executable, "manage.py", "process_batch", str(batch.id)]

    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"

    subprocess.Popen(
        cmd,
        cwd=str(settings.BASE_DIR),
        stdout=log_file,
        stderr=log_file,
        env=env,
        shell=False,
        creationflags=flags
    )
