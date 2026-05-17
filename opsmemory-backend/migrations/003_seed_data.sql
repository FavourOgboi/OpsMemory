-- ==========================================================================
-- OpsMemory — Seed Data (copy-paste into Supabase SQL Editor)
-- Run AFTER 001_initial_schema.sql has been applied.
-- ==========================================================================

-- Generate deterministic UUIDs using uuid_generate_v4() per row
-- We'll use gen_random_uuid() (available in pgcrypto) or uuid-ossp

-- ── 1. Business ────────────────────────────────────────────────────────────
INSERT INTO businesses (id, name, type, whatsapp_number, whatsapp_connected, auto_reply_enabled, deal_approval_threshold, owner_user_id, owner_email)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Bola Agro Supplies Ltd',
  'trading',
  '+2348012345678',
  true,
  true,
  100000,
  'demo-owner-001',
  'bola@agro.ng'
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Business User (CEO) ─────────────────────────────────────────────────
INSERT INTO business_users (id, business_id, clerk_user_id, email, name, role, phone, active)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'demo-owner-001',
  'bola@agro.ng',
  'Bola Adeyemi',
  'ceo',
  '+2348011112222',
  true
)
ON CONFLICT (clerk_user_id) DO NOTHING;

-- ── 3. Customers ─────────────────────────────────────────────────────────
INSERT INTO customers (id, business_id, name, business_name, phone, language, health_score, churn_risk, total_revenue, outstanding_balance, days_since_last_order, open_invoices, assigned_to)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Alhaji Musa', 'Alhaji Musa Traders', '+2348031234567', 'pidgin', 71, 'low', 2100000, 150000, 7, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Chidinma Okonkwo', 'Chidinma Foods', '+2348059876543', 'english', 54, 'medium', 890000, 0, 12, 0, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Emeka Nwosu', 'Emeka Distribution Co', '+2348067654321', 'igbo', 38, 'high', 1400000, 320000, 21, 3, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Adaeze Ibe', 'Adaeze Stores', '+2348076543210', 'english', 82, 'low', 3400000, 80000, 3, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Ibrahim Danladi', 'Danladi Grains', '+2348098765432', 'pidgin', 45, 'high', 750000, 200000, 18, 2, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Funke Adebayo', 'Funke Supermart', '+2348012345670', 'english', 91, 'low', 4500000, 50000, 2, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Obinna Nnamdi', 'Obinna Electronics', '+2348023456789', 'igbo', 60, 'medium', 1200000, 90000, 9, 1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Amina Bello', 'Amina Retail', '+2348034567890', 'english', 77, 'low', 1800000, 0, 5, 0, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
ON CONFLICT (business_id, phone) DO NOTHING;

-- ── 4. Orders (spanning last 6 months) ────────────────────────────────────
INSERT INTO orders (id, business_id, customer_id, order_ref, total_amount, status, payment_status, amount_paid, created_at)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'ORD-2025-1000', 450000, 'delivered', 'paid', 450000, NOW() - INTERVAL '150 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'ORD-2025-1001', 680000, 'delivered', 'paid', 680000, NOW() - INTERVAL '120 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'ORD-2025-1002', 320000, 'delivered', 'paid', 320000, NOW() - INTERVAL '90 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'ORD-2025-1003', 890000, 'delivered', 'paid', 890000, NOW() - INTERVAL '60 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'ORD-2025-1004', 540000, 'delivered', 'paid', 540000, NOW() - INTERVAL '30 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'ORD-2025-1005', 1200000, 'delivered', 'paid', 1200000, NOW() - INTERVAL '5 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'ORD-2025-1006', 250000, 'delivered', 'paid', 250000, NOW() - INTERVAL '45 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'ORD-2025-1007', 410000, 'delivered', 'paid', 410000, NOW() - INTERVAL '75 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5. Invoices ────────────────────────────────────────────────────────────
INSERT INTO invoices (id, business_id, customer_id, ref, amount, status, due_date, created_at)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'INV-1001', 150000, 'pending', NOW() + INTERVAL '7 days', NOW() - INTERVAL '30 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'INV-1002', 320000, 'overdue', NOW() - INTERVAL '14 days', NOW() - INTERVAL '45 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'INV-1003', 80000, 'pending', NOW() + INTERVAL '3 days', NOW() - INTERVAL '20 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'INV-1004', 200000, 'overdue', NOW() - INTERVAL '7 days', NOW() - INTERVAL '35 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'INV-1005', 90000, 'pending', NOW() + INTERVAL '10 days', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6. Payments ────────────────────────────────────────────────────────────
INSERT INTO payments (id, business_id, customer_id, amount, method, status, confirmed_at, created_at)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 890000, 'bank_transfer', 'confirmed', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 50000, 'bank_transfer', 'confirmed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 1800000, 'bank_transfer', 'confirmed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 100000, 'bank_transfer', 'pending', NULL, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ── 7. Agent Actions ─────────────────────────────────────────────────────
INSERT INTO agent_actions (id, business_id, customer_id, agent_name, agent_color, trigger_summary, proposed_action, proposed_message, risk_level, confidence, track, status)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Collections Agent', 'oklch(0.68 0.21 20)', 'Emeka Nwosu is 21 days overdue on ₦320,000', 'Send polite payment reminder via WhatsApp', 'Good afternoon sir, please can you settle your balance of ₦320,000?', 'high', 0.92, 'escalate', 'pending'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'Churn Detection Agent', 'oklch(0.74 0.18 160)', 'Ibrahim Danladi order frequency dropped 60% in 30 days', 'Offer discount coupon and check in via WhatsApp', NULL, 'medium', 0.81, 'assign', 'pending'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a63', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'Deal Intelligence Agent', 'oklch(0.65 0.22 280)', 'Funke Adebayo inquired about bulk pricing for 500 units', 'Schedule call with sales manager to negotiate deal', NULL, 'low', 0.88, 'assign', 'pending')
ON CONFLICT (id) DO NOTHING;

-- ── 8. Live Events ───────────────────────────────────────────────────────
INSERT INTO live_events (id, business_id, customer_id, event_type, severity, title, description, agent_name)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a71', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'payment_confirmed', 'positive', 'Payment received', 'Chidinma Okonkwo paid ₦890,000', NULL),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a72', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'order_placed', 'info', 'New order', 'Adaeze Ibe placed an order for ₦120,000', NULL),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a73', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'churn_alert', 'warning', 'Churn risk detected', 'Ibrahim Danladi hasn''t ordered in 18 days', 'Churn Detection Agent'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a74', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'overdue_invoice', 'critical', 'Overdue payment', 'Emeka Nwosu is 21 days overdue on ₦320,000', 'Collections Agent')
ON CONFLICT (id) DO NOTHING;
