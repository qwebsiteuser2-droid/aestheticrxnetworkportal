# AestheticRxNetwork - Branding Assets

This folder contains the official branding assets for **AestheticRxNetwork** (registered entity: **AESTHETICRXNETWORK (PRIVATE LIMITED)**).

## Logo Files

| File | Dimensions | Purpose |
|------|------------|---------|
| `logo.svg` | 1024x1024 | Vector source file (scalable) |
| `logo.png` | 1024x1024 | High-resolution PNG |
| `favicon.ico` | 32x32 | Browser tab icon |
| `apple-touch-icon.png` | 180x180 | iOS home screen icon |
| `icon-192.png` | 192x192 | Android/PWA icon |
| `icon-512.png` | 512x512 | High-res PWA icon |

## Logo Description

The AestheticRxNetwork logo features:
- **Dual intertwined profiles** representing connection and partnership
- **Striking blue gradient** (`#00C2FF` → `#1E66FF` → `#0837D7`)
- **Rich gold gradient** (`#FFE38A` → `#F5C24C` → `#C98513`)
- **Clean merged edges** for a professional aesthetic look

## Wordmark (Web UI)

The site uses `frontend/src/components/BrandTitle.tsx`, aligned with the `nameGrad` gradient in `logo.svg`:

| Segment | Color | Hex / style |
|---------|--------|----------------|
| **Aesthetic** | Primary blue | `#1E6BFF` |
| **R** | Primary blue | `#1E6BFF` |
| **X** | Light blue (logo mid-tone) | `#35B7D6` |
| **Ne** | Blue + gold blend | CSS gradient: blue → teal → gold |
| **twork** | Gold | `#D59225` |

Displayed as: **AestheticRxNetwork** (stylized wordmark; the visible letters keep the R/X color treatment).

### Marketing tagline (header & footer)

**Professional B2B platform for clinics. Connect, order, research, and grow together.**

Rendered in bold under the wordmark on large screens (`showTagline` on `BrandTitle`).

### SVG subtitle (logo file only)

**CONNECTED AESTHETIC CARE** — appears below the mark in `logo.svg`, not in the web header.

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#1E6BFF` | Wordmark, accents, theme |
| Light Blue / Teal | `#35B7D6` | **X** in wordmark |
| Dark Blue | `#0837D7` | Deep accents, buttons |
| Gold | `#F5C24C` | Secondary accent |
| Dark Gold | `#D59225` | **twork**, gradient end |

Shared constants: `frontend/src/lib/brandColors.ts`

## Usage in Website

The logo is deployed to:
- `frontend/public/logo.png` - Main logo
- `frontend/public/logo.svg` - Vector logo
- `frontend/public/favicon.ico` - Tab icon
- `frontend/public/apple-touch-icon.png` - iOS icon
- `frontend/public/icon-*.png` - PWA icons
- `frontend/public/assets/branding/` - All variants

Components:
- `BrandTitle` — wordmark + optional tagline
- `PublicOrderCatalog` — homepage product grid
- `ProductDetailsModal` — product gallery, reviews, cart actions

Backend:
- `backend/assets/invoice/logo.png` — copied from `frontend/public/logo.png` for **Invoices.pdf** challans

## Last Updated

June 1, 2026 (v3.5.6 — challan PDF + invoice email branding)
