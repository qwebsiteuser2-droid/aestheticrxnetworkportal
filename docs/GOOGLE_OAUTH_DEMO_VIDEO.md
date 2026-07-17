# OAuth verification demo video

Google requires a **publicly accessible** screen recording showing how your app uses each sensitive/restricted scope. A broken Drive link, private video, or login-walled file is the most common reason for rejection.

## Requirements

- **Length:** 2–5 minutes
- **Format:** MP4 uploaded to **YouTube (Unlisted)** recommended
- **Access:** Anyone with the link can watch **without signing in to Google**
- **Audio:** Optional; add short on-screen captions if no narration
- **Show:** Real production or staging UI at `https://aestheticrxnetworkportal.vercel.app`

## What to record (gmail.send scope)

Record this flow in order:

1. **Homepage** — Show footer with **Privacy Policy** and **Terms of Service** links (`/`).
2. **Privacy policy** — Open `/privacy`, scroll to **Section 13 — Google API Services** (Gmail API limited use).
3. **Login** — Sign in as a test user (doctor or admin).
4. **Trigger transactional email** (pick one):
   - **OTP:** Log out → Log in → enter phone/email OTP (show email received), or
   - **Order:** Place a test order → show order confirmation email, or
   - **Admin:** Admin → send test notification if available
5. **State clearly (text slide or voice):**  
   *“We only use Gmail API to send transactional emails. We do not read the user’s inbox.”*

If you use **Google Sign-In**, also show:

- Login with Google → account created/logged in
- Mention only `openid`, `email`, `profile` are used

## Upload checklist

- [ ] YouTube visibility = **Unlisted** (not Private)
- [ ] Open the link in **Incognito** — video plays
- [ ] Paste the same URL in Cloud Console → Verification → Demo video
- [ ] Paste the same URL in your **reply email** to Google

## Example title

`AestheticRxNetwork — Gmail API transactional email demo`

## Do not

- Use Google Sites, Instagram, or Facebook as the “homepage” in the console
- Use a Restricted scope demo for `mail.google.com` if you only request `gmail.send`
- Submit a Google Drive link set to “Restricted” or “Organization only”
