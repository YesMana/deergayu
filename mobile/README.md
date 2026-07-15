# Mobile ↔ Website sync

Expo SDK **56** docs: https://docs.expo.dev/versions/v56.0.0/

## Architecture

| Layer | Shared? |
|-------|---------|
| Firebase Auth (`deergayu-9de41`) | Yes — same login on web + app |
| Express API (`https://deergayu-api.onrender.com`) | Yes |
| Firestore (via Admin SDK on API) | Yes — carts, orders, appointments, products |

Guest cart is local (AsyncStorage). After login, guest items merge into `/api/cart`.

## Run

```bash
cd mobile
npm install
npx expo start
```

Phone: Expo Go → same Wi‑Fi → scan QR.

Optional: `EXPO_PUBLIC_API_URL=https://deergayu-api.onrender.com`

## Screens wired to live API

- Home, Shop, **Product detail** (reviews + wishlist)
- Cart with **checkout** (COD / QR / bank / PayHere when enabled)
- Channeling + booking (in-person / online)
- Astrology tab, Guide, Videos
- Login / Account / Orders / Appointments
- **Admin Panel** (admin accounts only) — experts, products, orders, appointments
- AyurBot (`/api/chat`), Symptom checker (`/api/symptom-check`)

## Admin on mobile

Sign in with an admin account (same as website). Account → **Admin Panel**.

Covers approvals + order/appointment actions. Settings / videos / guide editors stay on `deergayu.com/admin`.

## Google Sign-In

Mobile uses the **same website Google login** (no Client ID `.env` needed):

1. App opens `https://deergayu.com/mobile-auth` in a secure browser
2. You pick a Google account (same as website)
3. Browser returns to the app — Firebase session syncs

Requires live deploy of `/mobile-auth` on the site + Render API routes:
- `POST /api/auth/mobile-google/start`
- `POST /api/auth/mobile-google/exchange`

Optional override: `EXPO_PUBLIC_MOBILE_AUTH_URL=https://deergayu.com/mobile-auth`
