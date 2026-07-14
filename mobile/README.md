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

- Home, Shop, Cart (server when logged in)
- Channeling + booking
- Guide, Videos
- Login / Account / Orders / Appointments
- AyurBot (`/api/chat`), Symptom checker (`/api/symptom-check`)

## Still thinner than web

- PayHere checkout (use website for now)
- Product detail page, wishlist, Google Sign-In
- Admin / Vendor dashboards (web only)
