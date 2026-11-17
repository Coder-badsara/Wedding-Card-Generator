import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatWeddingLines } from './frontend/src/utils/textFormatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runTests() {
  const casesPath = path.join(__dirname, 'wedding_name_cases.json');
  if (!fs.existsSync(casesPath)) {
    console.error(`Error: ${casesPath} does not exist!`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  const cases = data.cases || [];

  console.log(`\n=======================================================`);
  console.log(` Running ${cases.length} Wedding Name Formatting Test Cases (Frontend JS)`);
  console.log(`=======================================================\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const cid = c.id;
    const desc = c.description || '';
    const text = c.input || '';
    const isHindi = c.target_language === 'hindi';
    const pref = c.line_preference || null;
    const expected = c.expected_lines || [];

    // Note: frontend does not do network transliteration inside formatWeddingLines,
    // so skip pure transliteration cases or check logic
    if (c.target_language === 'hindi' && !/[\u0900-\u097F]/.test(text)) {
      // In frontend, transliteration is handled via API before formatting,
      // or frontend displays what it received.
      console.log(`  [SKIP] #${String(i + 1).padStart(2, '0')}: ${cid} (Network transliteration test)`);
      continue;
    }

    const actual = formatWeddingLines(text, isHindi, pref);

    const match = JSON.stringify(actual) === JSON.stringify(expected);

    if (match) {
      passed++;
      console.log(`  [PASS] #${String(i + 1).padStart(2, '0')}: ${cid} (${desc})`);
    } else {
      failed++;
      console.log(`  [FAIL] #${String(i + 1).padStart(2, '0')}: ${cid}`);
      console.log(`         Input:    ${JSON.stringify(text)} (isHindi=${isHindi}, pref=${JSON.stringify(pref)})`);
      console.log(`         Expected: ${JSON.stringify(expected)}`);
      console.log(`         Actual:   ${JSON.stringify(actual)}`);
    }
  }

  console.log(`\n-------------------------------------------------------`);
  console.log(` Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`-------------------------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
