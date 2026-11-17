from django.db import migrations

def clean_line_preference(apps, schema_editor):
    CardProject = apps.get_model('cards', 'CardProject')
    CardProject.objects.all().update(line_preference={})

def unseed_line_preference(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('cards', '0006_generationbatch_session_id'),
    ]

    operations = [
        migrations.RunPython(clean_line_preference, unseed_line_preference),
    ]
