# Google OAuth verification — July 2026 reply checklist

Project: **aestheticrxnetworkportal** (`244788420362`)

Official refs:

- [Demo Video](https://support.google.com/cloud/answer/13804565)
- [In-app Testing](https://support.google.com/cloud/answer/13807382)
- [App Homepage / domain ownership](https://support.google.com/cloud/answer/13802798) (homepage must be on a domain you verify)

---

## What we fixed in code (deploy before reply)

1. **Third-party AI removed** — Hugging Face / LLaMA API calls are disabled (503 / coming soon). Homepage banner: “AI Research Assistant is coming soon.”
2. **Limited Use statement** — Privacy Policy §13 and `/oauth-verification` affirm no Google user data is sent to third-party AI for training.
3. **Research Lab** — AI Assistant button disabled (“Coming soon”); no UI path to HF.

---

## Blocking: custom domain (Vercel.app is rejected)

Google explicitly disallows homepage/privacy on `*.vercel.app` and similar third-party hosts.

**You must:**

1. Buy/attach a custom domain (e.g. `aestheticrxnetwork.com`) in Vercel → Domains.
2. Set `NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN` on the frontend deploy.
3. Verify the domain in [Google Search Console](https://search.google.com/search-console) (DNS or HTML tag).
4. In Cloud Console → OAuth consent screen, set:
   - Application home page → `https://YOUR-DOMAIN`
   - Privacy policy → `https://YOUR-DOMAIN/privacy`
   - Terms → `https://YOUR-DOMAIN/terms`
   - Authorized domains → `YOUR-DOMAIN` (not vercel.app)
5. Update Google OAuth client authorized origins / redirect URIs to the custom domain.

Until this is done, verification cannot proceed on the homepage item—even if the rest is fixed.

---

## Demo video requirements (re-record after deploy + domain)

Per [Demo Video guidance](https://support.google.com/cloud/answer/13804565):

1. End-to-end app flow **including OAuth grant**
2. **Complete OAuth Consent Screen** with **all requested scopes fully expanded and readable**
   - If scopes are obscured, click **“Show all services.”**
   - Consent language = **English** (bottom-left)
3. Show app features that use those scopes (Sign-In + `gmail.send` order/invoice email)
4. Same app name/branding as Cloud Console submission
5. Narration/captions help review

Upload: **YouTube Unlisted** (or Drive “Anyone with the link”). Test in Incognito.

Record helper:

```bash
cd /home/engmatix/qasim_ai/aestheticrxnetworkportal
# After custom domain is live, point DEMO_SITE_URL at it
DEMO_SITE_URL=https://YOUR-DOMAIN \
DEMO_SITE_EMAIL='...' DEMO_SITE_PASSWORD='...' \
DEMO_GMAIL_EMAIL='aestheticrxnetwork@gmail.com' \
DEMO_GMAIL_PASSWORD='...' \
DEMO_GMAIL_CLIENT_ID='...' \
DEMO_HEADED=1 \
node scripts/record-oauth-demo.mjs
```

---

## Test credentials (you provide in the reply)

Per [In-app Testing](https://support.google.com/cloud/answer/13807382):

- Login URL
- Username + password (or allowlist reviewer email)
- No 2FA / phone / credit-card blockers on the test account
- Steps to reach Google Sign-In and (if applicable) Gmail consent for `gmail.send`

---

## Reply email template

```text
Subject: Re: OAuth Dev Verification — aestheticrxnetworkportal (244788420362)

Hello Google OAuth Verification Team,

We have addressed the items in your July 2026 email for project
aestheticrxnetworkportal (244788420362):

1) Homepage and Privacy Policy (verified domain we own)
   - Homepage: https://YOUR-DOMAIN
   - Privacy: https://YOUR-DOMAIN/privacy
   - Terms: https://YOUR-DOMAIN/terms
   - Google API disclosure: https://YOUR-DOMAIN/oauth-verification
   Domain ownership verified in Google Search Console.
   Cloud Console OAuth consent screen URLs updated to the above.

2) Consent screen / demo video
   - Updated demo video (YouTube Unlisted): <PASTE_LINK>
   - Video shows the complete OAuth consent workflow with scopes fully
     expanded / readable (Show all services if needed), language English,
     and how AestheticRxNetwork uses Sign-In + gmail.send (transactional
     order/invoice email only).

3) Test credentials
   - Login URL: https://YOUR-DOMAIN/login
   - Username: <TEST_EMAIL>
   - Password: <TEST_PASSWORD>
   - 2FA and other blockers disabled on this account.
   - Steps: open Login → Continue with Google (or email/password as above)
     → place a product order to trigger transactional email via gmail.send.

4) AI / Limited Use
   - Third-party AI integration (Hugging Face / LLaMA via API) has been
     removed. The UI shows “AI Research Assistant is coming soon.”
   - List of third-party AI providers currently used: none.
   - Affirmative statement (hosted on privacy + oauth-verification pages):
     “The use of raw or derived user data received from Workspace APIs will
     adhere to the Google User Data Policy, including the Limited Use
     requirements.”
   - We do not transfer Google Workspace/Photos user data to third-party
     AI services for training or secondary use.

Please continue verification.

Thank you,
Muhammad Qasim Shabbir
muhammadqasimshabbir3@gmail.com
```

---

## After you finish

1. Deploy frontend + backend (AI kill-switch).
2. Attach custom domain + Search Console + Cloud Console URL updates.
3. Re-record and upload demo video.
4. **Reply to the Google email** (required — fixing Console alone is not enough).
