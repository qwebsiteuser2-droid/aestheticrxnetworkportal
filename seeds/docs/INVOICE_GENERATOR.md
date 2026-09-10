# Invoice Generator (integrated)

The standalone `AestheticRxNetworkInvoiceGenerationPortal` app is merged into the main portal.

## Admin UI

- **Path:** `/admin/invoices`
- **Dashboard:** Admin → **Invoice Generator**

Features:

- Manual invoices (clinic, doctor, line items, footer)
- Live preview
- Download PDF preview
- Save to database
- Save & email via Gmail API
- Generate from order ID (UUID from Order Management)
- Recent invoices list (download / resend)

## Automatic email on order

When a customer completes a **Cash on Delivery** order (not PayFast pending), the backend:

1. Creates an invoice per order (`Rx#` numbering from DB counter, starting at 2001)
2. Sends **one order confirmation email** to the doctor (not a second invoice-only email) with a single **`Invoices.pdf`** attachment:
   - One cart / batch checkout → **one combined challan** listing all line items
   - Matches the Rx challan layout (logo, brand colors, 28-row table grid)

Triggered on single COD checkout (no `skip_notification`) and after **batch checkout** (`POST /orders/batch-notify`).

PayFast orders: invoice / customer email is not sent until payment is confirmed (same as admin alerts).

## API (admin, authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/invoices` | List recent |
| GET | `/api/admin/invoices/next-number` | Next `Rx#` |
| POST | `/api/admin/invoices` | Create manual |
| POST | `/api/admin/invoices/preview` | PDF preview (body) |
| POST | `/api/admin/invoices/from-order/:orderId` | From order |
| GET | `/api/admin/invoices/:id/pdf` | Download PDF |
| POST | `/api/admin/invoices/:id/send-email` | Resend email |

## Database

Migration: `1700000000030-AddInvoices.ts`

- `invoices` — stored line items and metadata
- `invoice_counter` — next Rx number

## Deploy

1. Run migrations on Railway
2. Redeploy backend + frontend
3. Ensure Gmail API (`GMAIL_API_*`) is configured

Optional env: `INVOICE_BRAND_EMAIL` (defaults to Gmail sender email)

## Assets

Logo for PDFs: `backend/assets/invoice/logo.png` (from main app branding)
