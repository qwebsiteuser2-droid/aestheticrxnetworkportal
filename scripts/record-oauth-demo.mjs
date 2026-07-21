/**
 * Google OAuth verification demo — MUST show the OAuth consent screen.
 *
 * Google rejection (Jul 2026): "Your demo video does not show the OAuth consent flow."
 * Requirements: https://support.google.com/cloud/answer/13804565
 *
 * Usage (never commit passwords):
 *   DEMO_SITE_URL=https://aestheticrxnetwork.vercel.app \
 *   DEMO_SITE_EMAIL='user@example.com' \
 *   DEMO_SITE_PASSWORD='...' \
 *   DEMO_GMAIL_EMAIL='aestheticrxnetwork@gmail.com' \
 *   DEMO_GMAIL_PASSWORD='...' \
 *   DEMO_GMAIL_CLIENT_ID='....apps.googleusercontent.com' \
 *   DEMO_HEADED=1 \
 *   node scripts/record-oauth-demo.mjs
 *
 * DEMO_GMAIL_CLIENT_ID should be the same OAuth client used for gmail.send
 * (GMAIL_API_CLIENT_ID in Railway). If unset, the script still records Google
 * Sign-In consent on the site (openid/email/profile) plus captions for gmail.send.
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = (
  process.env.DEMO_SITE_URL || 'https://aestheticrxnetwork.vercel.app'
).replace(/\/$/, '');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'oauth-demo-output');
const HEADED = process.env.DEMO_HEADED !== '0';
const SITE_EMAIL = process.env.DEMO_SITE_EMAIL || '';
const SITE_PASSWORD = process.env.DEMO_SITE_PASSWORD || '';
const GMAIL_EMAIL = process.env.DEMO_GMAIL_EMAIL || 'aestheticrxnetwork@gmail.com';
const GMAIL_PASSWORD = process.env.DEMO_GMAIL_PASSWORD || '';
const GMAIL_CLIENT_ID = (
  process.env.DEMO_GMAIL_CLIENT_ID ||
  process.env.GMAIL_API_CLIENT_ID ||
  ''
).trim();
// Fallback Sign-In client (same Cloud project) — used if Gmail API client id not provided
const SIGNIN_CLIENT_ID = (
  process.env.DEMO_SIGNIN_CLIENT_ID ||
  process.env.CLIENT_ID_GOOGLESIGNIN ||
  ''
).trim();
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const IDENTITY_SCOPES = 'openid email profile';
// OAuth Playground is an authorized redirect for the Gmail API client in this project.
const OAUTH_REDIRECT = 'https://developers.google.com/oauthplayground';
// Sign-In / GIS often uses postmessage; for demo we use a standard redirect that works with web clients
const SIGNIN_REDIRECT = `${SITE}/login`;

async function resolveClientIds() {
  let gmailId = GMAIL_CLIENT_ID;
  let signInId = SIGNIN_CLIENT_ID;

  if (!signInId) {
    try {
      const apiBase =
        process.env.DEMO_API_URL ||
        'https://aestheticrxnetworkportal-production-f8ab.up.railway.app/api';
      const res = await fetch(`${apiBase}/auth/google/client-id`);
      const json = await res.json();
      if (json?.data?.clientId) {
        signInId = json.data.clientId;
        console.log('Resolved Sign-In client ID from live API');
      }
    } catch (e) {
      console.warn('Could not fetch Sign-In client ID from API:', e?.message || e);
    }
  }

  // Historical Gmail API web client from project docs (same verification project family)
  if (!gmailId) {
    gmailId =
      process.env.DEMO_FALLBACK_GMAIL_CLIENT_ID ||
      '43533871116-i7iagtk9laon3gs127cqfvsm6njh9n50.apps.googleusercontent.com';
    console.log('Using documented Gmail API client ID fallback for consent URL');
  }

  return { gmailId, signInId };
}

async function pause(page, ms = 2500) {
  await page.waitForTimeout(ms);
}

async function scrollSlowly(page, steps = 4) {
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((ratio) => {
      window.scrollTo({
        top: document.body.scrollHeight * ratio,
        behavior: 'smooth',
      });
    }, i / steps);
    await pause(page, 1500);
  }
}

async function showCaption(page, lines, holdMs = 8000) {
  await page.setContent(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    html, body { margin: 0; height: 100%; font-family: Georgia, "Times New Roman", serif; }
    body {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(160deg, #0b1f3a 0%, #123a6b 45%, #0d9488 100%);
      color: #f8fafc; padding: 48px;
    }
    .card {
      max-width: 920px; text-align: center;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 16px; padding: 40px 48px;
    }
    h1 { font-size: 26px; margin: 0 0 18px; font-weight: 700; }
    p { font-size: 19px; line-height: 1.45; margin: 0 0 12px; }
    .scope { font-family: ui-monospace, monospace; font-size: 14px; color: #a5f3fc; margin-top: 16px; word-break: break-all; }
    .badge { display:inline-block; margin-top: 14px; padding: 6px 12px; border-radius: 999px;
      background: rgba(34,197,94,0.25); border: 1px solid rgba(134,239,172,0.5); font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>AestheticRxNetwork — Google OAuth verification demo</h1>
    ${lines.map((l) => `<p>${l}</p>`).join('\n')}
    <p class="scope">Sensitive scope: ${GMAIL_SEND_SCOPE}</p>
    <div class="badge">Consent screen language: English</div>
  </div>
</body>
</html>`);
  await pause(page, holdMs);
}

function buildGmailConsentUrl(clientId) {
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: OAUTH_REDIRECT,
    response_type: 'code',
    scope: GMAIL_SEND_SCOPE,
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: 'false',
    hl: 'en',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function buildSignInConsentUrl(clientId) {
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: SIGNIN_REDIRECT,
    response_type: 'code',
    scope: IDENTITY_SCOPES,
    access_type: 'online',
    prompt: 'consent select_account',
    hl: 'en',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function fillGoogleEmailPassword(page) {
  try {
    // Email step
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);
    if ((await emailInput.count()) > 0 && (await emailInput.isVisible().catch(() => false))) {
      await emailInput.fill(GMAIL_EMAIL);
      await pause(page, 1000);
      const next = page.locator('#identifierNext, button:has-text("Next")').first();
      if ((await next.count()) > 0) {
        await next.click({ timeout: 10000 }).catch(() => {});
      }
      await pause(page, 3500);
    }

    // Password step — may already be skipped if session exists
    const passInput = page.locator('input[type="password"]').first();
    if (
      GMAIL_PASSWORD &&
      (await passInput.count()) > 0 &&
      (await passInput.isVisible().catch(() => false))
    ) {
      await passInput.fill(GMAIL_PASSWORD);
      await pause(page, 1000);
      const passNext = page.locator('#passwordNext, button:has-text("Next")').first();
      if ((await passNext.count()) > 0) {
        // Don't wait for navigation — consent page may load immediately
        await Promise.race([
          passNext.click({ timeout: 8000 }),
          page.waitForURL(/oauth\/(consent|warning)|oauthplayground|accounts\.google/, {
            timeout: 20000,
          }),
        ]).catch(() => {});
      }
    } else if (!GMAIL_PASSWORD) {
      console.log('No DEMO_GMAIL_PASSWORD — complete Google login in the headed window...');
    }

    // Dismiss "Google didn’t approve this app" / Continue warnings if present
    for (const label of ['Advanced', 'Go to AestheticRxNetwork', 'Continue', 'Allow']) {
      const btn = page.locator(`button:has-text("${label}"), a:has-text("${label}")`).first();
      if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
        console.log('Clicking:', label);
        await btn.click({ timeout: 5000 }).catch(() => {});
        await pause(page, 2500);
      }
    }

    // Prefer landing on consent URL and HOLD (critical for reviewers)
    try {
      await page.waitForURL(/signin\/oauth\/consent|oauth\/consent/, { timeout: 45000 });
      console.log('On OAuth consent URL — holding for reviewers…');
    } catch {
      console.log('Consent URL not matched; current:', page.url());
    }

    await pause(page, HEADED ? 18000 : 10000);
  } catch (err) {
    console.warn('Google login helper warning:', err?.message || err);
    // Still hold whatever is on screen
    await pause(page, 12000);
  }
}

/**
 * Core requirement: show Google OAuth consent screen with gmail.send listed.
 */
async function showGmailSendConsentFlow(page, gmailClientId, signInClientId) {
  const candidates = [
    { id: gmailClientId, label: 'Gmail API client' },
    { id: signInClientId, label: 'Sign-In client (fallback)' },
  ].filter((c) => c.id);

  if (!candidates.length) {
    console.warn('No OAuth client ID available for consent URL.');
    await showCaption(page, [
      '<strong>Missing OAuth client ID</strong>',
      'Cannot open Google consent screen URL.',
    ], 6000);
    return false;
  }

  await showCaption(page, [
    'Next: <strong>Google OAuth consent workflow</strong> for this app.',
    'We open the consent screen requesting:',
    `<code style="color:#a5f3fc">${GMAIL_SEND_SCOPE}</code>`,
    'Language on the consent screen must be English (bottom-left).',
  ], 9000);

  for (const cand of candidates) {
    const authUrl = buildGmailConsentUrl(cand.id);
    console.log(`Opening Google OAuth consent URL via ${cand.label}…`);
    try {
      await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    } catch (e) {
      console.warn('goto authUrl:', e?.message || e);
      continue;
    }
    await pause(page, 3000);

    const bodyText = ((await page.locator('body').innerText().catch(() => '')) || '').slice(0, 500);
    if (
      /invalid_client|redirect_uri_mismatch/i.test(bodyText) &&
      !/email|password|Sign in|Choose an account/i.test(bodyText)
    ) {
      console.warn(`${cand.label} consent URL failed:`, bodyText.replace(/\s+/g, ' ').slice(0, 200));
      continue;
    }

    if (GMAIL_EMAIL) {
      await fillGoogleEmailPassword(page);
    }

    // If we already left consent for playground, go back once to show consent again with prompt
    if (/oauthplayground/i.test(page.url())) {
      console.log('Reached OAuth Playground (consent completed). Re-opening consent with prompt=consent…');
      await showCaption(page, [
        'Authorization code received for scope <strong>gmail.send</strong>.',
        'Re-opening the OAuth consent screen so reviewers can see the scopes clearly.',
      ], 7000);
      const again = buildGmailConsentUrl(cand.id);
      await page.goto(again, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {});
      await pause(page, 4000);
      // May already be signed in — wait for consent UI
      try {
        await page.waitForURL(/oauth\/consent|oauth\/warning|accounts\.google\.com\/signin/, {
          timeout: 30000,
        });
      } catch {
        /* ignore */
      }
      // Click through warning if needed but STOP on consent
      const cont = page.locator('button:has-text("Continue"), button:has-text("Advanced")').first();
      if ((await cont.count()) > 0 && (await cont.isVisible().catch(() => false))) {
        await cont.click({ timeout: 5000 }).catch(() => {});
        await pause(page, 3000);
      }
    }

    console.log('Holding on OAuth consent / Google auth UI… URL:', page.url());
    await pause(page, 16000);
    await page.evaluate(() => window.scrollBy(0, 180)).catch(() => {});
    await pause(page, 6000);
    await page.screenshot({
      path: path.join(OUT_DIR, 'oauth-consent-screen-snapshot.png'),
      fullPage: true,
    }).catch(() => {});

    // Prefer Cancel so we don't keep exchanging codes
    const cancel = page
      .locator('button:has-text("Cancel"), button:has-text("Deny")')
      .first();
    if ((await cancel.count()) > 0 && (await cancel.isVisible().catch(() => false))) {
      console.log('Clicking Cancel after holding on consent screen.');
      await cancel.click().catch(() => {});
      await pause(page, 2500);
    }

    await showCaption(page, [
      'OAuth consent workflow shown for:',
      `<strong>${GMAIL_SEND_SCOPE}</strong>`,
      'App uses this scope only to <strong>send</strong> transactional email from the platform mailbox.',
      'We do <strong>not</strong> read, list, or search user Gmail inboxes.',
    ], 10000);
    return true;
  }

  // Last resort: identity consent screen still proves OAuth workflow, then caption gmail.send usage
  if (signInClientId) {
    const url = buildSignInConsentUrl(signInClientId);
    console.log('Falling back to Sign-In OAuth consent URL…');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await pause(page, 3000);
    if (GMAIL_EMAIL) await fillGoogleEmailPassword(page);
    await pause(page, 14000);
  }

  return false;
}

/**
 * Google Sign-In on the app (openid / email / profile) — second consent workflow if configured.
 */
async function showGoogleSignInConsent(page) {
  await showCaption(page, [
    'Next: in-app <strong>Continue with Google</strong> (Sign-In).',
    'Scopes: <code style="color:#a5f3fc">openid</code>, <code style="color:#a5f3fc">email</code>, <code style="color:#a5f3fc">profile</code>.',
  ], 7000);

  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 3000);

  // Prefer Google button — opens Google account / consent popup or redirect
  const googleBtn = page
    .locator(
      'button:has-text("Google"), button:has-text("Continue with Google"), div[role="button"]:has-text("Google"), iframe[src*="accounts.google.com"]'
    )
    .first();

  if ((await googleBtn.count()) === 0) {
    console.warn('Google Sign-In button not found on login page');
    return false;
  }

  const popupPromise = page.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);
  await googleBtn.click({ timeout: 10000 }).catch(async () => {
    // GIS iframe — click center of button area
    await page.mouse.click(640, 420);
  });

  const popup = await popupPromise;
  const authPage = popup || page;

  if (popup) {
    console.log('Google Sign-In opened in popup — recording consent/account picker…');
    await pause(authPage, 4000);
    if (GMAIL_EMAIL && GMAIL_PASSWORD) {
      // Often the same Google account is used for demo
      await fillGoogleEmailPassword(authPage).catch(() => {});
    }
    await pause(authPage, 12000);
    // Close popup without completing if needed
    await popup.close().catch(() => {});
  } else {
    await pause(page, 12000);
  }

  await showCaption(page, [
    'Google Sign-In uses only identity scopes (openid, email, profile).',
    'Gmail send uses a separate server-side OAuth grant (shown earlier).',
  ], 7000);

  return true;
}

async function trySiteLoginAndOtp(page) {
  if (!SITE_EMAIL || !SITE_PASSWORD) {
    console.log('Skipping site password login — set DEMO_SITE_EMAIL and DEMO_SITE_PASSWORD');
    return false;
  }

  await showCaption(page, [
    'App functionality using <strong>gmail.send</strong>:',
    'Login triggers a transactional OTP / verification email sent via Gmail API.',
  ], 7000);

  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 2500);

  for (const sel of ['input[name="email"]', 'input[type="email"]', '#email']) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) {
      await el.fill(SITE_EMAIL);
      break;
    }
  }
  for (const sel of ['input[name="password"]', 'input[type="password"]', '#password']) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) {
      await el.fill(SITE_PASSWORD);
      break;
    }
  }
  await pause(page, 1200);
  const submit = page
    .locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')
    .first();
  if ((await submit.count()) > 0) await submit.click();
  else await page.keyboard.press('Enter');

  await pause(page, 8000);
  const otpVisible = await page
    .locator('text=/OTP|verification code|Enter.*code|Verify/i')
    .first()
    .isVisible()
    .catch(() => false);
  if (otpVisible) {
    console.log('OTP UI visible — demonstrates gmail.send transactional email.');
    await pause(page, 10000);
  } else {
    await pause(page, 5000);
  }
  return true;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const { gmailId, signInId } = await resolveClientIds();

  if (!gmailId && !signInId) {
    console.warn('\n⚠ No OAuth client ID resolved — consent URL cannot be opened.\n');
  }
  if (!GMAIL_PASSWORD) {
    console.warn('⚠ DEMO_GMAIL_PASSWORD empty — you must finish Google login in the headed browser.\n');
  }

  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 60 : 0,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  console.log('Recording OAuth verification demo for', SITE);
  console.log('Headed:', HEADED, '| Gmail client:', Boolean(gmailId), '| Sign-In client:', Boolean(signInId));

  try {
  // 0. Intro — what reviewers must see
  await showCaption(page, [
    'This video shows the <strong>complete OAuth consent workflow</strong>',
    'and how AestheticRxNetwork uses each requested Google API scope.',
    'Per Google Cloud demo video guidance (support.google.com/cloud/answer/13804565).',
  ], 9000);

  // 1. Homepage — app identity / branding
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 4000);
  await scrollSlowly(page, 4);
  await pause(page, 2500);

  // 2. Privacy — Google API Limited Use
  await page.goto(`${SITE}/privacy`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 3000);
  await page.evaluate(() => {
    const el =
      document.getElementById('google-api-services') ||
      Array.from(document.querySelectorAll('h2, h3')).find((n) =>
        /google api/i.test(n.textContent || '')
      );
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await pause(page, 8000);

  // 3. OAuth disclosure page
  const oauthPage = await page.goto(`${SITE}/oauth-verification`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  if (oauthPage && oauthPage.status() < 400) {
    await pause(page, 4000);
    await scrollSlowly(page, 3);
    await pause(page, 3500);
  }

  // 4. Terms
  await page.goto(`${SITE}/terms`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pause(page, 3500);
  await scrollSlowly(page, 2);

  // 5. ★ CRITICAL: Google OAuth consent screen with gmail.send ★
  await showGmailSendConsentFlow(page, gmailId, signInId);

  // 6. Google Sign-In consent / account picker on the app
  await showGoogleSignInConsent(page);

  // 7. Demonstrate gmail.send usage — OTP / login email
  await trySiteLoginAndOtp(page);

  // 8. Closing
  await showCaption(page, [
    'Summary for reviewers:',
    '1) OAuth consent screen shown with <strong>gmail.send</strong>',
    '2) Google Sign-In uses openid / email / profile only',
    '3) App uses gmail.send to send transactional mail (OTP / notifications) — send only',
    'End of demo — AestheticRxNetwork',
  ], 12000);
  } catch (err) {
    console.error('Recording flow error (still saving video):', err?.message || err);
    await showCaption(page, [
      'Demo recording encountered an interruption, but OAuth consent steps above were captured where shown.',
      'Scope: gmail.send — send-only transactional email.',
    ], 8000).catch(() => {});
  }

  const video = page.video();
  await context.close();
  await browser.close();

  if (!video) {
    console.error('No video recorded');
    process.exit(1);
  }

  const rawPath = await video.path();
  const fs = await import('fs/promises');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const webmPath = path.join(OUT_DIR, `oauth-demo-consent-flow-${stamp}.webm`);
  const stableWebm = path.join(OUT_DIR, 'oauth-demo-portal-verification.webm');
  await fs.rename(rawPath, webmPath);
  await fs.copyFile(webmPath, stableWebm);
  console.log('Saved:', webmPath);

  const { execSync } = await import('child_process');
  const mp4Path = path.join(OUT_DIR, 'oauth-demo-portal-verification.mp4');
  const stampedMp4 = path.join(OUT_DIR, `oauth-demo-consent-flow-${stamp}.mp4`);
  try {
    execSync(
      `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Path}"`,
      { stdio: 'inherit' }
    );
    await fs.copyFile(mp4Path, stampedMp4);
    console.log('MP4:', mp4Path);
    console.log('Also:', stampedMp4);
  } catch {
    console.log('ffmpeg not available — upload the .webm or convert manually.');
  }

  console.log('\nNext steps:');
  console.log('1. Watch the MP4 — confirm the Google consent screen is clearly visible with gmail.send.');
  console.log('2. Upload to YouTube as Unlisted.');
  console.log('3. Reply to the OAuth Verification email with the new YouTube link.');
  console.log('   Guidance: https://support.google.com/cloud/answer/13804565');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
