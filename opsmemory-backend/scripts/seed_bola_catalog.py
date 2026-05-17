#!/usr/bin/env python3
"""
Seed Bola Agro Supplies catalog, FAQ, and policies into knowledge_base with embeddings.
Run from opsmemory-backend: ./venv/bin/python scripts/seed_bola_catalog.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.rag import store_catalog_item, store_faq_entry, store_policy

BIZ_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

# Curated Unsplash/Wikimedia-style stable image URLs (agricultural commodities)
CATALOG = [
    ("Local Parboiled Rice 50kg", "Premium Lagos parboiled rice for retailers", 48500, "bag", "RICE-50", True,
     "https://images.unsplash.com/photo-1586201375767-83865001e31c?w=800&q=80"),
    ("Imported Long Grain Rice 25kg", "Thai long grain rice, restaurant grade", 32000, "bag", "RICE-25", True,
     "https://images.unsplash.com/photo-1536304993881-ef6e8c1e6a94?w=800&q=80"),
    ("Honey Beans (Oloyin) 50kg", "Clean honey beans, minimum 10 bags", 72000, "bag", "BEAN-50", True,
     "https://images.unsplash.com/photo-1587735248150-9a58196074f3?w=800&q=80"),
    ("Brown Beans 25kg", "Brown beans for households and caterers", 38000, "bag", "BEAN-25", True,
     "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80"),
    ("Kings Vegetable Oil 25L", "Refined vegetable oil, carton pricing available", 42000, "keg", "OIL-25", True,
     "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80"),
    ("Palm Oil 25L", "Red palm oil, Lagos depot pickup or delivery", 35000, "keg", "PALM-25", True,
     "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80"),
    ("NPK 15-15-15 Fertilizer 50kg", "General purpose NPK for maize and vegetables", 28000, "bag", "NPK-50", True,
     "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"),
    ("Urea Fertilizer 50kg", "High nitrogen urea for rapid growth", 26500, "bag", "UREA-50", True,
     "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80"),
    ("Maize Seeds Hybrid 25kg", "High-yield hybrid maize seed", 55000, "bag", "MAIZE-SD", True,
     "https://images.unsplash.com/photo-1551752494-5e0d7c898f93?w=800&q=80"),
    ("Tomato Seeds (Roma) 100g", "Roma tomato seeds, 10+ trays MOQ", 8500, "pack", "TOM-SD", True,
     "https://images.unsplash.com/photo-1592840496694-26d035b52b23?w=800&q=80"),
    ("Glyphosate Herbicide 1L", "Weed control herbicide, agro-dealer license required", 4500, "bottle", "HERB-1L", True,
     "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"),
    ("Poultry Feed Grower 25kg", "Layer grower mash for commercial farms", 18500, "bag", "FEED-25", True,
     "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800&q=80"),
    ("Fish Feed Floating 15kg", "Floating fish feed for catfish ponds", 12000, "bag", "FISH-15", True,
     "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80"),
    ("Knapsack Sprayer 16L", "Manual sprayer with spare parts kit", 22000, "unit", "SPR-16", True,
     "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"),
    ("Watering Can 14L", "Heavy-duty plastic watering can", 4500, "unit", "WC-14", True,
     "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80"),
    ("Bola Agro Company Overview", "Bola Agro Supplies Ltd — Lagos distributor of fertilizers, seeds, grains, oils, and farm inputs since 2012. We serve retailers, caterers, and farms across Lagos Island, Mainland, and Ogun. MOQ applies on bulk grains. Payment: bank transfer to GTBank. Delivery 24-48h within Lagos.", 0, "info", "ABOUT", True,
     "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"),
]

FAQS = [
    ("What products do you sell?", "We supply rice, beans, vegetable oil, palm oil, fertilizers (NPK, urea), seeds, pesticides, poultry and fish feed, and basic farm equipment. Ask for our price list by product name."),
    ("What are your prices?", "Prices are per bag, keg, or unit as listed on our catalog. Bulk orders of 50+ bags get 3-5% discount. Send the product name and quantity for an exact quote."),
    ("Do you deliver in Lagos?", "Yes — Lagos Island and Mainland delivery in 24-48 hours. Ogun and nearby states: 2-3 days. Delivery fee from ₦3,000 depending on location and weight."),
    ("How do I pay?", "Bank transfer to GTBank Bola Agro Supplies Ltd. Send payment screenshot on WhatsApp. We confirm within 2 hours on business days."),
    ("Minimum order quantity?", "Grains: 10 bags minimum. Oils: 5 kegs. Fertilizer: 20 bags for best price. Retail single units available for seeds and small equipment."),
]

POLICIES = [
    ("delivery", "Lagos delivery Mon-Sat 8am-6pm. Orders confirmed before 2pm ship same day where stock allows. Customer provides accurate address and reachable phone."),
    ("payment", "100% transfer before dispatch for new accounts. Trusted accounts may get 7-day credit on approval. Always include invoice number in transfer narration."),
    ("returns", "Damaged or wrong goods reported within 24h of delivery with photo evidence. Replacement or credit note — no cash refunds on opened fertilizer or seeds."),
    ("contact", "WhatsApp business line, depot: Agege Industrial Estate Lagos. CEO escalation for disputes above ₦500,000."),
]


async def main():
    from app.services.rag import store_knowledge_entry

    print("Seeding catalog...")
    for name, desc, price, unit, sku, avail, img in CATALOG:
        content = f"{name}: {desc}. Price: ₦{price:,.0f} per {unit}. SKU: {sku}."
        if price == 0:
            content = f"{name}: {desc}"
        await store_knowledge_entry(
            business_id=BIZ_ID,
            content=content,
            category="catalog",
            title=name,
            metadata={"price": price, "unit": unit, "sku": sku, "available": avail, "image_url": img},
        )
        print(f"  + {name}")

    print("Seeding FAQ...")
    for q, a in FAQS:
        await store_faq_entry(BIZ_ID, q, a)

    print("Seeding policies...")
    for ptype, text in POLICIES:
        await store_policy(BIZ_ID, ptype, text)

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
