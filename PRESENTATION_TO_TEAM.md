# OpsMemory — Project Status Report & Frontend/Backend Overview

**Presented to:** Team  
**Date:** May 11, 2026  
**Status:** MVP-ready for testing

---

## Executive Summary

Listen, we've locked in a solid foundation for OpsMemory. The frontend is looking clean — it flows well, the demo works, and every page has a purpose that directly connects to what our backend is doing. On the backend, we've built out the full intelligence pipeline: webhook handlers, AI agents, approval flows, and role-based access. What I want to walk you through today is exactly how each page works, where the data comes from, and what we need from you to actually make this live.

---

## PART 1: FRONTEND FLOWS

### The Architecture

Before I get into each page, here's the big picture: We have a landing page that converts, and then a full dashboard for authenticated users. Every page is built with React, TanStack Router for navigation, and we're using Zustand for state management. The frontend talks to our Python FastAPI backend on every interaction.

---

### Page 1: **Landing Page** (`/`)

**Purpose:** First impression. Get visitors to understand what OpsMemory does and sign them up.

**What's on the page:**
- Hero section with the headline: "Businesses run on WhatsApp. OpsMemory runs the business."
- A phone mockup showing a WhatsApp conversation with a Collections Agent alert
- Section explaining how it works — 6 agents that monitor conversations
- Agent grid showcasing all the agents (Collections, Churn Detection, Deal Intelligence, etc.)
- Memory timeline showing how we build memory over time
- CTA buttons for "Get Early Access" and "Watch Demo"

**How it connects to backend:** 
- This is purely frontend — no backend calls yet. It's all static content.
- When they click "Get Early Access," they go to `/sign-up` (Clerk auth page)
- When they click "Watch Demo," a video modal pops up

**What we're NOT doing yet:**
- Analytics on how many people sign up
- Database tracking of landing page visits

---

### Page 2: **Dashboard / Mission Control** (`/dashboard`)

**Purpose:** The CEO/ops person's command center. Real-time view of everything happening with their customers and agents.

**What's on the page:**
- **Top bar:** "Mission control" + live status indicator ("all systems go")
- **Metric cards:** 
  - Total revenue this period
  - Outstanding payments due
  - Active conversations happening right now
  - Overall health score (average across all customers)
- **Relationship graph:** A visual network showing customers connected to each other (think: who owes who, repeat customers, etc.). This is a D3-based graph.
- **Pending approvals card:** Shows how many agent decisions are waiting on human approval
- **Event stream:** Real-time feed of what's happening (payments received, churn detected, etc.)

**How it connects to backend:**
1. When you land on dashboard, it calls `GET /analytics/pulse` to get:
   - Revenue, outstanding balance
   - Number of pending approvals
   - Number of critical alerts
   - Health score
2. It calls `GET /analytics/agents/status` to show which agents are active/idle and how many actions they're pending
3. It calls `GET /analytics/events` to populate the event stream (last 100 events)
4. The approval count is live — when someone approves or rejects an action, this number updates

**State management:**
- We're using Zustand stores to hold:
  - `useApprovalQueue` — pending approvals
  - `useEventStream` — live events
  - `useAgentStatus` — which agents are firing

---

### Page 3: **Customers / CRM** (`/dashboard/customers`)

**Purpose:** See all your customers at a glance. Track who's at risk, who's healthy, revenue per customer.

**What's on the page:**
- **Search bar:** Find customers by name or business name
- **Risk filter buttons:** Filter by Low/Medium/High risk
- **KPI cards at top:**
  - Total revenue across all customers
  - Total outstanding balance
  - Number of customers at high churn risk
- **Customer list:** Shows each customer as a card with:
  - Their name and business name
  - How long since last order
  - Total revenue they've brought
  - Outstanding balance
  - Churn risk indicator (color-coded)
  - Days of credit they use
- **Click a customer to see their full profile**

**How it connects to backend:**
1. `GET /customers` returns all customers for this business
2. If you're a sales rep, it only shows customers assigned to you (filtered by `assigned_to`)
3. If you click on a customer, it calls `GET /customers/{customer_id}/timeline` which returns:
   - The customer record
   - Their conversation history (last 50 messages)
   - Agent actions triggered about them
   - Their orders
   - All events related to them

**Business logic:**
- This is all read-only from the frontend
- Updating a customer (like reassigning them) calls `PUT /customers/{customer_id}`
- Only CEOs and Managers can reassign customers — if a sales rep tries, the backend rejects it with a 403

---

### Page 4: **Customer Detail Page** (`/dashboard/customers/{customer_id}`)

**Purpose:** Deep dive into one customer. See everything that's happened with them.

**What's on the page:**
- **Customer header:** Their name, business name, phone number, risk level
- **Three tabs:**
  1. **Conversations tab** — Every WhatsApp message thread with them
  2. **Timeline tab** — Chronological view of orders, payments, and agent actions
  3. **Insights tab** — AI-generated insights (churn likelihood, revenue opportunity, health score)

**How it connects to backend:**
- All data comes from `GET /customers/{customer_id}/timeline`
- The extraction data is stored in the `agent_actions` table
- We show what each agent detected: "Collections Agent detected N150K overdue" etc.

---

### Page 5: **Chat / Intelligence Interface** (`/dashboard/chat`)

**Purpose:** Ask your business questions. "How much did Alhaji Musa spend this month?" The AI looks at your data and tells you.

**What's on the page:**
- Chat-like interface
- User types a question
- Backend uses GPT-4 to analyze your business data in the context of the question
- Answer comes back in seconds

**How it connects to backend:**
1. You type: "Show me customers with outstanding payments over N200K"
2. Frontend calls `POST /chat/query` with your question
3. Backend fetches relevant data (customers, invoices, agents, actions)
4. Sends it to GPT-4 with context about your role (CEO sees everything, Sales person only sees their customers)
5. Returns the answer formatted nicely

**Role-based filtering (important):**
- **CEO:** Can ask about everything
- **Sales:** Only sees their assigned customers
- **Finance:** Only sees payment and invoice data (not conversations)
- **Operations:** Only sees delivery/fulfillment data

---

### Page 6: **Approvals Center** (`/dashboard/approvals`)

**Purpose:** Review agent decisions before they're executed. Every agent action waits here for approval.

**What's on the page:**
- **Grid of approval cards** — One per pending action
- Each card shows:
  - Which agent triggered it (Collections, Churn Detection, etc.)
  - What they want to do (Send message, Flag customer, Create invoice, etc.)
  - The reasoning (short summary)
  - Approve / Reject buttons
- **Click a card to see full reasoning** — Explains why the agent thinks this action is needed

**How it connects to backend:**
1. `GET /approvals` — Lists all pending actions
2. When you click Approve:
   - `POST /approvals/{action_id}/approve`
   - If it's a message action, it triggers WhatsApp send
   - Action status changes from "pending" to "executed"
   - Event is logged
3. When you click Reject:
   - `POST /approvals/{action_id}/reject`
   - You can add a reason
   - Action is marked as "rejected"

**Data flow:**
- An approval stays pending until someone with authority approves/rejects it
- Once executed, it moves out of this view
- It's recorded in the database so you can audit later

---

### Page 7: **Finance Dashboard** (`/dashboard/finance`)

**Purpose:** Financial health of your business. Revenue, collections, expenses, cash flow.

**What's on the page:**
- **KPI Cards:**
  - Weekly revenue
  - Collected so far
  - Outstanding total
  - Collection rate (%)
- **Revenue chart:** Month-by-month breakdown
- **Recent transactions:** Payments and invoices (last 20)
- **Expense breakdown:** By category (Procurement, Logistics, Salaries, etc.)
- **Overdue invoices list:** Which customers haven't paid and by how much

**How it connects to backend:**
1. `GET /customers` — Revenue and outstanding data
2. `GET /analytics/pulse` — Total revenue, outstanding
3. Database queries on the invoice and payment tables
4. All scoped to your business only

**Important:**
- Finance team can only see this page (by role)
- They can't see customer conversation data
- Backend enforces this at the query level (role-based access control)

---

### Page 8: **Sign Up & Sign In** (`/sign-up`, `/sign-in`)

**Purpose:** Authentication. Onboarding new users.

**How it works:**
- We're using Clerk for auth (not building our own)
- When they sign up, Clerk creates an account and returns a JWT token
- Frontend stores it in localStorage
- Every API request includes the token in the Authorization header
- Backend verifies the token and extracts their user ID

**Backend connection:**
- `GET /auth/user` verifies the token and loads their role, business_id, etc.
- Creates a `business_users` record linking their Clerk ID to a business
- All subsequent queries are filtered by business_id

---

## PART 2: BACKEND IMPLEMENTATION

Alright, so the frontend is the customer-facing layer. Now let me show you what's happening behind the scenes.

### Backend Stack

- **Framework:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **AI/LLM:** OpenAI (GPT-4o-mini, Whisper, GPT-4o vision)
- **WhatsApp Integration:** Meta WhatsApp Business API + Twilio sandbox
- **Auth:** Clerk JWT tokens
- **Task Queue:** (Planned — currently using background tasks)

---

### Architecture Overview

The backend has four main flows:

1. **Webhook → Extraction → Entity Matching → Database**
2. **Agent Evaluation Loop** (Every message triggers all 6 agents)
3. **Approval Flow** (Agent actions wait for human approval)
4. **API Queries** (Frontend fetches data with role-based filtering)

Let me break down each.

---

### Flow 1: Webhook → Extraction → Database

**When a customer sends a WhatsApp message, here's what happens:**

1. **Meta WhatsApp API sends webhook**
   - `POST /webhook/whatsapp/{business_id}`
   - We verify the HMAC signature (ensures it's really Meta)
   - Extract the message, sender phone, media (if any)

2. **Extraction Service processes the message**
   
   This is where the intelligence starts. The message goes through:
   
   - **Text extraction:** GPT-4o-mini reads the message and extracts:
     - Intent: What do they want? ("payment_claim", "order_request", "complaint", etc.)
     - Amount: If they mention money (e.g., "150k" → 150000)
     - Product mentioned, dates, sentiment, confidence score
     - Language detected: English, Pidgin, Yoruba, Igbo
   
   - **If it's an image:** Use GPT-4o vision to check if it's a payment receipt
     - Extract amount, bank name, transaction ID
     - Mark as `is_payment_proof = true/false`
   
   - **If it's an audio:** Transcribe using Whisper
     - Handles Nigerian English, Pidgin, accents, etc.
     - Then run extraction on the transcript

3. **Entity Matching**
   
   Now we know what the message is about, but who is it from?
   
   - We have their phone number from WhatsApp
   - Look them up in our `customers` table
   - If found, link the message to them
   - If NOT found, create a new customer record with their phone
   - Smart matching: If they mention their name, we might improve the match

4. **Database Storage**
   
   Insert into:
   - `messages` table (the raw message)
   - `conversations` table (thread with this customer)
   - `live_events` table (record this as an event for the dashboard)

---

### Flow 2: Agent Evaluation

**This is the magic. Six agents look at every message and decide if they need to act.**

The agents are:

1. **Collections Agent** — Detects overdue payments
   - Trigger: Customer mentions payment, or invoice is overdue for 7+ days
   - Action: Send reminder, create internal note
   
2. **Churn Detection Agent** — Spots customers about to leave
   - Trigger: Long time since last order, multiple complaints, declining orders
   - Action: Flag as "high risk", propose win-back campaign
   
3. **Deal Intelligence Agent** — Spots upsell/cross-sell opportunities
   - Trigger: Customer mentions wanting more product, bulk orders
   - Action: Propose deal, alert sales team
   
4. **Fulfillment Agent** — Tracks delivery status
   - Trigger: Order placed, item out of stock, delivery confirmed
   - Action: Create task, send tracking link, confirm delivery
   
5. **Revenue Pulse Agent** — Tracks money coming in
   - Trigger: Payment received, invoice sent, collection rate changes
   - Action: Log transaction, update customer health score
   
6. **Relationship Health Agent** — Calculates customer lifetime value and health
   - Trigger: Monthly, or after major event
   - Action: Update health_score and relationship metrics

**How agents work:**

Each agent has an `evaluate()` method:

```
if (trigger condition is met) {
   then propose_action() {
      Create a record in agent_actions table
      action = {
         business_id,
         customer_id,
         agent_name,
         trigger_summary: "what triggered this",
         proposed_action: "what we want to do",
         proposed_message: "draft WhatsApp message (if applicable)",
         confidence: 0.85,
         reasoning: "why we think this is good",
         status: "pending"  ← Waits for human approval
      }
   }
}
```

**Important:** Each agent checks `has_pending_action()` first — we don't spam approvals. If the same customer already has a pending Collections action, a new message won't create another.

---

### Flow 3: Approval Pipeline

**Now an action is pending. Here's what happens:**

1. **Frontend shows it in Approvals Center**
   - `GET /approvals` lists all pending actions
   - User can read reasoning and approve/reject

2. **User clicks Approve**
   - `POST /approvals/{action_id}/approve`
   - Backend executes the action:
     - If it's a message: Call WhatsApp API to send it
     - If it's a flag: Update customer table
     - If it's a reminder: Create a task
   - Update `agent_actions.status = "executed"`
   - Create a `live_event` record (for the event stream)
   - Record who approved it and when

3. **User clicks Reject**
   - `POST /approvals/{action_id}/reject`
   - They can add a reason
   - Update `agent_actions.status = "rejected"`
   - Log it for auditing

---

### Flow 4: API Endpoints (Frontend Queries)

Here's what data the frontend can request:

#### **Analytics (Dashboard)**

- `GET /analytics/pulse` 
  - Returns: Revenue, outstanding, pending approvals, health score, critical alerts
  - Used by: Dashboard overview

- `GET /analytics/events`
  - Returns: Last 100 live events (payments, agent triggers, etc.)
  - Used by: Event stream on dashboard

- `GET /analytics/agents/status`
  - Returns: Each agent's status (idle, active, triggered), pending count
  - Used by: Agent status display

#### **Customers (CRM)**

- `GET /customers`
  - Returns: All customers (or filtered by assigned_to if sales rep)
  - Fields: name, business_name, phone, revenue, outstanding, churn_risk, health_score

- `GET /customers/{customer_id}`
  - Returns: One customer's full profile

- `GET /customers/{customer_id}/timeline`
  - Returns: Customer + all their messages + agent actions + orders
  - Used by: Customer detail page

- `PUT /customers/{customer_id}`
  - Update customer data (name, assigned_to, notes)
  - Only CEO/Manager can reassign

#### **Approvals**

- `GET /approvals`
  - Returns: All pending actions for this business

- `POST /approvals/{action_id}/approve`
  - Execute the action (maybe send WhatsApp, maybe update DB)
  - Update status to "executed"

- `POST /approvals/{action_id}/reject`
  - Reject the action
  - Reason is optional but logged

#### **Chat / Intelligence**

- `POST /chat/query`
  - Request: `{ question: "How much did Alhaji spend?", role?: "ceo" }`
  - Fetches: Customers, invoices, agent actions (role-filtered)
  - Sends to GPT-4 with context
  - Returns: Natural language answer

---

### The Database Schema (What We're Storing)

We're using Supabase (PostgreSQL). Here's what matters:

**businesses** — One record per company using OpsMemory
- Fields: id, name, owner_user_id, whatsapp_phone, language, created_at

**business_users** — Maps Clerk users to a business + role
- Fields: id, business_id, clerk_user_id, role (ceo, sales, finance, operations, manager), created_at

**customers** — All customer records
- Fields: id, business_id, phone, name, business_name, total_revenue, outstanding_balance, churn_risk, health_score, last_order_date, assigned_to (user), created_at

**conversations** — WhatsApp threads
- Fields: id, business_id, customer_id, status (open/closed), last_message_at, unread_count, assigned_to

**messages** — Individual messages
- Fields: id, business_id, conversation_id, customer_id, direction (in/out), text, language, sender_phone, created_at

**agent_actions** — Pending/executed agent decisions
- Fields: id, business_id, customer_id, agent_name, trigger_summary, proposed_action, proposed_message, confidence, status (pending/executed/rejected), reasoning, approved_by, approved_at, rejection_reason, outcome, created_at

**live_events** — Real-time event stream
- Fields: id, business_id, customer_id, event_type, severity (positive/warning/critical), title, description, resolved, created_at

**invoices** — Bills and payment tracking
- Fields: id, business_id, customer_id, amount, due_date, status (pending/paid/overdue), created_at

**payments** — Payment records
- Fields: id, business_id, customer_id, amount, method, transaction_id, confirmed_at, created_at

**orders** — Sales orders
- Fields: id, business_id, customer_id, items, total, status, created_at, fulfilled_at

---

### Key Features Built

#### 1. **Multi-tenant isolation**
- Every query is scoped by `business_id`
- One business can NEVER see another's data
- Even if someone tries to guess a customer_id, they can't access it if it's not in their business

#### 2. **Role-based access control**
- **CEO:** See everything
- **Sales:** Only their assigned customers
- **Finance:** Only payment/invoice data
- **Operations:** Only fulfillment data
- **Manager:** Their team's data
- Enforced at the database query level (backend doesn't fetch unauthorized data in the first place)

#### 3. **Webhook signature verification**
- Meta sends a signature with every webhook
- We verify it using HMAC-SHA256
- If signature is wrong, request is rejected immediately
- Prevents spoofed messages

#### 4. **Async processing**
- Long operations (AI extraction, agent evaluation) run in background tasks
- Webhook responds immediately with 200 OK
- Processing happens asynchronously, so WhatsApp doesn't timeout

#### 5. **Extraction quality**
- Handles Nigerian English, Pidgin, Yoruba, Igbo
- Image receipts are analyzed for payment proof
- Voice notes are transcribed
- Amounts are parsed correctly ("150k", "1.5m", etc.)

---

## PART 3: WHAT WE STILL NEED TO SET UP

Okay, so here's where I need your input and help.

### Questions for the Backend/DevOps Person

1. **Database Setup**
   - We're using Supabase (managed PostgreSQL). Do we have a Supabase project set up yet, or should I create one?
   - Should I share the schema migrations with you, or will you generate them from the app?
   - Do we need backup/disaster recovery plan, or is Supabase's built-in good enough?

2. **WhatsApp Integration**
   - Meta WhatsApp Business API: Do we have a verified business account with Meta?
   - Do we have webhook credentials from Meta (app ID, webhook URL token, etc.)?
   - OR: Should we initially use Twilio sandbox instead (easier testing, fewer credentials to manage)?
   - Once live, we'll need customer's WhatsApp Business phone number. How should we register it?

3. **OpenAI API**
   - Do we have an OpenAI API key set up? (For GPT-4o-mini, Whisper, vision models)
   - What's the budget/rate limit we should set?

4. **Clerk Authentication**
   - Do we have a Clerk account with API keys? (For verifying JWT tokens)
   - Should we use Clerk's hosted login, or embed it in our app?
   - Do we need multi-org support (so one user can manage multiple businesses)?

5. **Environment Variables**
   - Where should we store secrets? (.env file on dev machine, GitHub Secrets for CI/CD, Vercel secrets, Supabase vault?)
   - Should I create a `.env.example` file listing all required keys?

6. **Deployment**
   - Where are we deploying the backend? (Vercel, AWS Lambda, Railway, self-hosted VPS?)
   - And the database? (Already on Supabase, or self-hosted?)
   - CI/CD pipeline: Do we have GitHub Actions set up?

7. **Messaging Service (Future)**
   - Currently, WhatsApp message sending happens synchronously in the approve action
   - Should we move this to a task queue (Bull, Celery, etc.) for reliability?
   - How many messages/day do we expect initially? (Affects rate limiting strategy)

8. **Logging & Monitoring**
   - Should we integrate Sentry for error tracking?
   - Log aggregation (CloudWatch, Datadog, etc.)?
   - Alerts if something fails?

9. **Testing**
   - Do you want me to add unit tests for the extraction pipeline?
   - Integration tests for the agent evaluation?
   - Test fixtures for common scenarios (payment proof, churn detection, etc.)?

10. **Security**
    - Should we add rate limiting to the API?
    - CORS configuration — what domains should the frontend accept requests from?
    - Do we need API key authentication for webhook calls, or is HMAC signature enough?

---

## Summary: What's Locked In

✅ **Frontend**
- 8 pages fully designed and functional
- All flows connected to backend endpoints
- Role-based UI (different views for different user types)
- Responsive design
- Demo works and looks great

✅ **Backend Architecture**
- Webhook receiver (Meta WhatsApp + Twilio support)
- Extraction pipeline (text, image, audio)
- 6 AI agents with trigger logic
- Approval flow
- API endpoints for frontend queries
- Multi-tenant isolation
- Role-based access control

✅ **Database Schema**
- All tables designed
- Ready for Supabase

### What We Need from You

1. Provision the services (Supabase, OpenAI API, Clerk, WhatsApp credentials)
2. Help set up environment variables and secrets management
3. Choose hosting/deployment platform
4. Set up CI/CD if needed
5. Advise on scaling/monitoring strategy

---

## PART 4: KNOWLEDGE BASE / RAG SYSTEM

### What It Does

This is the secret sauce that makes our agents actually intelligent. Instead of generic responses, our agents now have access to the business's own knowledge base — products, prices, FAQs, policies, uploaded documents. When a customer asks a question, the system:

1. **Retrieves relevant knowledge** — Uses embeddings to search the knowledge base semantically
2. **Injects context into the LLM** — Passes formatted knowledge chunks to GPT-4o-mini
3. **Agent reasons with context** — Agent explains price changes, remembers customer loyalty, references specific policies
4. **Feels personal** — Not scripted, but authentic to the business

### Frontend: Knowledge Base Management (`/dashboard/knowledge`)

**What the business owner does:**

- **Add Products:** Name, description, price (₦), unit, SKU, availability toggle
  - Endpoints: `POST /api/knowledge/catalog`
  - Stored as: Embedded product description + metadata
  
- **Add FAQs:** Question and answer pairs
  - Endpoints: `POST /api/knowledge/faq`
  - Stored as: "Question: X\nAnswer: Y" formatted text

- **Add Policies:** Delivery, payment, returns, business hours, contact info, discount terms
  - Endpoints: `POST /api/knowledge/policy`
  - Quick templates provided to save time

- **Upload Documents:** PDF, TXT, Markdown files
  - Endpoints: `POST /api/knowledge/upload`
  - System automatically chunks large documents (400-word overlapping chunks)
  - Each chunk is embedded and stored

- **View & Manage:** See all entries, filter by category, delete as needed
  - Endpoints: `GET /api/knowledge/`, `DELETE /api/knowledge/{id}`

### Backend: RAG Pipeline (`opsmemory-backend/app/services/rag.py`)

**How it works (technical):**

1. **Embedding** — Every piece of knowledge is converted to a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model
   - Cost: ~$0.02 per million tokens (entire product catalog costs cents to embed)

2. **Storage** — Embeddings stored in Supabase pgvector
   - Table: `knowledge_base`
   - Columns: id, business_id, content, embedding, category, title, source_file, metadata, created_at
   - Index: IVFFlat index on embeddings for fast cosine similarity search

3. **Retrieval** — When agent needs info, it:
   - Embeds the customer query
   - Calls Supabase RPC function `match_knowledge()` 
   - Returns top 5 relevant chunks (configurable threshold 0.70)
   - Ranks by semantic similarity

4. **Injection into Prompt** — Formatted knowledge chunks inserted into system prompt before sending to GPT-4o-mini
   - Example: `[CATALOG]\nProduct: iPhone 15 Pro 256GB\nPrice: ₦450,000\nUnit: piece`

### Integration with Agent Responses

When a customer sends a WhatsApp message:

1. Extract intent, product mention, sentiment (existing extraction pipeline)
2. **NEW:** Query knowledge base for related products/policies/FAQs
3. Build system prompt with:
   - Language instructions (Pidgin, Yoruba, etc.)
   - **Customer context:** Total spent, days since order, churn risk
   - **Sales persona:** "Never apologize for prices. Prices changed due to inflation/naira devaluation"
   - **Knowledge chunks:** Formatted product/policy/FAQ data
4. Agent reasons: If customer says "5 years ago this cost less," agent explains why (inflation, costs increased)
5. Send authentic, contextual response

### Database Setup (SQL)

**Step 1: Enable pgvector extension**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Step 2: Create knowledge_base table**
```sql
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  category TEXT CHECK(category IN ('catalog', 'policy', 'faq', 'general', 'document')),
  title TEXT,
  source_file TEXT,
  chunk_index INTEGER,
  metadata JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_business_id ON knowledge_base(business_id);
CREATE INDEX knowledge_base_embedding_idx ON knowledge_base 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Step 3: Create RPC function for semantic search**
```sql
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  target_business_id UUID,
  match_threshold FLOAT DEFAULT 0.70,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  category TEXT,
  title TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.category,
    kb.title,
    kb.metadata,
    (1 - (kb.embedding <=> query_embedding)) AS similarity
  FROM knowledge_base kb
  WHERE kb.business_id = target_business_id
    AND kb.active = TRUE
    AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

### API Endpoints (Complete List)

- `GET /api/knowledge/` — List all KB entries (with optional category filter)
- `POST /api/knowledge/catalog` — Add product/service
  - Request: `{ name, description, price, unit, sku?, available }`
- `POST /api/knowledge/faq` — Add FAQ
  - Request: `{ question, answer }`
- `POST /api/knowledge/policy` — Add policy
  - Request: `{ policy_type, content }`
- `POST /api/knowledge/upload` — Upload and chunk document
  - Request: multipart form-data with file
  - Returns: count of chunks created
- `DELETE /api/knowledge/{entry_id}` — Delete single entry (soft delete)
- `DELETE /api/knowledge/source/{source_file}` — Delete all chunks from file

### How This Makes Agents "Agentic"

**Before RAG:**
- Agent: "I'm sorry, I don't have that information"
- Customer: Frustrated

**After RAG:**
- Customer: "Why did your price increase?"
- Agent: "Great question! Our costs went up due to inflation and naira devaluation, but we've kept our margins tight. Your loyalty discount still applies — let me check if I can ask our manager for a special offer for you."
- Customer: Feels heard, stays loyal

This is what makes it agentic: The agent isn't just retrieving facts. It's reasoning about them, contextualizing them, and making decisions based on business rules (customer history) and knowledge (what products cost, what policies we have).

---

## PART 5: FULLY AGENTIC SYSTEMS — Multi-Step Autonomous Campaigns

### The Gap: Partial vs. Fully Agentic

Here's the honest gap most teams miss:

**Partially agentic** (what most solutions do):
- Agent detects situation
- Agent proposes action
- Human approves
- Action executes
- Done. Agent forgets about it.

**Fully agentic** (what OpsMemory does):
- Agent detects situation
- Agent proposes action
- Human approves
- Action executes
- **Agent observes outcomes**
- Agent decides next step autonomously
- Loop continues until goal achieved or escalation needed

That loop is everything. It's the difference between an agent and a notification system.

### How Collections Agent Works: The Full Loop

**Step 1: Initial Detection**
- Scheduler sweeps all businesses
- Finds: Customer has ₦500,000 outstanding for 5 days
- Collections Agent proposes: Send a gentle payment reminder
- Action proposed and sent

**Step 2: Campaign Created**
- When the reminder is approved/sent, system creates an `agent_campaign` record
- Stores: Outstanding amount, tone, customer language, all context needed
- Sets `next_check_at` = 48 hours from now

**Step 3: Scheduler Continues Campaign (48h later)**
- Scheduler wakes up and finds: Campaign due for check
- Fetches: Recent messages, customer data, campaign context
- Calls: `agent.continue_campaign()`

**Step 3a: Goal Achieved?**
- Agent checks: "Did payment confirmation arrive in the last 48 hours?"
- If YES: Closes campaign with outcome "goal_achieved", logs success
- Customer marked as paid, invoice updated, campaign done

**Step 3b: No Payment — Send Step 2**
- Agent sends FIRMER follow-up message (different tone, includes amount)
- Escalates confidence level to "high"
- Sets next_check_at = 48 hours again

**Step 4: Check Again (48h later)**
- Still no payment?
- Agent sends FINAL reminder or escalates to CEO with full context:
  - Conversation history
  - Both messages sent and responses
  - Recommendation: "Customer has ₦0 lifetime spend. Likely fraud. Recommend escalate to legal"
  - Or: "Customer has ₦5M lifetime spend and churn risk is low. Recommend personal call"

**Step 5: CEO Decision**
- CEO sees the escalation with context (not just "payment pending")
- CEO approves: "Send personal call via Twilio" or "Write it off"
- Agent logs decision and closes campaign

### The Database: Campaign Persistence

Two new tables track this:

**agent_campaigns** — Tracks active campaigns
```
- id, business_id, customer_id, agent_name
- goal: 'collect_payment', 'recover_churning_customer', 'close_deal'
- current_step: 1-3 (how far through the campaign)
- status: 'active', 'goal_achieved', 'escalated', 'abandoned'
- next_check_at: When scheduler should evaluate next
- context: JSONB with everything the agent remembers
  - Outstanding amount, tone, language, step 1 message, etc.
- outcome: Final result (payment received, escalated, etc.)
```

**campaign_log** — Audit trail of every decision
```
- campaign_id, step_number, action_taken, reasoning
- customer_signal: What the agent detected ("payment_confirmed", "no_response")
- agent_evaluation: Full confidence/risk/next-step data
- created_at: When decision was made
```

### The Scheduler: Campaign Continuations

New job runs every 4 hours:

```
1. Query: agent_campaigns WHERE status='active' AND next_check_at <= NOW()
2. For each campaign:
   a. Fetch customer + recent messages
   b. Get agent instance (Collections, Churn, etc.)
   c. Call agent.continue_campaign(campaign, customer, recent_messages)
3. Agent decides next step based on outcomes
```

### What This Looks Like in the Demo

**CEO opens dashboard:**
- Sees "Active Campaigns" widget
- 3 Collections campaigns running:
  - Customer A: "Step 2 of 3, payment reminder sent, waiting for response (due Wed 9am)"
  - Customer B: "Escalated to CEO for decision - ₦2M outstanding, 14 days overdue, flagged as high-value repeat"
  - Customer C: "Goal achieved - payment received ₦800k, campaign closed"
- 2 Churn campaigns:
  - Customer D: "Step 1 of 3, re-engagement sent, monitoring for response"
  - Customer E: "Escalated - customer not responding after re-engagement, recommend loyalty offer"

**This is NOT a pending approvals list.** This is a dashboard of autonomous agents actively managing relationships.

**Judge sees this and thinks:** "Oh. These agents are actually running campaigns. They're not just notifying us — they're making decisions, checking outcomes, and escalating when needed."

That's the difference. That's fully agentic.

### Collections Agent Implementation (Locked In)

The Collections Agent now has three methods:

1. **evaluate()** — Original behavior (triggered by scheduler sweep)
   - Detects overdue invoices, proposes action, creates campaign if approved

2. **start_campaign()** — Called after message is sent
   - Creates agent_campaign record with all context
   - Schedules next check in 48 hours

3. **continue_campaign()** — Called by scheduler every 4 hours
   - Checks if goal achieved (payment received)
   - If yes: Close campaign, celebrate
   - If no, step < 3: Send next follow-up, advance step
   - If no, step >= 3: Escalate to CEO with recommendation

### Why This Matters for Judges

**Most teams show:**
- "Agent detected something"
- "Agent proposed an action"
- "Human approved it"

**You're showing:**
- Agent detected problem
- Agent took action
- Agent watched what happened
- Agent made the next decision without asking
- Agent escalated when it needed human judgment
- All with full context and reasoning visible

That's the gap. That's why OpsMemory is genuinely agentic.

---

## Next Steps

1. **This week:** Database setup (agent_campaigns table, campaign_log table, migrations)
2. **Next week:** Deploy backend with:
   - RAG endpoints fully wired
   - Campaign manager service running
   - Scheduler with campaign continuations job active
   - Collections Agent with full loop implemented
3. **Week 3:** Test end-to-end:
   - Add a product to knowledge base
   - Send WhatsApp asking about it → Agent retrieves and uses knowledge
   - Create overdue invoice → Campaign starts → Wait 48h → Agent re-checks → Escalates if needed
4. **Week 4:** Load real product catalog, run with actual business data for 1-2 weeks before go-live

Let's do it. This is looking solid.

---

**Questions?**
