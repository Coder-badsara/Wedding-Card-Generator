from pathlib import Path
from django.conf import settings

FONT_REGISTRY = {
    "NotoSansDevanagari-Regular": {
        "name": "Noto Sans Devanagari (Standard)",
        "filename": "NotoSansDevanagari-Regular.ttf",
        "category": "devanagari",
        "preview_text": "श्रीमान् गिरधारी जी बड़सरा"
    },
    "Gargi": {
        "name": "Gargi (Traditional Calligraphic)",
        "filename": "Gargi.ttf",
        "category": "devanagari",
        "preview_text": "श्रीमान् गिरधारी जी बड़सरा"
    },
    "Eczar": {
        "name": "Eczar (Contemporary Devanagari)",
        "filename": "Eczar-Regular.ttf",
        "category": "devanagari",
        "preview_text": "श्रीमान् गिरधारी जी बड़सरा"
    },
    "Aparajita": {
        "name": "Aparajita (Classic Wedding Serif)",
        "filename": "Aparajita.ttf",
        "category": "devanagari",
        "preview_text": "श्रीमान् गिरधारी जी बड़सरा"
    },
    "Akshar Unicode": {
        "name": "Akshar Unicode (Modern Display)",
        "filename": "Akshar-Regular.ttf",
        "category": "devanagari",
        "preview_text": "श्रीमान् गिरधारी जी बड़सरा"
    },
    "Arya": {
        "name": "Arya (Elegant Devanagari)",
        "filename": "Arya-Regular.ttf",
        "category": "devanagari",
        "preview_text": "श्रीमान् गिरधारी जी बड़सरा"
    },
    "GreatVibes-Regular": {
        "name": "Great Vibes (Calligraphy Script)",
        "filename": "GreatVibes-Regular.ttf",
        "category": "script",
        "preview_text": "Shriman Girdhary Ji Badsara"
    },
    "AlexBrush-Regular": {
        "name": "Alex Brush (Calligraphy Script)",
        "filename": "AlexBrush-Regular.ttf",
        "category": "script",
        "preview_text": "Shriman Girdhary Ji Badsara"
    },
    "Aspire-DemiBold": {
        "name": "Aspire DemiBold (Classic Calligraphy)",
        "filename": "Aspire-DemiBold.otf",
        "category": "script",
        "preview_text": "Shriman Girdhary Ji Badsara"
    },
    "Masterday-Regular": {
        "name": "Masterday (Retro Script)",
        "filename": "Masterday-Regular.otf",
        "category": "script",
        "preview_text": "Shriman Girdhary Ji Badsara"
    },
    "SFCSway-Regular": {
        "name": "SFC Sway (Vintage Rounded Script)",
        "filename": "SFCSway-Regular.ttf",
        "category": "script",
        "preview_text": "Shriman Girdhary Ji Badsara"
    },
    "Novablanc-Regular": {
        "name": "Novablanc (Modern Luxury Serif)",
        "filename": "Novablanc-Regular.ttf",
        "category": "serif",
        "preview_text": "Shriman Girdhary Ji Badsara"
    },
    "PlayfairDisplay-Regular": {
        "name": "Playfair Display (Luxury Serif)",
        "filename": "PlayfairDisplay-Regular.ttf",
        "category": "serif",
        "preview_text": "Shriman Girdhary Ji Badsara"
    },
    "Cinzel-Bold": {
        "name": "Cinzel (Royal Serif)",
        "filename": "Cinzel-Bold.ttf",
        "category": "serif",
        "preview_text": "SHRIMAN GIRDHARY JI BADSARA"
    },
    "QueenOfCamelot-Regular": {
        "name": "Queen of Camelot (Royal Display)",
        "filename": "QueenOfCamelot-Regular.otf",
        "category": "display",
        "preview_text": "SHRIMAN GIRDHARY JI BADSARA"
    },
    "CollegeBlock2-Regular": {
        "name": "College Block 2.0 (Block Display)",
        "filename": "CollegeBlock2-Regular.otf",
        "category": "display",
        "preview_text": "SHRIMAN GIRDHARY JI BADSARA"
    },
    "Primitive-Regular": {
        "name": "Primitive (Vintage Decorative)",
        "filename": "Primitive-Regular.ttf",
        "category": "display",
        "preview_text": "Shriman Girdhary Ji Badsara"
    }
}

FONT_ALIASES = {
    "akshar": "Akshar-Regular.ttf",
    "akshar unicode": "Akshar-Regular.ttf",
    "aksharunicode": "Akshar-Regular.ttf",
    "gargi": "Gargi.ttf",
    "eczar": "Eczar-Regular.ttf",
    "aparajita": "Aparajita.ttf",
    "arya": "Arya-Regular.ttf",
    "noto": "NotoSansDevanagari-Regular.ttf",
    "notosansdevanagari": "NotoSansDevanagari-Regular.ttf",
    "greatvibes": "GreatVibes-Regular.ttf",
    "great vibes": "GreatVibes-Regular.ttf",
    "cinzel": "Cinzel-Bold.ttf",
    "playfair": "PlayfairDisplay-Regular.ttf",
    "playfair display": "PlayfairDisplay-Regular.ttf",
    "alexbrush": "AlexBrush-Regular.ttf",
    "alex brush": "AlexBrush-Regular.ttf",
    "aspire": "Aspire-DemiBold.otf",
    "aspire demibold": "Aspire-DemiBold.otf",
    "collegeblock": "CollegeBlock2-Regular.otf",
    "college block": "CollegeBlock2-Regular.otf",
    "college block 2.0": "CollegeBlock2-Regular.otf",
    "primitive": "Primitive-Regular.ttf",
    "queen of camelot": "QueenOfCamelot-Regular.otf",
    "queenofcamelot": "QueenOfCamelot-Regular.otf",
    "novablanc": "Novablanc-Regular.ttf",
    "masterday": "Masterday-Regular.otf",
    "sfcsway": "SFCSway-Regular.ttf",
    "sfc sway": "SFCSway-Regular.ttf",
}

def get_fonts_dir() -> Path:
    fonts_dir = settings.BASE_DIR / "fonts"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    return fonts_dir

def get_font_filename(font_family: str) -> str:
    if not font_family:
        return "NotoSansDevanagari-Regular.ttf"
    if font_family in FONT_REGISTRY:
        return FONT_REGISTRY[font_family]["filename"]
    
    clean_target = font_family.lower().strip()
    if clean_target in FONT_ALIASES:
        return FONT_ALIASES[clean_target]

    clean_no_spaces = clean_target.replace(" ", "").replace("-", "").replace("_", "")
    for alias, filename in FONT_ALIASES.items():
        if alias.replace(" ", "") == clean_no_spaces or alias in clean_target:
            return filename

    # Fallback default
    return "NotoSansDevanagari-Regular.ttf"
