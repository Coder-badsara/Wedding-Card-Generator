/**
 * Formats a guest name string into up to 3 lines according to traditional wedding card layout:
 * - Case 1 (1 name + family):
 *     Line 1: Name (e.g. Umesh Badsara / उमेश बड़सरा)
 *     Line 2: Connector (e.g. and / एवं)
 *     Line 3: Family (e.g. with family / सपरिवार)
 * - Case 2 (2 names + family):
 *     Line 1: Name 1 (e.g. Umesh Badsara / उमेश बड़सरा)
 *     Line 2: Name 2 (e.g. Mayank Badsara / मयंक बड़सरा)
 *     Line 3: Family (e.g. with family / एवं सपरिवार)
 * - Case 3 (>2 names + family/extras):
 *     Line 1 & 2: Names distributed
 *     Line 3: Family / Location / Extras
 */
export function formatWeddingLines(text, isHindi = false, linePreference = null) {
  if (!text || !text.trim()) return [];

  const raw = text.trim();

  // If already multi-line, respect user's lines
  if (raw.includes('\n')) {
    return raw.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3);
  }

  // Clean leading numbering e.g. "1. ", "02) ", "3 - "
  let s = raw.replace(/^\s*\d+[\.\)\-\:\s]+\s*/, '').trim() || raw;

  const hasDevanagari = /[\u0900-\u097F]/.test(s);
  const hindiMode = isHindi || hasDevanagari;

  // 1. Detect family pattern (and family, with family, एवं सपरिवार, सपरिवार)
  const famPattern = /(?:\s*(?:,|–|-)?\s*)(and\s+family|with\s+family|w\/\s+family|&\s+family|and\s+fam|with\s+fam|एवं\s+सपरिवार|व\s+सपरिवार|सपरिवार)(?:\s|$|[,\.\)\-])/i;
  const famMatch = s.match(famPattern);

  let hasFamily = false;
  let matchedFam = '';
  let extraLocation = '';
  let namesPart = s;

  if (famMatch) {
    hasFamily = true;
    matchedFam = (famMatch[1] || '').trim();
    namesPart = s.substring(0, famMatch.index).replace(/[,–\-\s]+$/, '').trim();
    const afterFam = s.substring(famMatch.index + famMatch[0].length).trim();
    if (afterFam) {
      const locClean = afterFam.replace(/^[\s,–\-\(]+|[\s\)]+$/g, '').trim();
      if (locClean) {
        extraLocation = locClean;
      }
    }
  } else {
    // No family phrase. Check for parenthetical location e.g. (Jaipur) or dash - Jaipur
    const parenMatch = s.match(/\s*(?:\(([^\)]+)\)|(?:-|–)\s*([^,–-]+))\s*$/i);
    if (parenMatch) {
      extraLocation = (parenMatch[1] || parenMatch[2] || '').trim();
      namesPart = s.substring(0, parenMatch.index).trim();
    }
  }

  // Split individual names by commas or 'and', '&', 'एवं', 'व'
  const rawNames = namesPart.split(/\s*,\s*|\s+(?:and|&|एवं|व)\s+/i);
  let names = rawNames.map((n) => n.trim()).filter(Boolean);

  // Post-split location detection if not already detected
  const knownCities = new Set([
    'jaipur', 'जयपुर', 'jhunjhunu', 'झुंझुनूं', 'sikar', 'सीकर', 'udaipurwati', 'उदयपुरवाटी',
    'nawalgarh', 'नवलगढ़', 'delhi', 'दिल्ली', 'new delhi', 'नई दिल्ली', 'mumbai', 'मुंबई',
    'jodhpur', 'जोधपुर', 'bikaner', 'बीकानेर', 'churu', 'चुरू', 'alwar', 'अलवर', 'kota', 'कोटा',
    'khetri', 'खेतड़ी', 'chirawa', 'चिड़ावा', 'baggar', 'बगड़', 'mandawa', 'मंडावा',
    'pilani', 'पिलानी', 'gudha', 'गुढ़ा', 'rajasthan', 'राजस्थान', 'ajmer', 'अजमेर',
    'pune', 'पुणे', 'bangalore', 'बेंगलुरु', 'kolkata', 'कोलकाता', 'surat', 'सूरत',
    'ahmedabad', 'अहमदाबाद', 'indore', 'इंदौर', 'bhopal', 'भोपाल', 'lucknow', 'लखनऊ',
    'gurugram', 'गुरुग्राम', 'gurgaon', 'नोएडा', 'noida'
  ]);

  if (!extraLocation && names.length >= 4) {
    extraLocation = names[names.length - 1];
    names = names.slice(0, -1);
  } else if (!extraLocation && names.length > 0) {
    const lastNameWords = names[names.length - 1].split(/\s+/);
    if (lastNameWords.length >= 2) {
      const lastWord = lastNameWords[lastNameWords.length - 1].toLowerCase();
      if (knownCities.has(lastWord)) {
        extraLocation = lastNameWords[lastNameWords.length - 1];
        names[names.length - 1] = lastNameWords.slice(0, -1).join(' ');
      } else if (names.length >= 2) {
        const prevSurnames = names.slice(0, -1).map((n) => n.split(/\s+/).pop().toLowerCase()).filter(Boolean);
        for (const surname of prevSurnames) {
          const idx = lastNameWords.slice(0, -1).map((w) => w.toLowerCase()).indexOf(surname);
          if (idx !== -1 && idx < lastNameWords.length - 1) {
            extraLocation = lastNameWords.slice(idx + 1).join(' ');
            names[names.length - 1] = lastNameWords.slice(0, idx + 1).join(' ');
            break;
          }
        }
      }
    }
  }

  // 2. Custom Line Preference
  if (linePreference && (linePreference.line1 || linePreference.line2 || linePreference.line3)) {
    const andStr = hindiMode ? 'एवं' : 'and';
    const withFamStr = hindiMode ? 'सपरिवार' : 'with family';
    const andFamStr = hindiMode ? 'एवं सपरिवार' : 'and family';

    // Case: 3 or more names -> Line 1: first 2 names, Line 2: 3rd name, Line 3: एवं सपरिवार
    if (names.length > 2) {
      const mid = names.length > 3 ? Math.floor((names.length + 1) / 2) : 2;
      const line1 = names.slice(0, mid).join(', ');
      const line2 = names.slice(mid).join(', ');
      if (hasFamily) {
        const line3 = extraLocation ? `${andFamStr} (${extraLocation})` : andFamStr;
        return [line1, line2, line3];
      } else if (extraLocation) {
        return [line1, line2, extraLocation];
      } else {
        return [line1, line2];
      }
    }

    // Case: Name + Family + Location -> Line 1: names, Line 2: एवं सपरिवार, Line 3: Location
    if (extraLocation && hasFamily) {
      const line1 = names.join(', ');
      const line2 = andFamStr;
      const line3 = extraLocation;
      return [line1, line2, line3];
    }

    // Case: 2 names WITHOUT family -> Line 1: Name 1, Line 2: Name 2 (or Location if present)
    if (names.length === 2 && !hasFamily) {
      if (extraLocation) {
        return [names[0], names[1], extraLocation];
      }
      const hadExplicitAnd = /(?:^|\s+)(?:and|&|एवं|और|व)(?:\s+|$)/i.test(raw);
      if (hadExplicitAnd && linePreference.line2?.includes('and')) {
        return [names[0], andStr, names[1]];
      }
      return [names[0], names[1]];
    }

    // Case: 1 name WITHOUT family + location -> Line 1: Name, Line 2: Location
    if (names.length === 1 && !hasFamily && extraLocation) {
      return [names[0], extraLocation];
    }

    // Standard 1 or 2 names + family (use line_preference mapping)
    const wantsSecondary = ['line2', 'line3'].some((k) => {
      const items = linePreference[k] || [];
      return items.includes('secondary_name') || items.includes('name');
    });

    const customLines = [];
    for (const lineKey of ['line1', 'line2', 'line3']) {
      const items = linePreference[lineKey] || [];
      const lineParts = [];

      if (items.includes('names')) {
        if (wantsSecondary && names.length > 1) {
          lineParts.push(names[0]);
        } else if (names.length > 0) {
          lineParts.push(names.join(', '));
        }
      }

      if ((items.includes('secondary_name') || items.includes('name')) && !items.includes('names')) {
        if (names.length > 1) {
          lineParts.push(names.slice(1).join(', '));
        } else if (names.length === 1 && lineParts.length === 0) {
          lineParts.push(names[0]);
        }
      }

      if (items.includes('and')) {
        const hadExplicitAnd = /(?:^|\s+)(?:and|&|एवं|और|व)(?:\s+|$)/i.test(raw);
        if ((names.length > 1 && hadExplicitAnd) || (items.includes('and_family') && hasFamily)) {
          lineParts.push(andStr);
        }
      }

      if (items.includes('with_family')) {
        if (hasFamily) {
          lineParts.push(withFamStr);
        }
      }

      if (items.includes('and_family')) {
        if (hasFamily) {
          lineParts.push(andFamStr);
        }
      }

      if (items.includes('location')) {
        if (extraLocation) {
          lineParts.push(extraLocation);
        }
      }

      if (lineParts.length > 0) {
        if (lineParts.length > 1 && items.some((x) => ['with_family', 'and_family'].includes(x)) && items.includes('location')) {
          customLines.push(lineParts.join(', '));
        } else {
          customLines.push(lineParts.join(' '));
        }
      }
    }

    if (customLines.length > 0) {
      return customLines;
    }
  }

  // Determine family string if present
  let famStr = '';
  if (hasFamily) {
    if (hindiMode) {
      if (['एवं सपरिवार', 'व सपरिवार'].includes(matchedFam)) {
        famStr = matchedFam;
      } else {
        famStr = 'सपरिवार';
      }
    } else {
      famStr = matchedFam || 'with family';
    }
  }

  // 1 Name cases
  if (names.length === 1) {
    if (hasFamily && extraLocation) {
      return [
        names[0],
        famStr,
        extraLocation
      ];
    } else if (hasFamily) {
      return [
        names[0],
        famStr
      ];
    } else if (extraLocation) {
      return [names[0], extraLocation];
    } else {
      return [names[0]];
    }
  }

  // 2 Names cases
  if (names.length === 2) {
    if (hasFamily && extraLocation) {
      return [
        `${names[0]}, ${names[1]}`,
        famStr,
        extraLocation
      ];
    } else if (hasFamily) {
      return [
        names[0],
        names[1],
        famStr
      ];
    } else if (extraLocation) {
      return [names[0], names[1], extraLocation];
    } else {
      const hadExplicitAnd = /(?:^|\s+)(?:and|&|एवं|और|व)(?:\s+|$)/i.test(raw);
      if (hadExplicitAnd) {
        return [names[0], hindiMode ? 'एवं' : 'and', names[1]];
      }
      return [names[0], names[1]];
    }
  }

  // >2 Names cases (3, 4, etc.)
  if (names.length > 2) {
    const mid = Math.ceil(names.length / 2);
    const line1 = names.slice(0, mid).join(', ');
    const line2 = names.slice(mid).join(', ');
    if (hasFamily) {
      const line3 = extraLocation ? `${famStr} (${extraLocation})` : famStr;
      return [line1, line2, line3];
    } else if (extraLocation) {
      return [line1, line2, extraLocation];
    } else {
      return [line1, line2];
    }
  }

  // 2 Names without family
  if (names.length === 2 && !hasFamily) {
    if (extraLocation) {
      return [names[0], names[1], extraLocation];
    }
    return [names[0], names[1]];
  }

  // 1 Name without family
  if (names.length === 1 && !hasFamily) {
    if (extraLocation) {
      return [names[0], extraLocation];
    }
    return [names[0]];
  }

  return [s];
}
