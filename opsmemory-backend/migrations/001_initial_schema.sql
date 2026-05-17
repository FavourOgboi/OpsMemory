-- ==========================================================================
-- OpsMemory — Database Schema
-- Run these statements in the Supabase SQL Editor, in order.
-- ==========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── BUSINESSES ────────────────────────────────────────────────────────────────
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,   -- 'trading', 'logistics', 'healthcare', 'services', etc.
    whatsapp_number TEXT UNIQUE,
    whatsapp_connected BOOLEAN DEFAULT FALSE,
    pairing_code TEXT UNIQUE,
    webhook_url TEXT UNIQUE,
    owner_user_id TEXT NOT NULL,   -- Clerk user ID
    owner_email TEXT NOT NULL,
    ceo_phone TEXT,                -- Registered phone for voice agent
    deal_approval_threshold NUMERIC DEFAULT 100000,   -- NGN
    auto_reply_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE business_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ceo', 'sales', 'finance', 'operations', 'manager')),
    phone TEXT,                     -- For voice agent identity verification
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── CUSTOMERS ─────────────────────────────────────────────────────────────────
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    business_name TEXT,
    phone TEXT NOT NULL,
    language TEXT DEFAULT 'english' CHECK (language IN ('english', 'pidgin', 'yoruba', 'igbo')),
    health_score INTEGER DEFAULT 80 CHECK (health_score BETWEEN 0 AND 100),
    churn_risk TEXT DEFAULT 'low' CHECK (churn_risk IN ('low', 'medium', 'high', 'critical')),
    total_revenue NUMERIC DEFAULT 0,
    outstanding_balance NUMERIC DEFAULT 0,
    days_since_last_order INTEGER DEFAULT 0,
    open_invoices INTEGER DEFAULT 0,
    assigned_to UUID REFERENCES business_users(id),
    payment_behavior_score INTEGER DEFAULT 70,  -- 0-100, higher = more reliable payer
    order_frequency_days INTEGER DEFAULT 0,     -- average days between orders
    last_order_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, phone)
);


-- ── CONVERSATIONS ──────────────────────────────────────────────────────────────
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
    assigned_to UUID REFERENCES business_users(id),
    unread_count INTEGER DEFAULT 0,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── MESSAGES ──────────────────────────────────────────────────────────────────
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,           -- Original or transcribed text
    raw_content TEXT,                -- Exactly as received from WhatsApp
    media_type TEXT CHECK (media_type IN ('text', 'image', 'voice', 'document', 'video')),
    media_url TEXT,                  -- Original WhatsApp media URL
    extracted_data JSONB,            -- Output from extraction pipeline
    sent_by UUID REFERENCES business_users(id),   -- NULL if inbound
    whatsapp_message_id TEXT,        -- Meta message ID for deduplication
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── LIVE EVENTS ───────────────────────────────────────────────────────────────
CREATE TABLE live_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('positive', 'warning', 'critical', 'info')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    agent_name TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── AGENT ACTIONS ─────────────────────────────────────────────────────────────
CREATE TABLE agent_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    agent_name TEXT NOT NULL,
    agent_color TEXT NOT NULL,
    trigger_summary TEXT NOT NULL,
    proposed_action TEXT NOT NULL,
    proposed_message TEXT,           -- Draft WhatsApp message if applicable
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
    confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),
    track TEXT CHECK (track IN ('auto', 'assign', 'escalate')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'auto_executed')),
    approved_by UUID REFERENCES business_users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── ORDERS ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    order_ref TEXT,
    items JSONB,                     -- [{name, qty, unit_price}]
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'disputed')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'claimed', 'paid', 'partial')),
    amount_paid NUMERIC DEFAULT 0,
    promised_delivery_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── INVOICES ────────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    ref TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── PAYMENTS ────────────────────────────────────────────────────────────────────
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    amount NUMERIC NOT NULL DEFAULT 0,
    method TEXT DEFAULT 'bank_transfer' CHECK (method IN ('bank_transfer', 'cash', 'pos', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    confirmed_at TIMESTAMPTZ,
    transaction_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── VOICE SESSIONS ────────────────────────────────────────────────────────────
-- Temporary call context for the Twilio voice agent.
CREATE TABLE voice_sessions (
    call_sid TEXT PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES business_users(id),
    role TEXT NOT NULL,
    caller_phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── ENABLE ROW LEVEL SECURITY ─────────────────────────────────────────────────
-- Backend uses service role key → bypasses RLS.
-- RLS enabled for defence in depth against direct Supabase client access.

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;


-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_conversations_business_id ON conversations(business_id);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id);
CREATE INDEX idx_live_events_business_id ON live_events(business_id);
CREATE INDEX idx_agent_actions_business_id_status ON agent_actions(business_id, status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_business_id ON orders(business_id);
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_payments_business_id ON payments(business_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_business_users_business_id ON business_users(business_id);
CREATE INDEX idx_business_users_clerk_id ON business_users(clerk_user_id);
