# AestheticRxNetwork - Business Cards

Exclusive, print-ready business cards for **AESTHETICRXNETWORK (PRIVATE LIMITED)**.

## Files
| File | Purpose |
|------|---------|
| `business-card.html` | Two editions, each one card with a front + back (open in a browser) |
| `logo-transparent.svg` | Transparent-background logo used for the card logo + background watermark |
| `logo.png` / `logo.svg` | Original brand mark (near-white background), copied from `branding-assets/` |

## Editions
Each edition is a **single card with two sides** (front + back):
1. **Signature Edition** - navy background with the brand blue/gold gradients.
2. **Black Edition** - pure black background with the **logo rendered in white**.

Both cards list the company leadership:
- **President** - Muhammad Asim Shabbir
- **CEO** - Muhammad Qasim Shabbir

## What's on the card
- **Front:** logo + wordmark, tagline *Connected Aesthetic Care*, both leaders (name + title), and a **Doctor Sign-up ID**.
- **Back:** logo, wordmark, tagline, contact details, registered address, and entity name.

Contact printed on every card:
- Email: `aestheticrxnetwork@gmail.com`
- Phone: `+92 322 5690149`
- Website: `aestheticrxnetwork.vercel.app`
- Address: Plot No. GP-1, ES4, Machi Para, Upper Gizri, Saddar Town, Karachi South, Sindh, Pakistan

## Doctor Sign-up ID (change per card)
Each card carries a **Doctor Sign-up ID** that a doctor enters when registering, so the sign-up can be
attributed to the card. Placeholder in the file: `ARX-0001`. Edit the value inside the
`<span class="code">...</span>` (look for the `CHANGE THIS CODE PER CARD` comment) before printing each card.

## How to print / export to PDF
1. Open `business-card.html` in Chrome or Edge.
2. Print (`Ctrl/Cmd + P`).
3. Enable **Background graphics** so the dark background and accents render.
4. Choose **Save as PDF**, or print at **100% scale** on card stock.

Card size is the standard **85 x 55 mm**. For a print shop, ask for a **3 mm bleed** at 300+ DPI.

## Notes
- Both editions use `logo-transparent.svg` (the original logo with its opaque near-white background removed)
  for the on-card logo and the faint background **watermark** (logo silhouette + wordmark). This is why the
  Black Edition shows the real logo instead of a white box.
- The watermark is intentionally faint; adjust `.wm-logo { opacity }` in `business-card.html` to taste.
