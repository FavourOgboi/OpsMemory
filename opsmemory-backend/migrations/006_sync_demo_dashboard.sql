-- Sync stale demo labels after Bola Agro rename (005) and clear seed-only pending queue noise.

UPDATE live_events
SET description = REPLACE(description, 'Obinna Nnamdi', 'Nnamdi Okafor')
WHERE business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND description LIKE '%Obinna Nnamdi%';

UPDATE live_events
SET description = REPLACE(description, 'Obinna Electronics', 'Nnamdi Provisions')
WHERE business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND description LIKE '%Obinna Electronics%';

-- Resolve historical demo pending actions (agent sweep on seed data).
UPDATE agent_actions
SET status = 'auto_executed',
    outcome = 'Cleared demo seed on dashboard refresh',
    approved_at = NOW()
WHERE business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND status = 'pending';

UPDATE agent_actions
SET trigger_summary = REPLACE(trigger_summary, 'Obinna Nnamdi', 'Nnamdi Okafor')
WHERE trigger_summary LIKE '%Obinna Nnamdi%';

-- Remove junk auto-created customers from webhook tests (detach events first)
DELETE FROM live_events
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    AND (phone = '+' OR name = '+' OR name ~ '^\+234[0-9]+$')
);

DELETE FROM customers
WHERE business_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND (phone = '+' OR name = '+' OR name ~ '^\+234[0-9]+$');
