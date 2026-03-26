# Setting Up Custom Domain Email (noreply@aestheticrx.com)

## 🎯 Goal

Change from Gmail address (`asadkhanbloch4949@gmail.com`) to custom domain email (`noreply@aestheticrx.com`) to improve deliverability and reduce spam.

## 📋 Prerequisites

1. **You need a domain** (e.g., `aestheticrx.com`)
2. **Domain must be accessible** for DNS record changes
3. **SendGrid account** (already have)

## 🔧 Step-by-Step Setup

### Step 1: Verify Single Sender in SendGrid

1. Go to [SendGrid Dashboard](https://app.sendgrid.com)
2. Navigate to **Settings → Sender Authentication**
3. Click **"Verify a Single Sender"**
4. Fill out the form:
   - **From Name:** AestheticRxNetwork (or your business name)
   - **From Email:** `noreply@aestheticrx.com` ⚠️ **Important: Use your domain**
   - **Reply To:** `noreply@aestheticrx.com` (or `support@aestheticrx.com`)
   - **Address:** Your physical business address (required)
   - **City, State, Zip, Country:** Your location
5. Click **"Create"**
6. **Check your email** - SendGrid will send a verification email
7. **Click the verification link** in that email
8. Wait for verification (usually instant)

### Step 2: Set Up Email for Your Domain

You have two options:

#### Option A: Use Email Forwarding (Easiest)

1. Set up email forwarding in your domain registrar
2. Forward `noreply@aestheticrx.com` to your Gmail (`asadkhanbloch4949@gmail.com`)
3. This allows you to receive verification emails

#### Option B: Use Email Service (Recommended)

1. Set up email hosting for your domain:
   - **Google Workspace** (paid, professional)
   - **Zoho Mail** (free tier available)
   - **ProtonMail** (privacy-focused)
   - **Your domain registrar's email** (often included)
2. Create the email address `noreply@aestheticrx.com`
3. Use it to receive SendGrid verification email

### Step 3: Update Environment Variables

#### In Railway:

Add/Update these environment variables:

```bash
SENDGRID_FROM_EMAIL=noreply@aestheticrx.com
MAIN_ADMIN_EMAIL=asadkhanbloch4949@gmail.com  # Keep for admin notifications
```

#### In Local .env file:

```bash
SENDGRID_FROM_EMAIL=noreply@aestheticrx.com
MAIN_ADMIN_EMAIL=asadkhanbloch4949@gmail.com
```

### Step 4: Update Code (Already Done!)

The code already supports this! It uses this priority:
1. `SENDGRID_FROM_EMAIL` (set this to `noreply@aestheticrx.com`)
2. `MAIN_ADMIN_EMAIL` (fallback)
3. `GMAIL_USER` (fallback)

### Step 5: Test

```bash
cd backend
npx ts-node src/scripts/test-sendgrid-standalone.ts YOUR_API_KEY noreply@aestheticrx.com recipient@gmail.com
```

## 🎯 Better Option: Domain Authentication (For Production)

Instead of Single Sender, you can authenticate your entire domain:

### Benefits:
- ✅ **Much better deliverability** (less spam)
- ✅ **Can send from any email@aestheticrx.com**
- ✅ **Professional appearance**
- ✅ **Better sender reputation**

### Setup:

1. Go to SendGrid → Settings → Sender Authentication
2. Click **"Authenticate Your Domain"**
3. Enter your domain: `aestheticrx.com`
4. Choose your DNS provider
5. SendGrid will give you DNS records to add:
   - **CNAME records** for domain authentication
   - **SPF record** (if needed)
   - **DKIM records**
6. Add these DNS records in your domain registrar
7. Wait 24-48 hours for DNS propagation
8. Verify in SendGrid dashboard

### After Domain Authentication:

You can send from:
- `noreply@aestheticrx.com`
- `hello@aestheticrx.com`
- `support@aestheticrx.com`
- Any email@aestheticrx.com

## 📝 Current Code Configuration

The code in `gmailService.ts` already supports custom sender:

```typescript
// Priority order:
const fromEmail = options?.fromEmail 
  || process.env.SENDGRID_FROM_EMAIL  // ← Set this to noreply@aestheticrx.com
  || process.env.MAIN_ADMIN_EMAIL 
  || process.env.GMAIL_USER 
  || 'noreply@aestheticrx.com';
```

## ✅ Quick Setup Summary

1. **Verify `noreply@aestheticrx.com`** in SendGrid (Single Sender)
2. **Set `SENDGRID_FROM_EMAIL=noreply@aestheticrx.com`** in Railway
3. **Test** with the test script
4. **Check inbox** (should have better deliverability)

## 🚀 For Even Better Results

After Single Sender works, consider:
1. **Domain Authentication** (authenticate entire domain)
2. **SPF/DKIM records** (improve email authentication)
3. **Warm up sender** (start with small volumes)

## 📧 Testing Commands

```bash
# Test with custom domain email
npm run test:sendgrid:standalone
# (Set SENDGRID_FROM_EMAIL=noreply@aestheticrx.com in .env first)

# Or directly:
npx ts-node src/scripts/test-sendgrid-standalone.ts YOUR_API_KEY noreply@aestheticrx.com recipient@gmail.com
```

## 🎉 Expected Results

After switching to `noreply@aestheticrx.com`:
- ✅ Better deliverability (less spam)
- ✅ More professional appearance
- ✅ Better sender reputation over time
- ✅ Can use domain authentication later

---

**Note:** Make sure you can receive emails at `noreply@aestheticrx.com` (or set up forwarding) to verify the sender in SendGrid.
