import time
import shutil
import zipfile
from pathlib import Path
from django.conf import settings
from django.http import HttpResponse
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .models import CardProject, GenerationBatch, GeneratedCard
from .serializers import (
    CardProjectSerializer,
    GenerationBatchSerializer,
    GeneratedCardSerializer,
    BatchCreateSerializer,
    SamplePreviewSerializer
)
from .services.preview_service import inspect_and_render_preview
from .services.pdf_engine import render_sample_preview
from .services.batch_allocator import create_and_dispatch_batch
from .services.recovery_service import check_and_recover_batch
from .services.font_manager import FONT_REGISTRY
from .services.batch_dispatcher import dispatch_batch_worker
from .services.transliteration_service import transliterate_multiline_text


class CardProjectViewSet(viewsets.ModelViewSet):
    queryset = CardProject.objects.all()
    serializer_class = CardProjectSerializer

    def perform_create(self, serializer):
        project = serializer.save()
        pdf_path = Path(project.original_pdf.path)

        preview_rel_path = f"projects/{project.id}/previews/page_0_preview.png"
        preview_abs_path = Path(settings.MEDIA_ROOT) / preview_rel_path

        # Inspect PDF and generate 150 DPI preview of Page 0
        meta = inspect_and_render_preview(pdf_path, preview_abs_path)

        project.preview_image = preview_rel_path
        project.pdf_width_pts = meta["pdf_width_pts"]
        project.pdf_height_pts = meta["pdf_height_pts"]
        project.total_pages = meta["total_pages"]
        project.page_rotation = meta["page_rotation"]
        project.save(update_fields=['preview_image', 'pdf_width_pts', 'pdf_height_pts', 'total_pages', 'page_rotation'])

    def perform_destroy(self, instance):
        project_dir = Path(settings.MEDIA_ROOT) / "projects" / str(instance.id)
        if project_dir.exists():
            shutil.rmtree(project_dir, ignore_errors=True)
        instance.delete()

    @action(detail=True, methods=['get'])
    def batches(self, request, pk=None):
        project = self.get_object()
        batches = project.batches.all()
        for batch in batches:
            check_and_recover_batch(batch)
        serializer = GenerationBatchSerializer(batches, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='create_batch')
    def create_batch(self, request, pk=None):
        project = self.get_object()
        input_serializer = BatchCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        batch_id_val = input_serializer.validated_data.get('batch_id')
        batch = create_and_dispatch_batch(
            project_id=str(project.id),
            guest_names_raw=input_serializer.validated_data['guest_names'],
            batch_name=input_serializer.validated_data.get('batch_name', ''),
            target_language=input_serializer.validated_data.get('target_language', 'original'),
            batch_id=str(batch_id_val) if batch_id_val else None
        )

        return Response(GenerationBatchSerializer(batch).data, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['post'], url_path='render_sample')
    def render_sample(self, request, pk=None):
        project = self.get_object()
        serializer = SamplePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            png_bytes = render_sample_preview(
                master_pdf_path=Path(project.original_pdf.path),
                sample_text=data['sample_text'],
                box_x=data['box_x'],
                box_y=data['box_y'],
                box_w=data['box_width'],
                box_h=data['box_height'],
                font_family=data['font_family'],
                font_size=data['font_size'],
                min_font_size=data['min_font_size'],
                font_color_hex=data['font_color'],
                text_align=data['text_align'],
                prefix_text=data.get('prefix_text', ''),
                target_language=data.get('target_language', 'original'),
                line_preference=data.get('line_preference') or project.line_preference,
                line_boxes=data.get('line_boxes') or project.line_boxes
            )
            return HttpResponse(png_bytes, content_type="image/png")
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GenerationBatchViewSet(viewsets.ModelViewSet):
    queryset = GenerationBatch.objects.all()
    serializer_class = GenerationBatchSerializer

    def retrieve(self, request, *args, **kwargs):
        batch = self.get_object()
        check_and_recover_batch(batch)
        return super().retrieve(request, *args, **kwargs)

    def perform_destroy(self, instance):
        batch_dir = Path(settings.MEDIA_ROOT) / "projects" / str(instance.project.id) / "batches" / str(instance.id)
        if batch_dir.exists():
            shutil.rmtree(batch_dir, ignore_errors=True)
        instance.delete()

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        batch = self.get_object()
        check_and_recover_batch(batch)
        return Response({
            "id": str(batch.id),
            "status": batch.status,
            "total_guests": batch.total_guests,
            "processed_guests": batch.processed_guests,
            "progress_percentage": round((batch.processed_guests / batch.total_guests * 100), 1) if batch.total_guests else 0.0,
            "error_message": batch.error_message,
            "zip_url": batch.zip_file.url if batch.zip_file else None
        })

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        with transaction.atomic():
            try:
                batch = GenerationBatch.objects.select_for_update().get(id=pk)
            except GenerationBatch.DoesNotExist:
                return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)

            if batch.status != 'FAILED':
                return Response({"error": "Only FAILED batches can be retried."}, status=status.HTTP_400_BAD_REQUEST)

            # 1. Delete existing card records
            batch.cards.all().delete()

            # 2. Clean physical filesystem assets
            batch_dir = Path(settings.MEDIA_ROOT) / "projects" / str(batch.project.id) / "batches" / str(batch.id)
            cards_dir = batch_dir / "cards"
            temp_dir = batch_dir / "temp"
            zip_path = batch_dir / "batch.zip"

            if cards_dir.exists():
                shutil.rmtree(cards_dir, ignore_errors=True)
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)
            if zip_path.exists():
                try:
                    zip_path.unlink()
                except Exception:
                    pass

            cards_dir.mkdir(parents=True, exist_ok=True)
            temp_dir.mkdir(parents=True, exist_ok=True)

            # 3. Reset metadata
            batch.processed_guests = 0
            batch.error_message = ""
            batch.worker_pid = None
            batch.started_at = None
            batch.heartbeat_at = None
            batch.completed_at = None
            batch.zip_file = None
            batch.status = 'PENDING'
            batch.save()

            # 4. Dispatch worker strictly after transaction commit
            transaction.on_commit(lambda: dispatch_batch_worker(str(batch.id)))

            return Response({
                "id": str(batch.id),
                "status": "PENDING",
                "message": "Batch reset and queued for processing."
            }, status=status.HTTP_202_ACCEPTED)


class GeneratedCardViewSet(viewsets.ModelViewSet):
    queryset = GeneratedCard.objects.all()
    serializer_class = GeneratedCardSerializer

    def perform_destroy(self, instance):
        batch = instance.batch
        project = batch.project
        pdf_path = None
        if instance.pdf_file:
            try:
                pdf_path = Path(instance.pdf_file.path)
            except Exception:
                pass

        instance.delete()

        if pdf_path and pdf_path.exists():
            try:
                pdf_path.unlink()
            except Exception:
                pass

        # Update batch guest count
        remaining_cards = batch.cards.all()
        count = remaining_cards.count()
        batch.total_guests = count
        batch.processed_guests = count

        # Re-pack batch ZIP archive if any cards remain, else remove zip
        batch_dir = Path(settings.MEDIA_ROOT) / "projects" / str(project.id) / "batches" / str(batch.id)
        zip_path = batch_dir / "batch.zip"
        if count > 0:
            temp_zip = zip_path.with_suffix(".zip.tmp")
            with zipfile.ZipFile(str(temp_zip), 'w', compression=zipfile.ZIP_DEFLATED) as zf:
                for card in remaining_cards:
                    if card.pdf_file and Path(card.pdf_file.path).exists():
                        zf.write(card.pdf_file.path, arcname=card.file_name)
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
            batch.zip_file = f"projects/{project.id}/batches/{batch.id}/batch.zip"
        else:
            if zip_path.exists():
                try:
                    zip_path.unlink()
                except Exception:
                    pass
            batch.zip_file = None

        batch.save(update_fields=['total_guests', 'processed_guests', 'zip_file'])


class FontListView(APIView):
    def get(self, request):
        fonts = []
        for font_id, meta in FONT_REGISTRY.items():
            fonts.append({
                "id": font_id,
                "name": meta["name"],
                "category": meta["category"],
                "preview_text": meta["preview_text"]
            })
        return Response(fonts)


class TransliterateView(APIView):
    def post(self, request):
        text = request.data.get('text', '')
        direction = request.data.get('direction', 'auto')
        if not text:
            return Response({'transliterated': ''})
        transliterated = transliterate_multiline_text(text, direction=direction)
        return Response({'transliterated': transliterated})
