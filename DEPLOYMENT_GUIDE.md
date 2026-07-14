# Deergayu Website - Deployment Guide

## Production layout (Option A — cPanel API + mail)

| Piece | Where it runs |
|-------|----------------|
| Frontend | cPanel `deergayu.com` (FTP deploy) **or** Vercel |
| API + email | **cPanel Node** `/home/dilspxws/api` — NOT Render |
| Mail | `info@deergayu.com` via `localhost:587` on the same server |

Render cannot open Namecheap SMTP (connection timeout). Keep the API on cPanel so mail works.

### Switch DNS back to cPanel (required if site still shows Server: Vercel)

1. cPanel home → note **Shared IP Address** (General Information).
2. Namecheap → Domain List → **deergayu.com** → Advanced DNS.
3. A Record `@` → that Shared IP (replace the Vercel IP).
4. A Record `www` → same Shared IP (or CNAME to `@`).
5. Wait 5–30 minutes. Check: https://deergayu.com/api/health → `{"status":"OK"...}`.
6. In Render → **deergayu-api** → Settings → **Suspend** (optional, saves free-tier spins).

### cPanel mail `.env`

File Manager → `/home/dilspxws/api/.env`:

```env
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@deergayu.com
SMTP_PASS="YOUR_MAILBOX_PASSWORD"
ADMIN_EMAIL=yes.manujaya@gmail.com
```

Then **Setup Node.js App → Restart**.

### Frontend API URL

- Same domain on cPanel: leave `VITE_API_URL` empty (requests go to `/api/...`).
- If frontend stays on Vercel while API is on cPanel: set Vercel env `VITE_API_URL=https://deergayu.com` only after DNS points the domain at cPanel — or use subdomain `https://api.deergayu.com`.

---

## Routine update (code changes)

### 1. Local build
```bash
cd frontend
npm run build
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Updated website"
git push
```

GitHub Actions FTP-deploys `frontend/dist` + `backend/` to cPanel.

### 3. Manual pull (if needed)
```bash
cd /home/dilspxws/deergayu
git pull
cd /home/dilspxws/api && npm install   # only if package.json changed
```
Restart the Node.js app in cPanel.
