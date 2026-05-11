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
│   │   └── jobs/           # Background scheduler (APScheduler)
│   ├── requirements.txt    # Python dependencies
│   └── main.py             # FastAPI entry point
├── package.json            # Frontend Node dependencies
└── vite.config.ts          # Vite configuration
```
