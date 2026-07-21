/**
 * Assisted OAuth demo recorder — attaches to YOUR already-open Chrome
 * (signed in as aestheticrxnetwork@gmail.com). You enter OAuth Client ID/Secret
 * yourself when Google asks; the script only navigates + records.
 *
 * 1) Close normal Chrome, then start debug Chrome (keep yourself logged in):
 *
 *   google-chrome --remote-debugging-port=9222 \
 *     --user-data-dir="$HOME/chrome-oauth-demo-profile" \
 *     https://mail.google.com
 *
 *    Sign in as aestheticrxnetwork@gmail.com if asked.
 *
 * 2) Run:
 *
 *   DEMO_CDP_URL=http://127.0.0.1:9222 \
 *   DEMO_HEADED=1 \
 *   node scripts/record-oauth-demo-assisted.mjs
 *
 * When the ⚙️ OAuth credentials panel appears, paste Client ID + Secret yourself.
 * When the Google consent screen appears, HOLD — the script waits ~20s for you.
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = (process.env.DEMO_SITE_URL || 'https://aestheticrxnetwork.vercel.app').replace(/\/$/, '');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'oauth-demo-output');
const CDP = process.env.DEMO_CDP_URL || 'http://127.0.0.1:9222';
const GMAIL = process.env.DEMO_GMAIL_EMAIL || 'aestheticrxnetwork@gmail.com';
const HOLD_CONSENT_MS = Number(process.env.DEMO_CONSENT_HOLD_MS || 22000);

async function pause(page, ms) {
  await page.waitForTimeout(ms);
}

async function banner(page, title, lines, holdMs = 7000) {
  await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
  font-family:Georgia,serif;background:linear-gradient(160deg,#0b1f3a,#0d9488);color:#fff;padding:40px}
  .c{max-width:900px;text-align:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);
  border-radius:16px;padding:36px}
  h1{font-size:26px;margin:0 0 16px} p{font-size:18px;line-height:1.45;margin:0 0 10px}
  .h{color:#a5f3fc;font-family:ui-monospace,monospace;font-size:14px;margin-top:14px}
  </style></head><body><div class="c"><h1>${title}</h1>
  ${lines.map((l) => `<p>${l}</p>`).join('')}
  <p class="h">Mailbox: ${GMAIL} · Scope: gmail.send</p></div></body></html>`);
  await pause(page, holdMs);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('Connecting to Chrome at', CDP);
  console.log('Expect mailbox session:', GMAIL);

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP);
  } catch (e) {
    console.error('\n❌ Cannot attach to Chrome.\n');
    console.error('Start Chrome like this FIRST (new window), sign in as aestheticrxnetwork@gmail.com:\n');
    console.error(`  google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/chrome-oauth-demo-profile" https://mail.google.com\n`);
    console.error('Then re-run this script.\n');
    console.error(e.message || e);
    process.exit(1);
  }

  const context = browser.contexts()[0] || (await browser.newContext());
  // Dedicated tab for recording
  const page = await context.newPage();

  // Start recording via a separate Playwright-controlled browser is more reliable for video;
  // so we also open a headed record browser that mirrors steps. If CDP-only, use screencast note.
  // For video file: launch a recording browser that uses the same navigation, OR record this page with CDP screencast.
  // Simplest reliable: launch recording browser AND instruct user CDP chrome is for login session cookies via shared steps.

  const recordBrowser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const recordContext = await recordBrowser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  const rec = await recordContext.newPage();

  console.log('Recording started. Follow on-screen banners. You will paste OAuth credentials yourself.');

  try {
    await banner(rec, 'AestheticRxNetwork — OAuth demo', [
      'Correct mailbox: <strong>aestheticrxnetwork@gmail.com</strong>',
      'You will enter Google OAuth Client ID / Secret yourself when asked.',
      'Hold on the consent screen — do not rush.',
    ], 8000);

    // App pages
    await rec.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pause(rec, 9000);
    await rec.goto(`${SITE}/privacy`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pause(rec, 4000);
    await rec.evaluate(() => {
      const el =
        document.getElementById('google-api-services') ||
        Array.from(document.querySelectorAll('h2,h3')).find((n) => /google api/i.test(n.textContent || ''));
      if (el) el.scrollIntoView({ block: 'start' });
    });
    await pause(rec, 11000);

    await rec.goto(`${SITE}/oauth-verification`, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await pause(rec, 10000);
    await rec.goto(`${SITE}/terms`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pause(rec, 6000);

    // OAuth Playground — user fills credentials
    await banner(rec, 'YOUR ACTION REQUIRED', [
      'Next: OAuth Playground opens.',
      '1) Click ⚙️ → enable <strong>Use your own OAuth credentials</strong>',
      '2) Paste <strong>Gmail API Client ID + Secret</strong> (from Google Cloud / Railway)',
      '3) Select scope <strong>gmail.send</strong> → Authorize APIs',
      '4) Sign in as <strong>aestheticrxnetwork@gmail.com</strong>',
      'Script will wait up to 3 minutes for the consent screen.',
    ], 14000);

    await rec.goto('https://developers.google.com/oauthplayground/', {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });

    console.log('\n========== WAITING FOR YOU ==========');
    console.log('In the RECORDING browser window:');
    console.log('  1. Open ⚙️ settings (top right of OAuth Playground)');
    console.log('  2. Check "Use your own OAuth credentials"');
    console.log('  3. Paste Client ID + Client Secret');
    console.log('  4. Close settings');
    console.log('  5. Left: Gmail API v1 → check gmail.send');
    console.log('  6. Click Authorize APIs');
    console.log('  7. Sign in as aestheticrxnetwork@gmail.com if asked');
    console.log('  8. On consent screen — LEAVE IT OPEN (script holds ~22s once detected)');
    console.log('=====================================\n');

    // Wait until consent URL or playground with code, up to 3 min
    const deadline = Date.now() + 180000;
    let sawConsent = false;
    while (Date.now() < deadline) {
      const url = rec.url();
      if (/signin\/oauth\/consent|oauth\/consent/i.test(url)) {
        console.log('✅ Consent screen detected — HOLDING for reviewers…');
        sawConsent = true;
        await pause(rec, HOLD_CONSENT_MS);
        // scroll a bit
        await rec.evaluate(() => window.scrollBy(0, 160)).catch(() => {});
        await pause(rec, 6000);
        await rec.screenshot({ path: path.join(OUT_DIR, 'oauth-consent-screen-snapshot.png'), fullPage: true }).catch(() => {});
        break;
      }
      if (/oauthplayground/i.test(url) && /[?&]code=/.test(url)) {
        console.log('Consent completed (code on playground). Showing caption.');
        sawConsent = true;
        break;
      }
      // Also detect visible consent text while still on accounts.google.com
      const txt = (await rec.locator('body').innerText().catch(() => '')) || '';
      if (/wants to access|Send email on your behalf|gmail\.send|AestheticRx/i.test(txt) && /accounts\.google/i.test(url)) {
        console.log('✅ Consent UI text detected — HOLDING…');
        sawConsent = true;
        await pause(rec, HOLD_CONSENT_MS);
        await rec.screenshot({ path: path.join(OUT_DIR, 'oauth-consent-screen-snapshot.png'), fullPage: true }).catch(() => {});
        break;
      }
      await pause(rec, 2000);
    }

    if (!sawConsent) {
      console.warn('Consent screen not detected in time — keep recording and complete manually if needed.');
    }

    await banner(rec, 'Scope usage', [
      'gmail.send is used only to <strong>send</strong> transactional email',
      '(OTP, order notifications) from aestheticrxnetwork@gmail.com',
      'We do <strong>not</strong> read Gmail inboxes.',
    ], 10000);

    // Login OTP demo on site
    await banner(rec, 'App functionality', [
      'Next: site login may trigger OTP email via gmail.send.',
      'If OTP appears, leave it visible.',
    ], 7000);
    await rec.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pause(rec, 12000);

    await banner(rec, 'End of demo', [
      '1) OAuth consent shown with gmail.send',
      '2) App uses gmail.send for transactional mail only',
      'Upload this MP4 to YouTube Unlisted and reply to Google.',
    ], 10000);
  } finally {
    const video = rec.video();
    await recordContext.close();
    await recordBrowser.close();
    try {
      await page.close();
    } catch {
      /* ignore */
    }
    // Do not close user's CDP browser
    try {
      browser.close(); // disconnects CDP client; does not kill Chrome
    } catch {
      /* ignore */
    }

    if (video) {
      const raw = await video.path();
      const fs = await import('fs/promises');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const webm = path.join(OUT_DIR, `oauth-demo-assisted-${stamp}.webm`);
      const stable = path.join(OUT_DIR, 'oauth-demo-portal-verification.webm');
      await fs.rename(raw, webm);
      await fs.copyFile(webm, stable);
      console.log('Saved:', webm);
      try {
        const { execSync } = await import('child_process');
        const mp4 = path.join(OUT_DIR, 'oauth-demo-portal-verification.mp4');
        execSync(
          `ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4}"`,
          { stdio: 'inherit' }
        );
        console.log('MP4:', mp4);
      } catch {
        console.log('Convert webm→mp4 manually if ffmpeg failed.');
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
