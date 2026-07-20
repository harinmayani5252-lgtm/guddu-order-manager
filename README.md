# Guddu Order Manager

A mobile-first **Progressive Web App** that digitises textile order entry for **Guddu Group** (Surat).
Take orders from phone/WhatsApp, enter them once, and generate a clean professional **PDF order sheet**
to share via **WhatsApp, Telegram, or Email**.

> Works **fully offline** after first load • Installable on Android, iPhone, iPad & Desktop
> Built as a zero-build static app — no server required. Optional **Supabase cloud sync**.
> **Created by Keval Mayani.**

---

## ✨ Features

- **10 local admin logins** — `guddu1` … `guddu10` (password pattern `guddu<n>guddu`, e.g. `guddu1guddu`). All are admins.
- **Dashboard** — total orders, orders today, total customers, pieces today, and recent orders.
- **Order entry** — customer info, order info, and a dynamic product table (Design No., Pieces, Rate *(optional)*, Remarks) with **auto totals** (designs + pieces).
- **Professional PDF** — modern Guddu Group header, customer & logistics block, items table, summary, signature area, and footer. Filename: `CustomerName_OrderNumber_Date.pdf` (e.g. `RMKV_ORD-000123_2026-07-20.pdf`).
- **Share** — native file share on phones (attaches the PDF directly); WhatsApp / Telegram / Email fallbacks on desktop.
- **Order history** — search by customer, mobile, order number, or design number; filter by date.
- **Dark & light mode**, responsive, touch-friendly (Stripe / Linear / Vercel-inspired UI).
- **Backup & restore** (JSON) to move data between devices; **optional Supabase sync** for automatic cross-device data.

## 🧱 Tech

Pure **HTML + CSS + vanilla JS** (no framework/build) so it deploys anywhere and stays fast and offline-capable.
PDF via **jsPDF + jspdf-autotable** (CDN, cached by the service worker). Optional sync via the **Supabase REST API**.

> The original brief listed Next.js/TypeScript/ShadCN. Per your decision we built the lighter **offline-first HTML PWA + optional cloud sync** instead — same features, no monthly cost, installs on every device, and can migrate to the full stack later if needed.

## 📁 Structure

```
guddu-order-manager/
├── index.html                 # app shell (loads scripts) — "Created by Keval Mayani"
├── offline.html               # offline fallback page
├── manifest.webmanifest       # PWA manifest
├── sw.js                      # service worker (offline cache)
├── css/styles.css             # design system (light/dark)
├── js/
│   ├── data.js                # localStorage models + auth (10 accounts)
│   ├── pdf.js                 # PDF order-sheet generator
│   ├── sync.js                # optional Supabase sync
│   └── app.js                 # UI, routing, all screens
├── icons/                     # generated PNG app icons
├── tools/generate-icons.js    # regenerate icons (node tools/generate-icons.js)
├── supabase-schema.sql        # optional cloud-sync schema
├── .env.example               # reference only (sync is configured in-app)
└── .github/workflows/deploy.yml
```

## ▶️ Run locally

It's a static site — serve the folder with any static server:

```bash
cd guddu-order-manager
npx serve .          # or: python -m http.server 8080
```

Open the printed URL and sign in with `guddu1` / `guddu1guddu`.
(Service workers need `http://localhost` or HTTPS — opening `index.html` directly via `file://` disables offline/install but the app still runs.)

## 🔐 Login accounts

| Username | Password |
|----------|----------|
| guddu1   | guddu1guddu |
| guddu2   | guddu2guddu |
| …        | … |
| guddu10  | guddu10guddu |

All accounts are stored in the app (`js/data.js`) and have full admin access. Give one to each user.

## 📄 PDF filename

`CustomerName_OrderNumber_Date.pdf` — e.g. `RMKV_ORD-000123_2026-07-20.pdf`.

## ☁️ Optional cloud sync (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase-schema.sql`](supabase-schema.sql).
3. In the app: **Settings → Cloud Sync**, toggle on, paste **Project URL** and **anon public key** (Project Settings → API), **Save**, **Test connection**, then **Sync now** once.

After that the app **auto-syncs** on every sign-in and after every create/edit/delete, so all 10 users share one common list of orders. The cloud is treated as the source of truth on each sync, and the local order-number counter is bumped to the cloud max to keep numbering sequential across devices. The ☁ button in the top bar forces a manual sync. Read the note in the SQL file about the anon-role policy.

> Do this **once on any one device**, then just hand out the login accounts — new devices pull the shared data automatically after sign-in.

## 🚀 Deploy to Cloudflare Pages

**Option A — Dashboard (simplest):**
1. Push this folder to a GitHub repo.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Framework preset: **None**. Build command: *(empty)*. Build output directory: `guddu-order-manager` (or `/` if this is the repo root).
4. Deploy. Every push auto-deploys.

**Option B — GitHub Actions:** use [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) and add repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

After deploy, open the HTTPS URL on a phone → browser menu → **Add to Home Screen** to install.

## 📱 Install (PWA)

- **Android (Chrome):** menu → *Install app* / *Add to Home screen*.
- **iPhone / iPad (Safari):** Share → *Add to Home Screen*.
- **Desktop (Chrome/Edge):** install icon in the address bar.

---

Created by **Keval Mayani**.
