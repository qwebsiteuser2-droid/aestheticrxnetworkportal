# AestheticRxNetwork - Business Cards

Exclusive, print-ready business cards for **AESTHETICRXNETWORK (PRIVATE LIMITED)**.

## Files
| File | Purpose |
|------|---------|
| `business-card.html` | Two editions, each one card with a front + back (open in a browser) |
| `signature-front.png` / `signature-back.png` | High-res Signature edition exports (~600 DPI) |
| `black-front.png` / `black-back.png` | High-res Black edition exports (~600 DPI) |
| `signup-ids-created.txt` / `.json` | Bulk Doctor Sign-up IDs for print runs (not on the master card art) |
| `logo-transparent.svg` | Transparent-background logo used for the card logo + background watermark |
| `logo.png` / `logo.svg` | Original brand mark (near-white background), copied from `branding-assets/` |
| `export-card-images.mjs` | Regenerates the four PNGs from the HTML |

## Editions
Each edition is a **single card with two sides** (front + back):
1. **Signature Edition** - navy background with the brand blue/gold gradients.
2. **Black Edition** - pure black background with the brand logo on dark.

## What's on the card
- **Front:** logo + wordmark, tagline *Connected Aesthetic Care*, email, phone, website, registered address, and entity name.
- **Back:** logo, wordmark, tagline, President and CEO, empty **Doctor Sign-up ID** in the bottom-left corner.

Contact printed on every card:
- Email: `aestheticrxnetwork@gmail.com`
- Phone: `+92 322 5690149`
- Website: `https://aestheticrxnetwork.com/`
- Address: Plot No. GP-1, ES4, Machi Para, Upper Gizri, Saddar Town, Karachi South, Sindh, Pakistan

## Doctor Sign-up IDs
The back shows an empty **Doctor Sign-up ID** slot (bottom-left). At print time, fill each card with a 5-digit ID from `signup-ids-created.txt` (printers may also supply their own IDs).

## How to print / export to PDF
1. Open `business-card.html` in Chrome or Edge.
2. Print (`Ctrl/Cmd + P`).
3. Enable **Background graphics** so the dark background and accents render.
4. Choose **Save as PDF**, or print at **100% scale** on card stock.

Card size is the standard **85 x 55 mm**. For a print shop, ask for a **3 mm bleed** at 300+ DPI.

## Regenerate PNGs
```bash
node export-card-images.mjs
```

## Notes
- Both editions use `logo-transparent.svg` for the on-card logo and the faint background watermark.
- The watermark is intentionally faint; adjust `.wm-logo { opacity }` in `business-card.html` to taste.
