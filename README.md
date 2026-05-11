# OpsMemory — Mission Control

OpsMemory is a high-performance, multi-tenant operational intelligence platform designed for businesses operating on WhatsApp. It transforms every customer message into structured operational memory, actively monitored by six autonomous AI agents to drive operational efficiency.

## 🏗 System Architecture

The project is structured as a modern full-stack application, cleanly separating a high-performance React frontend from an AI-driven Python backend.

### 🎨 Frontend (Mission Control Dashboard)
Located in the root directory.
- **Framework:** TanStack Start (React 19 + Vite + TanStack Router).
- **Styling:** Tailwind CSS v4, Framer Motion for micro-animations and dynamic transitions, Radix UI for accessible components.
- **State Management:** Zustand for real-time event streams, agent status tracking, and approval queues.
- **Authentication:** Clerk (`@clerk/tanstack-react-start`) providing secure, session-based multi-tenant access.
- **Features:** 
  - Live Event Stream and Agent Reasoning Panels.
  - Interactive multi-role dashboard (Overview, Customers, Agents, Approvals, Finance, Intelligence).
  - Advanced data visualizations using Recharts.
  - Dark mode support and responsive design.

### ⚙️ Backend (FastAPI Data Layer & Agents)
Located in the `opsmemory-backend/` directory.
- **Framework:** FastAPI (Python) for a high-concurrency async API.
- **Database:** Supabase (PostgreSQL) handling robust, business-scoped, multi-tenant data storage.
- **AI Agents:** OpenAI-driven extraction and reasoning for six autonomous watchdogs (Collections, Churn, Deal, Fulfillment, Revenue Pulse, Relationship Health).
- **Communication:** Twilio integration for voice interfaces, SMS, and an automated WhatsApp webhook pipeline.
- **Reporting:** Automated PDF passport generation (ReportLab) and SMTP emailing for regular CEO reporting.
- **Task Scheduling:** APScheduler for asynchronous background tasks and routine checks.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python (3.10+)
- Accounts and API Keys for: Clerk, Supabase, OpenAI, Twilio.

### 1. Environment Configuration

We use separate environment files to isolate public keys from private secrets.

**Frontend Configuration (`/.env`):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Backend Configuration (`/opsmemory-backend/.env`):**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
# Add any other required secrets
```

### 2. Running the Frontend (Vite)

Open a terminal in the root directory:
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend is available at `http://localhost:5173`.

### 3. Running the Backend (FastAPI)

Open a separate terminal and navigate to the backend directory:
```bash
cd opsmemory-backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```
The backend API is available at `http://localhost:8000`. You can view the interactive API documentation at `http://localhost:8000/docs`.

---

## 📂 Core Directory Structure

```text
mission-control/
├── src/                    # Frontend React codebase (TanStack Start)
│   ├── components/         # Reusable UI, dashboard layouts, and complex visualizations
│   ├── routes/             # File-based routing (Dashboard, Sign-in, Sign-up, etc.)
│   ├── store/              # Zustand state stores (Agent Status, Approvals, Events)
│   └── lib/                # Utilities and mock data structures
├── opsmemory-backend/      # Backend Python codebase (FastAPI)
│   ├── app/
│   │   ├── routers/        # API Endpoints (webhooks, analytics, voice, chat, etc.)
│   │   ├── services/       # Business logic (agents, RAG, campaign management)
│   │   └── jobs/           # Background scheduler (APScheduler)
│   ├── migrations/         # Database migrations (SQL)
│   ├── requirements.txt    # Python dependencies
│   └── main.py             # FastAPI entry point
├── package.json            # Frontend Node dependencies
└── vite.config.ts          # Vite configuration
```

---

## 🤖 Fully Agentic AI System

OpsMemory doesn't just detect situations — it actively manages them across multi-step campaigns.

### Multi-Step Agent Campaigns

Each agent can run autonomous, multi-step campaigns:

1. **Agent evaluates** customer data and proposes an action
2. **Human approves** the action (business approval in the dashboard)
3. **Agent executes** and then **watches the outcomes**
4. **Agent decides the next step** without waiting for human input
5. **Agent escalates to CEO** only when genuine human judgment is needed

### Collections Agent Campaign Example

**Step 1 (Initial Detection):**
- Customer has ₦500,000 outstanding for 5 days
- Collections Agent proposes: Send gentle payment reminder
- Reminder sent → Campaign created

**Step 2 (Waiting & Checking - 48 hours later):**
- Scheduler checks: Did payment arrive?
- If YES → Campaign closes successfully
- If NO → Agent sends FIRMER follow-up, still no excuse for payment

**Step 3 (Final Check - 48 hours later):**
- Still no payment?
- Agent escalates to CEO with full context:
  - Customer's lifetime value
  - Payment history
  - Conversation record
  - Recommended next action (personal call, write-off, etc.)

**CEO sees escalation** with data-backed recommendation, not just a notification.

### Campaign Persistence (`agent_campaigns` table)

All campaigns are tracked in the database:
- `status`: active, goal_achieved, escalated, abandoned
- `current_step`: Which step of the multi-step process
- `context`: JSONB storing all state the agent needs to remember
- `next_check_at`: When the scheduler should re-evaluate
- Campaign log table tracks every decision for full audit trail

### Scheduler Integration

Three background jobs run continuously:
1. **Morning digest** (7am) — CEO summary email
2. **Agent sweep** (every 30 min) — Detect new situations
3. **Campaign continuations** (every 4 hours) — Continue active campaigns

---

## 🔍 Knowledge Base & RAG Integration

Agents now have access to business knowledge:
- Product catalog with pricing and SKUs
- FAQ entries
- Business policies (delivery, payments, returns)
- Uploaded documents (PDFs, TXT, Markdown)

When a customer asks about a product, the agent:
1. Searches the knowledge base using semantic similarity
2. Retrieves relevant product info + pricing
3. Injects into LLM context
4. Responds with accurate, contextual information

Knowledge stored in Supabase with pgvector embeddings (OpenAI text-embedding-3-small).

---

## 🔐 Security & Multi-Tenancy

- **Business Isolation:** Every query scoped by `business_id`. One business cannot access another's data.
- **Role-Based Access:** CEO sees all data. Sales reps see only assigned customers. Finance sees payments only.
- **Webhook Verification:** HMAC-SHA256 signature verification for all incoming webhooks.
- **JWT Authentication:** Clerk integration for secure session management.

---

## 📊 Real-Time Event Stream

Live event types:
- Payment confirmations
- Agent triggers and escalations
- Customer order updates
- System health alerts

All events streamed to the dashboard in real-time via server-sent events or websockets.

---

## 🛠 Development

### Running Tests

```bash
cd opsmemory-backend
pytest tests/

# Or run specific test file
pytest tests/test_agents.py -v
```

### Deploying Changes

The system is designed to deploy on:
- **Frontend:** Vercel, Netlify, or standard web hosting
- **Backend:** AWS Lambda, Railway, Vercel Functions, or self-hosted VPS
- **Database:** Supabase (managed) or self-hosted PostgreSQL with pgvector

---

## 📝 License

Proprietary. All rights reserved.

---

**Questions or feedback?** Check [PRESENTATION_TO_TEAM.md](./PRESENTATION_TO_TEAM.md) for the full technical deep-dive.
