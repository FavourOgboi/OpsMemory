-- Onboarding fields for businesses + local auth user link on business_users

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS other_link TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS catalog_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS catalog_pdf_path TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS products_text TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS agent_languages JSONB DEFAULT '["english","pidgin"]';

ALTER TABLE business_users ADD COLUMN IF NOT EXISTS app_user_id TEXT UNIQUE;

-- Backfill app_user_id from clerk_user_id where present
UPDATE business_users SET app_user_id = clerk_user_id WHERE app_user_id IS NULL AND clerk_user_id IS NOT NULL;
