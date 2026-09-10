# Email & WhatsApp Setup Guide

## 🚨 **Why Notifications Aren't Working**

The rejection system is working perfectly, but the email and WhatsApp notifications aren't being sent because the services need real API credentials.

## 📧 **Email Setup (SendGrid)**

### Step 1: Create SendGrid Account
1. Go to [SendGrid.com](https://sendgrid.com)
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### Step 2: Get API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Choose "Restricted Access"
4. Give it "Mail Send" permissions
5. Copy the API key

### Step 3: Configure Environment
Create a `.env` file in your project root with:

```bash
# Email Configuration
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=your-verified-email@yourdomain.com
```

## 📱 **WhatsApp Setup (Twilio)**

### Step 1: Create Twilio Account
1. Go to [Twilio.com](https://twilio.com)
2. Sign up for a free account
3. Verify your phone number

### Step 2: Get WhatsApp Sandbox
1. Go to Console → Develop → Messaging → Try it out → Send a WhatsApp message
2. Follow the sandbox setup instructions
3. Note your sandbox number (usually +1 415 523 8886)

### Step 3: Get Credentials
1. Go to Console Dashboard
2. Copy your Account SID and Auth Token

### Step 4: Configure Environment
Add to your `.env` file:

```bash
# WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
WHATSAPP_PHONE_NUMBER=+14155238886
```

## 🔧 **Quick Setup Commands**

1. **Create .env file:**
```bash
cp env.example .env
```

2. **Edit .env file with your credentials:**
```bash
nano .env
```

3. **Restart services:**
```bash
docker compose restart backend
```

## 🧪 **Test the Setup**

1. **Test Email:**
```bash
# Check if SendGrid is configured
docker compose logs backend | grep "SendGrid"
```

2. **Test WhatsApp:**
```bash
# Check if Twilio is configured
docker compose logs backend | grep "WhatsApp"
```

3. **Test Rejection:**
- Go to admin panel
- Reject a user
- Check your email and WhatsApp

## 🆓 **Free Tier Limits**

- **SendGrid:** 100 emails/day free
- **Twilio WhatsApp:** Sandbox mode (limited to verified numbers)

## 🚀 **Production Setup**

For production, you'll need:
1. **SendGrid:** Paid plan for higher limits
2. **Twilio:** WhatsApp Business API approval
3. **Domain verification** for SendGrid
4. **Phone number verification** for Twilio

## 📞 **Alternative: Use Your Own SMTP**

If you prefer to use your own email server, you can modify the email service to use SMTP instead of SendGrid.

---

**Once you set up the credentials, the rejection emails and WhatsApp messages will be sent automatically!** 🎉
