#!/usr/bin/env node
/**
 * Export the four business-card faces from business-card.html at ~600 DPI.
 * Requires: google-chrome / chromium + puppeteer-core (see npm install note in README).
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Prefer a local or /tmp install of puppeteer-core
let puppeteer;
try {
  puppeteer = require(path.join(__dirname, 'node_modules/puppeteer-core'));
} catch {
  try {
    puppeteer = require('/tmp/arn-card-export/node_modules/puppeteer-core');
  } catch {
    console.error('Install puppeteer-core first, e.g.: npm install --prefix /tmp/arn-card-export puppeteer-core');
    process.exit(1);
  }
}

const HTML = path.join(__dirname, 'business-card.html');
const DPI = 600;
const MM_TO_IN = 1 / 25.4;
const CARD_W_PX = Math.round(85 * MM_TO_IN * DPI);
const CARD_H_PX = Math.round(55 * MM_TO_IN * DPI);

const TARGETS = [
  'signature-front',
  'signature-back',
  'black-front',
  'black-back',
];

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

async function main() {
  const executablePath = chromeCandidates.find((p) => {
    try {
      require('node:fs').accessSync(p);
      return true;
    } catch {
      return false;
    }
  });
  if (!executablePath) {
    console.error('No Chrome/Chromium found');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const page = await browser.newPage();
  // CSS mm is resolved against a reference CSS pixel density; we use deviceScaleFactor
  // so screenshots of the 85mm×55mm cards land near 600 DPI.
  await page.setViewport({
    width: 1400,
    height: 1600,
    deviceScaleFactor: DPI / 96,
  });

  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts?.ready);

  for (const id of TARGETS) {
    const el = await page.$(`#${id}`);
    if (!el) throw new Error(`Missing #${id}`);
    const out = path.join(__dirname, `${id}.png`);
    await el.screenshot({
      path: out,
      type: 'png',
      omitBackground: false,
    });
    const box = await el.boundingBox();
    console.log(
      `wrote ${path.basename(out)} css=${Math.round(box.width)}x${Math.round(box.height)} ` +
        `target~${CARD_W_PX}x${CARD_H_PX}px @${DPI}dpi`
    );
  }

  await browser.close();
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
