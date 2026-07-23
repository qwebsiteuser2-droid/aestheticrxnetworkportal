# OAuth verification demo video

Google requires a **publicly accessible** screen recording showing:

1. The **complete OAuth consent workflow**
2. The **OAuth Consent Screen** with the **same scopes** you request — **fully expanded and readable** (click **“Show all services”** if scopes are obscured). Language = **English**
3. How the app **uses each scope** in real functionality
4. The **same app** (name/branding) submitted for verification

Official checklist: [Demo Video — Google Cloud Help](https://support.google.com/cloud/answer/13804565)  
Testing access: [In-app Testing](https://support.google.com/cloud/answer/13807382)

**Important (Jul 2026):** Homepage and privacy in the video and Cloud Console must use a **custom domain you own** (not `*.vercel.app`). See [GOOGLE_OAUTH_JUL2026_REPLY.md](./GOOGLE_OAUTH_JUL2026_REPLY.md).

---

## Record

```bash
cd /home/engmatix/qasim_ai/aestheticrxnetworkportal

DEMO_SITE_URL=https://YOUR-CUSTOM-DOMAIN \
DEMO_SITE_EMAIL='YOUR_SITE_USER@email.com' \
DEMO_SITE_PASSWORD='YOUR_SITE_PASSWORD' \
DEMO_GMAIL_EMAIL='aestheticrxnetwork@gmail.com' \
DEMO_GMAIL_PASSWORD='YOUR_GMAIL_PASSWORD' \
DEMO_GMAIL_CLIENT_ID='YOUR_GMAIL_API_CLIENT_ID.apps.googleusercontent.com' \
DEMO_HEADED=1 \
node scripts/record-oauth-demo.mjs
```

`DEMO_GMAIL_CLIENT_ID` = Railway `GMAIL_API_CLIENT_ID` (the OAuth client that holds `gmail.send`).

Output:

- `docs/oauth-demo-output/oauth-demo-portal-verification.mp4`

---

## Required sequence (narrate or caption each beat)

1. Intro — app purpose: AestheticRxNetwork B2B portal  
2. Homepage on **verified custom domain** — show branding; banner may say “AI Research Assistant is coming soon” (no Hugging Face)  
3. Privacy policy — Limited Use / no third-party AI on Google user data  
4. `/oauth-verification` disclosure  
5. **★ Google OAuth consent** — open full consent UI; expand scopes; hold so `gmail.send` (and Sign-In scopes if shown) are readable; English  
6. In-app **Continue with Google** (openid / email / profile)  
7. Login → place order → show transactional / invoice email = **how gmail.send is used**  
8. Closing — Limited Use; no third-party AI training on Google data  

## Upload checklist

- [ ] Consent screen **fully expanded** (“Show all services” if needed)  
- [ ] Consent language = **English**  
- [ ] Same branding as Cloud Console app name  
- [ ] YouTube = **Unlisted** (not Private)  
- [ ] Link plays in **Incognito** without login  
- [ ] Reply to the OAuth Verification email with the **new** YouTube URL + test credentials  

## Do not

- Submit a video that only shows the website without opening Google’s consent UI  
- Leave scopes collapsed/obscured  
- Use Private YouTube / restricted Drive links  
- Demo `mail.google.com` if you only request `gmail.send`  
- Show Hugging Face / live AI calling Google user data  
