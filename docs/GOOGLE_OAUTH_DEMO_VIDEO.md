# OAuth verification demo video

Google requires a **publicly accessible** screen recording showing:

1. The **complete OAuth consent workflow** (this is what failed review on Jul 20, 2026)
2. The **OAuth Consent Screen** with the **same scopes** you request (language = **English**)
3. How the app **uses each scope** in real functionality

Official checklist: [Demo Video — Google Cloud Help](https://support.google.com/cloud/answer/13804565)

## Record (updated script)

```bash
cd /home/engmatix/qasim_ai/aestheticrxnetworkportal

DEMO_SITE_URL=https://aestheticrxnetwork.vercel.app \
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
- stamped copy `oauth-demo-consent-flow-*.mp4`

## What the new recording includes (in order)

1. Caption — purpose of the demo / Google requirements  
2. Homepage — app name & branding  
3. Privacy policy — Google API Limited Use section  
4. `/oauth-verification` disclosure page  
5. Terms of Service  
6. **★ Google OAuth consent screen** opened with  
   `https://www.googleapis.com/auth/gmail.send`  
   (hold on screen so reviewers can read scopes; language English)  
7. In-app **Continue with Google** (openid / email / profile)  
8. Site login → OTP / transactional email = **how gmail.send is used**  
9. Closing summary captions  

## Upload checklist

- [ ] Consent screen is **clearly visible** with **gmail.send** listed  
- [ ] Consent screen language = **English**  
- [ ] YouTube = **Unlisted** (not Private)  
- [ ] Link plays in **Incognito** without login  
- [ ] Reply to the OAuth Verification email with the **new** YouTube URL  

## Reply email snippet

```text
Hello Google OAuth Verification Team,

We have updated our demo video to show the complete OAuth consent
workflow, including the Google OAuth Consent Screen with the
gmail.send scope (English), and how AestheticRxNetwork uses that
scope to send transactional email only (OTP / notifications).

Updated demo video (YouTube Unlisted):
<PASTE_YOUTUBE_LINK>

Thank you,
AestheticRxNetwork
```

## Do not

- Submit a video that only shows the website without opening Google’s consent UI  
- Use Private YouTube / restricted Drive links  
- Demo `mail.google.com` if you only request `gmail.send`
