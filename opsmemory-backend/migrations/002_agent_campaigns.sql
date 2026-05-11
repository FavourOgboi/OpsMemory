-- ────────────────────────────────────────────────────────────────────────────
-- MIGRATION 002: Agent Campaigns Table for Fully Agentic Behavior
-- ────────────────────────────────────────────────────────────────────────────

-- Create agent_campaigns table to track multi-step agent campaigns
CREATE TABLE IF NOT EXISTS agent_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    goal TEXT NOT NULL,
    -- Goal types: 'collect_payment', 'recover_churning_customer', 'close_deal'
    
    current_step INTEGER DEFAULT 1,
    max_steps INTEGER DEFAULT 3,
    status TEXT DEFAULT 'active',
    -- Status values: 'active', 'goal_achieved', 'escalated', 'abandoned'
    
    last_action_at TIMESTAMPTZ DEFAULT NOW(),
    next_check_at TIMESTAMPTZ NOT NULL,
    -- When the scheduler should next evaluate this campaign
    
    context JSONB DEFAULT '{}',
    -- Stores everything the agent needs to remember:
    -- - actions_taken: list of all actions with timestamps
    -- - customer_responses: relevant messages from the customer
    -- - business_rules: applicable policies and constraints
    -- - escalation_recommendation: if escalated, what we're asking for
    
    outcome TEXT,
    -- Final outcome: 'goal_achieved', 'escalated_to_ceo', 'customer_rejected', 'timeout'
    
    outcome_reasoning TEXT,
    -- Why the agent concluded this campaign this way
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_agent_campaigns_business_id ON agent_campaigns(business_id);
CREATE INDEX idx_agent_campaigns_customer_id ON agent_campaigns(customer_id);
CREATE INDEX idx_agent_campaigns_status ON agent_campaigns(status);
CREATE INDEX idx_agent_campaigns_next_check ON agent_campaigns(next_check_at);
-- Composite index for finding campaigns that need processing
CREATE INDEX idx_agent_campaigns_active_check 
    ON agent_campaigns(status, next_check_at) 
    WHERE status = 'active';

-- Create campaign_log table to track all campaign decisions (audit trail)
CREATE TABLE IF NOT EXISTS campaign_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES agent_campaigns(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    action_taken TEXT NOT NULL,
    -- e.g., 'sent_reminder', 'escalated_to_ceo', 'moved_to_recovery_tier'
    
    reasoning TEXT,
    -- Why the agent chose this action
    
    agent_evaluation JSONB DEFAULT '{}',
    -- Full evaluation data from the agent
    -- - goal_achieved: boolean
    -- - confidence: 0-1
    -- - next_step_recommendation: string
    -- - alternative_actions: array
    
    customer_signal TEXT,
    -- What the agent detected from recent messages
    -- e.g., 'payment_confirmed', 'customer_responded', 'no_response'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_log_campaign_id ON campaign_log(campaign_id);
CREATE INDEX idx_campaign_log_business_id ON campaign_log(business_id);
CREATE INDEX idx_campaign_log_created_at ON campaign_log(created_at DESC);
