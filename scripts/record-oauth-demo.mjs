/**
 * Records Google OAuth verification demo for AestheticRxNetwork portal.
 * Run: DEMO_SITE_URL=https://aestheticrxnetworkportal.vercel.app node scripts/record-oauth-demo.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = (process.env.DEMO_SITE_URL || 'https://aestheticrxnetworkportal.vercel.app').replace(
  /\/$/,
  ''
);
const OUT_DIR = path.join(__dirname, '..', 'docs', 'oauth-demo-output');

async function pause(page, ms = 2500) {
  await page.waitForTimeout(ms);
}

async function scrollToBottom(page) {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await pause(page, 2000);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  console.log('Recording OAuth verification demo for', SITE);

  // 1. Homepage — app identity + footer legal links
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 3500);
  await scrollToBottom(page);
  await pause(page, 2000);

  // 2. Privacy Policy — Google API Limited Use (Section 13)
  await page.goto(`${SITE}/privacy`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 2500);
  await page.evaluate(() => {
    const el = document.getElementById('google-api-services');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await pause(page, 5000);

  // 3. OAuth disclosure page (if deployed)
  const oauthPage = await page.goto(`${SITE}/oauth-verification`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  if (oauthPage && oauthPage.status() < 400) {
    await pause(page, 4000);
    await scrollToBottom(page);
    await pause(page, 2000);
  }

  // 4. Terms of Service
  await page.goto(`${SITE}/terms`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 3000);

  // 5. Login — where Google Sign-In is used
  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 4000);

  const video = page.video();
  await context.close();
  await browser.close();

  if (!video) {
    console.error('No video recorded');
    process.exit(1);
  }

  const rawPath = await video.path();
  const webmPath = path.join(OUT_DIR, 'oauth-demo-portal-verification.webm');
  const fs = await import('fs/promises');
  await fs.rename(rawPath, webmPath);
  console.log('Saved:', webmPath);

  const { execSync } = await import('child_process');
  try {
    const mp4Path = path.join(OUT_DIR, 'oauth-demo-portal-verification.mp4');
    execSync(
      `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Path}"`,
      { stdio: 'inherit' }
    );
    console.log('MP4:', mp4Path);
  } catch {
    console.log('ffmpeg not available — upload the .webm to YouTube or convert manually.');
  }

  console.log('\nUpload to YouTube as Unlisted and paste the link in your Google verification reply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
