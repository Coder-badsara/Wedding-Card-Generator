from pathlib import Path
import fitz
from rest_framework.exceptions import ValidationError

def inspect_and_render_preview(pdf_path: Path, preview_output_path: Path) -> dict:
    """
    Validates PDF access, signatures, extracts page metadata,
    and generates a 150 DPI upright preview of Page 0.
    """
    try:
        doc = fitz.open(str(pdf_path))
    except Exception as e:
        raise ValidationError(f"Invalid PDF file: {str(e)}")

    if doc.is_encrypted or doc.needs_pass:
        doc.close()
        raise ValidationError("The uploaded PDF is password-protected. Please upload an unlocked PDF.")

    sig_flags = doc.get_sigflags()
    if sig_flags > 0:
        doc.close()
        raise ValidationError("This PDF contains digital signatures. Modifying it will invalidate signatures.")

    total_pages = len(doc)
    page0 = doc[0]
    width_pts = page0.rect.width
    height_pts = page0.rect.height
    rotation = page0.rotation

    # Render upright 150 DPI preview PNG
    pix = page0.get_pixmap(dpi=150)
    preview_output_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(preview_output_path))

    doc.close()

    return {
        "total_pages": total_pages,
        "pdf_width_pts": width_pts,
        "pdf_height_pts": height_pts,
        "page_rotation": rotation,
        "preview_width_px": pix.width,
        "preview_height_px": pix.height,
    }
