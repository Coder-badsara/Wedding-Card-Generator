import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator

hex_color_validator = RegexValidator(
    regex=r'^#(?:[0-9a-fA-F]{3}){1,2}$',
    message='Enter a valid hex color code (e.g. #800020).'
)

class CardProject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    original_pdf = models.FileField(upload_to='projects/originals/')
    preview_image = models.ImageField(upload_to='projects/previews/', null=True, blank=True)
    pdf_width_pts = models.FloatField(default=0.0)
    pdf_height_pts = models.FloatField(default=0.0)
    total_pages = models.PositiveIntegerField(default=1)
    page_rotation = models.IntegerField(default=0)

    # Normalized Bounding Box Coordinates (0.0 to 1.0)
    box_x = models.FloatField(default=0.2, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    box_y = models.FloatField(default=0.6, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    box_width = models.FloatField(default=0.6, validators=[MinValueValidator(0.01), MaxValueValidator(1.0)])
    box_height = models.FloatField(default=0.1, validators=[MinValueValidator(0.01), MaxValueValidator(1.0)])

    # Typography Configuration
    font_family = models.CharField(max_length=100, default='NotoSansDevanagari-Regular')
    font_size = models.PositiveIntegerField(default=24, validators=[MinValueValidator(8), MaxValueValidator(120)])
    min_font_size = models.PositiveIntegerField(default=12, validators=[MinValueValidator(6), MaxValueValidator(72)])
    font_color = models.CharField(max_length=7, default='#800020', validators=[hex_color_validator])
    text_align = models.CharField(
        max_length=10,
        choices=[('left', 'Left'), ('center', 'Center'), ('right', 'Right')],
        default='center'
    )
    prefix_text = models.CharField(max_length=100, blank=True, default='')
    line_preference = models.JSONField(default=dict, blank=True)
    line_boxes = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.min_font_size > self.font_size:
            raise ValidationError("Minimum font size cannot exceed configured font size.")
        if self.box_x + self.box_width > 1.0:
            raise ValidationError("Bounding box width exceeds right edge of page.")
        if self.box_y + self.box_height > 1.0:
            raise ValidationError("Bounding box height exceeds bottom edge of page.")


class GenerationBatch(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(CardProject, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.PositiveIntegerField()
    batch_name = models.CharField(max_length=255, blank=True)
    raw_input_names = models.TextField()
    target_language = models.CharField(
        max_length=20,
        choices=[('original', 'Original / As Entered'), ('hindi', 'Hindi / Devanagari')],
        default='original'
    )
    total_guests = models.PositiveIntegerField(default=0)
    processed_guests = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True, default='')
    zip_file = models.FileField(upload_to='projects/zips/', null=True, blank=True)
    session_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)

    # Process Monitoring Fields
    worker_pid = models.PositiveIntegerField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    heartbeat_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'session_id', 'batch_number'],
                name='unique_project_session_batch_number'
            )
        ]

    def __str__(self):
        return f"{self.project.title} - Batch {self.batch_number} ({self.status})"


class GeneratedCard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(GenerationBatch, on_delete=models.CASCADE, related_name='cards')
    serial_number = models.PositiveIntegerField()
    guest_name = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255)
    pdf_file = models.FileField(upload_to='projects/cards/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['serial_number']
        constraints = [
            models.UniqueConstraint(
                fields=['batch', 'serial_number'],
                name='unique_batch_card_serial'
            )
        ]

    def __str__(self):
        return f"{self.file_name} ({self.guest_name})"
