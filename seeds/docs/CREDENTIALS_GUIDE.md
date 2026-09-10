# Credentials Guide

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.4.0 |
| **Last Updated** | January 31, 2026 |

---

## Quick Reference

| Credential | Required | Where to Get |
|------------|----------|--------------|
| Google Maps API Key | ✅ Yes | Google Cloud Console |
| Google OAuth Client ID | ✅ Yes | Google Cloud Console |
| Gmail API Credentials | ✅ Yes | Google Cloud Console |
| PayFast Credentials | ✅ Yes | PayFast Dashboard |
| JWT Secrets | ✅ Yes | Generate locally |
| Database URL | ✅ Yes | Railway Dashboard |
| SendGrid API Key | Optional | SendGrid Dashboard |
| Hugging Face Token | Optional | Hugging Face Settings |

---

## 1. Google Maps API Key

**Purpose:** Location services, maps display, address autocomplete

### Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Maps JavaScript API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the API key
6. Restrict key (recommended):
   - HTTP referrers: `https://your-domain.com/*`
   - API restriction: Maps JavaScript API only

### Environment Variable

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your_key
```

### Notes

- Requires billing account (free $200 credit/month)
- Restrict key for production security

---

## 2. Google OAuth Client (Sign-In with Google)

**Purpose:** Allow users to sign in with their Google account

### Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Configure:
   - **Name**: "AestheticRxNetwork OAuth"
   - **Authorized JavaScript origins**:
     - `https://aestheticrxnetwork.vercel.app`
     - `https://your-domain.vercel.app` (your Vercel domain)
     - `http://localhost:3000` (for development)
   - **Authorized redirect URIs**:
     - `https://aestheticrxnetwork.vercel.app`
     - `https://your-domain.vercel.app`
     - `http://localhost:3000`
7. Click **Create**
8. Copy the **Client ID**

### Environment Variable

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### Notes

- Add all your Vercel domains to Authorized JavaScript origins
- Update when deploying to new domains
- Error 400 `origin_mismatch` means your domain isn't in the allowed list

---

## 3. Gmail API Credentials

**Purpose:** Email notifications via Gmail API (recommended over SMTP)

### Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Gmail API** for your project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Download the JSON credentials file
7. Run the authorization flow to get refresh token

### Environment Variables

```env
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_USER=your_email@gmail.com
```

### Getting Refresh Token

1. Go to [OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click gear icon → Check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. Select **Gmail API v1** → `https://mail.google.com/`
5. Click **Authorize APIs** and sign in
6. Click **Exchange authorization code for tokens**
7. Copy the **Refresh Token**

### Notes

- Gmail API is more reliable than SMTP
- Handles higher email volumes
- Required for production deployments
- Refresh tokens don't expire unless revoked

---

## 4. Gmail App Password (Legacy/Fallback)

**Purpose:** Email notifications via Gmail SMTP (fallback option)

### Steps

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to **App Passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter name: "AestheticRxNetwork Backend"
6. Click **Generate**
7. Copy the 16-character password

### Environment Variables

```env
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### Notes

- Different from your regular Gmail password
- Revoke and regenerate if compromised
- Works only with 2FA enabled
- Consider using Gmail API instead for better reliability

---

## 5. PayFast Credentials

**Purpose:** Online payment processing

### Steps

1. Create account at [PayFast](https://www.payfast.co.za/)
2. Complete merchant registration
3. Go to **My Account** → **Integration**
4. Copy **Merchant ID** and **Merchant Key**
5. Go to **Settings** → **Security**
6. Set and copy **Passphrase**

### Environment Variables

```env
# Production
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase

# Sandbox (Testing)
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_sandbox_passphrase
```

### Notes

- Use sandbox for testing: `https://sandbox.payfast.co.za/`
- App uses sandbox when `NODE_ENV != production`
- Transaction fees: ~2.9% + R2.00

---

## 6. JWT Secrets

**Purpose:** Token-based authentication

### Generate Secrets

```bash
# Generate both secrets (run twice, use different values)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Variables

```env
JWT_SECRET=your_64_character_hex_string
JWT_REFRESH_SECRET=another_64_character_hex_string
```

### Token Expiry (Defaults)

| Token | Default | Configurable Via |
|-------|---------|------------------|
| Access Token | 1 hour | `JWT_EXPIRES_IN` |
| Refresh Token | 7 days | `JWT_REFRESH_EXPIRES_IN` |

### Notes

- Use different secrets for each environment
- Rotate every 90 days for security
- Never commit to version control

---

## 7. Database URL

**Purpose:** PostgreSQL database connection

### Railway

1. Create PostgreSQL service in Railway
2. Go to **Connect** tab
3. Copy **Connection String**

### Format

```env
DATABASE_URL=postgres://user:password@host:5432/database?sslmode=require
```

### Local Development

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/aestheticrx1
```

---

## 8. SendGrid API Key (Optional)

**Purpose:** Alternative email service to Gmail

### Steps

1. Create account at [SendGrid](https://sendgrid.com/)
2. Verify sender email or domain
3. Go to **Settings** → **API Keys**
4. Create API key with **Mail Send** permission
5. Copy immediately (shown only once)

### Environment Variables

```env
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM_EMAIL=verified@domain.com
```

### Notes

- Free tier: 100 emails/day
- Must verify sender before sending

---

## 9. Hugging Face Token (Optional)

**Purpose:** AI-powered research assistance

### Steps

1. Create account at [Hugging Face](https://huggingface.co/)
2. Go to **Settings** → **Access Tokens**
3. Create new token with **Read** permission
4. Copy token (format: `hf_xxxxx`)

### Environment Variable

```env
HF_TOKEN=hf_your_token_here
```

### Notes

- Tokens managed via admin panel preferred
- Environment variable used as fallback
- Free tier available

---

## 10. Google Drive Service Account (Optional)

**Purpose:** Google Drive integration for exports

### Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Drive API**
3. Create **Service Account**
4. Create **JSON Key** for service account
5. Download JSON file

### Environment Variables

```env
GOOGLE_PRIVATE_KEY_ID=your_key_id
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_CLIENT_ID=your_client_id
```

### Alternative

Place `service-account.json` file in `/backend` directory.

---

## Security Best Practices

### Do

- ✅ Use different credentials per environment
- ✅ Store in environment variables, not code
- ✅ Rotate secrets every 90 days
- ✅ Use secrets management in production
- ✅ Restrict API keys to specific domains

### Don't

- ❌ Commit `.env` files to git
- ❌ Share credentials in chat/email
- ❌ Use production credentials in development
- ❌ Log sensitive values

---

## Checklist

### Required

- [ ] Google Maps API Key
- [ ] Google OAuth Client ID (for Sign-In with Google)
- [ ] Gmail API Credentials (Client ID, Secret, Refresh Token)
- [ ] PayFast Merchant ID
- [ ] PayFast Merchant Key
- [ ] PayFast Passphrase
- [ ] JWT Secret
- [ ] JWT Refresh Secret
- [ ] Database URL

### Optional

- [ ] Gmail App Password (fallback for SMTP)
- [ ] SendGrid API Key
- [ ] Hugging Face Token
- [ ] Google Drive Service Account

---

**Document Version**: 3.4.0  
**Last Updated**: January 31, 2026
