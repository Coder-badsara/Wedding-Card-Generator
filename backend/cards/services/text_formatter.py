import re
from .transliteration_service import transliterate_phrase

def format_wedding_lines(text: str, target_language: str = 'original', line_preference: dict = None) -> list[str]:
    """
    Formats a guest name string into up to 3 lines according to traditional wedding card layout
    or user-configured line_preference.
    """
    raw = text.strip()
    if not raw:
        return []

    # If already multi-line, respect user's lines
    if '\n' in raw:
        lines = [l.strip() for l in raw.splitlines() if l.strip()]
        if target_language == 'hindi':
            return [transliterate_phrase(l) for l in lines[:3]]
        return lines[:3]

    # Clean leading numbering e.g. "1. ", "02) ", "3 - "
    s = re.sub(r'^\s*\d+[\.\)\-\:\s]+\s*', '', raw).strip() or raw

    is_hindi = (target_language == 'hindi') or any('\u0900' <= c <= '\u097f' for c in s)

    # 1. Detect family pattern (and family, with family, एवं सपरिवार, सपरिवार)
    fam_pattern = r'(?:\s*(?:,|–|-)?\s*)(and\s+family|with\s+family|w/\s+family|&\s+family|and\s+fam|with\s+fam|एवं\s+सपरिवार|व\s+सपरिवार|सपरिवार)(?:\s|$|[,\.\)\-])'
    fam_match = re.search(fam_pattern, s, re.IGNORECASE)

    has_family = False
    matched_fam = ""
    extra_location = ""
    names_part = s

    if fam_match:
        has_family = True
        matched_fam = fam_match.group(1).strip()
        names_part = s[:fam_match.start()].strip().rstrip(',–- ')
        after_fam = s[fam_match.end():].strip()
        if after_fam:
            loc_clean = re.sub(r'^[\s,–\-\(]+|[\s\)]+$', '', after_fam).strip()
            if loc_clean:
                extra_location = loc_clean
    else:
        # No family phrase. Check for parenthetical location e.g. (Jaipur) or dash - Jaipur
        paren_match = re.search(r'\s*(?:\(([^\)]+)\)|(?:-|–)\s*([^,–-]+))\s*$', s)
        if paren_match:
            extra_location = (paren_match.group(1) or paren_match.group(2) or "").strip()
            names_part = s[:paren_match.start()].strip()

    # Split individual names by commas or 'and', '&', 'एवं', 'व'
    raw_names = re.split(r'\s*,\s*|\s+(?:and|&|एवं|व)\s+', names_part)
    names = [n.strip() for n in raw_names if n.strip()]

    # Post-split location detection if not already detected
    known_cities = {
        'jaipur', 'जयपुर', 'jhunjhunu', 'झुंझुनूं', 'sikar', 'सीकर', 'udaipurwati', 'उदयपुरवाटी',
        'nawalgarh', 'नवलगढ़', 'delhi', 'दिल्ली', 'new delhi', 'नई दिल्ली', 'mumbai', 'मुंबई',
        'jodhpur', 'जोधपुर', 'bikaner', 'बीकानेर', 'churu', 'चुरू', 'alwar', 'अलवर', 'kota', 'कोटा',
        'khetri', 'खेतड़ी', 'chirawa', 'चिड़ावा', 'baggar', 'बगड़', 'mandawa', 'मंडावा',
        'pilani', 'पिलानी', 'gudha', 'गुढ़ा', 'rajasthan', 'राजस्थान', 'ajmer', 'अजमेर',
        'pune', 'पुणे', 'bangalore', 'बेंगलुरु', 'kolkata', 'कोलकाता', 'surat', 'सूरत',
        'ahmedabad', 'अहमदाबाद', 'indore', 'इंदौर', 'bhopal', 'भोपाल', 'lucknow', 'लखनऊ',
        'gurugram', 'गुरुग्राम', 'gurgaon', 'नोएडा', 'noida'
    }
    if not extra_location and len(names) >= 4:
        # If there are 4 comma-separated tokens without family, 4th is location
        extra_location = names[-1]
        names = names[:-1]
    elif not extra_location and len(names) > 0:
        last_name_words = names[-1].split()
        if len(last_name_words) >= 2:
            last_word = last_name_words[-1].lower()
            if last_word in known_cities:
                extra_location = last_name_words[-1]
                names[-1] = ' '.join(last_name_words[:-1])
            elif len(names) >= 2:
                # Check if previous names share a surname that appears in last name
                prev_surnames = [n.split()[-1].lower() for n in names[:-1] if len(n.split()) >= 2]
                for surname in prev_surnames:
                    if surname in [w.lower() for w in last_name_words[:-1]]:
                        idx = [w.lower() for w in last_name_words].index(surname)
                        if idx < len(last_name_words) - 1:
                            extra_location = ' '.join(last_name_words[idx+1:])
                            names[-1] = ' '.join(last_name_words[:idx+1])
                            break

    # If target language is Hindi, transliterate individual name tokens and location
    if is_hindi:
        names = [transliterate_phrase(n) for n in names]
        if extra_location:
            extra_location = transliterate_phrase(extra_location)

    # 2. Check if a custom line_preference is defined
    if line_preference and any(k in line_preference for k in ['line1', 'line2', 'line3']):
        and_str = "एवं" if is_hindi else "and"
        with_family_str = "सपरिवार" if is_hindi else "with family"
        and_family_str = "एवं सपरिवार" if is_hindi else "and family"

        # Case: 3 or more names -> Line 1: first 2 names, Line 2: 3rd name, Line 3: एवं सपरिवार
        if len(names) > 2:
            mid = (len(names) + 1) // 2 if len(names) > 3 else 2
            line1 = ', '.join(names[:mid])
            line2 = ', '.join(names[mid:])
            if has_family:
                line3 = f"{and_family_str} ({extra_location})" if extra_location else and_family_str
                return [line1, line2, line3]
            elif extra_location:
                return [line1, line2, extra_location]
            else:
                return [line1, line2]

        # Case: Name + Family + Location -> Line 1: names, Line 2: एवं सपरिवार, Line 3: Location
        if extra_location and has_family:
            line1 = ', '.join(names)
            line2 = and_family_str
            line3 = extra_location
            return [line1, line2, line3]

        # Case: 2 names WITHOUT family -> Line 1: Name 1, Line 2: Name 2 (or Location if present)
        if len(names) == 2 and not has_family:
            if extra_location:
                return [names[0], names[1], extra_location]
            had_explicit_and = bool(re.search(r'(?:^|\s+)(?:and|&|एवं|और|व)(?:\s+|$)', raw, re.IGNORECASE))
            if had_explicit_and and 'and' in line_preference.get('line2', []):
                return [names[0], and_str, names[1]]
            return [names[0], names[1]]

        # Case: 1 name WITHOUT family + location -> Line 1: Name, Line 2: Location
        if len(names) == 1 and not has_family and extra_location:
            return [names[0], extra_location]

        # Standard 1 or 2 names + family (use line_preference mapping)
        wants_secondary = any(
            x in line_preference.get('line2', []) or x in line_preference.get('line3', [])
            for x in ['secondary_name', 'name']
        )

        custom_lines = []
        for line_key in ['line1', 'line2', 'line3']:
            items = line_preference.get(line_key, [])
            line_parts = []

            if 'names' in items:
                if wants_secondary and len(names) > 1:
                    line_parts.append(names[0])
                elif names:
                    line_parts.append(', '.join(names))

            if ('secondary_name' in items or 'name' in items) and 'names' not in items:
                if len(names) > 1:
                    line_parts.append(', '.join(names[1:]))
                elif len(names) == 1 and not line_parts:
                    line_parts.append(names[0])

            if 'and' in items:
                if has_family or len(names) > 1:
                    line_parts.append(and_str)

            if 'with_family' in items:
                if has_family:
                    line_parts.append(with_family_str)

            if 'and_family' in items:
                if has_family:
                    line_parts.append(and_family_str)

            if 'location' in items:
                if extra_location:
                    line_parts.append(extra_location)

            if line_parts:
                # If both family and location are present on same line, join with comma
                if len(line_parts) > 1 and any(x in ['with_family', 'and_family'] for x in items) and 'location' in items:
                    custom_lines.append(', '.join(line_parts))
                else:
                    custom_lines.append(' '.join(line_parts))

        if custom_lines:
            return custom_lines

    # Determine family string if present
    fam_str = ""
    if has_family:
        if is_hindi:
            if matched_fam in ["एवं सपरिवार", "व सपरिवार"]:
                fam_str = matched_fam
            else:
                fam_str = "सपरिवार"
        else:
            fam_str = matched_fam or "with family"

    # 1 Name cases
    if len(names) == 1:
        if has_family and extra_location:
            return [
                names[0],
                fam_str,
                extra_location
            ]
        elif has_family:
            return [
                names[0],
                fam_str
            ]
        elif extra_location:
            return [names[0], extra_location]
        else:
            return [names[0]]

    # 2 Names cases
    elif len(names) == 2:
        if has_family and extra_location:
            return [
                f"{names[0]}, {names[1]}",
                fam_str,
                extra_location
            ]
        elif has_family:
            return [
                names[0],
                names[1],
                fam_str
            ]
        elif extra_location:
            return [names[0], names[1], extra_location]
        else:
            had_explicit_and = bool(re.search(r'(?:^|\s+)(?:and|&|एवं|और|व)(?:\s+|$)', raw, re.IGNORECASE))
            if had_explicit_and:
                return [names[0], "एवं" if is_hindi else "and", names[1]]
            return [names[0], names[1]]

    # >2 Names cases (3, 4, etc.)
    elif len(names) > 2:
        mid = (len(names) + 1) // 2
        line1 = ', '.join(names[:mid])
        line2 = ', '.join(names[mid:])
        if has_family:
            line3 = f"{fam_str} ({extra_location})" if extra_location else fam_str
            return [line1, line2, line3]
        elif extra_location:
            return [line1, line2, extra_location]
        else:
            return [line1, line2]

    # 2 Names without family
    elif len(names) == 2 and not has_family:
        if extra_location:
            return [names[0], names[1], extra_location]
        return [names[0], names[1]]

    # 1 Name without family
    elif len(names) == 1 and not has_family:
        if extra_location:
            return [names[0], extra_location]
        return [names[0]]

    # Fallback
    final_s = transliterate_phrase(s) if is_hindi else s
    return [final_s]
