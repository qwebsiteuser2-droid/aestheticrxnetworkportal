# API Documentation

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.4.0 |
| **Last Updated** | January 31, 2026 |
| **Base URL (Development)** | `http://localhost:4000/api` |
| **Base URL (Production)** | `https://aestheticrxnetworkdepolying-production.up.railway.app/api` |

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Endpoints](#core-endpoints)
   - [Auth](#auth)
   - [Products](#products)
   - [Orders](#orders)
   - [Research Papers](#research-papers)
3. [User Features](#user-features)
   - [Leaderboard](#leaderboard)
   - [Teams](#teams)
   - [Badges](#badges)
   - [Certificates](#certificates)
   - [User Stats](#user-stats)
4. [Payments](#payments)
5. [Advertisements](#advertisements)
6. [Communication](#communication)
   - [Messages](#messages)
   - [Award Messages](#award-messages)
   - [Unsubscribe](#unsubscribe)
7. [AI Features](#ai-features)
8. [Admin Endpoints](#admin-endpoints)
9. [System Configuration](#system-configuration)
10. [Request/Response Format](#requestresponse-format)
11. [Rate Limiting](#rate-limiting)
12. [Pagination](#pagination)
13. [File Upload](#file-upload)

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

**Auth Levels:**
- `No` - Public endpoint
- `Yes` - Requires authentication
- `Admin` - Requires admin privileges

---

## Core Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/profile` | Get current user profile | Yes |
| PUT | `/auth/profile` | Update user profile | Yes |
| PUT | `/auth/change-password` | Change password | Yes |
| POST | `/auth/password-reset/request` | Request password reset OTP | No |
| POST | `/auth/password-reset/confirm` | Confirm password reset with OTP | No |
| POST | `/auth/location` | Save user location | Yes |
| GET | `/auth/location` | Get user location | Yes |
| GET | `/auth/leaderboard/position` | Get user's leaderboard position | Yes |
| GET | `/auth/test` | Test authentication | Yes |

### Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/products` | Get all products | No |
| GET | `/products/search` | Search products | No |
| GET | `/products/categories` | Get all categories | No |
| GET | `/products/slot/:slot` | Get product by slot (1-100) | No |
| GET | `/products/:id` | Get product by ID | No |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/orders` | Create new order | Yes |
| POST | `/orders/batch-notify` | Send batch order notification | Yes |
| GET | `/orders/my` | Get user's orders | Yes |
| GET | `/orders/:id` | Get order by ID | Yes |
| GET | `/orders` | Get all orders | Admin |
| PUT | `/orders/:id/status` | Update order status | Admin |

### Research Papers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/research` | Get all approved papers | No |
| GET | `/research/top` | Get top papers | No |
| GET | `/research/:id` | Get paper by ID | No |
| GET | `/research/:id/download` | Download paper PDF | No |
| POST | `/research/:id/view` | Track paper view | No |
| GET | `/research/my` | Get user's papers | Yes |
| GET | `/research/my/:id` | Get user's paper (including pending) | Yes |
| POST | `/research` | Create paper | Yes |
| POST | `/research/:id/upvote` | Upvote paper | Yes |
| DELETE | `/research/:id/upvote` | Remove upvote | Yes |
| POST | `/research/:id/report` | Report paper | Yes |
| GET | `/research/:id/analytics` | Get paper analytics | Admin |

---

## User Features

### Leaderboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/leaderboard` | Get leaderboard | No |
| GET | `/leaderboard/position` | Get user's position | Yes |
| GET | `/leaderboard/settings` | Get leaderboard settings | Yes |

### Teams

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/teams/my-team` | Get user's team | Yes |
| POST | `/teams/create` | Create team | Yes |
| POST | `/teams/invite` | Send team invitation | Yes |
| GET | `/teams/invitations` | Get team invitations | Yes |
| GET | `/teams/:teamId/benefits` | Get team benefits | Yes |
| POST | `/teams/leave` | Leave team | Yes |
| POST | `/teams/request-separation` | Request team separation | Yes |
| POST | `/teams/invitations/:id/respond` | Respond to invitation | Yes |
| GET | `/teams` | Get all teams | Admin |

### Team Tiers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/team-tier/pricing/:teamSize` | Get team tier pricing | No |
| GET | `/team-tier/configs` | Get team tier configs | Admin |
| POST | `/team-tier/configs` | Create team tier config | Admin |
| PUT | `/team-tier/configs/:id` | Update team tier config | Admin |
| DELETE | `/team-tier/configs/:id` | Delete team tier config | Admin |
| GET | `/team-tier/formula` | Get team formula | Admin |
| POST | `/team-tier/formula` | Update team formula | Admin |

### Badges

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/badges/user/:userId` | Get user badges | No |
| GET | `/badges` | Get all badges | Admin |
| POST | `/badges` | Create badge | Admin |
| PUT | `/badges/:id` | Update badge | Admin |
| DELETE | `/badges/:id` | Delete badge | Admin |

### Certificates

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/certificates/download/:id` | Download certificate | No |
| POST | `/certificates/generate-my-certificate` | Generate own certificate | Yes |
| POST | `/certificates/send-to-doctor` | Send to specific doctor | Admin |
| POST | `/certificates/send-to-all` | Send to all doctors | Admin |
| GET | `/certificates/stats` | Get certificate stats | Admin |
| POST | `/certificates/backfill` | Backfill certificates | Admin |

### User Stats

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/user-stats/:id` | Get user statistics | No |
| PUT | `/user-stats/:id` | Update user profile | Yes |

---

## Payments

### PayFast Integration

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/payments/payfast/initialize` | Initialize PayFast payment | Yes |
| POST | `/payments/payfast/notify` | PayFast ITN callback | No |
| GET | `/payments/status` | Get payment status | Yes |
| POST | `/payments/create-order-and-pay` | Create order and pay | Yes |
| POST | `/payments/confirm-success` | Confirm payment success | Yes |

---

## Advertisements

### Video Advertisements

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/video-advertisements/areas` | Get advertisement areas | No |
| GET | `/video-advertisements/active` | Get active advertisements | No |
| GET | `/video-advertisements/pricing` | Get pricing information | No |
| POST | `/video-advertisements/calculate-cost` | Calculate ad cost | No |
| GET | `/video-advertisements/rotation-configs/:area` | Get rotation config | No |
| POST | `/video-advertisements/:id/impression` | Track impression | No |
| POST | `/video-advertisements/:id/click` | Track click | No |
| POST | `/video-advertisements/:id/view` | Track view | No |
| POST | `/video-advertisements/create` | Create advertisement | Yes |
| GET | `/video-advertisements/my-advertisements` | Get user's ads | Yes |
| GET | `/video-advertisements/:id` | Get ad by ID | Yes |
| PUT | `/video-advertisements/:id` | Update advertisement | Yes |
| DELETE | `/video-advertisements/:id` | Delete advertisement | Yes |
| POST | `/video-advertisements/:id/confirm-payment` | Confirm payment | Yes |
| POST | `/video-advertisements/:id/close` | Close advertisement | Yes |

### Advertisement Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/video-advertisements/admin/all` | Get all advertisements | Admin |
| GET | `/video-advertisements/admin/areas` | Get all areas | Admin |
| PUT | `/video-advertisements/admin/areas/:id` | Update area | Admin |
| POST | `/video-advertisements/admin/areas/:id/preview-image` | Upload preview | Admin |
| PUT | `/video-advertisements/admin/:id/approve` | Approve ad | Admin |
| PUT | `/video-advertisements/admin/:id/reject` | Reject ad | Admin |
| PUT | `/video-advertisements/admin/:id/slides` | Update slides | Admin |
| PUT | `/video-advertisements/admin/:id/toggle` | Toggle status | Admin |
| PUT | `/video-advertisements/admin/toggle-all` | Toggle all ads | Admin |
| GET | `/video-advertisements/admin/pricing-configs` | Get pricing configs | Admin |
| POST | `/video-advertisements/admin/pricing-configs` | Create pricing config | Admin |
| PUT | `/video-advertisements/admin/pricing-configs/:id` | Update pricing config | Admin |
| DELETE | `/video-advertisements/admin/pricing-configs/:id` | Delete pricing config | Admin |
| GET | `/video-advertisements/admin/rotation-configs` | Get rotation configs | Admin |
| POST | `/video-advertisements/admin/rotation-configs` | Create rotation config | Admin |
| PUT | `/video-advertisements/admin/rotation-configs/:area` | Update rotation config | Admin |
| DELETE | `/video-advertisements/admin/rotation-configs/:area` | Delete rotation config | Admin |

---

## Communication

### Appointments (Conversations)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/conversations` | Get user's conversations | Yes |
| POST | `/conversations` | Create appointment request | Yes |
| GET | `/conversations/:id` | Get conversation details | Yes |
| POST | `/conversations/:id/messages` | Send message in conversation | Yes |
| PUT | `/conversations/:id/accept` | Accept appointment request | Yes (Doctor) |
| PUT | `/conversations/:id/read` | Mark conversation as read | Yes |

### Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | Get user's notifications | Yes |
| GET | `/notifications/unread-count` | Get unread notification count | Yes |
| PUT | `/notifications/:id/read` | Mark notification as read | Yes |
| PUT | `/notifications/read-all` | Mark all notifications as read | Yes |

### Doctor Search

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/doctors/search` | Search doctors with filters | No |
| GET | `/doctors/:id` | Get doctor profile | No |
| GET | `/doctors/current` | Get current user's doctor profile | Yes |

### Messages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/messages/send-messages` | Send bulk messages | Admin |
| GET | `/messages/users-with-progress` | Get users with tier progress | Admin |

### Award Messages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/award-messages` | Get all templates | Admin |
| GET | `/award-messages/:id` | Get template by ID | Admin |
| POST | `/award-messages` | Create template | Admin |
| PUT | `/award-messages/:id` | Update template | Admin |
| DELETE | `/award-messages/:id` | Delete template | Admin |
| PATCH | `/award-messages/:id/toggle` | Toggle template status | Admin |

### Unsubscribe

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/unsubscribe/:userId/:token` | Show unsubscribe page | No |
| POST | `/unsubscribe/:userId/:token` | Process unsubscribe | No |
| POST | `/unsubscribe/resubscribe/:userId/:token` | Process resubscribe | No |

### OTP

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/otp/generate` | Generate OTP | Yes |
| POST | `/otp/resend` | Resend OTP | No |
| POST | `/otp/verify` | Verify OTP | Yes |
| POST | `/otp/check-requirement` | Check if OTP required | Yes |

---

## AI Features

### AI Content Generation

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/ai/generate` | Generate AI content | Yes |

### AI Research

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/ai-research/suggestions` | Get research suggestions | No |
| POST | `/ai-research/generate` | Generate research content | Yes |
| POST | `/ai-research/generate-stream` | Generate streaming content | Yes |
| GET | `/ai-research/quota-status` | Get AI quota status | Yes |
| POST | `/ai-research/reset-quota` | Reset quota | Admin |

### API Tokens (Hugging Face)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api-tokens` | Get all tokens | Admin |
| GET | `/api-tokens/:id` | Get token by ID | Admin |
| POST | `/api-tokens` | Create token | Admin |
| PUT | `/api-tokens/:id` | Update token | Admin |
| DELETE | `/api-tokens/:id` | Delete token | Admin |
| PATCH | `/api-tokens/:id/toggle-status` | Toggle token status | Admin |
| PATCH | `/api-tokens/:id/set-default` | Set default token | Admin |
| POST | `/api-tokens/:id/validate` | Validate token | Admin |

---

## Admin Endpoints

### User Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/users` | Get all users | Admin |
| GET | `/admin/employees` | Get all employees | Admin |
| GET | `/admin/solo-doctors` | Get solo doctors | Admin |
| PUT | `/admin/user-profiles/:id` | Update user profile | Admin |
| POST | `/admin/users/:id/approve` | Approve user | Admin |
| POST | `/admin/users/:id/reject` | Reject user | Admin |
| POST | `/admin/users/:id/deactivate` | Deactivate user | Admin |
| POST | `/admin/users/:id/reactivate` | Reactivate user | Admin |
| DELETE | `/admin/users/:id` | Delete user | Admin |

### Signup ID Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/signup-ids` | Get all signup IDs | Admin |
| POST | `/admin/signup-ids` | Create signup ID | Admin |
| DELETE | `/admin/signup-ids/:id` | Delete signup ID | Admin |

### Product Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/products` | Get all products | Admin |
| POST | `/admin/products` | Create product | Admin |
| PUT | `/admin/products/:id` | Update product | Admin |
| DELETE | `/admin/products/:id` | Delete product | Admin |

### Tier Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/tier-configs` | Get tier configs | Admin |
| POST | `/admin/tier-configs` | Create tier config | Admin |
| PUT | `/admin/tier-configs/:id` | Update tier config | Admin |
| DELETE | `/admin/tier-configs/:id` | Delete tier config | Admin |
| POST | `/admin/tier-configs/update-all-tiers` | Update all user tiers | Admin |

### Debt Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/debt/thresholds` | Get debt thresholds | Admin |
| PUT | `/debt/thresholds` | Update debt threshold | Admin |
| POST | `/debt/thresholds/initialize` | Initialize default thresholds | Admin |
| GET | `/debt/user/:doctorId` | Check user debt status | Admin |
| POST | `/debt/user/:doctorId/custom-limit` | Set custom debt limit | Admin |
| DELETE | `/debt/user/:doctorId/custom-limit` | Remove custom debt limit | Admin |
| GET | `/debt/users-with-debt` | Get users with debt | Admin |
| POST | `/debt/sync-with-tiers` | Sync with tier configs | Admin |

### Research Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/admin/research-papers/:id/approve` | Approve paper | Admin |
| POST | `/admin/research-papers/:id/reject` | Reject paper | Admin |
| POST | `/admin/research-papers/:id/remove` | Remove paper | Admin |
| GET | `/admin/research-reports` | Get research reports | Admin |
| GET | `/admin/research-reports/stats` | Get report stats | Admin |
| POST | `/admin/research-reports/:id/dismiss` | Dismiss report | Admin |
| DELETE | `/admin/research-reports/:id` | Delete report | Admin |
| GET | `/admin/research-benefits` | Get research benefits | Admin |
| DELETE | `/admin/research-benefits/:id` | Delete benefit | Admin |
| GET | `/admin/research-benefit-configs` | Get benefit configs | Admin |
| POST | `/admin/research-benefit-configs` | Create benefit config | Admin |
| PUT | `/admin/research-benefit-configs/:id` | Update benefit config | Admin |
| DELETE | `/admin/research-benefit-configs/:id` | Delete benefit config | Admin |
| GET | `/admin/research-settings` | Get research settings | Admin |
| PUT | `/admin/research-settings` | Update research settings | Admin |

### Reward Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/reward-eligibility` | Get reward eligibility | Admin |
| PUT | `/admin/reward-eligibility/:id/status` | Update delivery status | Admin |
| POST | `/admin/reward-eligibility/check` | Check eligibility | Admin |

### Permission Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/permissions/current` | Get current user's permissions | Yes |
| GET | `/admin/permissions` | Get all permissions | Admin |
| POST | `/admin/permissions` | Create permission | Admin |
| PUT | `/admin/permissions/:id` | Update permission | Admin |
| DELETE | `/admin/permissions/:id` | Delete permission | Admin |
| GET | `/admin/available-doctors` | Get available doctors | Admin |

### Leaderboard Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/leaderboard` | Get admin leaderboard | Admin |
| GET | `/admin/leaderboard-settings` | Get settings | Admin |
| PUT | `/admin/leaderboard-settings` | Update settings | Admin |

### Hall of Pride

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/hall-of-pride` | Get entries | Admin |
| POST | `/admin/hall-of-pride` | Create entry | Admin |
| PUT | `/admin/hall-of-pride/:id` | Update entry | Admin |
| DELETE | `/admin/hall-of-pride/:id` | Delete entry | Admin |
| GET | `/admin/available-doctors-hall-of-pride` | Get available doctors | Admin |

### Email Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/email-quota` | Get email quota | Admin |
| GET | `/admin/email-quota/stats` | Get quota stats | Admin |
| GET | `/admin/email-monitoring/stats` | Get monitoring stats | Admin |
| GET | `/admin/email-delivery/:id` | Get delivery details | Admin |

### Data Export

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/data-export/export-jobs` | Get export jobs | Admin |
| POST | `/data-export/export-data` | Start data export | Admin |
| GET | `/data-export/export-jobs/:id/download` | Download export | Admin |
| POST | `/data-export/export-full-database` | Export full database | Admin |
| GET | `/data-export/google-drive/status` | Get Google Drive status | Admin |
| POST | `/data-export/google-drive/connect` | Connect Google Drive | Admin |
| POST | `/data-export/test-gmail` | Test Gmail connection | Admin |
| GET | `/data-export/gmail-status-public` | Get Gmail status | Admin |

### Data Visualization

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/data-visualization/dashboard-stats` | Get dashboard stats | Admin |

### OTP Config

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/otp-config/configs` | Get OTP configs | Admin |
| POST | `/otp-config/configs` | Update OTP configs | Admin |

---

## System Configuration

### Public Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/public/tier-configs` | Get tier configs | No |
| GET | `/public/leaderboard` | Get leaderboard | No |
| GET | `/public/research-benefits` | Get research benefits | No |
| GET | `/public/hall-of-pride` | Get hall of pride | No |
| GET | `/public/image-diagnostics` | Check missing images | No |

### Backgrounds

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/backgrounds/active` | Get active background | No |
| GET | `/backgrounds/admin` | Get all backgrounds | Admin |
| POST | `/backgrounds/admin` | Create background | Admin |
| PUT | `/backgrounds/admin/:id` | Update background | Admin |
| DELETE | `/backgrounds/admin/:id` | Delete background | Admin |
| POST | `/backgrounds/admin/:id/activate` | Activate background | Admin |
| POST | `/backgrounds/admin/:id/deactivate` | Deactivate background | Admin |
| POST | `/backgrounds/upload` | Upload background image | Admin |

### Contact Info

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/contact-info` | Get contact info | No |
| GET | `/contact-info/admin` | Get admin contact info | Admin |
| PUT | `/contact-info/admin` | Update contact info | Admin |

### Contact Platforms

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/contact-platforms` | Get contact platforms | No |
| GET | `/contact-platforms/admin` | Get admin platforms | Admin |
| POST | `/contact-platforms/admin` | Create platform | Admin |
| PUT | `/contact-platforms/admin/:id` | Update platform | Admin |
| DELETE | `/contact-platforms/admin/:id` | Delete platform | Admin |

### Search

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search` | Global search | Yes |

### Employee Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/employee/orders` | Get assigned orders | Yes |
| GET | `/employee/available-orders` | Get available orders | Yes |
| POST | `/employee/accept-delivery` | Accept delivery | Yes |
| POST | `/employee/start-delivery` | Start delivery | Yes |
| POST | `/employee/update-location` | Update delivery location | Yes |
| POST | `/employee/mark-delivered` | Mark as delivered | Yes |

---

## Request/Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev only)"
}
```

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Login | 5 requests / 15 min |
| Registration | 5 requests / 15 min |
| Password Reset | 5 requests / 15 min |
| Token Refresh | 10 requests / 15 min |
| General API | 100 requests / 15 min |

**Note:** Rate limits are relaxed in development mode.

---

## Pagination

All list endpoints support:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `page` | Page number (1-based) | 1 |
| `limit` | Items per page | 20 |

Response includes:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## File Upload

### Supported Types & Limits

| File Type | Max Size | Formats |
|-----------|----------|---------|
| Images | 10MB | JPG, PNG, GIF, WebP |
| Videos | 50MB | MP4, WebM, MOV |
| PDFs | 10MB | PDF |
| Advertisement Images | 2MB | JPG, PNG |
| Advertisement Videos | 50MB | MP4, WebM, MOV |
| Advertisement GIFs | 5MB | GIF |

### Upload Headers

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

---

## Related Documentation

- [Development Guide](DEVELOPMENT.md) - Local setup
- [Railway Deployment](RAILWAY_DEPLOYMENT.md) - Backend deployment
- [Vercel Deployment](VERCEL_DEPLOYMENT.md) - Frontend deployment
- [Security Guide](SECURITY.md) - Security implementation

---

**Document Version**: 3.4.0  
**Last Updated**: January 31, 2026
