import os
import re
import sys
import time
import shutil
import zipfile
import traceback
from pathlib import Path
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from cards.models import GenerationBatch, GeneratedCard
from cards.services.pdf_engine import render_guest_card
from cards.services.filename_sanitizer import sanitize_guest_filename
from cards.services.transliteration_service import transliterate_phrase

class Command(BaseCommand):
    help = "Processes a generation batch in a standalone worker process."

    def add_arguments(self, parser):
        parser.add_argument('batch_id', type=str, help="UUID of the GenerationBatch")

    def handle(self, *args, **options):
        # Ensure stdout and stderr handle Unicode (Devanagari) properly on Windows
        if hasattr(sys.stdout, 'reconfigure'):
            try:
                sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            except Exception:
                pass
        if hasattr(sys.stderr, 'reconfigure'):
            try:
                sys.stderr.reconfigure(encoding='utf-8', errors='replace')
            except Exception:
                pass

        batch_id = options['batch_id']
        try:
            self.stdout.write(f"[{timezone.now()}] Worker starting for batch {batch_id}")
        except Exception:
            pass

        # Claim batch atomically
        with transaction.atomic():
            try:
                batch = GenerationBatch.objects.select_for_update().get(id=batch_id)
            except GenerationBatch.DoesNotExist:
                self.stderr.write(f"Error: Batch {batch_id} does not exist.")
                return

            if batch.status != 'PENDING':
                self.stderr.write(f"Warning: Batch {batch_id} is in status '{batch.status}', skipping.")
                return

            batch.status = 'PROCESSING'
            batch.worker_pid = os.getpid()
            batch.started_at = timezone.now()
            batch.heartbeat_at = timezone.now()
            batch.save(update_fields=['status', 'worker_pid', 'started_at', 'heartbeat_at'])

        project = batch.project
        master_pdf_path = Path(project.original_pdf.path)

        batch_dir = Path(settings.MEDIA_ROOT) / "projects" / str(project.id) / "batches" / str(batch.id)
        cards_dir = batch_dir / "cards"
        cards_dir.mkdir(parents=True, exist_ok=True)
        zip_path = batch_dir / "batch.zip"

        # Check existing cards in this batch (for add-on generation)
        existing_count = batch.cards.count()
        start_idx = existing_count + 1

        all_guest_names = [line.strip() for line in batch.raw_input_names.splitlines() if line.strip()]
        new_guest_names = all_guest_names[existing_count:]
        devanagari_fonts = ["Gargi", "Eczar", "Aparajita", "Akshar", "Akshar Unicode", "Arya", "NotoSansDevanagari-Regular"]

        try:
            generated_cards = []
            for offset, raw_line in enumerate(new_guest_names):
                idx = start_idx + offset
                # Strip leading list numbers like "1. ", "2) ", "3 - " so the printed card and filename are clean
                clean_name = re.sub(r'^\s*\d+[\.\)\-\:\s]+\s*', '', raw_line).strip() or raw_line.strip()

                # If target language is Hindi, transliterate if contains English
                if batch.target_language == 'hindi':
                    guest_name = transliterate_phrase(clean_name)
                    # If project font is a Devanagari font, preserve user choice!
                    if project.font_family in devanagari_fonts or 'devanagari' in project.font_family.lower():
                        font_to_use = project.font_family
                    else:
                        font_to_use = "Arya"
                else:
                    guest_name = clean_name
                    # If project font is an English font, preserve user choice; otherwise fallback to Playfair Display
                    if project.font_family in devanagari_fonts or 'devanagari' in project.font_family.lower():
                        font_to_use = "PlayfairDisplay-Regular"
                    else:
                        font_to_use = project.font_family

                safe_filename = sanitize_guest_filename(idx, guest_name)
                card_pdf_path = cards_dir / safe_filename

                # Render personalized card PDF
                render_guest_card(
                    master_pdf_path=master_pdf_path,
                    output_pdf_path=card_pdf_path,
                    guest_name=guest_name,
                    box_x=project.box_x,
                    box_y=project.box_y,
                    box_w=project.box_width,
                    box_h=project.box_height,
                    font_family=font_to_use,
                    font_size=project.font_size,
                    min_font_size=project.min_font_size,
                    font_color_hex=project.font_color,
                    text_align=project.text_align,
                    prefix_text=project.prefix_text,
                    target_language=batch.target_language,
                    line_preference=project.line_preference,
                    line_boxes=project.line_boxes
                )

                # Relative path for FileField
                rel_pdf_path = f"projects/{project.id}/batches/{batch.id}/cards/{safe_filename}"
                card_obj = GeneratedCard(
                    batch=batch,
                    serial_number=idx,
                    guest_name=guest_name,
                    file_name=safe_filename,
                    pdf_file=rel_pdf_path
                )
                generated_cards.append(card_obj)

                # Update heartbeat and processed count
                batch.processed_guests = idx
                batch.heartbeat_at = timezone.now()
                batch.save(update_fields=['processed_guests', 'heartbeat_at'])
                try:
                    self.stdout.write(f"Generated {idx}/{len(all_guest_names)}: {safe_filename}")
                except Exception:
                    pass

            # Bulk create new card records
            if generated_cards:
                GeneratedCard.objects.bulk_create(generated_cards)

            # Create or refresh ZIP archive with ALL cards in the batch
            temp_zip = zip_path.with_suffix(".zip.tmp")
            with zipfile.ZipFile(str(temp_zip), 'w', compression=zipfile.ZIP_DEFLATED) as zipf:
                for card_file in sorted(cards_dir.glob("*.pdf")):
                    zipf.write(str(card_file), arcname=card_file.name)

            if temp_zip.exists():
                if zip_path.exists():
                    try:
                        zip_path.unlink()
                    except Exception:
                        pass
                for _ in range(5):
                    try:
                        shutil.move(str(temp_zip), str(zip_path))
                        break
                    except Exception:
                        time.sleep(0.15)

            rel_zip_path = f"projects/{project.id}/batches/{batch.id}/batch.zip"
            batch.zip_file = rel_zip_path
            batch.processed_guests = batch.cards.count()
            batch.total_guests = batch.cards.count()
            batch.status = 'COMPLETED'
            batch.completed_at = timezone.now()
            batch.save(update_fields=['zip_file', 'processed_guests', 'total_guests', 'status', 'completed_at'])
            try:
                self.stdout.write(f"[{timezone.now()}] Batch {batch_id} completed successfully.")
            except Exception:
                pass

        except Exception as e:
            tb = traceback.format_exc()
            try:
                self.stderr.write(f"[{timezone.now()}] Error processing batch {batch_id}:\n{tb}")
            except Exception:
                pass
            batch.status = 'FAILED'
            batch.error_message = str(e)
            batch.completed_at = timezone.now()
            batch.save(update_fields=['status', 'error_message', 'completed_at'])
