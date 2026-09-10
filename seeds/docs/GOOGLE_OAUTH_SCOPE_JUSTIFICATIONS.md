Use these in **Google Cloud Console** → **OAuth consent screen** → **Scopes** → justification fields, and in your reply to the verification team.

**Project:** aestheticrxnetworkportal (244788420362)  
**App:** AestheticRxNetwork  
**Homepage:** https://aestheticrxnetwork.vercel.app  
**Privacy policy:** https://aestheticrxnetwork.vercel.app/privacy  
**Demo video:** [paste your YouTube Unlisted URL]

---

## Application summary (optional intro field)

AestheticRxNetwork is a B2B web platform for aesthetic clinics and licensed medical professionals. Doctors use it to order medical supplies, manage appointments, share research, and receive tier-based benefits. The app uses Google OAuth for sign-in and the Gmail API only to send transactional emails from our platform mailbox (order confirmations, OTP codes, and account notifications). We do not read users’ Gmail inboxes, sell Google user data, or use Google data for advertising or AI model training.

---

## Scope: `openid`, `email`, `profile` (Google Sign-In)

**Why we need it:**  
Registered doctors and staff sign in with Google to create and access their accounts without managing a separate password for Google-authenticated users.

**How we use the data:**  
We receive the user’s name, email address, and profile picture to identify the account, display their profile, and link orders and activity to the correct user. This data is stored in our application database only for account operation.

**Why minimum scope:**  
We request only OpenID Connect basic profile scopes. We do not request access to Gmail, Calendar, Contacts, or other Google services through Sign-In.

**User-facing benefit:**  
Faster, secure login for medical professionals using the platform.

---

## Scope: `https://www.googleapis.com/auth/gmail.send` (Sensitive)

**Why we need it:**  
Our backend must send transactional emails on behalf of the platform when users place orders, verify login with OTP, or receive account/tier notifications. SMTP alone is unreliable in our cloud deployment; Gmail API with OAuth is our production sending method for one dedicated platform mailbox (`aestheticrxnetwork@gmail.com` or configured `GMAIL_API_USER_EMAIL`).

**How we use the data:**  
We use `gmail.send` only to **compose and send** messages. We do **not** use `https://mail.google.com/`, do **not** read, list, search, or store inbox or sent mail content from users’ personal Gmail accounts, and do **not** access email metadata beyond what is required to send a message. Recipients are platform users or admins; content is limited to order details, OTP codes, password-reset/verification, and administrative alerts.

**Why minimum scope:**  
We intentionally use `gmail.send` instead of the restricted full Gmail scope to limit access to send-only capability. No read, modify, or delete permissions are requested.

**User-facing benefit:**  
Users receive timely order confirmations, security OTPs, and important account notifications required to use the platform safely.

**Limited Use compliance:**  
Use of Google user data adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including Limited Use. Data is not used for ads, sold to third parties, or used to train generalized ML models. Disclosed in our privacy policy (Section 13): https://aestheticrxnetworkportal.vercel.app/privacy

---

## Scope: `https://www.googleapis.com/auth/drive.file` (Non-sensitive)

**Why we need it:**  
Administrators can export platform data (reports/backups) from the admin panel. Exports may be saved to Google Drive files **created by this application**.

**How we use the data:**  
We only create and access files that our app creates via the Drive API. We do **not** browse, read, or modify the user’s existing Drive files or folders.

**Why minimum scope:**  
`drive.file` is the narrowest Drive scope that allows storing user-initiated exports without full Drive access.

**User-facing benefit:**  
Admins can securely archive or share exports they explicitly generate.

---

## What we do NOT do

- We do **not** request `https://mail.google.com/` (restricted Gmail scope).
- We do **not** read users’ Gmail inboxes.
- We do **not** use Google data for advertising or resale.
- We do **not** use Google user data to train general-purpose AI/ML models.
- We do **not** host the privacy policy or homepage on Google Sites or social media; they are on https://aestheticrxnetwork.vercel.app

---

## Reply email snippet (combine with demo URL)

```
Scope justifications:

1) openid, email, profile — Google Sign-In so doctors can authenticate; we store name, email, and profile photo only for account identity.

2) gmail.send — Our server sends transactional email only (order confirmations, OTP, account notifications) from the platform mailbox. We do not read inbox mail. We use gmail.send (not mail.google.com).

3) drive.file — Admin-initiated data exports are saved only to Drive files created by our app.

Privacy: https://aestheticrxnetworkportal.vercel.app/privacy (Section 13 — Google API Services)
Demo video: https://www.youtube.com/watch?v=xNq1gIwWEJ4
```
