# 🏆 OpsMemory — Hackathon Lock-In Guide
### DSN × BCT LLM Agent Challenge | Deadline: May 24, 2026

> **For the team:** This document explains everything we've built, what still needs to be done, and the exact steps to win.

---

## 🎯 What's the Hackathon About?

Build **two AI agents** using real review datasets:

| Task | What It Does | Our Implementation |
|------|-------------|-------------------|
| **Task A: User Modeling** | Given a user persona + item → generate a realistic review (text + star rating) | ✅ `ReviewIntelligence` page + API |
| **Task B: Recommendation** | Given a user → give personalized recommendations via multi-turn conversation | ✅ `RecommendationEngine` chat + API |

**Three deliverables required:**
1. ✅ **Containerized web app** (our full-stack dashboard with Task A + B built in)
2. ❌ **Solution Paper** (4-8 pages — NOT STARTED, this is 15-25% of score)
3. ✅ **Code Repository** (clean GitHub repo with README)

---

## 📊 Current Score Estimate: 4/10 → Target: 8/10

### What's done vs what's missing:

```
✅ DONE                           ❌ MISSING / NEEDS WORK
─────────────────────────────     ──────────────────────────────
✅ Full web UI (React + Vite)     ❌ Solution paper (0% done)
✅ Task A review engine            ❌ Data not ingested into DB
✅ Task B recommendation engine   ❌ No evaluation metrics yet
✅ Cold-start handling             ❌ OpenRouter API key needed
✅ Cross-domain detection          ❌ Docker not tested end-to-end
✅ Nigerian Pidgin mode            ❌ Render deployment untested
✅ Local auth (replaced Clerk)     ⚠️  Prompt tuning needed
✅ PostgreSQL (replaced Supabase)  ⚠️  Cross-domain weak
✅ 6-step onboarding flow
✅ Dashboard + CRM + Analytics
✅ Evaluation script (evaluate.py)
✅ Dataset ingestion script
✅ Migration script (50 tables)
```

---

## 🔑 Scoring Rubric (What Judges Care About)

### Task A Scoring:
| Criteria | Weight | How We Score |
|----------|--------|-------------|
| Review Text Quality (ROUGE/BERTScore) | 30% | Need to run evaluate.py to get numbers |
| Rating Accuracy (RMSE) | 20% | Need to run evaluate.py |
| Behavioural Fidelity | 25% | Nigerian Pidgin + style matching ✅ |
| **Solution Paper** | **15%** | **NOT WRITTEN — judges read this FIRST** |
| Code Reproducibility | 10% | Clean repo + README ✅ |

### Task B Scoring:
| Criteria | Weight | How We Score |
|----------|--------|-------------|
| Ranking Quality (NDCG@10 / Hit Rate) | 30% | Need to run evaluate.py |
| Cold-Start & Cross-Domain | 25% | Both implemented ✅ |
| Contextual Relevance | 20% | Multi-turn chat ✅, Pidgin ✅ |
| **Solution Paper** | **15%** | **NOT WRITTEN** |
| Code Reproducibility | 10% | Clean repo + README ✅ |

> ⚠️ **"The paper is what we read first"** — literal quote from the hackathon brief. This is THE most important thing to finish.

---

## 🛠️ Tech Stack (No Clerk, No Supabase)

| What | Technology | Status |
|------|-----------|--------|
| Frontend | Vite + React 19 + TanStack Router | ✅ Running |
| Backend | FastAPI + Uvicorn | ✅ Running |
| Database | PostgreSQL 18 (local) | ✅ Connected |
| LLM | OpenRouter (GPT-4o-mini) | ⚠️ Need API key |
| Auth | Local (bcrypt + JWT) | ✅ Replaced Clerk |
| Dataset | Yelp (5.3GB reviews) | ✅ Downloaded, ❌ Not ingested |

---

## 📱 How to Test

### Start the app:
```bash
cd mission-control
npm run dev
# Frontend: http://localhost:8081
# Backend:  http://localhost:8000
```

### Test Task A (Review Intelligence):
```bash
# No data needed — persona mode
curl -X POST http://localhost:8000/reviews/simulate/persona \
  -H "Content-Type: application/json" \
  -d '{
    "persona": {"avg_rating": 4.0, "tone": "positive"},
    "item_name": "Mama Put Restaurant",
    "item_category": "Nigerian Restaurant",
    "nigerian_context": true
  }'
```

### Test Task B (Recommendations):
```bash
curl -X POST http://localhost:8000/recommend/start \
  -H "Content-Type: application/json" \
  -d '{"message": "I want spicy food", "source": "yelp"}'
```

### Demo Mode (for judges):
- **Double-click** the OpsMemory logo on sign-in → instant dashboard
- **Triple-click** the sidebar logo → toggle demo data

---

## 🔴 5-DAY ACTION PLAN

### Day 1 (May 19) — DATA PIPELINE
- [ ] Get OpenRouter API key: https://openrouter.ai/keys
- [ ] Add key to `.env`: `OPENROUTER_API_KEY=sk-or-...`
- [ ] Run: `python scripts/ingest_datasets.py`
- [ ] Verify: `psql -U postgres opsmemory -c "SELECT COUNT(*) FROM external_users;"`
- [ ] Test Task A via curl (profile mode — needs real data)
- [ ] Test Task B via curl (should show real candidates)

### Day 2 (May 20) — EVALUATION & TUNING
- [ ] Install: `pip install rouge-score`
- [ ] Run: `python scripts/evaluate.py --task all --samples 15`
- [ ] Record ROUGE-L, RMSE, Hit Rate numbers
- [ ] Tune prompts if scores are low
- [ ] Run evaluation again → compare
- [ ] Repeat 3-5 times

### Day 3 (May 21) — SOLUTION PAPER 📝
> **THE MOST IMPORTANT DAY**

Paper outline (4-8 pages):
1. Abstract
2. System Architecture (include the diagram from README)
3. Task A: User Modeling approach + results (ROUGE, RMSE)
4. Task B: Recommendation approach + results (Hit Rate)
5. Nigerian Contextualization
6. Ablation Studies (with/without past reviews, with/without Pidgin)
7. Limitations & Future Work

### Day 4 (May 22) — CONTAINERIZATION & DEPLOY
- [ ] Test: `docker compose up`
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Render
- [ ] Test all API endpoints on production URL
- [ ] Verify judges can reproduce

### Day 5 (May 23-24) — POLISH & SUBMIT
- [ ] Final code cleanup
- [ ] Record 2-min demo video
- [ ] Final paper proofread
- [ ] Submit via the form before midnight May 24

---

## 🗂️ Key Files to Know

```
mission-control/
├── src/                              # Frontend (React)
│   ├── routes/
│   │   ├── sign-up.$.tsx             # Sign up (local auth)
│   │   ├── sign-in.$.tsx             # Sign in (local auth)
│   │   ├── onboarding.tsx            # 6-step setup
│   │   └── dashboard.tsx             # Main layout
│   ├── components/
│   │   ├── review/ReviewIntelligence.tsx   # Task A UI
│   │   ├── recommendations/RecommendationEngine.tsx  # Task B UI
│   │   └── onboarding/              # Steps 1-6
│   └── store/
│       ├── useAuth.ts                # Auth state (JWT)
│       ├── useOnboarding.ts          # Onboarding state
│       └── useTour.ts                # Tour state
│
├── opsmemory-backend/                # Backend (FastAPI)
│   ├── app/
│   │   ├── routers/
│   │   │   ├── reviews.py            # Task A endpoints
│   │   │   ├── recommendations.py    # Task B endpoints
│   │   │   └── local_auth.py         # Auth (bcrypt + JWT)
│   │   ├── services/
│   │   │   ├── review_engine.py      # Task A core logic
│   │   │   └── recommendation_engine.py  # Task B core logic
│   │   └── database.py              # PostgreSQL client
│   ├── scripts/
│   │   ├── migrate_all.py            # Create all tables
│   │   ├── ingest_datasets.py        # Load Yelp data
│   │   └── evaluate.py              # Compute metrics
│   └── data/                         # Yelp JSON files go here
│       ├── yelp_academic_dataset_business.json (118MB)
│       ├── yelp_academic_dataset_review.json (5.3GB)
│       └── yelp_academic_dataset_user.json (3.3GB)
│
├── docker-compose.yml                # PostgreSQL + backend + frontend
├── Dockerfile                        # Container build
└── README.md                         # Main README
```

---

## 🤫 Secret Demo Access

Only we know about these:
- **Sign-in/Sign-up page:** Double-click the OpsMemory logo → goes straight to dashboard
- **Dashboard sidebar:** Triple-click the OpsMemory logo → toggles demo mode

---

## 💡 Competitive Advantages

1. **Full web app** — most teams will submit bare API endpoints
2. **Nigerian Pidgin** — bonus marks for cultural contextualization
3. **Multi-turn sessions** — not just single-shot recommendations
4. **Cold-start protocol** — agent asks questions first for unknown users
5. **Beautiful UI** — judges will be impressed by the production quality
6. **Session persistence** — recommendations stored in PostgreSQL
7. **Evaluation built-in** — we compute our own ROUGE/RMSE/Hit Rate

---

## ⚡ Bonus Nigerian Mark

The hackathon brief says: *"Additional marks if contextualized to behave and sound like Nigerians"*

Our implementation:
- ✅ Nigerian Pidgin review generation (oga, abeg, na wa o, e good sha)
- ✅ Nigerian business context (Bola Agro catalog — Lagos-based)
- ✅ Naira (₦) pricing
- ✅ Lagos delivery zones
- ✅ Nigerian writing style patterns

---

## Questions? Concerns?

If anything breaks:
1. Check PostgreSQL is running: `Get-Service -Name "postgresql*"`
2. Check backend: `http://localhost:8000/health`
3. Check frontend: `http://localhost:8081`
4. Check .env has `OPENROUTER_API_KEY` set

---

## 🔴 Critical 3-Day Lock-In Plan

### Day 1: Data Pipeline & Evaluation
**Goal:** Get real data flowing and get numbers for the paper
- Get an OpenRouter API key (https://openrouter.ai/keys) — even $5 credit is enough
- Run `python scripts/ingest_datasets.py` — this takes 1-3 hours for 5.3GB of reviews
- Verify data: `psql -U postgres opsmemory -c "SELECT COUNT(*) FROM external_users;"`
- Run `python scripts/evaluate.py --task all --samples 15`
- Record ROUGE-L, RMSE, Hit Rate numbers
- Tune prompts based on results (adjust temperature, add few-shot examples)

### Day 2: Solution Paper & Containerization
**Goal:** Write the paper (judges read this FIRST) and test deployment
- Write the 4-8 page paper covering: Abstract, Approach, Task A & B results, Nigerian Contextualization, and Ablation Studies.
- Test `docker compose up` end-to-end
- Deploy to Render — verify all endpoints work
- Test containerized version matches local results

### Day 3: Polish & Submit
**Goal:** Clean submission
- Final code cleanup, comments, docstrings
- Record a 2-min demo video (optional but powerful)
- Final paper review
- Submit all three deliverables via the form

### What Would Win This Hackathon
Based on the rubric, here's what separates winners from everyone else:

**Winners will have:**
- Strong paper (judges read this first) — clear reasoning, not just "we used GPT"
- Real numbers — ROUGE > 0.3, RMSE < 1.0, Hit Rate > 0.4
- Ablation studies — "removing past reviews dropped ROUGE by 15%"
- One-command setup — `docker compose up` and it works
- Nigerian bonus — authentic Pidgin, not caricature

**Our advantages:**
- 🟢 Beautiful web UI (most teams will submit bare API endpoints)
- 🟢 Full-stack production app (impressive for hackathon)
- 🟢 Nigerian Pidgin is well-engineered
- 🟢 Multi-turn recommendation with session persistence
- 🟢 Cold-start + cross-domain are both implemented
- 🟢 Clean, modular codebase

**Our risks:**
- 🔴 Paper not started — this is 15-25% of total score
- 🔴 No evaluation numbers yet — can't prove anything works
- 🔴 Yelp data = American users — Nigerian contextualization is prompt-level only
- 🔴 Cross-domain is keyword-based, not semantic
- 🟡 NDCG@10 not implemented (only Hit Rate)

---

## 🎯 What the System Must Do Before Submission (MVP Checklist)
To win this hackathon, we must ensure the following core functionalities are fully working and presentable before the deadline:

### 1. Seamless WhatsApp Number Integration
- **Functionality:** When a business registers their WhatsApp number with our system via the WhatsApp Business API, **anyone** who messages that number must instantly get a response from the OpsMemory AI agent.
- **Goal:** Prove the AI acts as a 24/7 customer service and sales representative using the specific business context.

### 2. Media Handling (Images & Voice Notes)
- **Voice Notes:** If a customer sends a voice note, the system must use audio transcription (e.g., Whisper) to convert it to text, process the intent, and reply. The dashboard must display a playable audio element alongside the text.
- **Images:** If a customer sends a picture (e.g., "Do you have this exact shoe?"), the system must process it via a Vision AI (e.g., GPT-4o Vision), compare it against the product catalog, and respond appropriately. The dashboard must display the actual image received.

### 3. Real-Time Dashboard Updates
- **Functionality:** When a brand-new customer messages the WhatsApp number for the first time, the system must automatically create a new customer profile in the database.
- **Live Sync:** The dashboard must update instantly (via WebSockets or polling) to show the new customer in the sidebar. The business owner must be able to click their name and watch the AI chatting with them *live* without refreshing the page.

### 4. The Yelp Dataset Benchmark
- **The "Why":** Real businesses will NOT use Yelp data (they will upload their own catalogs). However, for the Hackathon's strict rubric (Task A & Task B), we must use the massive 5.3GB Yelp dataset as a "stress test".
- **Goal:** By proving our recommendation engine and review intelligence can handle millions of complex Yelp reviews flawlessly, we show the judges that our system can easily scale and recommend a local business's specific products. This is strictly our proof-of-concept for the hackathon judging criteria.

---

## 🚀 Future Implementations (Post-MVP Core Features)
While our hackathon MVP focuses on chat and recommendations, the complete vision for OpsMemory includes:
- **Automated AI Voice Calls:** Enabling the AI to handle inbound and outbound customer service and sales calls directly.
- **Payment Verification Integration:** Connecting directly to bank APIs, PayPal, Paystack, or Flutterwave to automatically verify incoming payment alerts and complete orders without human intervention.
- **Advanced Media Handling:** Allowing the AI to generate images on-the-fly for products and process customer voice notes through real-time transcription.

---

## 👥 Team Task Delegation (Lock-In Plan)
To ensure we hit our 3-day deadline, responsibilities are split as follows:

### Darious
- **Focus:** The "Risks" & The Solution Paper
- **Responsibilities:**
  - Execute the NLP evaluations (ROUGE-L, RMSE, Hit Rate) to get our real numbers.
  - Write the 4-8 page Solution Paper (Abstract, Approach, Ablation Studies).
  - Address and mitigate the risks listed above to ensure maximum points from the judges.

### User
- **Focus:** Personalization, Authentication & Team Invite Flow
- **Responsibilities:**
  - Lock in the multi-tenant architecture to ensure 100% data isolation between businesses.
  - Finalize the Team Invite logic (when a CEO clicks "Invite", an email is sent, and the invited user is authenticated directly into that specific company's database).
  - Build out the interfaces and role-based access so invited staff only see what they are supposed to see.
