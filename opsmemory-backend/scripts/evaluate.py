"""
OpsMemory — Hackathon Evaluation Script

Computes scoring metrics for Task A and Task B:
  Task A: ROUGE-L F1 + Rating RMSE on held-out review pairs
  Task B: Hit Rate@10 on recommendation sessions

Usage:
  cd opsmemory-backend
  python scripts/evaluate.py --task a --samples 15
  python scripts/evaluate.py --task b --samples 10
  python scripts/evaluate.py --task all --samples 10
"""

import asyncio
import argparse
import logging
import math
import sys
import os
import time
from pathlib import Path

# Add parent directory to path so app.* imports resolve
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_PARAMS = {
    "dbname": os.getenv("OPSMEMORY_DB_NAME", "opsmemory"),
    "user": os.getenv("OPSMEMORY_DB_USER", "postgres"),
    "password": os.getenv("OPSMEMORY_DB_PASSWORD", "postgres"),
    "host": os.getenv("OPSMEMORY_DB_HOST", "localhost"),
    "port": os.getenv("OPSMEMORY_DB_PORT", "5432"),
}


def get_conn():
    return psycopg2.connect(cursor_factory=psycopg2.extras.RealDictCursor, **DB_PARAMS)


# ── Task A: Review Intelligence Evaluation ────────────────────────────────────

async def evaluate_task_a(n_samples: int = 15):
    """
    Hold-out evaluation:
    1. Pick users who have at least 5 reviews
    2. For each user, hold out 1 review as ground truth
    3. Generate a simulated review for the same (user, item)
    4. Compare predicted_stars vs actual_stars (RMSE)
    5. Compare review_text via ROUGE-L
    """
    try:
        from rouge_score import rouge_scorer
    except ImportError:
        logger.error("rouge-score not installed. Run: pip install rouge-score")
        sys.exit(1)

    from app.services.review_engine import simulate_from_profile

    conn = get_conn()
    cur = conn.cursor()

    # Find users with enough reviews for hold-out
    cur.execute("""
        SELECT eu.id AS user_id, eu.external_id, eu.review_count
        FROM external_users eu
        WHERE eu.review_count >= 5 AND eu.source = 'yelp'
        ORDER BY eu.review_count DESC
        LIMIT %s
    """, [n_samples * 2])  # Fetch extra in case some fail
    candidate_users = cur.fetchall()

    if not candidate_users:
        logger.error("No users with >= 5 reviews found. Run ingestion first.")
        cur.close()
        conn.close()
        return

    scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
    star_errors = []
    rouge_scores = []
    evaluated = 0

    logger.info(f"=" * 50)
    logger.info(f"TASK A EVALUATION — {n_samples} samples")
    logger.info(f"=" * 50)

    for user in candidate_users:
        if evaluated >= n_samples:
            break

        user_id = str(user["user_id"])

        # Pick a held-out review (the most recent one)
        cur.execute("""
            SELECT er.item_id, er.stars, er.review_text
            FROM external_reviews er
            WHERE er.user_id = %s AND er.review_text IS NOT NULL AND er.review_text != ''
            ORDER BY er.review_date DESC NULLS LAST
            LIMIT 1
        """, [user_id])
        held_out = cur.fetchone()

        if not held_out or not held_out["review_text"]:
            continue

        actual_stars = held_out["stars"]
        actual_text = held_out["review_text"]
        item_id = str(held_out["item_id"])

        try:
            logger.info(f"  [{evaluated + 1}/{n_samples}] User {user['external_id'][:12]}... → Item {item_id[:8]}...")

            result = await simulate_from_profile(
                user_id=user_id,
                item_id=item_id,
                force_nigerian=False,
            )

            predicted_stars = result.get("predicted_stars", 3)
            predicted_text = result.get("review_text", "")

            # RMSE component
            star_err = (predicted_stars - actual_stars) ** 2
            star_errors.append(star_err)

            # ROUGE-L
            scores = scorer.score(actual_text, predicted_text)
            rouge_l = scores["rougeL"].fmeasure
            rouge_scores.append(rouge_l)

            logger.info(
                f"    Stars: predicted={predicted_stars}, actual={actual_stars}, "
                f"ROUGE-L={rouge_l:.3f}"
            )
            evaluated += 1

            # Small delay to be kind to the API
            await asyncio.sleep(0.5)

        except Exception as e:
            logger.warning(f"    ⚠ Failed for user {user_id}: {e}")
            continue

    cur.close()
    conn.close()

    if not star_errors:
        logger.error("No samples evaluated. Check data and API keys.")
        return

    rmse = math.sqrt(sum(star_errors) / len(star_errors))
    avg_rouge = sum(rouge_scores) / len(rouge_scores)

    logger.info(f"\n{'=' * 50}")
    logger.info(f"TASK A RESULTS ({evaluated} samples)")
    logger.info(f"{'=' * 50}")
    logger.info(f"  Rating RMSE:     {rmse:.3f}  (lower = better, target < 1.0)")
    logger.info(f"  Avg ROUGE-L F1:  {avg_rouge:.3f}  (higher = better, target > 0.15)")
    logger.info(f"{'=' * 50}")

    return {"rmse": rmse, "rouge_l": avg_rouge, "n_samples": evaluated}


# ── Task B: Recommendation Engine Evaluation ──────────────────────────────────

async def evaluate_task_b(n_samples: int = 10):
    """
    Hit Rate@10 evaluation:
    1. Pick users with known review history
    2. Hold out items they've reviewed positively (>= 4 stars)
    3. Start a recommendation session
    4. Check if held-out items appear in top-10 recommendations
    """
    from app.services.recommendation_engine import start_session

    conn = get_conn()
    cur = conn.cursor()

    # Find users with positive reviews on known items
    cur.execute("""
        SELECT eu.id AS user_id, eu.external_id,
               array_agg(DISTINCT ei.name) AS liked_items
        FROM external_users eu
        JOIN external_reviews er ON er.user_id = eu.id
        JOIN external_items ei ON ei.id = er.item_id
        WHERE er.stars >= 4 AND eu.source = 'yelp'
        GROUP BY eu.id, eu.external_id
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
        LIMIT %s
    """, [n_samples * 2])
    candidates = cur.fetchall()

    if not candidates:
        logger.error("No users with positive reviews found. Run ingestion first.")
        cur.close()
        conn.close()
        return

    hits = 0
    evaluated = 0

    logger.info(f"\n{'=' * 50}")
    logger.info(f"TASK B EVALUATION — Hit Rate@10, {n_samples} samples")
    logger.info(f"{'=' * 50}")

    for cand in candidates:
        if evaluated >= n_samples:
            break

        user_id = str(cand["user_id"])
        liked = set(cand["liked_items"] or [])

        if not liked:
            continue

        try:
            logger.info(f"  [{evaluated + 1}/{n_samples}] User {cand['external_id'][:12]}... ({len(liked)} liked items)")

            # Start a recommendation session for this user
            result = await start_session(
                user_id=user_id,
                source="yelp",
                initial_message="Recommend some places I'd enjoy based on my taste",
            )

            recs = result.get("recommendations", [])
            rec_names = {r.get("name", "") for r in recs[:10]}

            # Check if any liked item appears in recommendations
            hit = bool(liked & rec_names)
            if hit:
                hits += 1
                overlap = liked & rec_names
                logger.info(f"    ✓ HIT — matched: {list(overlap)[:3]}")
            else:
                logger.info(f"    ✗ Miss — recs: {list(rec_names)[:3]}...")

            evaluated += 1
            await asyncio.sleep(0.5)

        except Exception as e:
            logger.warning(f"    ⚠ Failed for user {user_id}: {e}")
            continue

    cur.close()
    conn.close()

    if evaluated == 0:
        logger.error("No samples evaluated.")
        return

    hit_rate = hits / evaluated

    logger.info(f"\n{'=' * 50}")
    logger.info(f"TASK B RESULTS ({evaluated} samples)")
    logger.info(f"{'=' * 50}")
    logger.info(f"  Hit Rate@10:  {hit_rate:.3f}  ({hits}/{evaluated})")
    logger.info(f"  (Higher = better; this measures if user's liked items appear in recs)")
    logger.info(f"{'=' * 50}")

    # Cold-start test
    logger.info(f"\n  Running cold-start test...")
    try:
        cold_result = await start_session(
            source="yelp",
            initial_message="I'm new here, recommend something good",
        )
        agent_text = cold_result.get("agent_response", "")
        has_question = "?" in agent_text
        has_recs = bool(cold_result.get("recommendations"))
        logger.info(f"  Cold-start asks question: {'✓' if has_question else '✗'}")
        logger.info(f"  Cold-start gives recs immediately: {'✗ (correct — should ask first)' if not has_recs else '⚠ (should ask first)'}")
    except Exception as e:
        logger.warning(f"  Cold-start test failed: {e}")

    # Cross-domain test
    logger.info(f"\n  Running cross-domain test...")
    try:
        cross_result = await start_session(
            source="yelp",
            initial_message="Recommend a good book to read",
        )
        switched = cross_result.get("cross_domain", False)
        new_source = cross_result.get("source", "yelp")
        logger.info(f"  Cross-domain detected: {'✓' if switched else '✗'}")
        logger.info(f"  Switched to source: {new_source}")
    except Exception as e:
        logger.warning(f"  Cross-domain test failed: {e}")

    return {"hit_rate_at_10": hit_rate, "n_samples": evaluated, "hits": hits}


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OpsMemory Hackathon Evaluation")
    parser.add_argument(
        "--task",
        choices=["a", "b", "all"],
        default="all",
        help="Which task to evaluate (a=Review Intelligence, b=Recommendations, all=both)",
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=10,
        help="Number of samples to evaluate per task",
    )
    args = parser.parse_args()

    async def main():
        results = {}
        start = time.time()

        if args.task in ("a", "all"):
            results["task_a"] = await evaluate_task_a(args.samples)

        if args.task in ("b", "all"):
            results["task_b"] = await evaluate_task_b(args.samples)

        elapsed = round(time.time() - start, 1)
        logger.info(f"\n{'=' * 50}")
        logger.info(f"ALL EVALUATIONS COMPLETE — {elapsed}s")
        if results.get("task_a"):
            a = results["task_a"]
            logger.info(f"  Task A: RMSE={a['rmse']:.3f}, ROUGE-L={a['rouge_l']:.3f} ({a['n_samples']} samples)")
        if results.get("task_b"):
            b = results["task_b"]
            logger.info(f"  Task B: Hit@10={b['hit_rate_at_10']:.3f} ({b['hits']}/{b['n_samples']})")
        logger.info(f"{'=' * 50}")

    asyncio.run(main())
