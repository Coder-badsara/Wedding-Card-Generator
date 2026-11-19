import uuid
from django.db import migrations

def update_line_boxes(apps, schema_editor):
    CardProject = apps.get_model('cards', 'CardProject')
    project_id = uuid.UUID('165af48f-d184-4363-9d8c-c5ed4aadcce3')
    try:
        project = CardProject.objects.get(id=project_id)
        project.line_boxes = {
            'line1': {'x': 0.4537, 'y': 0.553, 'w': 0.42, 'h': 0.047},
            'line2': {'x': 0.4537, 'y': 0.6009, 'w': 0.42, 'h': 0.048},
            'line3': {'x': 0.4537, 'y': 0.6498, 'w': 0.42, 'h': 0.049}
        }
        project.save(update_fields=['line_boxes'])
    except CardProject.DoesNotExist:
        pass

def rollback_line_boxes(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('cards', '0008_remove_generationbatch_unique_project_batch_number_and_more'),
    ]

    operations = [
        migrations.RunPython(update_line_boxes, rollback_line_boxes),
    ]
