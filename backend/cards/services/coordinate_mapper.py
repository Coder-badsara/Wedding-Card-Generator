import fitz

def calculate_target_rect(
    page: fitz.Page,
    box_x: float,
    box_y: float,
    box_w: float,
    box_h: float
) -> tuple[fitz.Rect, int]:
    """
    Maps visual normalized coordinates [0.0..1.0] from upright preview
    to unrotated PyMuPDF page coordinate space.
    Accounts for page.rotation and CropBox offsets with exact transformation matrix.
    Returns (target_rect, text_rotation).
    """
    w_vis = page.rect.width
    h_vis = page.rect.height

    r_vis = fitz.Rect(
        box_x * w_vis,
        box_y * h_vis,
        (box_x + box_w) * w_vis,
        (box_y + box_h) * h_vis
    )

    # Compute exact matrix mapping unrotated page coords to visual page.rect
    m_rot = fitz.Matrix(page.rotation)
    rotated_cropbox = page.cropbox * m_rot
    m_to_vis = m_rot * fitz.Matrix(1, 0, 0, 1, -rotated_cropbox.x0, -rotated_cropbox.y0)

    # Invert to map visual rect to unrotated target rect on page
    r_target = r_vis * (~m_to_vis)
    text_rotation = page.rotation

    # PyMuPDF insert_htmlbox rotation translation compensation:
    # PyMuPDF's internal htmlbox layout rotates relative to page MediaBox rather
    # than CropBox, resulting in an offset when the page has non-zero cropbox margins.
    if page.rotation in (90, 270):
        shift_y = page.mediabox.y1 - page.cropbox.y1
        r_target = fitz.Rect(r_target.x0, r_target.y0 - shift_y, r_target.x1, r_target.y1 - shift_y)
    elif page.rotation == 180:
        shift_x = page.cropbox.x0 - page.mediabox.x0
        r_target = fitz.Rect(r_target.x0 + shift_x, r_target.y0, r_target.x1 + shift_x, r_target.y1)

    return r_target, text_rotation
