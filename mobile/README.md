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
- Channeling + booking
- Guide, Videos
- Login / Account / Orders / Appointments
- AyurBot (`/api/chat`), Symptom checker (`/api/symptom-check`)

## Still on website only

- Admin / Vendor dashboards

## Google Sign-In

Website already uses Google. Mobile needs the **Web client ID**:

1. [Firebase Console](https://console.firebase.google.com/) → project **deergayu-9de41**
2. **Authentication** → **Sign-in method** → **Google** (enable if needed)
3. Copy **Web client ID** (`….apps.googleusercontent.com`)
4. Create `mobile/.env`:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

5. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → that OAuth client → **Authorized redirect URIs** add:
   - `deergayu://oauthredirect`
6. Restart Expo: `npx expo start -c`

Then Login screen → **Continue with Google** uses the same Firebase users as the website.

> Native Google Sign-In packages need a **development build** (not Expo Go). This app uses browser OAuth + Firebase so Expo Go can work after the Client ID is set.
