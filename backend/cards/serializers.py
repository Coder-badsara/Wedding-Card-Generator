from rest_framework import serializers
from .models import CardProject, GenerationBatch, GeneratedCard
from .services.font_manager import FONT_REGISTRY

class GeneratedCardSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = GeneratedCard
        fields = ['id', 'serial_number', 'guest_name', 'file_name', 'pdf_file', 'download_url', 'created_at']

    def get_download_url(self, obj):
        if obj.pdf_file:
            return obj.pdf_file.url
        return None


class GenerationBatchSerializer(serializers.ModelSerializer):
    cards = GeneratedCardSerializer(many=True, read_only=True)
    zip_url = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = GenerationBatch
        fields = [
            'id', 'project', 'batch_number', 'batch_name', 'target_language', 'total_guests',
            'processed_guests', 'progress_percentage', 'status', 'error_message',
            'zip_file', 'zip_url', 'session_id', 'worker_pid', 'started_at', 'heartbeat_at',
            'completed_at', 'created_at', 'cards'
        ]

    def get_zip_url(self, obj):
        if obj.zip_file:
            return obj.zip_file.url
        return None

    def get_progress_percentage(self, obj):
        if obj.total_guests == 0:
            return 0.0
        return round((obj.processed_guests / obj.total_guests) * 100, 1)


class CardProjectSerializer(serializers.ModelSerializer):
    batches_count = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = CardProject
        fields = [
            'id', 'title', 'original_pdf', 'preview_image', 'pdf_url', 'preview_url',
            'pdf_width_pts', 'pdf_height_pts', 'total_pages', 'page_rotation',
            'box_x', 'box_y', 'box_width', 'box_height',
            'font_family', 'font_size', 'min_font_size', 'font_color',
            'text_align', 'prefix_text', 'line_preference', 'line_boxes', 'batches_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['pdf_width_pts', 'pdf_height_pts', 'total_pages', 'page_rotation', 'preview_image']

    def get_batches_count(self, obj):
        request = self.context.get('request')
        if request:
            session_id = request.headers.get('X-Session-ID') or request.query_params.get('session_id')
            if session_id:
                return obj.batches.filter(session_id=session_id).count()
        return 0

    def get_preview_url(self, obj):
        if obj.preview_image:
            return obj.preview_image.url
        return None

    def get_pdf_url(self, obj):
        if obj.original_pdf:
            return obj.original_pdf.url
        return None

    def validate_font_family(self, value):
        if value not in FONT_REGISTRY:
            raise serializers.ValidationError(f"Font family '{value}' is not in the permitted font registry.")
        return value

    def validate(self, data):
        font_size = data.get('font_size', getattr(self.instance, 'font_size', 24))
        min_font_size = data.get('min_font_size', getattr(self.instance, 'min_font_size', 12))
        box_x = data.get('box_x', getattr(self.instance, 'box_x', 0.2))
        box_y = data.get('box_y', getattr(self.instance, 'box_y', 0.6))
        box_width = data.get('box_width', getattr(self.instance, 'box_width', 0.6))
        box_height = data.get('box_height', getattr(self.instance, 'box_height', 0.1))

        if min_font_size > font_size:
            raise serializers.ValidationError("Minimum font size cannot exceed configured font size.")
        if box_x + box_width > 1.0001:
            raise serializers.ValidationError("Bounding box width exceeds the right edge of the card.")
        if box_y + box_height > 1.0001:
            raise serializers.ValidationError("Bounding box height exceeds the bottom edge of the card.")

        return data


class BatchCreateSerializer(serializers.Serializer):
    batch_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    guest_names = serializers.CharField(style={'base_template': 'textarea.html'})
    target_language = serializers.ChoiceField(choices=['original', 'hindi'], default='original')
    batch_id = serializers.UUIDField(required=False, allow_null=True)
    session_id = serializers.CharField(max_length=128, required=False, allow_blank=True, default='')


class SamplePreviewSerializer(serializers.Serializer):
    sample_text = serializers.CharField(max_length=255, default="श्रीमान् राजेश शर्मा")
    box_x = serializers.FloatField(min_value=0.0, max_value=1.0)
    box_y = serializers.FloatField(min_value=0.0, max_value=1.0)
    box_width = serializers.FloatField(min_value=0.01, max_value=1.0)
    box_height = serializers.FloatField(min_value=0.01, max_value=1.0)
    font_family = serializers.CharField(max_length=100)
    font_size = serializers.IntegerField(min_value=8, max_value=120)
    min_font_size = serializers.IntegerField(min_value=6, max_value=72)
    font_color = serializers.CharField(max_length=7)
    text_align = serializers.ChoiceField(choices=['left', 'center', 'right'])
    prefix_text = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    target_language = serializers.CharField(max_length=20, required=False, default="original")
    line_preference = serializers.JSONField(required=False, default=dict)
    line_boxes = serializers.JSONField(required=False, default=dict)
