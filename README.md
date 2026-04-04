# SmartStock Pro

A production-ready full-stack inventory management and optimization system with AI-powered insights.

**Stack:** React + Vite (Vercel) · FastAPI + SQLAlchemy (Railway) · Supabase PostgreSQL · Groq AI · Resend Email

---

## Features

- 📦 **Inventory Management** — Full CRUD with EOQ auto-calculation, status tracking
- 🧾 **Sales Tracking** — Record sales, process refunds, day-of-week and hourly trends
- 📈 **Analytics** — Linear regression demand forecast, peak hours, interactive EOQ/ROP calculator
- ⚠️ **Smart Alerts** — Auto-email via Resend API when stock goes critical
- 🤖 **AI Chatbot** — Groq-powered inventory assistant (llama-3.1-8b-instant)
- ⬇️ **CSV Export** — One-click export of inventory and sales data
- 🔍 **Global Search** — Topbar search finds products and pages instantly
- 🎨 **Warm Dark Theme** — Premium amber/orange UI with light mode toggle

---

## Project Structure

```
smartstock-pro/
├── frontend/          # React + Vite SPA (deploy to Vercel)
│   ├── src/App.jsx    # Entire frontend in one file
│   ├── vercel.json    # SPA routing config
│   └── package.json
├── backend/           # FastAPI Python API (deploy to Railway)
│   ├── main.py        # App entry, CORS, routes
│   ├── models.py      # SQLAlchemy ORM models
│   ├── config.py      # Pydantic settings
│   ├── database.py    # SQLAlchemy engine
│   ├── routes/        # auth, inventory, sales, alerts, forecast, export, chat
│   ├── Dockerfile     # Railway deployment
│   └── railway.toml
└── README.md          # ← you are here (safe to have at repo root)
```

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in values
uvicorn main:app --reload --port 8000
```

API: `http://localhost:8000` · Swagger docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

App: `http://localhost:5173`

**Demo login (works offline):** `demo@smartstock.pro` / `demo1234`

---

## Deployment

### 1. Supabase (Database)

1. Create project at [supabase.com](https://supabase.com)
2. Settings → Database → Connection string → URI tab → copy
3. Paste as `DATABASE_URL` in Railway env vars
4. Tables are created automatically on first backend boot (`Base.metadata.create_all`)

### 2. Railway (Backend)

1. Push this repo to GitHub (with `frontend/`, `backend/`, `README.md` at root)
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub → select repo
3. Set **Root Directory** to `backend` in Railway settings
4. Add environment variables (Settings → Variables):

```
DATABASE_URL        = postgresql://postgres:...@db....supabase.co:5432/postgres
SECRET_KEY          = (any random 32+ char string)
ALGORITHM           = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 60
RESEND_API_KEY      = re_xxxxxxxxxxxxxxxxxxxx
ALERT_EMAIL         = forai3101@gmail.com
GROQ_API_KEY        = gsk_xxxxxxxxxxxx
APP_NAME            = SmartStock Pro
DEBUG               = False
```

5. Railway auto-detects `Dockerfile`, builds and deploys
6. Copy your Railway URL (e.g. `https://smartstock-pro-backend.up.railway.app`)

### 3. Vercel (Frontend)

1. [vercel.com](https://vercel.com) → New Project → Import repo from GitHub
2. Framework preset: **Vite**
3. Root directory: `frontend`
4. Add environment variable:
   ```
   VITE_API_URL = https://your-railway-url.up.railway.app
   ```
5. Deploy

---

## Email Alerts — Resend Setup

> **Why Resend and not Gmail SMTP?** Railway blocks all outbound SMTP ports (587, 465, 2525) on all plans. Raw SMTP cannot work from Railway. Resend uses an HTTPS API instead — it's unblocked and more reliable.

### Steps

1. Sign up free at [resend.com](https://resend.com) — 3,000 emails/month free
2. Go to **API Keys** → Create Key → copy it (starts with `re_`)
3. Add to Railway: `RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxx`
4. Add to Railway: `ALERT_EMAIL = forai3101@gmail.com` (who receives alerts)
5. Done — alerts will arrive from `onboarding@resend.dev` by default

### Using your own domain as sender (optional)

1. In Resend dashboard → **Domains** → Add domain → follow DNS instructions
2. Once verified, set in Railway: `RESEND_FROM = alerts@yourdomain.com`

### Who gets the alerts?

The system is a self-notification setup: one Gmail account (`ALERT_EMAIL`) receives all stock alerts for the whole business. Alerts fire automatically when any product goes critical during a sale, and can also be triggered manually from the Alerts page. If you later want per-user alerts, you'd extend the `users` table with a `notify_email` field and loop through admin users.

---

## Groq API Key (AI Chatbot)

1. Go to [console.groq.com](https://console.groq.com) → API Keys → Create
2. Set `GROQ_API_KEY` in Railway
3. Model: `llama-3.1-8b-instant` (fast, free tier available)
4. If not set, the chatbot falls back to built-in keyword responses — no crash

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL URI |
| `SECRET_KEY` | ✅ | JWT signing secret (32+ chars) |
| `ALGORITHM` | ✅ | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | `60` |
| `RESEND_API_KEY` | ✅ for email | From resend.com |
| `ALERT_EMAIL` | ✅ for email | Inbox that receives alerts |
| `RESEND_FROM` | Optional | Custom sender address (requires verified domain) |
| `GROQ_API_KEY` | Optional | AI chatbot |
| `APP_NAME` | Optional | `SmartStock Pro` |
| `DEBUG` | Optional | `False` |
| `GMAIL_USER` | Legacy | Only used as `ALERT_EMAIL` fallback |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Create account, returns JWT |
| POST | `/auth/login` | OAuth2 login, returns JWT |
| GET | `/auth/me` | Current user info |
| GET | `/inventory/products` | List products (`?search=`, `?status=`, `?category=`) |
| POST | `/inventory/products` | Add product (auto-calculates EOQ) |
| PUT | `/inventory/products/{id}` | Update product |
| DELETE | `/inventory/products/{id}` | Delete product |
| GET | `/inventory/stats` | Dashboard KPIs |
| POST | `/sales/record` | Record sale (deducts stock, auto-triggers alert) |
| GET | `/sales/history` | Sales history (`?limit=`, `?product_id=`) |
| POST | `/sales/refund/{sale_id}` | Process refund (restores stock) |
| GET | `/sales/trends/day-of-week` | Sales grouped by weekday |
| GET | `/sales/trends/hourly` | Sales grouped by hour |
| GET | `/alerts/` | Categorized stock alerts |
| POST | `/alerts/send-email/{product_id}` | Send Resend alert email |
| GET | `/analytics/forecast` | ML demand forecast (4 months) |
| GET | `/analytics/peak-hours` | Peak sales hours |
| POST | `/analytics/eoq-rop` | Calculate EOQ & ROP |
| GET | `/export/inventory` | Download inventory CSV |
| GET | `/export/sales` | Download sales CSV |
| POST | `/chat/message` | AI chatbot (Groq) |

---

## Business Logic

```
Stock status:
  critical  = stock < reorder_level × 0.25   → auto email + badge
  low       = stock < reorder_level           → badge
  overstock = stock > optimal_stock × 1.2    → badge
  optimal   = everything else

EOQ  = √(2 × D × S / H)
       D = annual demand, S = ordering cost/order, H = holding cost/unit/year

ROP  = (lead_time_days × daily_sales_velocity) + safety_stock
```

---

## Security Notes

- CORS is `allow_origins=["*"]` for development. In production, tighten to:
  ```python
  allow_origins=["https://your-app.vercel.app"]
  ```
- Never commit `.env` — use Railway/Vercel dashboards for secrets
- JWT tokens expire after 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Passwords are hashed with bcrypt

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Recharts |
| Styling | CSS-in-JS via `injectStyles()` |
| Backend | Python 3.11, FastAPI 0.111, Uvicorn |
| ORM | SQLAlchemy 2.0 |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Email | Resend API (HTTPS — Railway SMTP-safe) |
| AI | Groq API (llama-3.1-8b-instant) |
| ML | scikit-learn LinearRegression |
| Hosting | Vercel (frontend) + Railway (backend) |
