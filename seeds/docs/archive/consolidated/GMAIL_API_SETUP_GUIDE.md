# Gmail API Setup Guide

This guide will walk you through setting up the official Gmail API for sending emails instead of using Gmail SMTP (App Passwords).

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Create Google Cloud Project](#step-1-create-google-cloud-project)
3. [Step 2: Enable Gmail API](#step-2-enable-gmail-api)
4. [Step 3: Create OAuth 2.0 Credentials](#step-3-create-oauth-20-credentials)
5. [Step 4: Configure OAuth Consent Screen](#step-4-configure-oauth-consent-screen)
6. [Step 5: Get Refresh Token](#step-5-get-refresh-token)
7. [Step 6: Environment Variables](#step-6-environment-variables)
8. [Step 7: Install Required Packages](#step-7-install-required-packages)
9. [Step 8: Implementation Notes](#step-8-implementation-notes)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A Google account (Gmail or Google Workspace)
- Access to Google Cloud Console (https://console.cloud.google.com)
- Node.js backend application
- Basic understanding of OAuth 2.0

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `QWebsiteEmailService` (or your preferred name)
5. Click **"Create"**
6. Wait for the project to be created and select it

---

## Step 2: Enable Gmail API

1. In your Google Cloud Project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Gmail API"**
3. Click on **"Gmail API"**
4. Click **"Enable"**
5. Wait for the API to be enabled (usually takes a few seconds)

---

## Step 3: Create OAuth 2.0 Credentials

**⚠️ IMPORTANT**: You need to configure the OAuth Consent Screen (Step 4) BEFORE creating credentials. If you haven't done Step 4 yet, Google will prompt you to do it first.

1. Go to **"APIs & Services"** → **"Credentials"**
   - **Navigation**: Left sidebar → "APIs & Services" → "Credentials"
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. **If you see a message about configuring OAuth consent screen first:**
   - Click the link to configure it, OR
   - Go to Step 4 below and complete it, then come back here
5. For **Application type**, select **"Web application"**
6. Enter a name: `QWebsiteGmailAPIClient`
7. Under **"Authorized JavaScript origins"**, click **"+ ADD URI"** and add:
   - For local development: `http://localhost:4000`
   - For production: `https://aestheticrxdepolying-production.up.railway.app`
   - (You can add multiple origins)
8. Under **"Authorized redirect URIs"**, click **"+ ADD URI"** and add:
   - For local development: `http://localhost:4000/auth/google/callback`
   - For production: `https://aestheticrxdepolying-production.up.railway.app/auth/google/callback`
   - **Also add OAuth Playground** (for getting refresh token): `https://developers.google.com/oauthplayground`
   - (You can add multiple redirect URIs)
9. Click **"Create"**
10. **IMPORTANT**: A popup will appear with your credentials:
   - **Client ID**: Copy this (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)
   - **Save these securely** - you'll need them for environment variables

**Note**: The OAuth Playground redirect URI (`https://developers.google.com/oauthplayground`) is added so you can use it in Step 5 to get your refresh token. You can remove it later if you want, but it's safe to keep it.

---

## Step 4: Configure OAuth Consent Screen

**📍 WHERE TO FIND THIS**: This is a DIFFERENT page from the OAuth Client ID page you just saw.

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
   - **Navigation path**: 
     - From the page you're on (OAuth Client ID), look at the **left sidebar**
     - Click **"APIs & Services"** (if not already expanded)
     - Click **"OAuth consent screen"** (this is a separate menu item, NOT under "Credentials")
   - **Direct URL**: `https://console.cloud.google.com/apis/credentials/consent`
2. Select **"External"** (unless you have Google Workspace, then use "Internal")
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: `QWebsiteEmailService`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"** (bottom of the page)
6. **You'll now be on the "Scopes" page** (Step 2 of 4 in the setup):
   - Look for the section titled **"Scopes"** or **"Add or remove scopes"**
   - Click the button **"+ ADD OR REMOVE SCOPES"** (usually a blue button)
   - A popup/modal will appear with a search box
   - In the search box, type: `gmail.send` or `gmail`
   - Find and check the box next to: `https://www.googleapis.com/auth/gmail.send`
   - Click **"Update"** or **"Add to table"** button (at bottom of popup)
   - You should see the scope appear in the scopes table
   - Click **"Save and Continue"** (bottom of the page) to proceed to next step
7. **You'll now be on the "Test users" page** (Step 3 of 4, if in Testing mode):
   - Click **"+ ADD USERS"**
   - Add the Gmail account you want to use for sending emails
   - Click **"Add"**
   - Click **"Save and Continue"** (bottom of the page)
8. **You'll now be on the "Summary" page** (Step 4 of 4):
   - Review all your settings
   - Click **"Back to Dashboard"** to return to the OAuth consent screen dashboard

**Note**: 
- **Testing Mode**: Works immediately, but only for users you add as "Test users". Limited to 100 test users.
- **Production Mode**: Works for all users, but requires verification (can take several days to weeks).

### For Production Environment (Your Case):

Since you're testing with database users (not just test users), you have two options:

#### Option 1: Publish to Production (Recommended for Real Users)

1. After completing all 4 steps above, you'll be back at the OAuth consent screen dashboard
2. Look for a section that shows your app status (usually shows "Testing" with a warning)
3. Click **"PUBLISH APP"** button (usually at the top)
4. You'll see a warning - click **"Confirm"**
5. Your app will be in "In production" status

**Requirements for Production:**
- ✅ App name, support email (already done)
- ✅ Scopes configured (already done)
- ⚠️ Privacy policy URL (required for production)
- ⚠️ Terms of service URL (required for production)
- ⚠️ Google verification (required if using sensitive scopes - can take 1-4 weeks)

**For `gmail.send` scope**: This is considered a "sensitive scope" and will require:
- Privacy policy URL
- Terms of service URL
- Security assessment by Google
- Verification process (1-4 weeks typically)

#### Option 2: Keep in Testing Mode (Faster, but Limited)

If you want to test immediately without waiting for verification:
1. Keep app in "Testing" mode
2. Add ALL your database users as "Test users" in Step 3
3. Each user needs to be added manually (up to 100 users)
4. Users will see "Google hasn't verified this app" warning (but it still works)

**For your case (testing with database users):**
- If you have < 100 users: Add them all as Test users (Option 2)
- If you have > 100 users or want to go live: Use Option 1 and wait for verification

---

## Step 4.5: Publish to Production (If Needed)

**Only do this if you want to use with all database users without adding them as test users.**

1. Go back to **"OAuth consent screen"** dashboard
2. You should see your app status (likely "Testing")
3. Scroll down to find **"Publishing status"** section
4. Click **"PUBLISH APP"** button
5. Read the warning and click **"Confirm"**

**⚠️ Important**: Before publishing, make sure you have:
- Privacy Policy URL (required)
- Terms of Service URL (required)
- Your app will need Google verification (takes 1-4 weeks)

**If you don't have Privacy Policy/Terms yet:**
- You can create simple pages on your website
- Or use a service like https://www.privacypolicygenerator.info/
- Add these URLs in the OAuth consent screen settings

**After Publishing:**
- Status changes to "In production"
- All users can use it (no test user limit)
- But Google verification is still pending
- Users will see "Google hasn't verified this app" warning until verified

---

## Step 5: Get Refresh Token

The refresh token is needed for your application to send emails without user interaction. Here are two methods:

### Method 1: Using OAuth 2.0 Playground (Easier)

**⚠️ Important**: Make sure your OAuth consent screen is either:
- In "Testing" mode with your Gmail account added as a test user, OR
- In "Production" mode (published)

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check **"Use your own OAuth credentials"**
4. Enter your **Client ID** and **Client Secret** from Step 3
5. Click **"Close"**
6. In the left panel, find **"Gmail API v1"**
7. Expand it and check: `https://www.googleapis.com/auth/gmail.send`
8. Click **"Authorize APIs"**
9. **Sign in with the Gmail account you want to use for sending emails**
   - This should be the account you'll use in `GMAIL_API_USER_EMAIL`
   - If in Testing mode: This account MUST be added as a test user in Step 4
   - If in Production mode: Any Gmail account can authorize
10. You may see a warning "Google hasn't verified this app" - click **"Advanced"** → **"Go to [Your App Name] (unsafe)"**
11. Click **"Allow"** to grant permissions
12. Click **"Exchange authorization code for tokens"**
13. You'll see a JSON response with:
    - **Refresh token**: Copy this (looks like: `1//04r09NyyyHbjYCgYIARAAGAQSNwF...`)
      - This is the important one - save it!
    - **Access token**: This expires in 1 hour, so you don't need to save it
    - **refresh_token_expires_in**: Shows 604799 (about 7 days), but refresh tokens typically don't expire unless revoked
14. **Save the Refresh Token securely** - you'll need it for environment variables
    - Example from your response: `1//04r09NyyyHbjYCgYIARAAGAQSNwF-L9IrKNkSCNeuXj9tCGTmo0kDyngGG161lw8EQ-8Gt80S1dB1XPGtRptJZXvkO5hU47A4q-s`
    - Copy the entire refresh_token value (starts with `1//`)

**⚠️ Important Notes:**
- The `refresh_token_expires_in: 604799` shown in the response is a display value
- Refresh tokens typically don't expire unless:
  - You revoke them manually
  - The user changes their password
  - 6 months of inactivity (Google policy)
- Save it in a secure place - you'll use it in Step 6

### Method 2: Using Node.js Script (More Control)

Create a temporary script to get the refresh token:

```javascript
// get-refresh-token.js
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',      // From Step 3
  'YOUR_CLIENT_SECRET',  // From Step 3
  'http://localhost:4000/auth/google/callback' // Your redirect URI
);

const scopes = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent' // Force consent to get refresh token
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh Token:', token.refresh_token);
    console.log('Save this refresh token in your environment variables!');
  });
});
```

Run it:
```bash
node get-refresh-token.js
```

---

## Step 6: Environment Variables

Add these environment variables to your `.env` file and Railway:

```bash
# Gmail API Configuration (OAuth 2.0)
GMAIL_API_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GMAIL_API_CLIENT_SECRET=your_client_secret_here
GMAIL_API_REFRESH_TOKEN=your_refresh_token_here
GMAIL_API_USER_EMAIL=your_email@gmail.com  # The Gmail account to send from
```

### Example (Based on Your Credentials):

```bash
# Gmail API Configuration (OAuth 2.0)
GMAIL_API_CLIENT_ID=43533871116-i7iagtk9laon3gs127cqfvsm6njh9n50.apps.googleusercontent.com
GMAIL_API_CLIENT_SECRET=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
GMAIL_API_REFRESH_TOKEN=1//04r09NyyyHbjYCgYIARAAGAQSNwF-L9IrKNkSCNeuXj9tCGTmo0kDyngGG161lw8EQ-8Gt80S1dB1XPGtRptJZXvkO5hU47A4q-s
GMAIL_API_USER_EMAIL=your_gmail_account@gmail.com  # The email you used to authorize
```

**Important Notes:**
- `GMAIL_API_USER_EMAIL` should be the **same Gmail account** you used to authorize in Step 5 (the one you signed in with in OAuth Playground)
- The refresh token doesn't expire (unless revoked or user changes password)
- Keep these credentials secure and **never commit them to Git**
- Add to Railway environment variables in your project settings

### Where to Add:

1. **Local `.env` file**: Add to `/backend/.env` (make sure it's in `.gitignore`)
2. **Railway**: 
   - Go to your Railway project
   - Click on your backend service
   - Go to "Variables" tab
   - Click "+ New Variable"
   - Add each variable one by one

---

## Step 7: Install Required Packages

You'll need to install the Google APIs client library:

```bash
cd backend
npm install googleapis
```

Or if using yarn:
```bash
yarn add googleapis
```

---

## Step 8: Implementation Notes

### Key Differences from SMTP:

1. **Authentication**: Uses OAuth 2.0 instead of App Password
2. **API Calls**: Uses Gmail API REST endpoints instead of SMTP
3. **Rate Limits**: 
   - Free Gmail: 500 emails/day
   - Google Workspace: 2000 emails/day
   - Per user: 100 emails/second
4. **Quota**: Better tracking and management through API

### Implementation Structure:

The new Gmail API service should:
1. Initialize OAuth2 client with credentials
2. Get access token from refresh token (auto-refresh when expired)
3. Use `gmail.users.messages.send()` to send emails
4. Handle errors and retries appropriately

### Required Scopes:

- `https://www.googleapis.com/auth/gmail.send` - Send emails only (recommended)
- `https://www.googleapis.com/auth/gmail` - Full Gmail access (not recommended for security)

---

## Troubleshooting

### Issue: "Invalid Grant" Error
**Solution**: 
- Refresh token may have been revoked
- Re-generate refresh token using Step 5
- Make sure you selected "offline" access type

### Issue: "Access Denied" Error
**Solution**:
- Check that Gmail API is enabled in Google Cloud Console
- Verify OAuth consent screen is configured
- Ensure test user is added (if in Testing mode)
- Check that the correct scopes are requested

### Issue: "Quota Exceeded" Error
**Solution**:
- You've hit the daily email limit (500 for free Gmail)
- Wait 24 hours or upgrade to Google Workspace
- Implement email queuing/batching

### Issue: "Invalid Client" Error
**Solution**:
- Verify Client ID and Client Secret are correct
- Check that redirect URI matches exactly
- Ensure credentials are for the correct project

### Issue: Refresh Token Not Generated
**Solution**:
- Make sure `access_type: 'offline'` is set
- Use `prompt: 'consent'` to force re-consent
- Delete old authorization and re-authorize

---

## Security Best Practices

1. **Never commit credentials to Git**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Rotate credentials periodically**
   - Regenerate refresh tokens every 90 days
   - Rotate client secrets if compromised

3. **Use least privilege**
   - Only request `gmail.send` scope (not full Gmail access)
   - Use service account if possible (for server-to-server)

4. **Monitor usage**
   - Set up alerts for quota limits
   - Log all email sending attempts
   - Monitor for suspicious activity

5. **Store securely**
   - Use Railway's encrypted environment variables
   - Consider using a secrets manager for production

---

## Next Steps

After completing this setup:

1. ✅ Test sending a single email
2. ✅ Verify emails are delivered
3. ✅ Check spam folder (first few emails might go there)
4. ✅ Monitor quota usage
5. ✅ Implement error handling and retries
6. ✅ Set up email delivery tracking
7. ✅ Configure email templates

---

## Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Node.js Google APIs Client](https://github.com/googleapis/google-api-nodejs-client)
- [Gmail API Quotas](https://developers.google.com/gmail/api/reference/quota)

---

## Support

If you encounter issues:
1. Check Google Cloud Console for error logs
2. Review Gmail API quota dashboard
3. Test with OAuth 2.0 Playground first
4. Check Railway logs for application errors

---

**Last Updated**: January 2026
**Version**: 1.0
