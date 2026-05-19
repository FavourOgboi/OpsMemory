# OpsMemory — DSN x BCT LLM Agent Challenge

> **AI agents that understand how people behave, what they want, and what they'll choose next.**

Built for the [DSN × BCT LLM Agent Challenge](https://dsnxbct.com) — a hackathon tasking teams with building LLM-powered user modeling (Task A) and recommendation engines (Task B) using real-world review datasets.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Task A: Review Intelligence (User Modeling)](#task-a-review-intelligence)
- [Task B: Recommendation Engine](#task-b-recommendation-engine)
- [Nigerian Context](#nigerian-context)
- [Demo Mode](#demo-mode)
- [Deployment (Render)](#deployment-render)
- [Evaluation](#evaluation)
- [Implementation Status](#implementation-status)
- [Testing Guide](#testing-guide)
- [Future Improvements](#future-improvements)

---

## Quick Start

### Prerequisites
- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **PostgreSQL 15+** (local install or Docker)

### 1. Clone & Install

```bash
git clone https://github.com/FavourOgboi/OpsMemory.git
cd mission-control

# Frontend
npm install

# Backend
cd opsmemory-backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Create the database
createdb -U postgres opsmemory

# Run all migrations (tables, indexes, extensions)
cd opsmemory-backend
python scripts/migrate_all.py
```

### 3. Ingest Yelp Dataset

Place Yelp JSON files in `opsmemory-backend/data/`, then:
```bash
python scripts/ingest_datasets.py
```

### 4. Configure Environment

Copy `.env.example` to `.env` and set your OpenRouter API key:
```bash
cp .env.example .env
# Edit .env → set OPENROUTER_API_KEY=sk-or-...
```

### 5. Run

```bash
cd mission-control
npm run dev
# Frontend → http://localhost:8081
# Backend  → http://localhost:8000
```

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              Frontend (Vite + React)          │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐  │
│  │ Review   │ │ Recommend    │ │ Dashboard│  │
│  │ Intel UI │ │ Engine Chat  │ │ & CRM    │  │
│  └────┬─────┘ └──────┬───────┘ └────┬─────┘  │
│       │              │              │        │
├───────┼──────────────┼──────────────┼────────┤
│       ▼              ▼              ▼        │
│           FastAPI Backend (Port 8000)        │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐  │
│  │ /reviews │ │ /recommend   │ │ /api/*   │  │
│  │ Router   │ │ Router       │ │ Routers  │  │
│  └────┬─────┘ └──────┬───────┘ └────┬─────┘  │
│       ▼              ▼              │        │
│  ┌──────────────────────────┐       │        │
│  │ LLM Client (OpenRouter)  │       │        │
│  │ → GPT-4o-mini / Llama    │       │        │
│  └──────────────────────────┘       │        │
│       │              │              │        │
│       ▼              ▼              ▼        │
│  ┌──────────────────────────────────────┐    │
│  │     PostgreSQL (opsmemory DB)        │    │
│  │  external_users · external_items     │    │
│  │  external_reviews · generated_reviews│    │
│  │  recommendation_sessions · app_users │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

---

## Task A: Review Intelligence

**Goal:** Given a user persona + item, simulate an authentic review (star rating + text).

### How It Works
1. **Profile-based mode** (`POST /reviews/simulate/profile`): Fetches user's real behavioral profile + 5 past reviews from the Yelp dataset, then generates a review matching their tone, style, and rating tendency.
2. **Persona-based mode** (`POST /reviews/simulate/persona`): Takes a free-form persona object (avg_rating, tone, writing style, complaints, praises) — no DB lookup needed.

### Key Design Decisions
- **Style matching**: Up to 5 past reviews injected as few-shot context for the LLM to mirror vocabulary, sentence structure, and review length
- **Behavioral anchoring**: Average rating tendency constrains the predicted star rating
- **Nigerian Pidgin mode**: Activatable per-request — generates reviews in authentic Pidgin English
- **Structured output**: JSON response format enforced via `response_format={"type": "json_object"}`

### API Examples

```bash
# From real user profile (requires data ingested)
curl -X POST http://localhost:8000/reviews/simulate/profile \
  -H "Content-Type: application/json" \
  -d '{"user_id": "...", "item_id": "...", "force_nigerian": false}'

# From persona (no DB needed — works immediately)
curl -X POST http://localhost:8000/reviews/simulate/persona \
  -H "Content-Type: application/json" \
  -d '{
    "persona": {
      "avg_rating": 4.2,
      "tone": "enthusiastic",
      "language_style": "casual",
      "common_praises": ["great customer service", "fast delivery"],
      "writing_personality": "Writes long positive reviews"
    },
    "item_name": "Mama Put Restaurant",
    "item_category": "Nigerian Restaurant",
    "nigerian_context": true
  }'
```

---

## Task B: Recommendation Engine

**Goal:** Multi-turn conversational recommendations with cold-start handling and cross-domain switching.

### How It Works
1. **Start session** (`POST /recommend/start`): User describes what they want → agent either asks preference questions (cold-start) or directly recommends (if user profile exists)
2. **Continue session** (`POST /recommend/continue`): Multi-turn refinement — agent updates preferences, re-ranks candidates, handles domain switches

### Key Design Decisions
- **Cold-start protocol**: When no user profile exists, agent asks 2 targeted questions before recommending
- **Cross-domain**: Detects when user mentions books/products vs restaurants and switches catalogs
- **Candidate retrieval**: Top items by review count fetched from PostgreSQL, injected into LLM context
- **Session persistence**: Full conversation history stored in `recommendation_sessions` table
- **Preference tracking**: Gathered preferences (cuisine, price, location) merged across turns

### API Examples

```bash
# Start a cold-start session
curl -X POST http://localhost:8000/recommend/start \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to find a good suya spot in Lagos", "source": "yelp"}'

# Continue the conversation
curl -X POST http://localhost:8000/recommend/continue \
  -H "Content-Type: application/json" \
  -d '{"session_id": "...", "message": "Something affordable, open late"}'
```

---

## Nigerian Context

The system is contextualized for Nigerian users (bonus marks criteria):

- **Pidgin English** review generation with authentic vocabulary (oga, abeg, na wa o, chop well)
- Nigerian business context (Bola Agro catalog as sample data)
- Lagos-specific delivery policies, pricing in Naira (₦)
- Nigerian review tone patterns

---

## Demo Mode

For judges and team members to quickly access the full dashboard without creating an account:

| Method | Where | How |
|--------|-------|-----|
| **Double-click logo** | Sign-in or Sign-up page | Double-click the OpsMemory logo → instant dashboard access |
| **Triple-click logo** | Dashboard sidebar | Triple-click the OpsMemory logo → toggle demo mode on/off |

---

## Deployment (Render)

### PostgreSQL (Render)
1. Create a **PostgreSQL** database on Render (free tier works)
2. Copy the **Internal Database URL** from Render dashboard
3. Set environment variables in your Render Web Service:

```env
OPSMEMORY_DB_NAME=<from render>
OPSMEMORY_DB_USER=<from render>
OPSMEMORY_DB_PASSWORD=<from render>
OPSMEMORY_DB_HOST=<from render internal host>
OPSMEMORY_DB_PORT=5432
OPENROUTER_API_KEY=sk-or-...
SECRET_KEY=<random 32+ char string>
APP_ENV=production
BASE_URL=https://your-app.onrender.com
```

### Backend (Render Web Service)
- **Build command:** `cd opsmemory-backend && pip install -r requirements.txt`
- **Start command:** `cd opsmemory-backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- **After first deploy:** Run `python scripts/migrate_all.py` via Render Shell

### Frontend (Render Static Site or same service)
- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- Set `VITE_API_BASE_URL` to backend URL

---

## Evaluation

Run the built-in evaluation script:

```bash
cd opsmemory-backend

# Evaluate Task A (ROUGE-L + RMSE on held-out reviews)
python scripts/evaluate.py --task a --samples 15

# Evaluate Task B (Hit Rate@10 on recommendation sessions)
python scripts/evaluate.py --task b --samples 10

# Both
python scripts/evaluate.py --task all --samples 10
```

Metrics computed:
- **Task A:** ROUGE-L F1, Rating RMSE, per-sample breakdowns
- **Task B:** Hit Rate@10, cold-start vs warm-start comparison

---

## Implementation Status

### ✅ Fully Implemented
| Feature | Files |
|---------|-------|
| Task A: Review simulation (profile + persona modes) | `review_engine.py`, `reviews.py` |
| Task A: Review Intelligence UI (user select, generate, view) | `ReviewIntelligence.tsx` |
| Task B: Multi-turn recommendation sessions | `recommendation_engine.py`, `recommendations.py` |
| Task B: Recommendation chat UI with cold-start | `RecommendationEngine.tsx` |
| Cross-domain detection (Yelp ↔ Amazon phrase triggers) | `recommendation_engine.py` |
| Cold-start protocol (2-question warmup) | `recommendation_engine.py` |
| Nigerian Pidgin review generation | `review_engine.py` |
| Yelp dataset ingestion (business, user, review) | `ingest_datasets.py` |
| Evaluation script (ROUGE-L, RMSE, Hit Rate) | `evaluate.py` |
| Local auth (register, login, JWT) | `local_auth.py` |
| 6-step business onboarding flow | `OnboardingShell.tsx`, Steps 1–6 |
| First-time dashboard tour (7 steps) | `TourOverlay.tsx`, `useTour.ts` |
| Demo mode (double-click / triple-click) | `Sidebar.tsx`, sign-in/sign-up pages |
| PostgreSQL migrations (20+ tables + indexes) | `migrate_all.py` |
| Full dashboard (CRM, Analytics, Approvals, Event Stream) | `src/routes/dashboard/*` |

### ⚠️ Needs Testing / Perfecting Before Submission (May 24)
| Item | What's Needed | Priority |
|------|---------------|----------|
| **Yelp data ingestion** | Run `ingest_datasets.py` with OpenRouter key to populate DB + build behavior profiles | 🔴 Critical |
| **OpenRouter API key** | Get key from openrouter.ai/keys — without it, Task A + B LLM calls fail | 🔴 Critical |
| **Evaluation metrics** | Run `evaluate.py` after ingestion to get ROUGE/RMSE/Hit Rate numbers for the paper | 🔴 Critical |
| **Solution Paper** | Write 4–8 page paper (approach, architecture, experiments, ablation studies) | 🔴 Critical |
| **Containerization** | Test Dockerfile end-to-end, ensure `docker compose up` works for judges | 🟡 High |
| **Render deployment** | Deploy and verify all API endpoints work in production | 🟡 High |
| **Prompt tuning** | Test review quality, adjust temperature/prompt for higher ROUGE scores | 🟡 High |
| **Cross-domain test** | Verify domain switching actually works with populated data | 🟡 Medium |

### 🔮 Future Improvements (Post-Hackathon)
| Feature | Description |
|---------|-------------|
| pgvector semantic search | Vector similarity for candidate retrieval instead of review count sorting |
| BERTScore evaluation | Add BERTScore alongside ROUGE for richer text quality metrics |
| Fine-tuned model | Train a LoRA adapter on Yelp reviews for better style mimicry |
| WhatsApp live integration | Connect Twilio/Meta API for real customer conversations |
| Multi-agent orchestration | Full 6-agent system (Memory, Finance, Ops, Sales, Campaign, Escalation) |
| Voice note transcription | Process WhatsApp voice notes via Whisper API |
| Payment verification | Automated bank transfer matching |
| Real-time analytics | WebSocket-powered live dashboard updates |

---

## Testing Guide

### Test Task A (Review Intelligence)

1. **Via UI:** Go to Dashboard → Review Intelligence → Select a user + item → Click "Generate"
2. **Via API (persona mode — no data needed):**
   ```bash
   curl -X POST http://localhost:8000/reviews/simulate/persona \
     -H "Content-Type: application/json" \
     -d '{
       "persona": {"avg_rating": 4.0, "tone": "positive", "language_style": "casual"},
       "item_name": "Test Restaurant",
       "item_category": "Restaurant",
       "nigerian_context": true
     }'
   ```
3. **Via API (profile mode — requires ingested data):**
   ```bash
   curl -X POST http://localhost:8000/reviews/simulate/profile \
     -H "Content-Type: application/json" \
     -d '{"user_id": "<from DB>", "item_id": "<from DB>"}'
   ```

### Test Task B (Recommendations)

1. **Via UI:** Go to Dashboard → Recommendations → Type a message like "I want spicy food"
2. **Via API:**
   ```bash
   # Start
   curl -X POST http://localhost:8000/recommend/start \
     -H "Content-Type: application/json" \
     -d '{"message": "recommend a good restaurant", "source": "yelp"}'

   # Continue (use session_id from above)
   curl -X POST http://localhost:8000/recommend/continue \
     -H "Content-Type: application/json" \
     -d '{"session_id": "...", "message": "something affordable and spicy"}'
   ```

### Test Cold-Start
- Start a session WITHOUT `user_id` — the agent should ask preference questions first
- After answering, it should recommend

### Test Nigerian Pidgin
- Set `force_nigerian: true` in Task A requests
- The review should contain Pidgin phrases (oga, abeg, e good sha, etc.)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite 7, React 19, TanStack Router, Framer Motion, Zustand |
| Backend | FastAPI, Uvicorn, APScheduler |
| Database | PostgreSQL 18 (local) / Render PostgreSQL (production) |
| LLM | OpenRouter (GPT-4o-mini, Llama 3.1) |
| Auth | bcrypt + PyJWT (local auth, no third-party) |
| Evaluation | rouge-score, psycopg2 |

---

## Team

Built for the **DSN × BCT LLM Agent Challenge** (May 2026).

**Deadline:** May 24, 2026 — End of Day.
