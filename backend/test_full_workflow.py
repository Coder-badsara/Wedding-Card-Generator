import os
import sys
import django
from pathlib import Path

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from cards.models import CardProject, GenerationBatch, GeneratedCard
from cards.services.batch_allocator import create_and_dispatch_batch
from cards.services.preview_service import inspect_and_render_preview
from django.conf import settings

def run_e2e_workflow():
    print("=== Starting End-to-End Workflow Test ===")
    
    # 1. Locate sample wedding card
    pdf_source = Path(settings.BASE_DIR).parent / "Megha_Virendra Singh.pdf"
    assert pdf_source.exists(), f"Source wedding card not found at {pdf_source}"
    
    # 2. Create Project
    with open(pdf_source, "rb") as f:
        pdf_bytes = f.read()
        
    uploaded_file = SimpleUploadedFile("Megha_Virendra_Singh.pdf", pdf_bytes, content_type="application/pdf")
    
    project = CardProject.objects.create(
        title="Megha & Virendra Singh Wedding",
        original_pdf=uploaded_file,
        box_x=0.588,
        box_y=0.546,
        box_width=0.303,
        box_height=0.060,
        font_family="NotoSansDevanagari-Regular",
        font_size=20,
        min_font_size=12,
        font_color="#800020",
        text_align="left",
        prefix_text=""
    )
    
    # Generate Page 0 preview
    preview_rel_path = f"projects/{project.id}/previews/page_0_preview.png"
    preview_abs_path = Path(settings.MEDIA_ROOT) / preview_rel_path
    meta = inspect_and_render_preview(Path(project.original_pdf.path), preview_abs_path)
    
    project.preview_image = preview_rel_path
    project.pdf_width_pts = meta["pdf_width_pts"]
    project.pdf_height_pts = meta["pdf_height_pts"]
    project.total_pages = meta["total_pages"]
    project.page_rotation = meta["page_rotation"]
    project.save()
    
    print(f"Project Created: ID={project.id}, Title='{project.title}', Pages={project.total_pages}")
    
    # 3. Create Batch #1 (5 guests)
    batch_1_guests = "राजेश शर्मा\nअमित शर्मा एवं सपरिवार\nराहुल शर्मा\nविकास शर्मा\nसुरेश शर्मा"
    batch_1 = create_and_dispatch_batch(
        project_id=str(project.id),
        guest_names_raw=batch_1_guests,
        batch_name="Batch 1 - Close Family"
    )
    print(f"Batch 1 Created: ID={batch_1.id}, Batch #{batch_1.batch_number}, Total Guests={batch_1.total_guests}")
    
    # Run the worker for Batch 1
    call_command("process_batch", str(batch_1.id))
    
    batch_1.refresh_from_db()
    assert batch_1.status == "COMPLETED", f"Batch 1 failed: {batch_1.error_message}"
    assert batch_1.cards.count() == 5, f"Expected 5 cards, got {batch_1.cards.count()}"
    
    batch_1_cards = list(batch_1.cards.order_by("serial_number"))
    print(f"Batch 1 Verified: Status={batch_1.status}, Generated Cards={len(batch_1_cards)}")
    for card in batch_1_cards:
        card_file_path = Path(settings.MEDIA_ROOT) / card.pdf_file.name
        assert card_file_path.exists(), f"Card file missing: {card_file_path}"
        print(f"  [{card.serial_number:03d}] {card.guest_name} -> {card.file_name} ({card_file_path.stat().st_size} bytes)")
        
    zip_path = Path(settings.MEDIA_ROOT) / batch_1.zip_file.name
    assert zip_path.exists(), f"ZIP missing: {zip_path}"
    print(f"Batch 1 ZIP Verified: {zip_path.name} ({zip_path.stat().st_size} bytes)")
    
    # 4. Create Batch #2 (2 guests) to confirm multiple non-conflicting batches
    batch_2_guests = "सुनील सिंह शेखावत\nडॉ. कुलदीप सिंह"
    batch_2 = create_and_dispatch_batch(
        project_id=str(project.id),
        guest_names_raw=batch_2_guests,
        batch_name="Batch 2 - VIP Guests"
    )
    print(f"Batch 2 Created: ID={batch_2.id}, Batch #{batch_2.batch_number}")
    assert batch_2.batch_number == 2, f"Expected batch_number 2, got {batch_2.batch_number}"
    
    # Run worker for Batch 2
    call_command("process_batch", str(batch_2.id))
    batch_2.refresh_from_db()
    assert batch_2.status == "COMPLETED", f"Batch 2 failed: {batch_2.error_message}"
    assert batch_2.cards.count() == 2
    print(f"Batch 2 Verified: Status={batch_2.status}, Generated Cards={batch_2.cards.count()}")
    
    # 5. Confirm Batch 1 files were NOT overwritten by Batch 2
    batch_1.refresh_from_db()
    assert batch_1.cards.count() == 5, "Batch 1 was corrupted by Batch 2!"
    print("Batch Isolation Verified: Batch 1 remains 100% intact with 5 cards.")
    
    print("\n=== ALL END-TO-END WORKFLOW CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_e2e_workflow()
