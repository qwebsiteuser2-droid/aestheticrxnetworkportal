# Mobile UI and installing as an app (PWA)

Most users visit **AestheticRXNetwork** on phones. This document describes the mobile layout, navigation, and how to install the site as an app.

| | |
|--|--|
| **Version** | 3.5.7 |
| **Last updated** | June 2, 2026 |
| **Production URL** | https://aestheticrxnetworkportal.vercel.app |

---

## Sticky header (all mobile pages)

At the top of every page (except full-screen admin flows that omit the shared header):

1. **Row 1:** Small logo + **AestheticRXNetwork** wordmark · **Sign In / Register** (guests) or **bell** + **profile menu** (signed in)
2. **Row 2:** Horizontal **tab bar** (scrolls on very narrow screens)

### Tab bar (left → right)

| Tab | Path | Notes |
|-----|------|--------|
| **Home** | `/` | Landing |
| **Order** | `/order` | Full catalog, cart, COD checkout |
| **Doctors** | `/doctors?focus=search` | Doctor icon with **search magnifier** badge — find & search doctors |
| **Status** | `/messages` | Appointment Status (sign-in required) |
| **Ranks** | `/leaderboard` | Leaderboard (sign-in required) |
| **Research** | `/research` | Research papers |
| **Pride** | `/hall-of-pride` | Hall of Pride (sign-in required) |

There is **no separate Search tab**; search is part of **Doctors**.

### Profile menu (signed in)

Tap your name on the top right:

- Order Products / Dashboard (role-dependent)
- Admin Dashboard (if permitted)
- Appointment Status
- **Sign out**

### Notifications

Tap the **bell** icon. On mobile, a **full-width panel** opens below the header with a dimmed backdrop. Tap outside or a notification to close.

---

## Homepage behavior (mobile)

| User | Home page shows |
|------|-----------------|
| **Guest (not signed in)** | Product catalog (browse), foldable Top Clinics, Research, Features, Contact. **Add to Cart / Buy Now** → login with product preserved |
| **Signed in** | **No product catalog** on Home — use **Order** tab to shop. **Top Clinics** section **opens automatically**. Other sections remain foldable |

Desktop (signed in): catalog still visible on Home.

---

## Product details modal (mobile)

When you open a product:

1. Image gallery (front / back / side thumbnails)
2. **Quantity** + line total
3. **Add to Cart** and **Buy Now**
4. **Share**
5. Title, price, stock, reviews (scroll below)

---

## Appointment Status (`/messages`, mobile)

- Page title and **Book New Appointment** stack vertically
- Conversation cards fit the screen width
- **Unread messages** and **new requests** (doctors) appear **first**, sorted by most recent activity

---

## Install as an app (PWA)

### Android (Chrome)

1. Open **https://aestheticrxnetworkportal.vercel.app** in Chrome.
2. Menu **⋮** → **Install app** or **Add to Home screen**.
3. Open from the home screen — runs **standalone** (no address bar).

### iPhone / iPad (Safari)

1. Open the site in **Safari**.
2. **Share** → **Add to Home Screen** → **Add**.

### Verify

- No browser URL bar
- Status bar theme **#1E66FF**
- Sticky header + tabs remain while scrolling

### After manifest changes

Uninstall the old home-screen icon and add again — the OS caches the manifest at install time.

---

## Technical reference

| Item | Location |
|------|----------|
| Web manifest | `frontend/public/manifest.json` |
| Viewport / theme | `frontend/src/app/layout.tsx` |
| Mobile chrome | `frontend/src/components/layout/MobileHeaderChrome.tsx` |
| Tab navigation | `frontend/src/components/layout/MobileTabNavigation.tsx` |
| Profile menu | `frontend/src/components/layout/MobileUserMenu.tsx` |
| Notifications | `frontend/src/components/NotificationBell.tsx` |
| Product images | `frontend/src/components/ProductCatalogImage.tsx` |
| Product modal | `frontend/src/components/ProductDetailsModal.tsx` |
| Safe-area CSS | `frontend/src/app/globals.css` |

A **service worker** is not required for “Add to Home Screen” on most browsers.

---

## Local testing

```bash
cd frontend
npm run build && npm run start
```

Use Chrome DevTools device mode or a phone on the same Wi‑Fi. PWA install requires **HTTPS** (use your Vercel URL).

---

## Related docs

- [CHANGELOG.md](CHANGELOG.md) — v3.5.7 mobile release notes
- [USER_GUIDE.md](USER_GUIDE.md) — end-user overview
- [GOOGLE_OAUTH_VERIFICATION.md](GOOGLE_OAUTH_VERIFICATION.md) — Sign-In with Google
