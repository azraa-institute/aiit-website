// Regenerates docs/*.pdf from the matching docs/*.html source using headless Chrome.
// Usage: npm run docs:pdf
//
// The HTML files in docs/ are the canonical source. The PDFs are build artifacts —
// edit the HTML, then run this script.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = join(root, 'docs');

// Documents to render: [source.html, output.pdf]
const DOCS = [
  ['production-readiness.html', 'production-readiness.pdf'],
  ['backend-implementation-plan.html', 'backend-implementation-plan.pdf'],
  ['infrastructure-setup-and-workflow.html', 'infrastructure-setup-and-workflow.pdf'],
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error(
    'Could not find Chrome/Chromium. Set CHROME_PATH to the executable and retry.',
  );
  process.exit(1);
}

const profileDir = join(root, 'node_modules', '.cache', 'docs-pdf-chrome');

for (const [src, out] of DOCS) {
  const srcPath = join(docsDir, src);
  const outPath = join(docsDir, out);
  if (!existsSync(srcPath)) {
    console.warn(`skip: ${src} not found`);
    continue;
  }
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      `--user-data-dir=${profileDir}`,
      `--print-to-pdf=${outPath}`,
      pathToFileURL(srcPath).href,
    ],
    { stdio: 'inherit' },
  );
  console.log(`ok: ${out}`);
}
