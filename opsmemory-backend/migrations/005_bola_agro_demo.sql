-- Bola Agro demo enrichment: customer fixes, order line items, sample conversations
-- Run after 005_schema_updates.sql. Knowledge catalog: run scripts/seed_bola_catalog.py

UPDATE customers SET
  name = 'Nnamdi Okafor',
  business_name = 'Nnamdi Provisions',
  order_frequency_days = 14,
  days_since_last_order = 9
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27';

UPDATE customers SET
  name = 'Demo Tester',
  business_name = 'Lagos Retail Test',
  language = 'english',
  health_score = 75,
  churn_risk = 'low',
  total_revenue = 450000,
  outstanding_balance = 0,
  days_since_last_order = 2,
  order_frequency_days = 21,
  open_invoices = 0
WHERE phone = '+2349064434659' AND business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

UPDATE orders SET items = '[{"name": "Local Parboiled Rice 50kg", "qty": 5, "unit_price": 48500, "sku": "RICE-50"}]'::jsonb,
  total_amount = 242500 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31';

UPDATE orders SET items = '[{"name": "Honey Beans 50kg", "qty": 8, "unit_price": 72000, "sku": "BEAN-50"}]'::jsonb,
  total_amount = 576000 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32';

UPDATE orders SET items = '[{"name": "NPK 15-15-15 50kg", "qty": 10, "unit_price": 28000, "sku": "NPK-50"}]'::jsonb,
  total_amount = 280000 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

UPDATE orders SET items = '[{"name": "Kings Vegetable Oil 25L", "qty": 20, "unit_price": 42000, "sku": "OIL-25"}]'::jsonb,
  total_amount = 840000 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34';

UPDATE orders SET items = '[{"name": "Maize Seeds Hybrid 25kg", "qty": 12, "unit_price": 55000, "sku": "MAIZE-SD"}]'::jsonb,
  total_amount = 660000 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35';

UPDATE orders SET items = '[{"name": "Local Parboiled Rice 50kg", "qty": 20, "unit_price": 48500, "sku": "RICE-50"}, {"name": "Palm Oil 25L", "qty": 10, "unit_price": 35000, "sku": "PALM-25"}]'::jsonb,
  total_amount = 1320000 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a36';

UPDATE orders SET items = '[{"name": "Poultry Feed Grower 25kg", "qty": 10, "unit_price": 18500, "sku": "FEED-25"}]'::jsonb,
  total_amount = 185000 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a37';

UPDATE orders SET items = '[{"name": "Urea Fertilizer 50kg", "qty": 8, "unit_price": 26500, "sku": "UREA-50"}]'::jsonb,
  total_amount = 212000 WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a38';

-- Sample conversation: Emeka payment / balance thread
INSERT INTO conversations (id, business_id, customer_id, status, last_message, last_message_at, unread_count)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23',
  'open',
  'I will pay Friday',
  NOW() - INTERVAL '2 days',
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, business_id, conversation_id, customer_id, direction, content, media_type, extracted_data, created_at)
VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'inbound', 'Good afternoon, what is my outstanding balance?', 'text', '{"intent":"balance_inquiry","language":"english","confidence":0.95}'::jsonb, NOW() - INTERVAL '3 days'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'outbound', 'Good afternoon Emeka. Your outstanding balance is ₦320,000 across 3 open invoices. Shall I send payment details?', 'text', NULL, NOW() - INTERVAL '3 days'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'inbound', 'Yes send GTBank details', 'text', '{"intent":"payment_promise","language":"english","confidence":0.9}'::jsonb, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Funke price inquiry thread
INSERT INTO conversations (id, business_id, customer_id, status, last_message, last_message_at, unread_count)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26',
  'open',
  'Price for 20 bags rice?',
  NOW() - INTERVAL '1 day',
  0
) ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, business_id, conversation_id, customer_id, direction, content, media_type, extracted_data, created_at)
VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'inbound', 'Good morning, price for 20 bags of parboiled rice?', 'text', '{"intent":"price_inquiry","product_mentioned":"rice","language":"english","confidence":0.92}'::jsonb, NOW() - INTERVAL '1 day'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'outbound', 'Good morning Funke. Local Parboiled Rice 50kg is ₦48,500/bag. 20 bags = ₦970,000 before delivery. Confirm address for quote?', 'text', NULL, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
