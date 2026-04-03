# SmartStock Pro

A production-ready full-stack inventory management and optimization system with AI-powered insights.

**Stack:** React + Vite (Vercel) · FastAPI + SQLAlchemy (Railway) · Supabase PostgreSQL · Groq AI · Gmail SMTP

---

## Features

- 📦 **Inventory Management** — Full CRUD with EOQ auto-calculation, status tracking
- 🧾 **Sales Tracking** — Record sales, process refunds, day-of-week and hourly trends
- 📈 **Analytics** — Linear regression demand forecast, peak hours, interactive EOQ/ROP calculator
- ⚠️ **Smart Alerts** — Auto-email via Gmail SMTP when stock goes critical
- 🤖 **AI Chatbot** — Groq-powered inventory assistant (llama3-8b-8192)
- ⬇️ **CSV Export** — One-click export of inventory and sales data
- 🎨 **Warm Dark Theme** — Premium amber/orange UI with light mode toggle

---

## Project Structure

```
smartstock-pro/
├── frontend/          # React + Vite SPA
│   ├── src/App.jsx    # Entire frontend in one file
│   ├── vercel.json    # Vercel SPA routing config
│   └── package.json
└── backend/           # FastAPI Python API
    ├── main.py        # App entry, CORS, routes
    ├── models.py      # SQLAlchemy ORM models
    ├── config.py      # Pydantic settings
    ├── database.py    # SQLAlchemy engine
    ├── routes/        # auth, inventory, sales, alerts, forecast, export, chat
    ├── Dockerfile     # Railway deployment
    └── railway.toml   # Railway config
```

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your values
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`
Swagger docs at: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
# Create .env.local:
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

App available at: `http://localhost:5173`

**Demo login:** `demo@smartstock.pro` / `demo1234` (works offline without backend)

---

## Deployment

### 1. Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Settings → Database → **Connection string** → URI tab
3. Copy the URI — it looks like: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
4. Tables are created automatically on first backend startup (`Base.metadata.create_all`)

### 2. Railway (Backend)

1. Push `backend/` folder to a GitHub repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your backend repo
4. Add all environment variables (Settings → Variables):

```
DATABASE_URL=postgresql://postgres:...@db....supabase.co:5432/postgres
SECRET_KEY=your-very-long-random-secret-key-at-least-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
APP_NAME=SmartStock Pro
DEBUG=False
```

5. Railway auto-detects `Dockerfile` and deploys
6. Copy the generated URL (e.g. `https://smartstock-backend-production.up.railway.app`)

> **Note:** Railway uses the `$PORT` env var automatically — the `railway.toml` handles this.

### 3. Vercel (Frontend)

1. Push `frontend/` folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Framework preset: **Vite**
4. Root directory: `frontend` (if deploying from monorepo)
5. Add environment variable:
   ```
   VITE_API_URL = https://your-railway-url.up.railway.app
   ```
6. Deploy → your app is live!

---

## Gmail App Password Setup

Gmail's App Password is required for SMTP email alerts:

1. Enable **2-Factor Authentication** on your Google account
2. Go to [myaccount.google.com](https://myaccount.google.com) → Security → **App Passwords**
3. Select app: **Mail**, device: **Other** → type "SmartStock Pro"
4. Copy the generated 16-character password (format: `xxxx xxxx xxxx xxxx`)
5. Set `GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx` in Railway (spaces are fine)
6. Set `GMAIL_USER=your.gmail@gmail.com`

> Alerts are sent to the same Gmail address. To send to a different address, modify `routes/alerts.py` → `msg["To"]` field.

---

## Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. API Keys → Create new key
3. Copy and set as `GROQ_API_KEY` in Railway

Model used: `llama-3.1-8b-instant` (fast, free tier available)

> If `GROQ_API_KEY` is not set, the chatbot falls back to built-in keyword responses — no crash.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing secret (min 32 chars) |
| `ALGORITHM` | ✅ | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | Token lifetime (default: `60`) |
| `GMAIL_USER` | Optional | Gmail address for email alerts |
| `GMAIL_APP_PASSWORD` | Optional | Gmail App Password (not your login password) |
| `GROQ_API_KEY` | Optional | Groq API key for AI chatbot |
| `APP_NAME` | Optional | Display name (default: `SmartStock Pro`) |
| `DEBUG` | Optional | Debug mode (default: `False`) |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Create account, returns JWT |
| POST | `/auth/login` | OAuth2 login, returns JWT |
| GET | `/auth/me` | Current user info |
| GET | `/inventory/products` | List products (filterable) |
| POST | `/inventory/products` | Add product (auto-calculates EOQ) |
| PUT | `/inventory/products/{id}` | Update product |
| DELETE | `/inventory/products/{id}` | Delete product |
| GET | `/inventory/stats` | Dashboard KPIs |
| POST | `/sales/record` | Record sale (deducts stock, triggers alerts) |
| GET | `/sales/history` | Sales history |
| POST | `/sales/refund/{sale_id}` | Process refund (restores stock) |
| GET | `/sales/trends/day-of-week` | Sales by weekday |
| GET | `/sales/trends/hourly` | Sales by hour |
| GET | `/alerts/` | Categorized stock alerts |
| POST | `/alerts/send-email/{product_id}` | Send Gmail alert |
| GET | `/analytics/forecast` | ML demand forecast (4 months) |
| GET | `/analytics/peak-hours` | Peak sales hours |
| POST | `/analytics/eoq-rop` | Calculate EOQ & ROP |
| GET | `/export/inventory` | Download inventory CSV |
| GET | `/export/sales` | Download sales CSV |
| POST | `/chat/message` | AI chatbot (Groq) |

---

## Business Logic

### Stock Status
```
critical  = stock < reorder_level × 0.25
low       = stock < reorder_level
overstock = stock > optimal_stock × 1.2
optimal   = everything else
```

### EOQ Formula
```
EOQ = √(2 × D × S / H)
D = annual demand, S = ordering cost, H = holding cost per unit per year
```

### ROP Formula
```
ROP = (lead_time_days × daily_sales_velocity) + safety_stock
```

---

## Security Notes

- CORS is set to `allow_origins=["*"]` for development. In production, change to your Vercel domain:
  ```python
  allow_origins=["https://your-app.vercel.app"]
  ```
- Never commit `.env` files — use Railway/Vercel environment variable dashboards
- JWT tokens expire after 60 minutes by default (configurable)
- Passwords are hashed with bcrypt

---

## Tech Stack Details

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Recharts |
| Styling | CSS-in-JS (injected via `injectStyles`) |
| Backend | Python 3.11, FastAPI 0.111, Uvicorn |
| ORM | SQLAlchemy 2.0 |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Email | Python smtplib + Gmail SMTP SSL |
| AI | Groq API (llama3-8b-8192) |
| ML | scikit-learn LinearRegression |
| Hosting | Vercel (frontend) + Railway (backend) |

---

*SmartStock Pro — Built for production inventory management.*
