# OpsMemory — Mission Control

OpsMemory turns WhatsApp conversations into operational intelligence for SMEs: ingest messages, extract structured signals, persist tenant-scoped memory, run six autonomous agents, and surface actions on a live dashboard.

**Stack:** TanStack Start (React 19) + FastAPI + PostgreSQL (local dev) / Supabase (production path) + OpenRouter (LLM/embeddings) + Meta WhatsApp Cloud API + Twilio WhatsApp sandbox.

---

## Table of contents

1. [Security & secrets](#security--secrets)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick start (local development)](#quick-start-local-development)
5. [Environment variables](#environment-variables)
6. [Database setup & migrations](#database-setup--migrations)
7. [Running the application](#running-the-application)
8. [WhatsApp webhooks (Meta + Twilio)](#whatsapp-webhooks-meta--twilio)
9. [Cloudflare tunnel (24/7 webhooks)](#cloudflare-tunnel-247-webhooks)
10. [Dashboard & demo auth](#dashboard--demo-auth)
11. [Background jobs](#background-jobs)
12. [Production deployment notes](#production-deployment-notes)
13. [Troubleshooting](#troubleshooting)
14. [Project structure](#project-structure)

---

## Security & secrets

### What must never be committed

| File / pattern | Purpose |
|----------------|---------|
| `opsmemory-backend/.env` | All backend API keys and tokens |
| `.env.local` | Frontend overrides |
| `tunnel-url.txt` | Ephemeral public tunnel URL |
| `*.pem`, `*.key`, `credentials.json` | Certificates and key files |

These paths are listed in `.gitignore`. **Do not remove them from `.gitignore`.**

### Safe templates (placeholders only)

| File | Copy to |
|------|---------|
| `opsmemory-backend/.env.example` | `opsmemory-backend/.env` |
| `.env.example` | `.env.local` |

Use **placeholder values only** in examples and documentation. Never paste real tokens into README, issues, or chat.

### Verify nothing sensitive is tracked

```bash
# Should print nothing (or only .env.example files)
git ls-files | grep -E '\.env$|\.env\.'

# Scan for accidental secrets before pushing
git diff --staged | grep -E 'sk-|EAA[A-Za-z0-9]|eyJhbG|AC[a-f0-9]{32}'
```

### If credentials were exposed

1. **Rotate immediately** in each provider console (Meta, Twilio, OpenRouter, Clerk, Supabase).
2. Remove secrets from git history if they were ever committed (`git filter-repo` or GitHub secret scanning).
3. Regenerate `SECRET_KEY` in `.env`.
4. Treat pasted chat logs as compromised.

### Production hardening checklist

- [ ] Set `APP_ENV=production` (enables strict Clerk JWT signature verification).
- [ ] Set `META_APP_SECRET` (enables Meta webhook HMAC verification).
- [ ] Use a **named** Cloudflare Tunnel or fixed HTTPS domain for webhooks (not ephemeral `trycloudflare.com` in prod).
- [ ] Restrict CORS in `main.py` to your real frontend origin(s).
- [ ] Run backend as a non-root user; lock down `.env` file permissions (`chmod 600`).
- [ ] Never log request bodies containing tokens.

---

## Architecture

```
Customer WhatsApp
       │
       ├── Meta Cloud API ──POST──► /webhook/whatsapp/{business_id}
       └── Twilio sandbox ──POST──► /webhook/twilio/{business_id}
                    │
                    ▼
            FastAPI (port 8000)
         extract → memory → agents → orchestrator
                    │
                    ▼
         PostgreSQL (tenant-scoped by business_id)
                    │
                    ▼
         Dashboard (port 5173) ◄── REST /api/*
```

**Inbound reply routing:** Replies are sent on the **same channel** as the inbound message (`meta` or `twilio`). Cross-channel fallback is disabled when the channel is known, so Meta chats do not receive Twilio replies.

**Demo business ID (seed data):** `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` (Bola Agro Supplies Ltd)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Frontend |
| Python | 3.10+ (3.14 tested) | Backend |
| PostgreSQL | 15+ | Local dev on port **5433** (or configure via env) |
| cloudflared | Latest | Public HTTPS tunnel for webhooks |
| Accounts | — | OpenRouter, Meta Developer, Twilio (optional), Clerk (optional) |

---

## Quick start (local development)

```bash
# 1. Clone and enter repo
cd OpsMemory

# 2. Backend env
cp opsmemory-backend/.env.example opsmemory-backend/.env
# Edit opsmemory-backend/.env with your keys (see Environment variables)

# 3. Frontend env
cp .env.example .env.local

# 4. PostgreSQL — create DB and run migrations (see Database section)

# 5. Python backend
cd opsmemory-backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 6. Frontend (new terminal, repo root)
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

- **API docs:** http://localhost:8000/docs  
- **Dashboard:** http://localhost:5173/dashboard  
- **Health:** http://localhost:8000/health  

---

## Environment variables

### Backend (`opsmemory-backend/.env`)

Copy from `opsmemory-backend/.env.example`. Pydantic loads lowercase keys from `.env`.

| Variable | Required | Description |
|----------|----------|-------------|
| `supabase_url` | Yes* | Supabase project URL (*required by config; local dev uses PostgreSQL client in `database.py`) |
| `supabase_service_role_key` | Yes* | Service role key |
| `supabase_anon_key` | Yes* | Anon key |
| `openrouter_api_key` | Yes | LLM, embeddings, Whisper via OpenRouter |
| `openrouter_base_url` | No | Default `https://openrouter.ai/api/v1` |
| `clerk_secret_key` | Yes | JWT verification |
| `clerk_publishable_key` | Yes | Clerk app key |
| `clerk_jwt_issuer` | Yes | Clerk JWT issuer URL |
| `meta_whatsapp_token` | Yes | Meta permanent/temporary access token |
| `meta_whatsapp_verify_token` | Yes | Random string; must match Meta webhook setup |
| `meta_phone_number_id` | Yes | From Meta API Setup |
| `meta_business_account_id` | Yes | WhatsApp Business Account ID |
| `meta_graph_api_version` | No | Default `v25.0` |
| `meta_app_secret` | Prod | Meta App Secret for webhook HMAC |
| `whatsapp_provider` | No | `auto`, `meta`, or `twilio` |
| `twilio_account_sid` | Twilio | Twilio account SID |
| `twilio_auth_token` | Twilio | Twilio auth token |
| `twilio_whatsapp_number` | Twilio | e.g. `whatsapp:+14155238886` |
| `twilio_voice_number` | Optional | Voice experiments |
| `elevenlabs_api_key` | Optional | TTS |
| `smtp_*` | Optional | CEO email digests |
| `app_env` | No | `development` or `production` |
| `base_url` | Yes | Public HTTPS URL (tunnel or deployed host) |
| `secret_key` | Yes | App secret; generate with `openssl rand -hex 32` |
| `OPSMEMORY_DB_*` | No | Override local Postgres connection (see `.env.example`) |

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend URL. Use `http://localhost:8000` or leave empty in dev to use Vite proxy. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Only if re-enabling Clerk on the frontend |

---

## Database setup & migrations

Local development uses **PostgreSQL** via `app/database.py` (not live Supabase HTTP for queries). Default connection:

- Host: `localhost`
- Port: `5433`
- Database: `opsmemory`
- User / password: `postgres` / `postgres` (override with `OPSMEMORY_DB_*` env vars)

### Create database

```bash
# Example: Postgres listening on 5433
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE opsmemory;"
```

### Run migrations (in order)

```bash
export PGPASSWORD=postgres
export PGHOST=localhost
export PGPORT=5433
export PGUSER=postgres
export PGDATABASE=opsmemory

psql -f opsmemory-backend/migrations/001_initial_schema.sql
psql -f opsmemory-backend/migrations/002_agent_campaigns.sql
psql -f opsmemory-backend/migrations/003_seed_data.sql
psql -f opsmemory-backend/migrations/004_knowledge_base.sql
psql -f opsmemory-backend/migrations/005_schema_updates.sql
psql -f opsmemory-backend/migrations/005_bola_agro_demo.sql
psql -f opsmemory-backend/migrations/006_sync_demo_dashboard.sql
```

### Seed catalog + embeddings (requires OpenRouter)

```bash
cd opsmemory-backend
source venv/bin/activate
python scripts/seed_bola_catalog.py
```

This inserts Bola Agro SKUs, FAQs, policies, and vector embeddings into `knowledge_base`.

---

## Running the application

### Development (manual)

**Backend:**

```bash
cd opsmemory-backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Vite proxies `/api` and `/webhook` to `http://127.0.0.1:8000` (see `vite.config.ts`).

### Production-style (systemd, Linux)

Install units from `deploy/systemd/`:

```bash
sudo cp deploy/systemd/opsmemory-backend.service /etc/systemd/system/
sudo cp deploy/systemd/opsmemory-cloudflared.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable opsmemory-backend opsmemory-cloudflared
sudo systemctl start opsmemory-backend opsmemory-cloudflared
```

| Command | Purpose |
|---------|---------|
| `systemctl status opsmemory-backend` | API health |
| `systemctl status opsmemory-cloudflared` | Tunnel health |
| `cat tunnel-url.txt` | Current public webhook base URL |
| `journalctl -u opsmemory-cloudflared -f` | Tunnel logs |

### Build frontend for production

```bash
npm run build
npm run preview   # optional local preview
```

Cloudflare Workers entry: `src/server.ts` (see `wrangler.jsonc`).

---

## WhatsApp webhooks (Meta + Twilio)

Replace `{BASE_URL}` with your public HTTPS origin (from `tunnel-url.txt` or deployment).

Replace `{BUSINESS_ID}` with your tenant UUID (demo: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`).

### Meta WhatsApp Cloud API

| Setting | Value |
|---------|--------|
| **Callback URL** | `{BASE_URL}/webhook/whatsapp/{BUSINESS_ID}` |
| **Verify token** | Same as `meta_whatsapp_verify_token` in `.env` |
| **Method** | GET (verify), POST (messages) |

Meta Developer → WhatsApp → Configuration → Webhook.

**Test number:** Configure in Meta API Setup; add your phone as a test recipient.

### Twilio WhatsApp sandbox

| Setting | Value |
|---------|--------|
| **When a message comes in** | `{BASE_URL}/webhook/twilio/{BUSINESS_ID}` |
| **Method** | HTTP POST |

Twilio Console → Messaging → Try WhatsApp → Sandbox settings.

**Important:** Use `/webhook/twilio/`, **not** `/webhook/whatsapp/`. Paths are not interchangeable.

**Sandbox number:** Join by sending the join code to `+1 415 523 8886` (or your console’s sandbox number).

### Validate token (Meta)

```bash
curl -s "https://graph.facebook.com/v25.0/{META_PHONE_NUMBER_ID}" \
  -H "Authorization: Bearer {META_WHATSAPP_TOKEN}"
```

Should return phone metadata, not `OAuthException`.

---

## Cloudflare tunnel (24/7 webhooks)

Quick tunnels (`*.trycloudflare.com`) are used for development. The URL **changes when the tunnel restarts**.

### Managed service (recommended on VPS)

```bash
# URL written to tunnel-url.txt and base_url in .env
systemctl start opsmemory-cloudflared
cat /root/OpsMemory/tunnel-url.txt
```

After restart, update **Meta** and **Twilio** webhook URLs to the new host.

### Manual one-off tunnel

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

### Fixed hostname (production)

Use a [named Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) with `cloudflared tunnel login` and a custom subdomain. Quick tunnels are not suitable for production webhooks.

---

## Dashboard & demo auth

### URLs

| Page | Path |
|------|------|
| Mission control | `/dashboard` |
| Customers | `/dashboard/customers` |
| Demo test customer | `/dashboard/customers/6a8908d4-48e3-49c5-a765-ec25904d1cf5` |
| Approvals | `/dashboard/approvals` |
| Knowledge / catalog | `/dashboard/knowledge` |
| Agents | `/dashboard/agents` |

### Demo mode (current default)

- Clerk is **disabled** on the frontend (`__root.tsx`).
- Dashboard uses a dev JWT in `localStorage` (`opsmemory-demo-token`).
- Backend with `APP_ENV=development` accepts JWTs with relaxed signature verification.

Opening `/dashboard` auto-installs demo auth as CEO for business `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`.

### Re-enabling Clerk (production path)

1. Uncomment `ClerkProvider` in `src/routes/__root.tsx`.
2. Set `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local`.
3. Set `APP_ENV=production` on the backend.
4. Ensure `public_metadata.business_id` and `role` are set on Clerk users.

---

## Background jobs

Scheduler (`app/jobs/scheduler.py`), timezone **Africa/Lagos**:

| Job | Schedule | Behavior |
|-----|----------|----------|
| `morning_digest` | 07:00 daily | CEO email digest |
| `agent_sweep` | Every 30 min | Collections, Churn, Fulfillment, Revenue Pulse, Relationship |
| `campaign_continuations` | Every 4 h | Collections / Churn campaign steps |

Deal agent runs on webhook path, not the 30-minute sweep.

---

## Production deployment notes

| Layer | Suggested hosting |
|-------|-------------------|
| Frontend | Vercel, Cloudflare Pages, or static + Workers (`wrangler.jsonc`) |
| Backend | VPS with systemd, Railway, Fly.io |
| Database | Supabase Postgres + pgvector, or managed PostgreSQL |
| Webhooks | Named Cloudflare Tunnel or load balancer with TLS |

1. Set `APP_ENV=production`.
2. Point `database.py` / Supabase client at production Postgres.
3. Run all migrations on production DB.
4. Configure CORS to your frontend origin only.
5. Use secrets manager or platform env vars — not committed `.env` files.

---

## Troubleshooting

### Meta replies appear in Twilio chat

- Meta outbound failed (expired token) and an older build fell back to Twilio. **Fix:** Refresh `meta_whatsapp_token`; ensure strict channel routing (current code does not cross-post).
- Verify token: `curl` Graph API call above.

### Twilio messages get no reply

- Webhook URL must be `/webhook/twilio/{BUSINESS_ID}`, method POST.
- Check Twilio Monitor → Logs for failed webhook deliveries.
- Confirm tunnel URL is current: `cat tunnel-url.txt`.
- Server logs should show: `Twilio inbound for business ...`

### Dashboard shows stale or empty data

- Hard refresh (`Ctrl+Shift+R`).
- Confirm backend is running: `curl http://localhost:8000/health`.
- Check browser network tab: `/api/customers/` should return 200.
- `VITE_API_BASE_URL` must reach the backend from the browser (use server IP or proxy).

### `Meta API error 401`

- Token expired. Generate a new permanent token in Meta Developer Console → API Setup.

### `json.decoder.JSONDecodeError` on webhook

- Twilio POST sent to Meta URL (`/webhook/whatsapp/...`). Use correct path per provider.

### Firewall (remote VPS)

```bash
sudo ufw allow 5173/tcp   # frontend
sudo ufw allow 8000/tcp   # backend (optional if only using tunnel)
```

---

## Project structure

```text
OpsMemory/
├── src/                          # TanStack Start frontend
│   ├── routes/                   # File-based routes (/dashboard/*)
│   ├── components/               # UI, dashboard, knowledge
│   ├── store/                    # Zustand (events, agents, approvals)
│   └── lib/                      # api.ts, dev-auth.ts, mappers
├── opsmemory-backend/
│   ├── main.py                   # FastAPI entry (uvicorn main:app)
│   ├── app/
│   │   ├── routers/              # API + webhooks
│   │   ├── services/             # agents, extraction, RAG, orchestrator
│   │   └── jobs/                 # APScheduler
│   ├── migrations/               # SQL seeds & schema
│   ├── scripts/                  # seed_bola_catalog.py, cloudflared-tunnel.sh
│   └── .env.example              # Secret template (safe to commit)
├── deploy/systemd/               # 24/7 backend + tunnel units
├── vite.config.ts                # Lovable TanStack config + API proxy
├── wrangler.jsonc                # Cloudflare Workers
├── .env.example                  # Frontend template
└── tunnel-url.txt                # Gitignored — current tunnel URL
```

---

## License

Proprietary. All rights reserved.
