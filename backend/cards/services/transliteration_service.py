import re
import json
import urllib.request
import urllib.parse

# Cache to avoid repeated HTTP calls for same names
_TRANSLITERATION_CACHE = {
    "badsara": "बड़सरा",
    "bdsara": "बड़सरा",
    "umesh": "उमेश",
    "aryan": "आर्यन",
    "mayank": "मयंक",
    "sharma": "शर्मा",
    "singh": "सिंह",
    "kumar": "कुमार",
    "verma": "वर्मा",
    "gupta": "गुप्ता",
    "suresh": "सुरेश",
    "vikas": "विकास",
    "rahul": "राहुल",
    "rajesh": "राजेश",
    "amit": "अमित",
    "priya": "प्रिया",
    "megha": "मेघा",
    "virendra": "वीरेन्द्र",
}

def transliterate_word(word: str) -> str:
    cleaned = word.strip().strip(",.!?()[]{}")
    if not cleaned:
        return word

    w_lower = cleaned.lower()

    # Common wedding titles and phrases
    if w_lower in ["with", "w/"]:
        return ""
    if w_lower in ["family", "fam"]:
        return "सपरिवार"
    if w_lower in ["and", "&"]:
        return "एवं"
    if w_lower in ["dr", "dr."]:
        return "डॉ."
    if w_lower in ["shri", "mr", "mr."]:
        return "श्रीमान्"
    if w_lower in ["mrs", "mrs.", "smt", "smt."]:
        return "श्रीमती"

    # Check cache
    if w_lower in _TRANSLITERATION_CACHE:
        return _TRANSLITERATION_CACHE[w_lower]

    url = f"https://inputtools.google.com/request?text={urllib.parse.quote(cleaned)}&itc=hi-t-i0-und&num=1"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode("utf-8"))
            if data[0] == "SUCCESS" and len(data[1]) > 0 and len(data[1][0][1]) > 0:
                result = data[1][0][1][0]
                _TRANSLITERATION_CACHE[w_lower] = result
                return result
    except Exception:
        pass

    return word


def transliterate_phrase(phrase: str) -> str:
    """
    Translates/transliterates an English guest name phrase into Hindi,
    handling idioms like 'with family' -> 'सपरिवार'.
    """
    if not phrase or not phrase.strip():
        return phrase

    # Pre-process wedding family idioms
    p = phrase
    # "with family" and "and family" -> "सपरिवार" (never inject extra "एवं")
    p = re.sub(r'\b(?:with\s+family|with\s+fam|w/\s+family|w/\s+fam)\b', 'सपरिवार', p, flags=re.IGNORECASE)
    p = re.sub(r'\b(?:and\s+family|&\s+family|&amp;\s+family|and\s+fam|&\s+fam)\b', 'सपरिवार', p, flags=re.IGNORECASE)

    # Split preserving delimiters (spaces, commas, punctuation)
    tokens = re.split(r'(\s+|,|\.|\&)', p)
    result = []
    for t in tokens:
        if not t or not t.strip() or t in [',', '.', '&']:
            result.append(t)
        elif any('\u0900' <= c <= '\u097f' for c in t):
            # Already Hindi text
            result.append(t)
        elif t.isdigit():
            # Serial number or digits
            result.append(t)
        else:
            w = transliterate_word(t)
            if w:
                result.append(w)

    return ''.join(result).strip()


def transliterate_hindi_to_english(text: str) -> str:
    """
    Converts Hindi Devanagari guest list text to natural English,
    preserving numbers, capitalization, and wedding phrases.
    """
    if not text or not text.strip():
        return text

    # Pre-process Devanagari family phrases for clean wedding card conversion
    p = text
    p = re.sub(r'एवं\s+सपरिवार', 'and family', p)
    p = re.sub(r'व\s+सपरिवार', 'and family', p)
    p = re.sub(r'सपरिवार', 'with family', p)

    url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=hi&tl=en&dt=t&q=' + urllib.parse.quote(p)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            if data and data[0]:
                result = ''.join([x[0] for x in data[0] if x and x[0]])
                if result.strip():
                    return result
    except Exception:
        pass

    # Fallback using text-unidecode
    try:
        import text_unidecode
        return text_unidecode.unidecode(text)
    except Exception:
        return text


def transliterate_multiline_text(text: str, direction: str = 'auto') -> str:
    """
    Transliterates a multiline list of guest names line by line,
    preserving numbers and formatting.
    If direction == 'to_english' or ('auto' and text has Devanagari): converts to English.
    If direction == 'to_hindi' or ('auto' and text is English): converts to Hindi.
    """
    has_devanagari = any('\u0900' <= c <= '\u097f' for c in text)

    if direction == 'to_english' or (direction == 'auto' and has_devanagari):
        return transliterate_hindi_to_english(text)

    # English to Hindi
    lines = text.splitlines()
    output_lines = []
    for line in lines:
        if not line.strip():
            output_lines.append(line)
            continue

        # Check for leading serial number e.g. "1. " or "1) "
        match = re.match(r'^(\s*[\d]+[\.\)\-\s]+)(.*)$', line)
        if match:
            prefix, name = match.group(1), match.group(2)
            converted_name = transliterate_phrase(name)
            output_lines.append(f"{prefix}{converted_name}")
        else:
            output_lines.append(transliterate_phrase(line))

    return '\n'.join(output_lines)
