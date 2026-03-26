# Gmail API Setup - Quick Checklist

Use this checklist to quickly verify you have everything needed for Gmail API setup.

## ✅ Prerequisites Checklist

- [ ] Google account (Gmail or Google Workspace)
- [ ] Access to Google Cloud Console
- [ ] Node.js backend ready

## ✅ Google Cloud Setup

- [ ] Created Google Cloud Project
- [ ] Enabled Gmail API
- [ ] Configured OAuth Consent Screen
  - [ ] App name set
  - [ ] Support email added
  - [ ] Scope `gmail.send` added
  - [ ] Test user added (your Gmail account)

## ✅ OAuth Credentials

- [ ] Created OAuth 2.0 Client ID
  - [ ] Application type: Web application
  - [ ] Redirect URI added (localhost + production)
- [ ] **Client ID** copied: `___________________________`
- [ ] **Client Secret** copied: `___________________________`

## ✅ Refresh Token

- [ ] Used OAuth 2.0 Playground or Node.js script
- [ ] Authorized with Gmail account
- [ ] **Refresh Token** obtained: `___________________________`
- [ ] Verified refresh token is long string (starts with `1//`)

## ✅ Environment Variables

Add to `.env` and Railway:

```bash
GMAIL_API_CLIENT_ID=___________________________
GMAIL_API_CLIENT_SECRET=___________________________
GMAIL_API_REFRESH_TOKEN=___________________________
GMAIL_API_USER_EMAIL=___________________________
```

## ✅ Code Setup

- [ ] Installed `googleapis` package: `npm install googleapis`
- [ ] Ready to implement Gmail API service
- [ ] Old SMTP code ready to be replaced

## ✅ Testing

- [ ] Test email sending works
- [ ] Emails delivered successfully
- [ ] Checked spam folder
- [ ] Verified quota limits understood

## 🔒 Security

- [ ] Credentials NOT committed to Git
- [ ] `.env` in `.gitignore`
- [ ] Railway environment variables set
- [ ] Using `gmail.send` scope only (not full Gmail access)

---

## Quick Command Reference

```bash
# Install package
npm install googleapis

# Test refresh token (create test script)
node test-gmail-api.js
```

---

## Important URLs

- **Google Cloud Console**: https://console.cloud.google.com/
- **OAuth 2.0 Playground**: https://developers.google.com/oauthplayground/
- **Gmail API Docs**: https://developers.google.com/gmail/api
- **Credentials Page**: https://console.cloud.google.com/apis/credentials

---

**Need Help?** See the full guide: `GMAIL_API_SETUP_GUIDE.md`
