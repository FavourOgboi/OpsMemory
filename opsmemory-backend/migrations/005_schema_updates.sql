-- OpsMemory — schema updates for intelligent agents demo
-- Run after 004_knowledge_base.sql

-- Hausa language support
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_language_check;
ALTER TABLE customers ADD CONSTRAINT customers_language_check
    CHECK (language IN ('english', 'pidgin', 'yoruba', 'igbo', 'hausa'));

-- Track which agent sent auto-replies
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_by_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages(conversation_id, created_at);
