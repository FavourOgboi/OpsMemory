"""
OpsMemory — Unified Migration Script

Creates ALL tables (core + hackathon + auth + onboarding) in local PostgreSQL.
Idempotent — safe to run multiple times.

Usage:
  cd opsmemory-backend
  python scripts/migrate_all.py
"""

import psycopg2
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

DB_PARAMS = {
    "dbname": os.getenv("OPSMEMORY_DB_NAME", "opsmemory"),
    "user": os.getenv("OPSMEMORY_DB_USER", "postgres"),
    "password": os.getenv("OPSMEMORY_DB_PASSWORD", "postgres"),
    "host": os.getenv("OPSMEMORY_DB_HOST", "localhost"),
    "port": os.getenv("OPSMEMORY_DB_PORT", "5432"),
}

MIGRATIONS = [
    # ── Extensions ────────────────────────────────────────────────────────
    "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"",
    "CREATE EXTENSION IF NOT EXISTS vector",  # pgvector — OK if fails

    # ── App Users (local auth — replaces Clerk) ───────────────────────────
    """
    CREATE TABLE IF NOT EXISTS app_users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        avatar_url TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Businesses ────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS businesses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        whatsapp_number TEXT UNIQUE,
        whatsapp_connected BOOLEAN DEFAULT FALSE,
        pairing_code TEXT UNIQUE,
        webhook_url TEXT UNIQUE,
        owner_user_id TEXT NOT NULL,
        owner_email TEXT NOT NULL,
        ceo_phone TEXT,
        deal_approval_threshold NUMERIC DEFAULT 100000,
        auto_reply_enabled BOOLEAN DEFAULT TRUE,
        onboarding_step INTEGER DEFAULT 0,
        onboarding_completed BOOLEAN DEFAULT FALSE,
        instagram_handle TEXT,
        website_url TEXT,
        catalog_url TEXT,
        catalog_pdf_path TEXT,
        city TEXT,
        business_hours JSONB DEFAULT '{}',
        agent_language TEXT DEFAULT 'auto',
        business_description TEXT,
        products_text TEXT,
        other_link TEXT,
        website TEXT,
        instagram_url TEXT,
        facebook_url TEXT,
        twitter_url TEXT,
        tiktok_url TEXT,
        custom_links JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Business Users ────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS business_users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        app_user_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('ceo', 'sales', 'finance', 'operations', 'manager')),
        phone TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── User Preferences (tour + onboarding tracking per user) ────────────
    """
    CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
        tour_completed BOOLEAN DEFAULT FALSE,
        onboarding_completed BOOLEAN DEFAULT FALSE,
        theme TEXT DEFAULT 'dark',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
    )
    """,

    # ── Customers ─────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        business_name TEXT,
        phone TEXT NOT NULL,
        language TEXT DEFAULT 'english',
        health_score INTEGER DEFAULT 80 CHECK (health_score BETWEEN 0 AND 100),
        churn_risk TEXT DEFAULT 'low' CHECK (churn_risk IN ('low', 'medium', 'high', 'critical')),
        total_revenue NUMERIC DEFAULT 0,
        outstanding_balance NUMERIC DEFAULT 0,
        days_since_last_order INTEGER DEFAULT 0,
        open_invoices INTEGER DEFAULT 0,
        assigned_to UUID REFERENCES business_users(id),
        payment_behavior_score INTEGER DEFAULT 70,
        order_frequency_days INTEGER DEFAULT 0,
        last_order_at TIMESTAMPTZ,
        last_contact_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(business_id, phone)
    )
    """,

    # ── Conversations ─────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS conversations (
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
    )
    """,

    # ── Messages ──────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        content TEXT NOT NULL,
        raw_content TEXT,
        media_type TEXT CHECK (media_type IN ('text', 'image', 'voice', 'document', 'video')),
        media_url TEXT,
        extracted_data JSONB,
        sent_by UUID REFERENCES business_users(id),
        sent_by_agent TEXT,
        whatsapp_message_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Live Events ───────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS live_events (
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
    )
    """,

    # ── Agent Actions ─────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS agent_actions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id),
        agent_name TEXT NOT NULL,
        agent_color TEXT NOT NULL,
        trigger_summary TEXT NOT NULL,
        proposed_action TEXT NOT NULL,
        proposed_message TEXT,
        risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
        confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),
        track TEXT CHECK (track IN ('auto', 'assign', 'escalate')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'auto_executed')),
        approved_by UUID REFERENCES business_users(id),
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        outcome TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Orders ────────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id),
        order_ref TEXT,
        items JSONB,
        total_amount NUMERIC NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'disputed')),
        payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'claimed', 'paid', 'partial')),
        amount_paid NUMERIC DEFAULT 0,
        promised_delivery_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Invoices ──────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS invoices (
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
    )
    """,

    # ── Payments ──────────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS payments (
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
    )
    """,

    # ── Voice Sessions ────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS voice_sessions (
        call_sid TEXT PRIMARY KEY,
        business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
        user_id UUID REFERENCES business_users(id),
        role TEXT NOT NULL,
        caller_phone TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Agent Campaigns ───────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS agent_campaigns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        agent_name TEXT NOT NULL,
        goal TEXT NOT NULL,
        current_step INTEGER DEFAULT 1,
        max_steps INTEGER DEFAULT 3,
        status TEXT DEFAULT 'active',
        last_action_at TIMESTAMPTZ DEFAULT NOW(),
        next_check_at TIMESTAMPTZ NOT NULL,
        context JSONB DEFAULT '{}',
        outcome TEXT,
        outcome_reasoning TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS campaign_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        campaign_id UUID NOT NULL REFERENCES agent_campaigns(id) ON DELETE CASCADE,
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        action_taken TEXT NOT NULL,
        reasoning TEXT,
        agent_evaluation JSONB DEFAULT '{}',
        customer_signal TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Knowledge Base ────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS knowledge_base (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding JSONB,
        category TEXT NOT NULL,
        title TEXT,
        source_file TEXT,
        chunk_index INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── External Users (Yelp dataset) ─────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS external_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_id TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        name TEXT,
        review_count INTEGER DEFAULT 0,
        average_stars NUMERIC DEFAULT 0,
        behavior_profile JSONB,
        language TEXT DEFAULT 'english',
        nigerian_signals BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── External Items (Yelp businesses) ──────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS external_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_id TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        subcategories TEXT[],
        description TEXT,
        average_stars NUMERIC DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        attributes JSONB,
        embedding JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── External Reviews (Yelp reviews) ───────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS external_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_review_id TEXT UNIQUE,
        user_id UUID REFERENCES external_users(id) ON DELETE CASCADE,
        item_id UUID REFERENCES external_items(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        stars INTEGER CHECK (stars BETWEEN 1 AND 5),
        review_text TEXT,
        review_date TIMESTAMPTZ,
        useful_votes INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Generated Reviews (Task A outputs) ────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS generated_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_profile_id UUID REFERENCES external_users(id),
        item_id UUID REFERENCES external_items(id),
        predicted_stars NUMERIC NOT NULL,
        review_text TEXT NOT NULL,
        language TEXT DEFAULT 'english',
        nigerian_context BOOLEAN DEFAULT FALSE,
        reasoning TEXT,
        confidence NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Recommendation Sessions (Task B) ──────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS recommendation_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT UNIQUE NOT NULL,
        user_profile_id UUID REFERENCES external_users(id),
        source TEXT DEFAULT 'yelp',
        category TEXT,
        conversation_history JSONB DEFAULT '[]',
        current_recommendations JSONB DEFAULT '[]',
        status TEXT DEFAULT 'active',
        turn_count INTEGER DEFAULT 0,
        is_cold_start BOOLEAN DEFAULT FALSE,
        cross_domain BOOLEAN DEFAULT FALSE,
        preferences_gathered JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,

    # ── Indexes ───────────────────────────────────────────────────────────
    "CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email)",
    "CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)",
    "CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_live_events_business_id ON live_events(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_agent_actions_business_id_status ON agent_actions(business_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_business_id ON payments(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON business_users(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_business_users_app_id ON business_users(app_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_ext_users_source ON external_users(source)",
    "CREATE INDEX IF NOT EXISTS idx_ext_items_source_cat ON external_items(source, category)",
    "CREATE INDEX IF NOT EXISTS idx_ext_reviews_user ON external_reviews(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_ext_reviews_item ON external_reviews(item_id)",
    "CREATE INDEX IF NOT EXISTS idx_rec_sessions_sid ON recommendation_sessions(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_knowledge_base_business ON knowledge_base(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_agent_campaigns_business_id ON agent_campaigns(business_id)",
    "CREATE INDEX IF NOT EXISTS idx_agent_campaigns_status ON agent_campaigns(status)",
    "CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_preferences(user_id)",
]


def run():
    print("Connecting to local PostgreSQL...")
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"❌  Cannot connect to PostgreSQL: {e}")
        print(f"    Connection params: host={DB_PARAMS['host']} port={DB_PARAMS['port']} db={DB_PARAMS['dbname']}")
        print(f"\n    Make sure PostgreSQL is running:")
        print(f"    Option 1: docker compose up postgres -d")
        print(f"    Option 2: Local PostgreSQL on port {DB_PARAMS['port']}")
        sys.exit(1)

    ok = 0
    warn = 0
    for sql in MIGRATIONS:
        stmt = sql.strip().split("\n")[0][:70]
        try:
            cur.execute(sql)
            ok += 1
            print(f"  ✓  {stmt}...")
        except Exception as e:
            err_str = str(e).strip()
            if "already exists" in err_str:
                print(f"  ·  {stmt}... (already exists)")
                ok += 1
            elif "vector" in sql.lower() and "extension" in sql.lower():
                print(f"  ⚠  pgvector not available — embeddings will use JSONB fallback")
                warn += 1
            else:
                print(f"  ⚠  {stmt}... → {err_str}")
                warn += 1

    cur.close()
    conn.close()

    print(f"\n{'='*50}")
    print(f"Migration complete: {ok} OK, {warn} warnings")
    print(f"{'='*50}")
    if warn == 0:
        print("✅  All tables created successfully!")
    else:
        print("⚠   Some warnings — check above (most are safe to ignore)")


if __name__ == "__main__":
    run()
