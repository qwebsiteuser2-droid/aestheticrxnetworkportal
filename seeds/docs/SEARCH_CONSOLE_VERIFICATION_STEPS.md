# Where to get the Google Search Console `content` value

You need this value for the Vercel environment variable:

`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

---

## Important: use the same domain as OAuth

Your Search Console link uses:

`https://aestheticrxnetwork.vercel.app`

Your live app for OAuth is usually:

`https://aestheticrxnetworkportal.vercel.app`

**These are different hostnames.** Google only verifies the exact URL you add.

Pick **one** production URL and use it everywhere:

- OAuth consent screen (homepage + privacy URLs)
- Search Console property
- `NEXT_PUBLIC_SITE_URL` on Vercel

If OAuth uses `aestheticrxnetworkportal.vercel.app`, add **that** property in Search Console (not only `aestheticrxnetwork.vercel.app`).

---

## Step-by-step (HTML tag method)

1. Open [Google Search Console](https://search.google.com/search-console).
2. Top-left property dropdown → **+ Add property**.
3. Choose **URL prefix** (not “Domain”).
4. Enter your exact site, e.g.  
   `https://aestheticrxnetworkportal.vercel.app`  
   → **Continue**.
5. On **Verify ownership**, find the card **“HTML tag”**.
6. Click **HTML tag** to expand it. Google shows something like:

   ```html
   <meta name="google-site-verification" content="AbCdEf1234567890_XyZ" />
   ```

7. **Copy only the string inside `content="..."`** — that is your token.  
   Example: `AbCdEf1234567890_XyZ`  
   Do **not** copy the whole `<meta>` tag.

8. In [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**:
   - **Name:** `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   - **Value:** paste the token from step 7
   - **Environment:** Production (and Preview if you want)
9. **Deployments** → ⋮ on latest → **Redeploy** (must redeploy or the meta tag is not on the live site).
10. Back in Search Console → **Verify**.

If verification fails, open your homepage in the browser → **View page source** → search for `google-site-verification`. You should see:

```html
<meta name="google-site-verification" content="YOUR_TOKEN_HERE" />
```

---

## You do NOT get the token from the resource_id URL

A link like:

`https://search.google.com/search-console?resource_id=https://aestheticrxnetwork.vercel.app/`

only opens the **dashboard** for that property. The token appears only when you **add** a property or open **Settings → Ownership verification** for that property and choose the **HTML tag** method.

---

## After verification

In [Google Cloud Console](https://console.cloud.google.com) → **OAuth consent screen** → ensure:

| Field | Example |
|-------|---------|
| Homepage | `https://aestheticrxnetworkportal.vercel.app` |
| Privacy policy | `https://aestheticrxnetworkportal.vercel.app/privacy` |

Authorized domains should include the hostname (e.g. `aestheticrxnetworkportal.vercel.app`).
