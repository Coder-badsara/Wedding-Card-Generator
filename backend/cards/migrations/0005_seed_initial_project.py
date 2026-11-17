import uuid
from django.db import migrations

def seed_project(apps, schema_editor):
    CardProject = apps.get_model('cards', 'CardProject')
    project_id = uuid.UUID('165af48f-d184-4363-9d8c-c5ed4aadcce3')
    if not CardProject.objects.filter(id=project_id).exists():
        CardProject.objects.create(
            id=project_id,
            title='Megha Wedding Card-2',
            original_pdf='projects/originals/Megha_Wedding_Card-2.pdf',
            preview_image='projects/165af48f-d184-4363-9d8c-c5ed4aadcce3/previews/page_0_preview.png',
            pdf_width_pts=600.0,
            pdf_height_pts=800.0,
            box_x=0.4232,
            box_y=0.553,
            box_width=0.5243,
            box_height=0.1358,
            font_family='Arya',
            font_size=20,
            min_font_size=12,
            font_color='#800020',
            text_align='center',
            line_boxes={
                'line1': {'x': 0.4537, 'y': 0.553, 'w': 0.42, 'h': 0.04},
                'line2': {'x': 0.4537, 'y': 0.6009, 'w': 0.42, 'h': 0.04},
                'line3': {'x': 0.4537, 'y': 0.6498, 'w': 0.42, 'h': 0.04}
            },
            line_preference={
                'line1': ['names'],
                'line2': ['and'],
                'line3': ['with_family']
            }
        )

def unseed_project(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('cards', '0004_cardproject_line_boxes'),
    ]

    operations = [
        migrations.RunPython(seed_project, unseed_project),
    ]
