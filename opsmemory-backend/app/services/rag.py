"""
OpsMemory — RAG (Retrieval-Augmented Generation) Service

Handles knowledge base embedding, chunking, storage, and retrieval.
Every business has their own knowledge base — scoped by business_id.

The flow:
1. Business adds products, FAQs, policies, or uploads documents
2. Text is chunked and embedded using OpenAI text-embedding-3-small
3. Embeddings are stored in Supabase with pgvector
4. When a customer sends a message, we retrieve relevant knowledge
5. Knowledge is injected into the agent's system prompt for intelligent responses
"""

from openai import AsyncOpenAI
from app.config import settings
from app.database import supabase
from app.services.llm_client import get_llm_client
from typing import List, Dict, Optional
import logging
import re
import math

logger = logging.getLogger(__name__)

def _get_embed_client() -> AsyncOpenAI:
    """Embeddings via OpenRouter."""
    return get_llm_client("cheap")


# ── EMBEDDING ─────────────────────────────────────────────────────────────────

async def embed_text(text: str) -> List[float]:
    """
    Converts text to a vector embedding using OpenAI.
    Uses text-embedding-3-small: cheaper than ada-002, better performance.
    Output: list of 1536 floats.
    Cost: $0.02 per million tokens — embedding an entire catalog costs cents.
    """
    response = await _get_embed_client().embeddings.create(
        model=settings.openrouter_embedding_model,
        input=text.strip(),
    )
    return response.data[0].embedding


# ── CHUNKING ──────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """
    Splits long text into overlapping chunks for storage.
    chunk_size: approximate words per chunk (not tokens)
    overlap: words shared between consecutive chunks for context continuity

    For FAQs and catalog items entered manually — no chunking needed,
    they are short enough to store whole. Only chunk uploaded documents.
    """
    words = text.split()
    if len(words) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap  # Overlap for continuity

    return chunks


# ── STORAGE ───────────────────────────────────────────────────────────────────

async def store_knowledge_entry(
    business_id: str,
    content: str,
    category: str,
    title: str = None,
    source_file: str = None,
    chunk_index: int = 0,
    metadata: dict = None,
) -> str:
    """
    Embeds and stores a single knowledge chunk in Supabase.
    Returns the ID of the created record.
    """
    embedding = await embed_text(content)

    result = supabase.table("knowledge_base").insert({
        "business_id": business_id,
        "content": content,
        "embedding": embedding,
        "category": category,
        "title": title or content[:60],
        "source_file": source_file,
        "chunk_index": chunk_index,
        "metadata": metadata or {},
        "active": True,
    }).execute()

    return result.data[0]["id"]


async def store_document(
    business_id: str,
    full_text: str,
    filename: str,
    category: str = "document",
) -> int:
    """
    Chunks a long document and stores all chunks.
    Returns the number of chunks stored.
    Used for uploaded PDF or text files.
    """
    chunks = chunk_text(full_text)
    stored = 0
    for i, chunk in enumerate(chunks):
        if chunk.strip():
            await store_knowledge_entry(
                business_id=business_id,
                content=chunk,
                category=category,
                title=f"{filename} — Part {i + 1}",
                source_file=filename,
                chunk_index=i,
            )
            stored += 1
    logger.info(f"Stored {stored} chunks from document '{filename}' for business {business_id}")
    return stored


async def store_catalog_item(
    business_id: str,
    name: str,
    description: str,
    price: float,
    unit: str = None,
    sku: str = None,
    available: bool = True,
    image_url: str = None,
) -> str:
    """
    Stores a single product or service catalog item.
    Formats it as a natural language sentence for better retrieval.
    """
    price_str = f"₦{price:,.0f}"
    unit_str = f" per {unit}" if unit else ""
    availability = "Available" if available else "Currently unavailable"

    content = f"{name}: {description}. Price: {price_str}{unit_str}. Status: {availability}."
    if sku:
        content += f" SKU: {sku}."

    meta = {
        "price": price,
        "unit": unit,
        "sku": sku,
        "available": available,
    }
    if image_url:
        meta["image_url"] = image_url

    return await store_knowledge_entry(
        business_id=business_id,
        content=content,
        category="catalog",
        title=name,
        metadata=meta,
    )


async def store_faq_entry(
    business_id: str,
    question: str,
    answer: str,
) -> str:
    """
    Stores a FAQ question-answer pair.
    Formats as Q&A for natural retrieval.
    """
    content = f"Question: {question}\nAnswer: {answer}"
    return await store_knowledge_entry(
        business_id=business_id,
        content=content,
        category="faq",
        title=question[:80],
    )


async def store_policy(
    business_id: str,
    policy_type: str,
    policy_text: str,
) -> str:
    """
    Stores a business policy entry.
    policy_type: 'delivery', 'payment', 'returns', 'hours', 'contact', etc.
    """
    return await store_knowledge_entry(
        business_id=business_id,
        content=policy_text,
        category="policy",
        title=f"{policy_type.capitalize()} Policy",
        metadata={"policy_type": policy_type},
    )


# ── RETRIEVAL ─────────────────────────────────────────────────────────────────

def _cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def _retrieve_knowledge_local(
    business_id: str,
    query_embedding: List[float],
    top_k: int,
    threshold: float,
) -> List[Dict]:
    """Vector search using JSONB-stored embeddings (local PostgreSQL / no pgvector RPC)."""
    result = (
        supabase.table("knowledge_base")
        .select("id, content, category, title, embedding")
        .eq("business_id", business_id)
        .eq("active", True)
        .execute()
    )
    scored: List[tuple[float, Dict]] = []
    for row in result.data or []:
        emb = row.get("embedding")
        if not emb:
            continue
        score = _cosine_similarity(query_embedding, emb)
        if score >= threshold:
            scored.append((score, row))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [row for _, row in scored[:top_k]]


async def retrieve_relevant_knowledge(
    business_id: str,
    query: str,
    top_k: int = 4,
    threshold: float = 0.70,
) -> List[Dict]:
    """
    The core RAG retrieval function.
    Takes a customer query, embeds it, finds the most relevant
    knowledge base entries for that business.

    Called before every customer response generation.
    Returns a list of relevant content chunks with their categories.
    """
    if not query or len(query.strip()) < 3:
        return []

    query_embedding = await embed_text(query)

    try:
        result = supabase.rpc("match_knowledge", {
            "query_embedding": query_embedding,
            "target_business_id": business_id,
            "match_threshold": threshold,
            "match_count": top_k,
        }).execute()
        if result.data:
            return result.data
    except NotImplementedError:
        pass
    except Exception as exc:
        logger.warning("match_knowledge RPC failed, using local search: %s", exc)

    return await _retrieve_knowledge_local(
        business_id, query_embedding, top_k, threshold
    )


def format_knowledge_for_prompt(knowledge_chunks: List[Dict]) -> str:
    """
    Formats retrieved knowledge chunks into a clean string
    for injection into the LLM system prompt.
    """
    if not knowledge_chunks:
        return ""

    formatted = "BUSINESS KNOWLEDGE BASE — use this to answer customer questions:\n"
    for chunk in knowledge_chunks:
        category = chunk.get("category", "general").upper()
        content = chunk.get("content", "")
        formatted += f"\n[{category}]\n{content}\n"

    return formatted


# ── MANAGEMENT ────────────────────────────────────────────────────────────────

async def list_knowledge_entries(
    business_id: str,
    category: str = None,
) -> List[Dict]:
    """Returns all knowledge base entries for a business (without embeddings)."""
    query = supabase.table("knowledge_base")\
        .select("id, content, category, title, source_file, metadata, active, created_at")\
        .eq("business_id", business_id)\
        .eq("active", True)\
        .order("created_at", desc=True)

    if category:
        query = query.eq("category", category)

    result = query.execute()
    return result.data


async def delete_knowledge_entry(business_id: str, entry_id: str) -> bool:
    """Soft deletes a knowledge entry (sets active = False)."""
    result = supabase.table("knowledge_base")\
        .update({"active": False})\
        .eq("id", entry_id)\
        .eq("business_id", business_id)\
        .execute()
    return bool(result.data)


async def delete_all_from_source(business_id: str, source_file: str) -> int:
    """
    Deletes all chunks from a specific uploaded file.
    Called when the user removes an uploaded document.
    """
    result = supabase.table("knowledge_base")\
        .update({"active": False})\
        .eq("business_id", business_id)\
        .eq("source_file", source_file)\
        .execute()
    return len(result.data) if result.data else 0
