# PayFast Setup Guide

**BioAestheticAx Network B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |

---

## Overview

PayFast is integrated for online payment processing. You need to configure your own PayFast credentials for production use.

---

## Required PayFast Credentials

You need **3 credentials** from PayFast:

1. **`PAYFAST_MERCHANT_ID`** - Your PayFast merchant ID
2. **`PAYFAST_MERCHANT_KEY`** - Your PayFast merchant key
3. **`PAYFAST_PASSPHRASE`** - Your PayFast passphrase (set in PayFast dashboard)

---

## Step 1: Get PayFast Account Credentials

### Option A: Use Existing PayFast Account

If you already have a PayFast account:

1. **Log in to PayFast Dashboard:**
   - Go to: https://www.payfast.co.za/
   - Click **"Log In"** (top right)
   - Enter your credentials

2. **Get Your Credentials:**
   - Go to **"Settings"** → **"Integration"** or **"API Credentials"**
   - Find:
     - **Merchant ID** (usually a number like `10042666`)
     - **Merchant Key** (usually a string like `aacjyg5h02c4s`)
     - **Passphrase** (you set this yourself in PayFast settings)

3. **Set Passphrase (if not set):**
   - Go to **"Settings"** → **"Integration"** → **"Passphrase"**
   - Create a secure passphrase (recommended: 16+ characters)
   - **Save it** - you'll need it for Railway

### Option B: Create New PayFast Account

If you don't have a PayFast account:

1. **Sign Up:**
   - Go to: https://www.payfast.co.za/
   - Click **"Sign Up"** or **"Register"**
   - Fill in your business details
   - Complete verification process

2. **Get Credentials:**
   - After account approval, go to **"Settings"** → **"Integration"**
   - Copy your **Merchant ID** and **Merchant Key**
   - Set a **Passphrase** (create a secure one)

3. **Test vs Live:**
   - **Sandbox/Test Mode**: Use `sandbox.payfast.co.za` (for testing)
   - **Live Mode**: Use `www.payfast.co.za` (for real payments)
   - Your code automatically switches based on `NODE_ENV`

---

## Step 2: Add Credentials to Railway

1. **Go to Railway:**
   - Railway Dashboard → Your Backend Service → **Variables** tab

2. **Add PayFast Variables:**

   **Variable 1:**
   - **Key:** `PAYFAST_MERCHANT_ID`
   - **Value:** Your PayFast Merchant ID (e.g., `10042666`)
   - Click **"Add"**

   **Variable 2:**
   - **Key:** `PAYFAST_MERCHANT_KEY`
   - **Value:** Your PayFast Merchant Key (e.g., `aacjyg5h02c4s`)
   - Click **"Add"**

   **Variable 3:**
   - **Key:** `PAYFAST_PASSPHRASE`
   - **Value:** Your PayFast Passphrase (the one you set in PayFast dashboard)
   - Click **"Add"**

3. **Railway Auto-Redeploys:**
   - Railway will automatically redeploy when you add variables
   - Check Deploy Logs to verify

---

## Verification

After adding credentials, check Railway Deploy Logs:

**You should see:**
```
🔧 PayFast Service Initialized:
   Merchant ID: ***configured***
   Merchant Key: ***masked***
   Passphrase: ***masked***
   Sandbox Mode: true  (or false if NODE_ENV=production)
```

**If you see:**
```
   Merchant ID: NOT SET
   Merchant Key: NOT SET
```
→ Credentials are not set correctly. Check variable names and values.

---

## Sandbox vs Live Mode

### How It Works:

The code automatically switches between sandbox and live:

```typescript
this.isSandbox = process.env.NODE_ENV !== 'production';
```

- **If `NODE_ENV=production`** → Uses **LIVE** PayFast (`www.payfast.co.za`)
- **If `NODE_ENV != production`** → Uses **SANDBOX** PayFast (`sandbox.payfast.co.za`)

### For Production:

1. **Set `NODE_ENV=production`** in Railway
2. **Use your LIVE PayFast credentials** (not test credentials)
3. System will automatically use live PayFast URL

### For Testing:

1. **Set `NODE_ENV=development`** (or don't set it)
2. **Use test/sandbox credentials**
3. System will automatically use sandbox PayFast URL

---

## Security Notes

1. **Never commit PayFast credentials** to Git
2. **Use different credentials** for test vs production
3. **Keep passphrase secure** - it's used for signature generation
4. **Railway masks sensitive variables** automatically

---

## Example Configuration

### Railway Variables (Production):

```bash
# PayFast Credentials
PAYFAST_MERCHANT_ID=10042666
PAYFAST_MERCHANT_KEY=aacjyg5h02c4s
PAYFAST_PASSPHRASE=your_secure_passphrase_here

# Server Configuration
NODE_ENV=production  # This makes PayFast use LIVE mode
```

### Railway Variables (Testing):

```bash
# PayFast Credentials (Test/Sandbox)
PAYFAST_MERCHANT_ID=10042666
PAYFAST_MERCHANT_KEY=aacjyg5h02c4s
PAYFAST_PASSPHRASE=your_test_passphrase_here

# Server Configuration
NODE_ENV=development  # This makes PayFast use SANDBOX mode
```

---

## Important Notes

### Environment Variables Required:

For the application to process payments, you must configure:
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`

Without these, payment processing will not work correctly.

### Passphrase:

- **Must match** the passphrase set in your PayFast dashboard
- Used for **signature generation** (security)
- If passphrase doesn't match, payments will fail signature verification

### Testing:

1. **Test with sandbox first** (`NODE_ENV != production`)
2. **Verify payments work** in test mode
3. **Switch to production** (`NODE_ENV=production`) only after testing
4. **Use live credentials** for production

---

## Troubleshooting

### "Merchant ID: NOT SET"
- Check variable name: `PAYFAST_MERCHANT_ID` (exact spelling)
- Check value is not empty
- Redeploy after adding

### "Signature verification failed"
- Check `PAYFAST_PASSPHRASE` matches PayFast dashboard
- Verify all 3 credentials are correct
- Check PayFast dashboard for correct passphrase

### "Payment not processing"
- Verify `NODE_ENV` is set correctly
- Check if using sandbox vs live mode
- Verify PayFast account is active
- Check PayFast dashboard for account status

---

## PayFast Resources

- **PayFast Dashboard:** https://www.payfast.co.za/
- **PayFast Documentation:** https://developers.payfast.co.za/
- **PayFast Support:** https://www.payfast.co.za/support/

---

## Quick Checklist

- [ ] Have PayFast account (or created one)
- [ ] Got Merchant ID from PayFast dashboard
- [ ] Got Merchant Key from PayFast dashboard
- [ ] Set Passphrase in PayFast dashboard
- [ ] Added `PAYFAST_MERCHANT_ID` to Railway
- [ ] Added `PAYFAST_MERCHANT_KEY` to Railway
- [ ] Added `PAYFAST_PASSPHRASE` to Railway
- [ ] Set `NODE_ENV=production` for live mode (or leave unset for sandbox)
- [ ] Verified in Deploy Logs that credentials are loaded
- [ ] Tested payment flow

---

## Next Steps

1. **Get your PayFast credentials** from PayFast dashboard
2. **Add them to Railway** as environment variables
3. **Set `NODE_ENV=production`** if using live mode
4. **Test payment flow** to verify everything works
5. **Monitor PayFast dashboard** for payment notifications

---

**Document Version**: 3.1.0  
**Last Updated**: January 22, 2026

