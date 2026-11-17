import html
from pathlib import Path
import fitz
from .coordinate_mapper import calculate_target_rect
from .font_manager import get_fonts_dir, get_font_filename
from .text_formatter import format_wedding_lines

class GuestNameOverflowError(Exception):
    """Raised when a guest name cannot fit inside the configured box even after scaling down."""
    pass

def render_guest_card(
    master_pdf_path: Path,
    output_pdf_path: Path,
    guest_name: str,
    box_x: float,
    box_y: float,
    box_w: float,
    box_h: float,
    font_family: str,
    font_size: int,
    min_font_size: int,
    font_color_hex: str,
    text_align: str,
    prefix_text: str = "",
    target_language: str = "original",
    line_preference: dict = None,
    line_boxes: dict = None
) -> None:
    doc = fitz.open(str(master_pdf_path))
    page = doc[0]

    fonts_dir = get_fonts_dir()
    font_filename = get_font_filename(font_family)
    archive = fitz.Archive(str(fonts_dir))

    lines = format_wedding_lines(guest_name, target_language, line_preference)
    if not lines:
        lines = [guest_name]

    if prefix_text and lines:
        lines[0] = f"{prefix_text} {lines[0]}".strip()

    has_devanagari = any(any('\u0900' <= c <= '\u097f' for c in l) for l in lines)
    if target_language == 'hindi':
        is_devanagari = True
    elif target_language == 'original':
        is_devanagari = has_devanagari
    else:
        is_devanagari = has_devanagari or (
            'devanagari' in font_family.lower() or font_family in ['Gargi', 'Eczar', 'Aparajita', 'Akshar', 'Arya', 'Akshar Unicode']
        )

    # Ensure font family matches language script
    devanagari_font_keys = ['NotoSansDevanagari-Regular', 'Gargi', 'Eczar', 'Aparajita', 'Akshar Unicode', 'Arya']
    if not is_devanagari and (font_family in devanagari_font_keys or 'devanagari' in font_family.lower()):
        font_family = "PlayfairDisplay-Regular"
        font_filename = get_font_filename("PlayfairDisplay-Regular")
    elif is_devanagari and (font_family not in devanagari_font_keys and 'devanagari' not in font_family.lower()):
        font_family = "Arya"
        font_filename = get_font_filename("Arya")
    else:
        font_filename = get_font_filename(font_family)

    scale_low = max(0.05, min_font_size / font_size)

    # Multi-box rendering: if line_boxes contains specific boxes for lines
    if line_boxes and isinstance(line_boxes, dict) and any(k in line_boxes for k in ('line1', 'line2', 'line3')):
        for idx, line_text in enumerate(lines[:3]):
            if not line_text or not line_text.strip():
                continue
            box_key = f"line{idx+1}"
            lbox = line_boxes.get(box_key)
            if not lbox:
                continue
            bx = lbox.get('x', box_x)
            by = lbox.get('y', box_y)
            bw = lbox.get('w', box_w)
            bh = lbox.get('h', box_h)

            vis_box_h = bh * page.rect.height
            by_to_use = by
            if not is_devanagari:
                # English letters sit on top of the line (baseline resting on printed guide line)
                shift_pt = font_size * 0.60
                by_to_use = by - (shift_pt / page.rect.height)

            line_target_rect, text_rotation = calculate_target_rect(page, bx, by_to_use, bw, bh)
            line_adj_rect = fitz.Rect(line_target_rect)

            line_css = f"""
            @font-face {{
                font-family: 'CardFont';
                src: url('{font_filename}');
            }}
            body {{
                margin: 0;
                padding: 0;
            }}
            p {{
                font-family: 'CardFont';
                font-size: {font_size}pt;
                color: {font_color_hex};
                text-align: {text_align};
                height: {vis_box_h:.1f}pt;
                line-height: {vis_box_h:.1f}pt;
                margin: 0;
                padding: 0;
            }}
            """
            line_html = f"<p>{html.escape(line_text)}</p>"
            spare_height, scale = page.insert_htmlbox(
                line_adj_rect,
                line_html,
                css=line_css,
                scale_low=scale_low,
                archive=archive,
                rotate=text_rotation
            )
            if spare_height < 0 or scale < scale_low:
                doc.close()
                raise GuestNameOverflowError(
                    f"Line '{line_text}' overflows its box at minimum font size {min_font_size}pt."
                )
    else:
        # Fallback to single bounding box
        vis_box_h = box_h * page.rect.height
        by_to_use = box_y
        num_lines = max(1, len(lines))
        if not is_devanagari:
            shift_pt = font_size * 0.60
            by_to_use = box_y - (shift_pt / page.rect.height)

        target_rect, text_rotation = calculate_target_rect(page, box_x, by_to_use, box_w, box_h)
        adjusted_rect = fitz.Rect(target_rect)
        num_lines = max(1, len(lines))
        if num_lines > 1:
            nominal_pitch = 28.50
            box_pitch = vis_box_h / num_lines
            if 25.0 <= box_pitch <= 33.0:
                line_height_pt = nominal_pitch
            else:
                line_height_pt = box_pitch
        else:
            line_height_pt = max(font_size * 1.25, 28.50)

        css = f"""
        @font-face {{
            font-family: 'CardFont';
            src: url('{font_filename}');
        }}
        body {{
            margin: 0;
            padding: 0;
        }}
        p {{
            font-family: 'CardFont';
            font-size: {font_size}pt;
            color: {font_color_hex};
            text-align: {text_align};
            height: {line_height_pt:.1f}pt;
            line-height: {line_height_pt:.1f}pt;
            margin: 0;
            padding: 0;
        }}
        """
        html_content = "".join(f"<p>{html.escape(l)}</p>" for l in lines)

        spare_height, scale = page.insert_htmlbox(
            adjusted_rect,
            html_content,
            css=css,
            scale_low=scale_low,
            archive=archive,
            rotate=text_rotation
        )

        if spare_height < 0 or scale < scale_low:
            doc.close()
            raise GuestNameOverflowError(
                f"Guest name '{guest_name}' overflows the configured area at minimum font size {min_font_size}pt."
            )

    # Atomic write to temporary file
    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    temp_output = output_pdf_path.with_suffix(".pdf.tmp")
    doc.save(str(temp_output), garbage=3, deflate=True, clean=False)
    doc.close()
    temp_output.replace(output_pdf_path)


def render_sample_preview(
    master_pdf_path: Path,
    sample_text: str,
    box_x: float,
    box_y: float,
    box_w: float,
    box_h: float,
    font_family: str,
    font_size: int,
    min_font_size: int,
    font_color_hex: str,
    text_align: str,
    prefix_text: str = "",
    target_language: str = "original",
    line_preference: dict = None,
    line_boxes: dict = None
) -> bytes:
    """
    Renders an in-memory sample of Page 0 with the multi-line text inserted,
    returning PNG image bytes for authoritative preview.
    If line_boxes is provided, each line is rendered inside its own independent box.
    """
    doc = fitz.open(str(master_pdf_path))
    page = doc[0]

    fonts_dir = get_fonts_dir()
    font_filename = get_font_filename(font_family)
    archive = fitz.Archive(str(fonts_dir))

    lines = format_wedding_lines(sample_text, target_language, line_preference)
    if not lines:
        lines = [sample_text]

    if prefix_text and lines:
        lines[0] = f"{prefix_text} {lines[0]}".strip()

    has_devanagari = any(any('\u0900' <= c <= '\u097f' for c in l) for l in lines)
    if target_language == 'hindi':
        is_devanagari = True
    elif target_language == 'original':
        is_devanagari = has_devanagari
    else:
        is_devanagari = has_devanagari or (
            'devanagari' in font_family.lower() or font_family in ['Gargi', 'Eczar', 'Aparajita', 'Akshar', 'Arya', 'Akshar Unicode']
        )

    # Ensure font family matches language script
    devanagari_font_keys = ['NotoSansDevanagari-Regular', 'Gargi', 'Eczar', 'Aparajita', 'Akshar Unicode', 'Arya']
    if not is_devanagari and (font_family in devanagari_font_keys or 'devanagari' in font_family.lower()):
        font_family = "PlayfairDisplay-Regular"
        font_filename = get_font_filename("PlayfairDisplay-Regular")
    elif is_devanagari and (font_family not in devanagari_font_keys and 'devanagari' not in font_family.lower()):
        font_family = "Arya"
        font_filename = get_font_filename("Arya")
    else:
        font_filename = get_font_filename(font_family)

    scale_low = max(0.05, min_font_size / font_size)

    # Multi-box rendering: if line_boxes contains specific boxes for lines
    if line_boxes and isinstance(line_boxes, dict) and any(k in line_boxes for k in ('line1', 'line2', 'line3')):
        for idx, line_text in enumerate(lines[:3]):
            if not line_text or not line_text.strip():
                continue
            box_key = f"line{idx+1}"
            lbox = line_boxes.get(box_key)
            if not lbox:
                continue
            bx = lbox.get('x', box_x)
            by = lbox.get('y', box_y)
            bw = lbox.get('w', box_w)
            bh = lbox.get('h', box_h)

            vis_box_h = bh * page.rect.height
            by_to_use = by
            if not is_devanagari:
                # English letters sit on top of the line (baseline resting on printed guide line)
                shift_pt = font_size * 0.60
                by_to_use = by - (shift_pt / page.rect.height)

            line_target_rect, text_rotation = calculate_target_rect(page, bx, by_to_use, bw, bh)
            line_adj_rect = fitz.Rect(line_target_rect)

            line_css = f"""
            @font-face {{
                font-family: 'CardFont';
                src: url('{font_filename}');
            }}
            body {{
                margin: 0;
                padding: 0;
            }}
            p {{
                font-family: 'CardFont';
                font-size: {font_size}pt;
                color: {font_color_hex};
                text-align: {text_align};
                height: {vis_box_h:.1f}pt;
                line-height: {vis_box_h:.1f}pt;
                margin: 0;
                padding: 0;
            }}
            """
            line_html = f"<p>{html.escape(line_text)}</p>"
            page.insert_htmlbox(
                line_adj_rect,
                line_html,
                css=line_css,
                scale_low=scale_low,
                archive=archive,
                rotate=text_rotation
            )
    else:
        # Fallback to single bounding box
        vis_box_h = box_h * page.rect.height
        by_to_use = box_y
        num_lines = max(1, len(lines))
        if not is_devanagari:
            shift_pt = font_size * 0.60
            by_to_use = box_y - (shift_pt / page.rect.height)

        target_rect, text_rotation = calculate_target_rect(page, box_x, by_to_use, box_w, box_h)
        adjusted_rect = fitz.Rect(target_rect)
        num_lines = max(1, len(lines))
        if num_lines > 1:
            nominal_pitch = 28.50
            box_pitch = vis_box_h / num_lines
            if 25.0 <= box_pitch <= 33.0:
                line_height_pt = nominal_pitch
            else:
                line_height_pt = box_pitch
        else:
            line_height_pt = max(font_size * 1.25, 28.50)

        css = f"""
        @font-face {{
            font-family: 'CardFont';
            src: url('{font_filename}');
        }}
        body {{
            margin: 0;
            padding: 0;
        }}
        p {{
            font-family: 'CardFont';
            font-size: {font_size}pt;
            color: {font_color_hex};
            text-align: {text_align};
            height: {line_height_pt:.1f}pt;
            line-height: {line_height_pt:.1f}pt;
            margin: 0;
            padding: 0;
        }}
        """
        html_content = "".join(f"<p>{html.escape(l)}</p>" for l in lines)

        page.insert_htmlbox(
            adjusted_rect,
            html_content,
            css=css,
            scale_low=scale_low,
            archive=archive,
            rotate=text_rotation
        )

    # Render upright 150 DPI preview
    pix = page.get_pixmap(dpi=150)
    png_bytes = pix.tobytes("png")
    doc.close()
    return png_bytes
