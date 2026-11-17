import re
import unicodedata

def sanitize_guest_filename(serial_number: int, guest_name: str, max_name_len: int = 50) -> str:
    """
    Produces a safe, collision-free filename with 3-digit serial padding:
    e.g. 001_Rajesh_Sharma.pdf
    Safely sanitizes Unicode, Windows reserved chars, and reserved device names.
    """
    normalized = unicodedata.normalize('NFC', guest_name)
    # Remove Windows illegal characters: < > : " / \ | ? * and ASCII control chars
    clean_name = re.sub(r'[\<\>\:\"\/\\\|\?\*\x00-\x1f]', '', normalized)
    # Replace spaces and multiple whitespace with underscore
    clean_name = re.sub(r'\s+', '_', clean_name.strip())

    reserved_names = {"CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "LPT1", "LPT2"}
    if clean_name.upper() in reserved_names or not clean_name:
        clean_name = "guest"

    # Strip trailing dots or spaces
    clean_name = clean_name.rstrip(". ")
    clean_name = clean_name[:max_name_len]

    return f"{serial_number:03d}_{clean_name}.pdf"
