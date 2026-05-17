#!/usr/bin/env python3
"""
OpsMemory — Seed Script
Inserts demo data for the fictional Lagos business "Bola Agro Supplies Ltd".
Run after applying 001_initial_schema.sql.
"""

import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from supabase import create_client


def seed():
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    # ── 1. Business ──────────────────────────────────────────────────────────
    business_id = str(uuid4())
    client.table("businesses").insert({
        "id": business_id,
        "name": "Bola Agro Supplies Ltd",
        "type": "trading",
        "whatsapp_number": "+2348012345678",
        "whatsapp_connected": True,
        "auto_reply_enabled": True,
        "deal_approval_threshold": 100000,
        "owner_user_id": "demo-owner-001",
        "owner_email": "bola@agro.ng",
    }).execute()
    print(f"Business {business_id} created")

    # ── 2. Business User (CEO) ───────────────────────────────────────────────
    user_id = str(uuid4())
    client.table("business_users").insert({
        "id": user_id,
        "business_id": business_id,
        "clerk_user_id": "demo-owner-001",
        "email": "bola@agro.ng",
        "name": "Bola Adeyemi",
        "role": "ceo",
        "phone": "+2348011112222",
        "active": True,
    }).execute()
    print(f"User {user_id} created")

    # ── 3. Customers ─────────────────────────────────────────────────────────
    customers = [
        {"name": "Alhaji Musa", "business_name": "Alhaji Musa Traders", "phone": "+2348031234567", "language": "pidgin", "health_score": 71, "churn_risk": "low", "total_revenue": 2100000, "outstanding_balance": 150000, "days_since_last_order": 7, "open_invoices": 1},
        {"name": "Chidinma Okonkwo", "business_name": "Chidinma Foods", "phone": "+2348059876543", "language": "english", "health_score": 54, "churn_risk": "medium", "total_revenue": 890000, "outstanding_balance": 0, "days_since_last_order": 12, "open_invoices": 0},
        {"name": "Emeka Nwosu", "business_name": "Emeka Distribution Co", "phone": "+2348067654321", "language": "igbo", "health_score": 38, "churn_risk": "high", "total_revenue": 1400000, "outstanding_balance": 320000, "days_since_last_order": 21, "open_invoices": 3},
        {"name": "Adaeze Ibe", "business_name": "Adaeze Stores", "phone": "+2348076543210", "language": "english", "health_score": 82, "churn_risk": "low", "total_revenue": 3400000, "outstanding_balance": 80000, "days_since_last_order": 3, "open_invoices": 1},
        {"name": "Ibrahim Danladi", "business_name": "Danladi Grains", "phone": "+2348098765432", "language": "pidgin", "health_score": 45, "churn_risk": "high", "total_revenue": 750000, "outstanding_balance": 200000, "days_since_last_order": 18, "open_invoices": 2},
        {"name": "Funke Adebayo", "business_name": "Funke Supermart", "phone": "+2348012345670", "language": "english", "health_score": 91, "churn_risk": "low", "total_revenue": 4500000, "outstanding_balance": 50000, "days_since_last_order": 2, "open_invoices": 1},
        {"name": "Obinna Nnamdi", "business_name": "Obinna Electronics", "phone": "+2348023456789", "language": "igbo", "health_score": 60, "churn_risk": "medium", "total_revenue": 1200000, "outstanding_balance": 90000, "days_since_last_order": 9, "open_invoices": 1},
        {"name": "Amina Bello", "business_name": "Amina Retail", "phone": "+2348034567890", "language": "english", "health_score": 77, "churn_risk": "low", "total_revenue": 1800000, "outstanding_balance": 0, "days_since_last_order": 5, "open_invoices": 0},
    ]

    customer_ids = []
    for c in customers:
        cid = str(uuid4())
        customer_ids.append(cid)
        client.table("customers").insert({
            "id": cid,
            "business_id": business_id,
            **c,
            "assigned_to": user_id,
        }).execute()
    print(f"{len(customers)} customers created")

    # ── 4. Orders (spanning last 6 months) ─────────────────────────────────────
    now = datetime.utcnow()
    order_months = [
        (now - timedelta(days=150), 450000),
        (now - timedelta(days=120), 680000),
        (now - timedelta(days=90), 320000),
        (now - timedelta(days=60), 890000),
        (now - timedelta(days=30), 540000),
        (now - timedelta(days=5), 1200000),
        (now - timedelta(days=45), 250000),
        (now - timedelta(days=75), 410000),
    ]

    for i, (dt, amt) in enumerate(order_months):
        cid = customer_ids[i % len(customer_ids)]
        client.table("orders").insert({
            "id": str(uuid4()),
            "business_id": business_id,
            "customer_id": cid,
            "order_ref": f"ORD-2025-{1000+i}",
            "total_amount": amt,
            "status": "delivered",
            "payment_status": "paid",
            "amount_paid": amt,
            "created_at": dt.isoformat(),
        }).execute()
    print(f"{len(order_months)} orders created")

    # ── 5. Invoices ────────────────────────────────────────────────────────────
    invoice_data = [
        (customer_ids[0], 150000, "pending", now + timedelta(days=7)),
        (customer_ids[2], 320000, "overdue", now - timedelta(days=14)),
        (customer_ids[3], 80000, "pending", now + timedelta(days=3)),
        (customer_ids[4], 200000, "overdue", now - timedelta(days=7)),
        (customer_ids[6], 90000, "pending", now + timedelta(days=10)),
    ]

    invoice_ids = []
    for cid, amt, status, due in invoice_data:
        iid = str(uuid4())
        invoice_ids.append(iid)
        client.table("invoices").insert({
            "id": iid,
            "business_id": business_id,
            "customer_id": cid,
            "ref": f"INV-{1000+len(invoice_ids)}",
            "amount": amt,
            "status": status,
            "due_date": due.isoformat(),
            "created_at": (now - timedelta(days=30)).isoformat(),
        }).execute()
    print(f"{len(invoice_data)} invoices created")

    # ── 6. Payments ──────────────────────────────────────────────────────────
    payment_data = [
        (customer_ids[1], 890000, "confirmed", now - timedelta(days=10)),
        (customer_ids[5], 50000, "confirmed", now - timedelta(days=5)),
        (customer_ids[7], 1800000, "confirmed", now - timedelta(days=20)),
        (customer_ids[0], 100000, "pending", now - timedelta(days=2)),
    ]

    for cid, amt, status, confirmed in payment_data:
        client.table("payments").insert({
            "id": str(uuid4()),
            "business_id": business_id,
            "customer_id": cid,
            "amount": amt,
            "method": "bank_transfer",
            "status": status,
            "confirmed_at": confirmed.isoformat() if status == "confirmed" else None,
            "created_at": confirmed.isoformat(),
        }).execute()
    print(f"{len(payment_data)} payments created")

    # ── 7. Agent Actions ─────────────────────────────────────────────────────
    actions = [
        {
            "agent_name": "Collections Agent",
            "agent_color": "oklch(0.68 0.21 20)",
            "trigger_summary": "Emeka Nwosu is 21 days overdue on ₦320,000",
            "proposed_action": "Send polite payment reminder via WhatsApp",
            "proposed_message": "Good afternoon sir, please can you settle your balance of ₦320,000?",
            "risk_level": "high",
            "confidence": 0.92,
            "track": "escalate",
            "status": "pending",
            "customer_id": customer_ids[2],
        },
        {
            "agent_name": "Churn Detection Agent",
            "agent_color": "oklch(0.74 0.18 160)",
            "trigger_summary": "Ibrahim Danladi order frequency dropped 60% in 30 days",
            "proposed_action": "Offer discount coupon and check in via WhatsApp",
            "proposed_message": None,
            "risk_level": "medium",
            "confidence": 0.81,
            "track": "assign",
            "status": "pending",
            "customer_id": customer_ids[4],
        },
        {
            "agent_name": "Deal Intelligence Agent",
            "agent_color": "oklch(0.65 0.22 280)",
            "trigger_summary": "Funke Adebayo inquired about bulk pricing for 500 units",
            "proposed_action": "Schedule call with sales manager to negotiate deal",
            "proposed_message": None,
            "risk_level": "low",
            "confidence": 0.88,
            "track": "assign",
            "status": "pending",
            "customer_id": customer_ids[5],
        },
    ]

    for a in actions:
        client.table("agent_actions").insert({
            "id": str(uuid4()),
            "business_id": business_id,
            **a,
        }).execute()
    print(f"{len(actions)} agent actions created")

    # ── 8. Live Events ───────────────────────────────────────────────────────
    events = [
        {"event_type": "payment_confirmed", "severity": "positive", "title": "Payment received", "description": "Chidinma Okonkwo paid ₦890,000", "agent_name": None},
        {"event_type": "order_placed", "severity": "info", "title": "New order", "description": "Adaeze Ibe placed an order for ₦120,000", "agent_name": None},
        {"event_type": "churn_alert", "severity": "warning", "title": "Churn risk detected", "description": "Ibrahim Danladi hasn't ordered in 18 days", "agent_name": "Churn Detection Agent"},
        {"event_type": "overdue_invoice", "severity": "critical", "title": "Overdue payment", "description": "Emeka Nwosu is 21 days overdue on ₦320,000", "agent_name": "Collections Agent"},
    ]

    for e in events:
        client.table("live_events").insert({
            "id": str(uuid4()),
            "business_id": business_id,
            "customer_id": customer_ids[0] if "Emeka" in e["description"] else customer_ids[1] if "Chidinma" in e["description"] else customer_ids[3] if "Adaeze" in e["description"] else customer_ids[4] if "Ibrahim" in e["description"] else None,
            **e,
        }).execute()
    print(f"{len(events)} live events created")

    print("\n✅ Seed complete. Note the business_id and user_id for demo token use:")
    print(f"   business_id: {business_id}")
    print(f"   user_id:     {user_id}")


if __name__ == "__main__":
    seed()
