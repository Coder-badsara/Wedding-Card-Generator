from django.contrib import admin
from .models import CardProject, GenerationBatch, GeneratedCard

@admin.register(CardProject)
class CardProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'total_pages', 'page_rotation', 'font_family', 'font_size', 'created_at')
    search_fields = ('title',)

@admin.register(GenerationBatch)
class GenerationBatchAdmin(admin.ModelAdmin):
    list_display = ('project', 'batch_number', 'batch_name', 'status', 'total_guests', 'processed_guests', 'created_at')
    list_filter = ('status',)

@admin.register(GeneratedCard)
class GeneratedCardAdmin(admin.ModelAdmin):
    list_display = ('batch', 'serial_number', 'guest_name', 'file_name', 'created_at')
    search_fields = ('guest_name', 'file_name')
