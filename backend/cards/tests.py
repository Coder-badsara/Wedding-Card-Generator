import os
from pathlib import Path
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from cards.models import CardProject, GenerationBatch, GeneratedCard
from cards.services.filename_sanitizer import sanitize_guest_filename
from cards.services.coordinate_mapper import calculate_target_rect
import fitz

class ModelValidationTests(TestCase):
    def test_bounding_box_and_font_validation(self):
        project = CardProject(
            title="Test Wedding",
            original_pdf=SimpleUploadedFile("dummy.pdf", b"%PDF-1.4\n...", content_type="application/pdf"),
            box_x=0.8,
            box_width=0.3, # 0.8 + 0.3 = 1.1 > 1.0 (exceeds right edge)
            font_size=20,
            min_font_size=25 # min > configured (invalid)
        )
        with self.assertRaises(ValidationError):
            project.clean()

    def test_filename_sanitizer(self):
        # 1. Standard Hindi name
        f1 = sanitize_guest_filename(1, "राजेश शर्मा")
        self.assertEqual(f1, "001_राजेश_शर्मा.pdf")

        # 2. Windows reserved characters: < > : " / \ | ? *
        f2 = sanitize_guest_filename(2, 'Amit "The Boss" Sharma: VIP & Family?')
        self.assertEqual(f2, "002_Amit_The_Boss_Sharma_VIP_&_Family.pdf")

        # 3. Reserved Windows device name
        f3 = sanitize_guest_filename(3, "CON")
        self.assertEqual(f3, "003_guest.pdf")

        # 4. Long name truncation
        long_name = "Dr. " + ("A" * 80)
        f4 = sanitize_guest_filename(4, long_name)
        self.assertTrue(len(f4) <= 65)
        self.assertTrue(f4.startswith("004_"))

    def test_coordinate_derotation(self):
        doc = fitz.open()
        p90 = doc.new_page(width=595, height=842)
        p90.set_rotation(90)

        # Place in visual box: top center (x=0.2, y=0.1, w=0.6, h=0.2)
        r_target, text_rot = calculate_target_rect(p90, 0.2, 0.1, 0.6, 0.2)
        self.assertEqual(text_rot, 90)
        self.assertIsInstance(r_target, fitz.Rect)
        doc.close()
