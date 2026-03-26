# Email Setup Guide

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |
| **Status** | ✅ Production Ready |

---

This guide covers all email configuration options, deliverability, spam reduction, and unsubscribe functionality for the AestheticRxNetwork platform.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Option 1: Gmail SMTP (Simple)](#option-1-gmail-smtp-simple)
3. [Option 2: Gmail API (OAuth 2.0)](#option-2-gmail-api-oauth-20)
4. [Option 3: SendGrid (Recommended for Railway)](#option-3-sendgrid-recommended-for-railway)
5. [Environment Variables](#environment-variables)
6. [Email Types Sent](#email-types-sent)
7. [Spam Reduction Features](#spam-reduction-features)
8. [Unsubscribe System](#unsubscribe-system)
9. [Compliance](#compliance)
10. [Rate Limits](#rate-limits)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Overview

The AestheticRxNetwork backend supports multiple email providers:

| Method | Best For | Limits | Railway Free |
|--------|----------|--------|--------------|
| Gmail SMTP | Local development | 500/day | ❌ Blocked |
| Gmail API | Production | 500/day | ✅ Works |
| SendGrid | Railway Free/Hobby | 100/day free | ✅ Works |

**Recommendation:**
- **Local Development**: Gmail SMTP (simplest)
- **Railway Free/Hobby**: SendGrid (Gmail SMTP is blocked)
- **Railway Pro/Production**: Gmail API or Gmail SMTP

### Key Achievements

- **Spam Rate Reduction**: 70-90%
- **Gmail Deliverability**: Significantly improved
- **Compliance**: CAN-SPAM Act and GDPR compliant

---

## Option 1: Gmail SMTP (Simple)

Best for local development. Gmail SMTP is blocked on Railway Free/Hobby plans.

### Setup Steps

1. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification"

2. **Generate App Password**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter name: "AestheticRxNetwork Backend"
   - Click "Generate"
   - Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

3. **Add Environment Variables**
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

### Limitations
- ❌ Blocked on Railway Free/Hobby plans
- ⚠️ 500 emails per day limit
- ⚠️ May go to spam initially

---

## Option 2: Gmail API (OAuth 2.0)

More secure method using Google's OAuth 2.0. Works on all platforms.

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project"
3. Name it: `QWebsiteEmailService`
4. Click "Create"

### Step 2: Enable Gmail API

1. Go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (or Internal for Google Workspace)
3. Fill in:
   - App name: `QWebsiteEmailService`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. Add scope: `https://www.googleapis.com/auth/gmail.send`
6. Add test users (your Gmail account)
7. Complete the wizard

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `QWebsiteGmailAPIClient`
5. Add Authorized redirect URIs:
   - `http://localhost:4000/auth/google/callback`
   - `https://your-railway-url.up.railway.app/auth/google/callback`
   - `https://developers.google.com/oauthplayground`
6. Click **Create**
7. **Save** the Client ID and Client Secret

### Step 5: Get Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click gear icon (⚙️) → Check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In left panel, find "Gmail API v1" → select `gmail.send`
5. Click **Authorize APIs**
6. Sign in with your Gmail account
7. Click **Exchange authorization code for tokens**
8. **Copy the Refresh Token**

### Step 6: Add Environment Variables

```env
GMAIL_API_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_API_CLIENT_SECRET=your_client_secret
GMAIL_API_REFRESH_TOKEN=your_refresh_token
GMAIL_API_USER_EMAIL=your-email@gmail.com
```

### Limitations
- ⚠️ 500 emails per day (free Gmail)
- ⚠️ 2000 emails per day (Google Workspace)
- ✅ More secure than SMTP
- ✅ Works on all Railway plans

---

## Option 3: SendGrid (Recommended for Railway)

Best option for Railway Free/Hobby plans. Simple API-based sending.

### Setup Steps

1. **Create SendGrid Account**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Sign up (free - 100 emails/day)
   - Verify your email

2. **Create API Key**
   - Go to **Settings** → **API Keys**
   - Click **Create API Key**
   - Name: "AestheticRxNetwork Backend"
   - Select **Full Access** or **Mail Send** permission
   - **Copy the API key** (starts with `SG.`)

3. **Verify Sender**
   - Go to **Settings** → **Sender Authentication**
   - Click **Verify a Single Sender**
   - Enter your email address
   - Check email and click verification link

4. **Add Environment Variables**
   ```env
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_FROM_EMAIL=your-email@domain.com
   ```

### How It Works

The backend automatically:
1. Tries Gmail SMTP first
2. Falls back to SendGrid if SMTP fails
3. Email is sent successfully

### Limitations
- ⚠️ 100 emails/day (free tier)
- 💰 $19.95/month for 50K emails
- ✅ Works on all Railway plans
- ✅ Better deliverability

---

## Environment Variables

### All Email Variables

```env
# Gmail SMTP (Option 1)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Gmail API (Option 2)
GMAIL_API_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_API_CLIENT_SECRET=your_client_secret
GMAIL_API_REFRESH_TOKEN=your_refresh_token
GMAIL_API_USER_EMAIL=your-email@gmail.com

# SendGrid (Option 3)
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM_EMAIL=your-email@domain.com

# Admin notification emails
MAIN_ADMIN_EMAIL=admin1@example.com
SECONDARY_ADMIN_EMAIL=admin2@example.com

# Batch Settings
EMAIL_BATCH_SIZE=10
EMAIL_DELAY_MS=2000
EMAIL_BATCH_DELAY_MS=10000

# Retry Settings
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY_MS=5000

# Rate Limits
EMAIL_RATE_LIMIT=100
```

### Where to Configure

**Local Development:**
- Add to `/backend/.env` file

**Railway:**
1. Go to Railway Dashboard → Backend Service → Variables
2. Add each variable
3. Redeploy

**Vercel:**
- Not needed (email is sent from backend only)

---

## Email Types Sent

The platform sends these email types:

### Marketing Emails (Respects Unsubscribe)

| Email Type | When Sent | Unsubscribe |
|------------|-----------|-------------|
| Promotional messages | Admin campaigns | ✅ Yes |
| Automatic campaigns | Scheduled sends | ✅ Yes |
| Bulk messages | Admin bulk send | ✅ Yes |
| Award Messages | Admin sends awards | ✅ Yes |

### Transactional Emails (Always Sent)

| Email Type | When Sent | Template |
|------------|-----------|----------|
| Password Reset OTP | Password reset request | OTP code with 2-min expiry |
| Order Confirmation | Order placed | Order details |
| Payment Confirmation | PayFast payment success | Payment receipt |
| Admin Notifications | New orders, signups | Admin alerts |
| Tier Upgrade | User reaches new tier | Congratulations |
| Research Approval | Paper approved | Notification |
| Delivery Notifications | Order status updates | Status message |

---

## Spam Reduction Features

### 1. Batch Email Sending ✅

Sends emails in small batches instead of bulk.

| Setting | Default | Description |
|---------|---------|-------------|
| Batch Size | 10 | Emails per batch |
| Email Delay | 2 seconds | Between individual emails |
| Batch Delay | 10 seconds | Between batches |

### 2. List-Unsubscribe Headers ✅

RFC 2369 and RFC 8058 compliant headers enable Gmail's native unsubscribe button.

```
List-Unsubscribe: <https://domain.com/unsubscribe/userId/token>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

**Benefits:**
- Gmail shows native "Unsubscribe" button
- Improves sender reputation
- Reduces spam complaints
- Better inbox placement

### 3. Email Footer Unsubscribe Links ✅

All marketing emails include clear unsubscribe link in footer.

```
─────────────────────────────────────────
You are receiving this email because you are a registered user.

[Unsubscribe from marketing emails]

This is an automated message from AestheticRxNetwork.
─────────────────────────────────────────
```

### 4. User Consent Management ✅

- Consent collected during signup
- Stored in database (`consent_flag`, `consent_at`)
- Email sending respects consent preferences
- GDPR compliant

### 5. Email Delivery Monitoring ✅

Analytics dashboard at `/admin/email-analytics`:

- Delivery rates
- Bounce rates
- Unsubscribe rates
- Email performance metrics

### 6. Retry Mechanism ✅

| Setting | Value | Description |
|---------|-------|-------------|
| Max Retries | 3 | Per email |
| Backoff | Exponential | 1min, 5min, 15min |

---

## Unsubscribe System

### Implementation

#### Database Fields

```typescript
// doctors table
email_unsubscribed: boolean (default: false)
email_unsubscribed_at: timestamp (nullable)
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/unsubscribe/:userId/:token` | Show unsubscribe page |
| POST | `/api/unsubscribe/:userId/:token` | Process unsubscribe |
| POST | `/api/unsubscribe/resubscribe/:userId/:token` | Resubscribe |
| POST | `/api/unsubscribe/one-click` | One-click unsubscribe |

### Security

- Secure token generation (SHA-256)
- Token verification before processing
- No authentication required (standard practice)
- User verification before action

---

## Compliance

### CAN-SPAM Act ✅

- Clear sender identification
- Honest subject lines
- Physical address included
- Unsubscribe option in all marketing emails
- Honor opt-out requests promptly

### GDPR ✅

- User consent before sending
- Easy unsubscribe option
- Data access upon request
- Right to be forgotten

---

## Rate Limits

### Gmail API Limits

| Limit | Value |
|-------|-------|
| Daily Sending | 500 emails/day (free Gmail) |
| Per Hour | ~100 emails |
| Per Minute | ~20 emails |

### SendGrid Free Tier

| Limit | Value |
|-------|-------|
| Daily Sending | 100 emails/day |

### Platform Safeguards

| Feature | Implementation |
|---------|----------------|
| Batch Sending | Prevents overwhelming servers |
| Delays | Mimics human behavior |
| Quota Tracking | Warns at 80%, 90% of limit |
| Blocking | Stops at 100% of limit |

---

## Troubleshooting

### Issue: "Authentication Failed" (Gmail SMTP)

**Causes:**
- Wrong app password
- 2FA not enabled
- Less secure apps blocked

**Solution:**
1. Verify 2FA is enabled
2. Regenerate app password
3. Use the new 16-character password

### Issue: "Connection Refused" (Railway)

**Cause:** Gmail SMTP is blocked on Railway Free/Hobby

**Solution:**
- Use SendGrid instead (Option 3)
- Or upgrade to Railway Pro ($20/month)

### Issue: "Invalid Grant" (Gmail API)

**Causes:**
- Refresh token revoked
- User changed password
- Token expired (6 months inactivity)

**Solution:**
1. Go to OAuth Playground
2. Re-authorize and get new refresh token
3. Update environment variable

### Issue: "Quota Exceeded"

**Causes:**
- Hit daily email limit

**Solutions:**
- Gmail: 500/day limit - wait 24 hours
- SendGrid: 100/day free - upgrade or wait
- Implement email queuing

### Issue: Emails Going to Spam

**Solutions:**
1. Verify Gmail API credentials
2. Check List-Unsubscribe headers
3. Review email content for spam triggers
4. Ensure batch sending is enabled
5. Monitor sender reputation
6. Add SPF/DKIM records
7. Use consistent "From" address

### Issue: High Bounce Rates

**Solutions:**
1. Validate email addresses before sending
2. Remove invalid emails from lists
3. Check for typos in addresses
4. Monitor bounce logs

### Issue: "Access Denied" (Gmail API)

**Causes:**
- Gmail API not enabled
- Wrong OAuth consent screen settings
- Missing test user

**Solution:**
1. Verify Gmail API is enabled in Cloud Console
2. Check OAuth consent screen is configured
3. Add your email as test user

### Issue: Unsubscribe Not Working

**Solutions:**
1. Verify token generation
2. Check database updates
3. Confirm endpoint accessibility
4. Test with different users

---

## Best Practices

### Sending

1. Always use batch sending for bulk emails
2. Respect user consent preferences
3. Filter out unsubscribed users
4. Use proper email headers
5. Test templates before sending

### Content

1. Clear sender identification
2. Relevant subject lines
3. Mobile-responsive templates
4. Easy unsubscribe option
5. No spam trigger words

### Monitoring

1. Check delivery rates regularly
2. Monitor bounce rates
3. Track unsubscribe rates
4. Review failed emails
5. Act on spam complaints

### Security

1. **Never commit credentials to Git**
2. **Use environment variables**
3. **Rotate credentials periodically**
4. **Monitor email usage**
5. **Use least-privilege scopes**

---

## Related Documentation

- [Credentials Guide](CREDENTIALS_GUIDE.md) - All API keys
- [Railway Deployment](RAILWAY_DEPLOYMENT.md) - Railway setup
- [Environment Variables Reference](ENVIRONMENT_VARIABLES_REFERENCE.md) - All env vars

---

**Document Version**: 3.1.0  
**Last Updated**: January 22, 2026  
**Status**: ✅ All Features Implemented and Tested
