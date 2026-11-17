import time
import random
from django.db import transaction, IntegrityError, OperationalError
from rest_framework.exceptions import ValidationError
from ..models import CardProject, GenerationBatch
from .batch_dispatcher import dispatch_batch_worker

def create_and_dispatch_batch(
    project_id: str,
    guest_names_raw: str,
    batch_name: str,
    target_language: str = 'original',
    batch_id: str | None = None,
    max_retries: int = 5
) -> GenerationBatch:
    guest_list = [name.strip() for name in guest_names_raw.splitlines() if name.strip()]
    if not guest_list:
        raise ValidationError({"guest_names": "Please provide at least one valid guest name."})

    try:
        project = CardProject.objects.get(id=project_id)
    except CardProject.DoesNotExist:
        raise ValidationError({"project": "Project not found."})

    # If appending to an existing batch
    if batch_id:
        try:
            batch = GenerationBatch.objects.get(id=batch_id, project=project)
        except GenerationBatch.DoesNotExist:
            raise ValidationError({"batch_id": "Target batch not found."})

        if batch.status == 'PROCESSING':
            raise ValidationError({"batch_id": "This batch is currently generating. Please wait for it to complete."})

        with transaction.atomic():
            existing_count = batch.cards.count()
            current_raw = batch.raw_input_names.strip()
            if current_raw:
                batch.raw_input_names = f"{current_raw}\n{guest_names_raw.strip()}"
            else:
                batch.raw_input_names = guest_names_raw.strip()

            batch.total_guests = existing_count + len(guest_list)
            batch.status = 'PENDING'
            batch.error_message = ''
            batch.target_language = target_language
            if batch_name.strip():
                batch.batch_name = batch_name.strip()
            batch.save(update_fields=['raw_input_names', 'total_guests', 'status', 'error_message', 'target_language', 'batch_name'])

            transaction.on_commit(lambda: dispatch_batch_worker(str(batch.id)))
            return batch

    base_delay = 0.05

    for attempt in range(max_retries):
        try:
            with transaction.atomic():
                last_batch = GenerationBatch.objects.filter(project=project).order_by('-batch_number').first()
                next_batch_num = (last_batch.batch_number + 1) if last_batch else 1

                batch = GenerationBatch.objects.create(
                    project=project,
                    batch_number=next_batch_num,
                    batch_name=batch_name or f"Batch {next_batch_num}",
                    raw_input_names=guest_names_raw,
                    target_language=target_language,
                    total_guests=len(guest_list),
                    status='PENDING'
                )

                # Dispatch worker strictly AFTER database transaction commits
                transaction.on_commit(lambda: dispatch_batch_worker(str(batch.id)))
                return batch

        except (IntegrityError, OperationalError) as err:
            if isinstance(err, OperationalError) and "locked" not in str(err).lower() and "busy" not in str(err).lower():
                raise err
            if attempt == max_retries - 1:
                raise ValidationError({"error": "Database is busy. Please submit the batch again."})
            sleep_time = (base_delay * (2 ** attempt)) + (random.uniform(0.01, 0.05))
            time.sleep(sleep_time)

    raise ValidationError({"error": "Failed to allocate batch after retries."})
