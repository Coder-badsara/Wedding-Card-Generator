import json
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

# Mock django settings / imports if needed
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from cards.services.text_formatter import format_wedding_lines

def run_tests():
    cases_path = Path(__file__).resolve().parent / "wedding_name_cases.json"
    if not cases_path.exists():
        print(f"Error: {cases_path} does not exist!")
        return 1

    with open(cases_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    cases = data.get("cases", [])
    print(f"\n=======================================================")
    print(f" Running {len(cases)} Wedding Name Formatting Test Cases (Backend)")
    print(f"=======================================================\n")

    passed = 0
    failed = 0
    failures = []

    for i, c in enumerate(cases, 1):
        cid = c.get("id")
        desc = c.get("description", "")
        text = c.get("input", "")
        lang = c.get("target_language", "original")
        pref = c.get("line_preference")
        expected = c.get("expected_lines", [])

        actual = format_wedding_lines(text, target_language=lang, line_preference=pref)

        if actual == expected:
            passed += 1
            print(f"  [PASS] #{i:02d}: {cid} ({desc})")
        else:
            failed += 1
            print(f"  [FAIL] #{i:02d}: {cid}")
            print(f"         Input:    {repr(text)} (lang={lang}, pref={pref})")
            print(f"         Expected: {expected}")
            print(f"         Actual:   {actual}")
            failures.append({
                "id": cid,
                "description": desc,
                "input": text,
                "expected": expected,
                "actual": actual
            })

    print(f"\n-------------------------------------------------------")
    print(f" Results: {passed} PASSED, {failed} FAILED (Total: {len(cases)})")
    print(f"-------------------------------------------------------\n")

    if failed > 0:
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(run_tests())
