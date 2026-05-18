-- ==========================================================================
-- OpsMemory — Knowledge base (RAG)
-- Run after 001_initial_schema.sql
-- ==========================================================================

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
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_business
    ON knowledge_base(business_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_business_active
    ON knowledge_base(business_id, active)
    WHERE active = TRUE;
