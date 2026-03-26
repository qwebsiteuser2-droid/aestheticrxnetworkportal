# SendGrid: Using One API Key with Multiple Sender Addresses

## ✅ Yes, It's Possible!

You can use **one SendGrid API key** but send emails from **different email addresses**.

## 🔒 Requirements

The email address you send FROM must be **verified** in SendGrid:

### Option 1: Single Sender Verification (Easiest)
1. Go to SendGrid Dashboard → **Settings → Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Enter the email address you want to send from
4. Check your email and click verification link
5. ✅ You can now send from that email using your API key

### Option 2: Domain Authentication (Best for Multiple Addresses)
1. Go to SendGrid Dashboard → **Settings → Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Add DNS records (SPF, DKIM) to your domain
4. ✅ You can now send from **ANY email@yourdomain.com** using your API key

## 📝 How to Use in Code

### Method 1: Set Default in Environment Variable
```bash
SENDGRID_FROM_EMAIL=your-verified-email@yourdomain.com
```

### Method 2: Override Per Email (Advanced)
You can pass a custom `fromEmail` in the options:
```typescript
await gmailService.sendEmail(
  'recipient@example.com',
  'Subject',
  '<html>Content</html>',
  {
    fromEmail: 'custom@yourdomain.com' // Must be verified in SendGrid
  }
);
```

## ⚠️ Important Restrictions

1. **Cannot send from unverified addresses** - SendGrid will reject them
2. **Cannot send from Gmail/Yahoo addresses** - They have strict DMARC policies
3. **Domain must be authenticated** - If sending from `@yourdomain.com`, the domain must be verified

## 🎯 Best Practice

1. **Authenticate your domain** (Option 2 above)
2. Then you can send from:
   - `noreply@yourdomain.com`
   - `support@yourdomain.com`
   - `orders@yourdomain.com`
   - `admin@yourdomain.com`
   - Any email under your domain!

## 📚 Example Setup

```bash
# Railway Environment Variables
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # Default sender

# After domain authentication, you can use:
# - support@yourdomain.com
# - orders@yourdomain.com
# - admin@yourdomain.com
# All using the same API key!
```

## ✅ Current Code Support

The code already supports this! Just:
1. Verify your sender email(s) in SendGrid
2. Set `SENDGRID_FROM_EMAIL` to your verified email
3. Or authenticate your domain to use any email@yourdomain.com

---

**Last Updated:** January 15, 2026
