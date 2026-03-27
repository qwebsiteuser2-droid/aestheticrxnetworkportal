# Google OAuth App Verification Guide

This guide covers everything required to pass Google's OAuth app verification for AestheticRx Network. Follow all steps in order.

---

## Current Status After Code Changes

The following have already been implemented in the codebase:

- Privacy Policy page at `/privacy` with Google API Limited Use disclosure (section 14)
- Terms of Service page at `/terms` (also accessible via `/terms-of-service`)
- Privacy Policy and Terms links in the landing page footer
- `robots.txt` and `sitemap.xml` in `frontend/public/`
- Gmail API scope downgraded to `gmail.send` (not the restricted `mail.google.com` scope)
- Google Drive scope restricted to `drive.file` only
- All test/debug pages removed
- `manifest.json` corrected (`short_name`, `name`, `theme_color`)
- Google Search Console meta tag support added via `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` env var

---

## Step 1 — Verify Domain Ownership (Google Search Console)

Google's OAuth consent screen requires you to prove you own the homepage domain before accepting your app for verification.

### Why this is needed

The app runs on `aestheticrxnetworkportal.vercel.app`. Since this is a Vercel subdomain you cannot modify DNS records. The only available method is the **HTML meta tag** method.

### How to do it

1. Go to [Google Search Console](https://search.google.com/search-console/welcome)
2. Click **"Add property"**
3. Select **"URL prefix"** and enter:
   ```
   https://aestheticrxnetworkportal.vercel.app
   ```
4. Under **Verification methods**, expand **"HTML tag"**
5. You will see a tag like:
   ```html
   <meta name="google-site-verification" content="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
   ```
6. Copy only the value (everything inside `content="..."`)

### Add the token to Vercel

1. Go to your [Vercel dashboard](https://vercel.com/dashboard)
2. Open the `aestheticrxnetworkportal` project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**:
   - **Name:** `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   - **Value:** the token you copied (e.g. `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
   - **Environment:** Production (and Preview if you want)
5. Click **Save**
6. Go to **Deployments** → click the three dots on the latest deployment → **Redeploy**
7. Wait for the deployment to finish

### Verify in Search Console

1. Go back to [Google Search Console](https://search.google.com/search-console)
2. Open the property you added
3. Click **"Verify"**
4. You should see: "Ownership verified"

---

## Step 2 — Set Up OAuth Consent Screen in Google Cloud Console

Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **OAuth consent screen**.

Fill in every field exactly as follows:

| Field | Value |
|-------|-------|
| App name | `AestheticRx Network` |
| User support email | `muhammadqasimshabbir3@gmail.com` |
| App logo | Upload `branding-assets/icon-512.png` |
| App homepage | `https://aestheticrxnetworkportal.vercel.app` |
| Privacy policy URL | `https://aestheticrxnetworkportal.vercel.app/privacy` |
| Terms of service URL | `https://aestheticrxnetworkportal.vercel.app/terms` |
| Authorized domains | `aestheticrxnetworkportal.vercel.app` |
| Developer contact email | `muhammadqasimshabbir3@gmail.com` |

---

## Step 3 — Configure OAuth Scopes

In the **Scopes** section of the OAuth consent screen, add only the scopes you actually use:

| Scope | Type | Requires Verification |
|-------|------|-----------------------|
| `openid` | Non-sensitive | No |
| `email` | Non-sensitive | No |
| `profile` | Non-sensitive | No |
| `https://www.googleapis.com/auth/gmail.send` | Sensitive | Yes — submit for verification |
| `https://www.googleapis.com/auth/drive.file` | Non-sensitive | No |

Do NOT add:
- `https://mail.google.com/` — this is a **Restricted** scope requiring a $15,000+ security audit
- `https://www.googleapis.com/auth/drive` — full Drive access, unnecessary

---

## Step 4 — Re-generate Gmail Refresh Token (CRITICAL)

If the current `GMAIL_API_REFRESH_TOKEN` in Railway was generated with the `https://mail.google.com/` scope, it must be regenerated with the narrower `gmail.send` scope or Google will reject the app.

### Steps to regenerate

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click the settings gear (top right) → check **"Use your own OAuth credentials"**
3. Enter your `GMAIL_API_CLIENT_ID` and `GMAIL_API_CLIENT_SECRET`
4. In the scope input (Step 1), enter only:
   ```
   https://www.googleapis.com/auth/gmail.send
   ```
5. Click **"Authorize APIs"** and sign in with the Gmail account used for sending
6. Click **"Exchange authorization code for tokens"**
7. Copy the **Refresh token** value
8. In Railway: update `GMAIL_API_REFRESH_TOKEN` with this new token
9. Redeploy the backend on Railway

---

## Step 5 — Submit for Verification

1. In Google Cloud Console → OAuth consent screen, click **"Publish App"** (moves from Testing to Production)
2. Click **"Prepare for verification"**
3. For the `gmail.send` scope, provide:
   - A **short explanation**: "We use the Gmail API solely to send transactional emails (order confirmations, OTP codes, and account notifications) to registered users of the AestheticRx Network platform. We do not read, access, or store any Gmail messages."
   - A **demo video** (screen recording showing the email sending flow — required by Google)
   - Your **privacy policy URL**: `https://aestheticrxnetworkportal.vercel.app/privacy`
4. Submit

### What Google checks

- App name matches branding on the website
- Privacy policy URL is live and contains the Google API Limited Use disclosure
- Terms of Service URL is live
- Homepage URL is verified in Search Console
- Only the scopes you declared are actually being used
- No test/debug pages publicly accessible

---

## Step 6 — Google Cloud Console Checklist Before Submitting

Run through this checklist before clicking Submit:

- [ ] Domain verified in Google Search Console
- [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` set in Vercel env vars and redeployed
- [ ] Privacy policy live at `https://aestheticrxnetworkportal.vercel.app/privacy` (includes section 14 Google API disclosure)
- [ ] Terms of Service live at `https://aestheticrxnetworkportal.vercel.app/terms`
- [ ] Privacy policy and Terms links visible in homepage footer
- [ ] OAuth consent screen: app name, logo, support email, homepage, privacy URL, ToS URL all filled
- [ ] Authorized domain `aestheticrxnetworkportal.vercel.app` added
- [ ] Only `openid`, `email`, `profile`, `gmail.send`, `drive.file` in scopes (no `mail.google.com`, no `drive`)
- [ ] Gmail refresh token regenerated with `gmail.send` scope only (see Step 4)
- [ ] Backend redeployed on Railway with new refresh token

---

## Troubleshooting

### "The website of your home page URL is not registered to you"
Domain ownership not verified in Google Search Console. Complete Step 1.

### "Your home page URL does not include a link to your privacy policy"
The privacy policy link was added to the landing page footer. If still showing after deploy, clear browser cache and check the live site footer.

### "This app isn't verified"
Normal for apps using sensitive scopes before verification is approved. Users can still click "Advanced" → "Go to site" during testing. Submit for verification (Step 5) to remove this warning for all users.

### Gmail API rejection
Most likely caused by using the restricted `mail.google.com` scope instead of `gmail.send`. Complete Step 4 to regenerate the refresh token.

---

## Environment Variables Reference

| Variable | Where to set | Purpose |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Vercel env vars | Google Search Console domain ownership verification |
| `GMAIL_API_CLIENT_ID` | Railway env vars | Gmail OAuth client ID |
| `GMAIL_API_CLIENT_SECRET` | Railway env vars | Gmail OAuth client secret |
| `GMAIL_API_REFRESH_TOKEN` | Railway env vars | Gmail OAuth refresh token (must use `gmail.send` scope) |
| `GMAIL_API_USER_EMAIL` | Railway env vars | Gmail address used for sending |
| `CLIENT_ID_GOOGLESIGNIN` | Railway env vars | Google Sign-In OAuth client ID |
| `CLIENT_SECRETE_GOOGLESIGIN` | Railway env vars | Google Sign-In OAuth client secret |
