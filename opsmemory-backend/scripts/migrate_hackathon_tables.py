"""
OpsMemory — Hackathon Table Migration
Creates external_users, external_items, external_reviews,
generated_reviews, and recommendation_sessions in local PostgreSQL.

Run once:
  cd opsmemory-backend
  python scripts/migrate_hackathon_tables.py
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
    # Try pgvector — silently skip if not installed
    "CREATE EXTENSION IF NOT EXISTS vector",

    # External user profiles (from Yelp/Amazon datasets)
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

    # External items (businesses, products, books)
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

    # Actual review history from datasets
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

    # Generated reviews (Task A outputs)
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

    # Recommendation sessions (Task B multi-turn)
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

    # Indexes
    "CREATE INDEX IF NOT EXISTS idx_ext_users_source ON external_users(source)",
    "CREATE INDEX IF NOT EXISTS idx_ext_items_source_cat ON external_items(source, category)",
    "CREATE INDEX IF NOT EXISTS idx_ext_reviews_user ON external_reviews(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_ext_reviews_item ON external_reviews(item_id)",
    "CREATE INDEX IF NOT EXISTS idx_rec_sessions_sid ON recommendation_sessions(session_id)",

    # Business memory column (add website/links/description to businesses)
    """
    ALTER TABLE businesses
        ADD COLUMN IF NOT EXISTS website TEXT,
        ADD COLUMN IF NOT EXISTS instagram_url TEXT,
        ADD COLUMN IF NOT EXISTS facebook_url TEXT,
        ADD COLUMN IF NOT EXISTS twitter_url TEXT,
        ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
        ADD COLUMN IF NOT EXISTS business_description TEXT,
        ADD COLUMN IF NOT EXISTS custom_links JSONB DEFAULT '[]'
    """,
]


def run():
    print("Connecting to local PostgreSQL...")
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"❌  Cannot connect to PostgreSQL: {e}")
        print(f"    Connection params: {DB_PARAMS}")
        sys.exit(1)

    errors = []
    for sql in MIGRATIONS:
        stmt = sql.strip().split("\n")[0][:60]
        try:
            cur.execute(sql)
            print(f"✓  {stmt}...")
        except Exception as e:
            # pgvector extension failure is OK — we have a JSONB fallback
            if "vector" in sql.lower() and "extension" in sql.lower():
                print(f"⚠  pgvector not installed — using JSONB for embeddings (vector search will use popularity fallback)")
            else:
                print(f"⚠  {stmt}... → {e}")
                errors.append(str(e))

    cur.close()
    conn.close()

    if errors:
        print(f"\n⚠  {len(errors)} warning(s) — check above. Some may be safe to ignore.")
    else:
        print("\n✅  All hackathon tables created successfully.")
    print("   Next: python scripts/ingest_datasets.py --source yelp --limit 3000")


if __name__ == "__main__":
    run()
