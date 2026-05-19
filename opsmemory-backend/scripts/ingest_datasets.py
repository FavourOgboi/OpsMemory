"""
OpsMemory — Yelp Dataset Ingestion

Reads Yelp NDJSON files and stores into local PostgreSQL.
Uses psycopg2 directly (same DB as backend, no supabase-py needed).
Uses OpenAI API directly for embeddings + behavioral profiling.

Usage:
  cd opsmemory-backend
  python scripts/ingest_datasets.py --source yelp --limit 3000
  python scripts/ingest_datasets.py --source amazon --limit 1000
"""

import json
import asyncio
import argparse
import psycopg2
import psycopg2.extras
import os
import sys
import time
import logging
from pathlib import Path
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

DB_PARAMS = {
    "dbname": os.getenv("OPSMEMORY_DB_NAME", "opsmemory"),
    "user": os.getenv("OPSMEMORY_DB_USER", "postgres"),
    "password": os.getenv("OPSMEMORY_DB_PASSWORD", "postgres"),
    "host": os.getenv("OPSMEMORY_DB_HOST", "localhost"),
    "port": os.getenv("OPSMEMORY_DB_PORT", "5432"),
}

OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_KEY:
    logger.error("Missing OPENROUTER_API_KEY in .env")
    sys.exit(1)

OPENROUTER_BASE = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

openai_client = AsyncOpenAI(api_key=OPENROUTER_KEY, base_url=OPENROUTER_BASE)
DATA_DIR = Path(__file__).parent.parent / "data"

stats = {
    "users_ok": 0, "users_fail": 0,
    "items_ok": 0, "items_fail": 0,
    "reviews_ok": 0, "reviews_fail": 0,
    "profiles_ok": 0, "profiles_fail": 0,
}

NIGERIAN_WORDS = {
    "oga", "abeg", "na", "sha", "dey", "wahala", "oyinbo", "naija",
    "nna", "ndo", "biko", "ehen", "kai", "omo", "gbam", "shey",
    "wetin", "comot", "chop", "jollof", "suya", "eba", "garri",
    "danfo", "okada", "nepa", "sabi", "bros",
}


def get_conn():
    return psycopg2.connect(cursor_factory=psycopg2.extras.RealDictCursor, **DB_PARAMS)


def detect_nigerian(text: str) -> bool:
    words = set(text.lower().split())
    return bool(words & NIGERIAN_WORDS)


async def embed_text(text: str) -> list:
    await asyncio.sleep(0.12)
    try:
        resp = await openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:2000],
        )
        return resp.data[0].embedding
    except Exception as e:
        logger.warning(f"Embedding failed: {e}")
        return []


async def build_behavior_profile(reviews: list) -> dict:
    if not reviews:
        return {}

    stars = [r.get("stars", 3) for r in reviews]
    texts = [r.get("text", "") for r in reviews if r.get("text")]
    avg_rating = round(sum(stars) / len(stars), 2)
    rating_dist = {str(s): stars.count(s) for s in range(1, 6)}
    avg_word_count = round(sum(len(t.split()) for t in texts) / len(texts)) if texts else 0
    all_text = " ".join(texts[:10])
    nigerian = detect_nigerian(all_text)

    llm_profile = {
        "tone": "balanced",
        "common_complaints": [],
        "common_praises": [],
        "language_style": "casual",
        "writing_personality": "Typical reviewer",
    }

    if texts:
        try:
            await asyncio.sleep(0.15)
            sample_reviews = texts[:3]
            resp = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": f"""Analyze these reviews from ONE user. Return ONLY valid JSON.

Reviews:
{json.dumps(sample_reviews, indent=1)}

Return this exact structure:
{{
  "tone": "enthusiastic" or "brief" or "detailed_critic" or "storyteller" or "balanced",
  "common_complaints": ["up to 3 recurring complaint themes"],
  "common_praises": ["up to 3 recurring praise themes"],
  "language_style": "casual" or "formal" or "emoji_heavy" or "terse",
  "writing_personality": "one sentence describing how this person writes"
}}"""}],
                max_tokens=200,
                temperature=0,
                response_format={"type": "json_object"},
            )
            llm_profile = json.loads(resp.choices[0].message.content)
            stats["profiles_ok"] += 1
        except Exception as e:
            logger.warning(f"LLM profile failed: {e}")
            stats["profiles_fail"] += 1

    return {
        "avg_rating": avg_rating,
        "rating_distribution": rating_dist,
        "review_count": len(reviews),
        "review_length_avg": avg_word_count,
        "nigerian_context": nigerian,
        **llm_profile,
    }


async def ingest_yelp(limit: int = 3000):
    logger.info("=" * 50)
    logger.info("YELP INGESTION START")
    logger.info("=" * 50)
    start_time = time.time()
    conn = get_conn()

    # ── 1. Load and store businesses ──────────────────────────────────────────
    biz_file = DATA_DIR / "yelp_academic_dataset_business.json"
    businesses: dict = {}
    if biz_file.exists():
        logger.info("Loading Yelp businesses...")
        with open(biz_file, encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= 2000:
                    break
                try:
                    b = json.loads(line)
                    businesses[b["business_id"]] = b
                except Exception:
                    continue
        logger.info(f"Read {len(businesses)} businesses from file")

        for biz_id, biz in list(businesses.items())[:400]:
            name = biz.get("name", "")
            cats = biz.get("categories", "") or ""
            city = biz.get("city", "")
            state = biz.get("state", "")
            desc = f"{name}. Categories: {cats}. Rating: {biz.get('stars', 0)}/5. Location: {city}, {state}."

            try:
                emb = await embed_text(desc)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO external_items
                            (external_id, source, name, category, subcategories,
                             description, average_stars, review_count, embedding, attributes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (external_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            average_stars = EXCLUDED.average_stars,
                            review_count = EXCLUDED.review_count,
                            embedding = EXCLUDED.embedding,
                            attributes = EXCLUDED.attributes
                        RETURNING id
                        """,
                        [
                            biz_id, "yelp", name,
                            cats.split(",")[0].strip() if cats else "General",
                            [c.strip() for c in cats.split(",")][:5] if cats else [],
                            desc,
                            biz.get("stars", 0),
                            biz.get("review_count", 0),
                            json.dumps(emb) if emb else None,
                            json.dumps({
                                "city": city, "state": state,
                                "is_open": biz.get("is_open"),
                                "price_range": (
                                    biz.get("attributes", {}).get("RestaurantsPriceRange2")
                                    if isinstance(biz.get("attributes"), dict) else None
                                ),
                            }),
                        ],
                    )
                    conn.commit()
                    stats["items_ok"] += 1
            except Exception as e:
                conn.rollback()
                logger.error(f"Business {biz_id}: {e}")
                stats["items_fail"] += 1

            if stats["items_ok"] % 50 == 0 and stats["items_ok"] > 0:
                logger.info(f"  Businesses: {stats['items_ok']} stored, {stats['items_fail']} failed")

        logger.info(f"Businesses complete: {stats['items_ok']} stored, {stats['items_fail']} failed")
    else:
        logger.warning(f"Business file not found: {biz_file}")

    # ── 2. Load reviews grouped by user ──────────────────────────────────────
    rev_file = DATA_DIR / "yelp_academic_dataset_review.json"
    if not rev_file.exists():
        logger.error(f"Review file not found: {rev_file}")
        conn.close()
        return

    logger.info(f"Loading up to {limit} reviews...")
    user_reviews: dict = {}
    with open(rev_file, encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= limit:
                break
            try:
                r = json.loads(line)
                uid = r.get("user_id")
                if uid:
                    user_reviews.setdefault(uid, []).append(r)
            except Exception:
                continue
    logger.info(f"Grouped reviews for {len(user_reviews)} unique users")

    # ── 3. Build profiles and store ───────────────────────────────────────────
    processed = 0
    for user_id, reviews in list(user_reviews.items())[:400]:
        if len(reviews) < 3:
            continue

        try:
            profile = await build_behavior_profile(reviews)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO external_users
                        (external_id, source, review_count, average_stars,
                         behavior_profile, nigerian_signals)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (external_id) DO UPDATE SET
                        review_count = EXCLUDED.review_count,
                        average_stars = EXCLUDED.average_stars,
                        behavior_profile = EXCLUDED.behavior_profile,
                        nigerian_signals = EXCLUDED.nigerian_signals,
                        updated_at = NOW()
                    RETURNING id
                    """,
                    [
                        user_id, "yelp", len(reviews),
                        profile.get("avg_rating", 0),
                        json.dumps(profile),
                        profile.get("nigerian_context", False),
                    ],
                )
                row = cur.fetchone()
                conn.commit()

            if not row:
                stats["users_fail"] += 1
                continue

            stored_user_id = row["id"]
            stats["users_ok"] += 1

            # Store this user's reviews — FULL text (needed for ROUGE/BERTScore)
            for rev in reviews[:20]:
                biz_id = rev.get("business_id")
                if not biz_id:
                    continue
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id FROM external_items WHERE external_id = %s", [biz_id]
                    )
                    item_row = cur.fetchone()
                if not item_row:
                    continue

                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO external_reviews
                                (external_review_id, user_id, item_id, source,
                                 stars, review_text, review_date, useful_votes)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (external_review_id) DO NOTHING
                            """,
                            [
                                rev.get("review_id"),
                                str(stored_user_id),
                                str(item_row["id"]),
                                "yelp",
                                rev.get("stars"),
                                rev.get("text", ""),
                                rev.get("date"),
                                rev.get("useful", 0),
                            ],
                        )
                        conn.commit()
                        stats["reviews_ok"] += 1
                except Exception:
                    conn.rollback()
                    stats["reviews_fail"] += 1

            processed += 1
            if processed % 25 == 0:
                logger.info(
                    f"  Users: {processed} processed "
                    f"({stats['users_ok']} ok, {stats['users_fail']} fail)"
                )

        except Exception as e:
            conn.rollback()
            logger.error(f"User {user_id}: {e}")
            stats["users_fail"] += 1

    conn.close()
    elapsed = round(time.time() - start_time, 1)
    logger.info(f"""
{'=' * 50}
YELP INGESTION COMPLETE — {elapsed}s
Users:    {stats['users_ok']} stored, {stats['users_fail']} failed
Items:    {stats['items_ok']} stored, {stats['items_fail']} failed
Reviews:  {stats['reviews_ok']} stored, {stats['reviews_fail']} failed
Profiles: {stats['profiles_ok']} LLM ok, {stats['profiles_fail']} LLM failed
{'=' * 50}
""")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Yelp/Amazon datasets into OpsMemory")
    parser.add_argument("--source", choices=["yelp", "amazon", "all"], default="yelp")
    parser.add_argument("--limit", type=int, default=3000, help="Max reviews to process")
    args = parser.parse_args()

    async def main():
        if args.source in ("yelp", "all"):
            await ingest_yelp(args.limit)

    asyncio.run(main())
