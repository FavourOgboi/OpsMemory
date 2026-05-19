"""
OpsMemory — Local PostgreSQL Database Client

Drop-in replacement for Supabase client in local dev mode.
Mimics the supabase.table().select().eq().execute() API.
"""

import psycopg2
from psycopg2.extras import RealDictCursor, Json
from typing import Optional, List, Dict, Any
from functools import lru_cache
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
import os
import re

from app.json_utils import to_jsonable

# ── Connection (local dev defaults; override via env — never commit real passwords) ──

DB_PARAMS = {
    "dbname": os.getenv("OPSMEMORY_DB_NAME", "opsmemory"),
    "user": os.getenv("OPSMEMORY_DB_USER", "postgres"),
    "password": os.getenv("OPSMEMORY_DB_PASSWORD", "postgres"),
    "host": os.getenv("OPSMEMORY_DB_HOST", "localhost"),
    "port": os.getenv("OPSMEMORY_DB_PORT", "5432"),
}


@lru_cache()
def _get_conn():
    """Return a cached psycopg2 connection."""
    return psycopg2.connect(cursor_factory=RealDictCursor, **DB_PARAMS)


def _utcnow():
    return datetime.now(timezone.utc)


def _adapt_value(val: Any) -> Any:
    """Prepare Python values for psycopg2 (JSONB, timestamps, etc.)."""
    if val == "now()":
        return _utcnow()
    if isinstance(val, dict):
        return Json(val)
    if isinstance(val, list):
        return Json(val)
    if isinstance(val, UUID):
        return str(val)
    return val


def _serialize_row(row: Dict) -> Dict:
    return to_jsonable(dict(row))


class _Result:
    """Mimics Supabase PostgREST response."""
    def __init__(self, data):
        self.data = data


class _QueryBuilder:
    """Builds SQL queries using the Supabase fluent API style."""

    def __init__(self, table: str):
        self.table = table
        self._select_cols = "*"
        self._joins: list = []
        self._join_cols: dict = {}
        self._filters: list = []
        self._order_by: Optional[str] = None
        self._order_desc = False
        self._limit: Optional[int] = None
        self._offset: Optional[int] = None
        self._single = False
        self._maybe_single = False
        self._count_mode: Optional[str] = None
        self._insert_data: Optional[Dict] = None
        self._update_data: Optional[Dict] = None
        self._upsert_data: Optional[Dict] = None
        self._upsert_conflict_col: Optional[str] = None
        self._delete = False

    # ── Chain methods ─────────────────────────────────────────────────────

    def select(self, cols: str = "*", count: str = None) -> "_QueryBuilder":
        self._select_cols = cols
        self._count_mode = count  # "exact" or None
        # Parse foreign table selects like "*, customers(name, business_name)"
        self._joins = []
        self._join_cols = {}
        if cols == "*":
            return self
        # Find patterns like "table_name(col1, col2)" or "table_name(*)"
        for match in re.finditer(r"([a-z_]+)\(([^)]+)\)", cols):
            join_table = match.group(1)
            join_fields = match.group(2)
            self._joins.append(join_table)
            self._join_cols[join_table] = [f.strip() for f in join_fields.split(",")]
        return self

    def eq(self, col: str, val: Any) -> "_QueryBuilder":
        self._filters.append(("=", col, val))
        return self

    def neq(self, col: str, val: Any) -> "_QueryBuilder":
        self._filters.append(("!=", col, val))
        return self

    def gt(self, col: str, val: Any) -> "_QueryBuilder":
        self._filters.append((">", col, val))
        return self

    def gte(self, col: str, val: Any) -> "_QueryBuilder":
        self._filters.append((">=", col, val))
        return self

    def lt(self, col: str, val: Any) -> "_QueryBuilder":
        self._filters.append(("<", col, val))
        return self

    def lte(self, col: str, val: Any) -> "_QueryBuilder":
        self._filters.append(("<=", col, val))
        return self

    def like(self, col: str, val: str) -> "_QueryBuilder":
        self._filters.append(("LIKE", col, val))
        return self

    def ilike(self, col: str, val: str) -> "_QueryBuilder":
        self._filters.append(("ILIKE", col, val))
        return self

    def in_(self, col: str, vals: list) -> "_QueryBuilder":
        self._filters.append(("IN", col, vals))
        return self

    def order(self, col: str, desc: bool = False) -> "_QueryBuilder":
        self._order_by = col
        self._order_desc = desc
        return self

    def limit(self, n: int) -> "_QueryBuilder":
        self._limit = n
        return self

    def offset(self, n: int) -> "_QueryBuilder":
        self._offset = n
        return self

    def single(self) -> "_QueryBuilder":
        self._single = True
        return self

    def maybeSingle(self) -> "_QueryBuilder":
        self._maybe_single = True
        return self

    def insert(self, data: Dict) -> "_QueryBuilder":
        self._insert_data = data
        return self

    def upsert(self, data: Dict, on_conflict: str = "external_id") -> "_QueryBuilder":
        self._upsert_data = data
        self._upsert_conflict_col = on_conflict
        return self

    def update(self, data: Dict) -> "_QueryBuilder":
        self._update_data = data
        return self

    def delete(self) -> "_QueryBuilder":
        self._delete = True
        return self

    # ── Execution ─────────────────────────────────────────────────────────

    def execute(self) -> _Result:
        conn = _get_conn()
        conn.rollback()  # Reset any failed transaction state from previous errors
        cur = conn.cursor()

        try:
            if self._upsert_data:
                return self._run_upsert(cur, conn)
            if self._insert_data:
                return self._run_insert(cur, conn)
            if self._update_data:
                return self._run_update(cur, conn)
            if self._delete:
                return self._run_delete(cur, conn)
            return self._run_select(cur)
        finally:
            cur.close()

    # ── Internal SQL builders ───────────────────────────────────────────

    def _run_select(self, cur) -> _Result:
        # COUNT mode (analytics)
        if self._count_mode == "exact":
            sql = f"SELECT COUNT(*) FROM {self.table}"
            where, params = self._build_where()
            if where:
                sql += f" WHERE {where}"
            cur.execute(sql, params)
            row = cur.fetchone()
            count = list(row.values())[0] if row else 0
            r = _Result([])
            r.count = count
            return r

        # Build column list — qualify base table when joining so `id` is not overwritten
        if self._joins:
            select_parts = [f"{self.table}.*"]
            for join_table in self._joins:
                for field in self._join_cols.get(join_table, []):
                    if field == "*":
                        continue
                    select_parts.append(
                        f'{join_table}."{field}" AS "{join_table}.{field}"'
                    )
            sql = f"SELECT {', '.join(select_parts)} FROM {self.table}"
        else:
            cols = "*" if self._select_cols == "*" else self._select_cols
            base_cols = re.sub(r",?\s*[a-z_]+\([^)]+\)", "", cols).strip()
            if not base_cols:
                base_cols = "*"
            sql = f"SELECT {base_cols} FROM {self.table}"

        params = []

        # Add JOINs for foreign table selects
        for join_table in self._joins:
            fk_col = self._guess_fk(join_table)
            sql += f" LEFT JOIN {join_table} ON {self.table}.{fk_col} = {join_table}.id"

        # WHERE
        where, params = self._build_where()
        if where:
            sql += f" WHERE {where}"

        # ORDER BY
        if self._order_by:
            dir_str = "DESC" if self._order_desc else "ASC"
            order_qualified = f'{self.table}."{self._order_by}"' if self._joins else f'"{self._order_by}"'
            sql += f" ORDER BY {order_qualified} {dir_str}"

        # LIMIT / OFFSET
        if self._limit:
            sql += f" LIMIT {self._limit}"
        if self._offset:
            sql += f" OFFSET {self._offset}"

        cur.execute(sql, params)
        rows = cur.fetchall()

        # Post-process: attach joined data as nested dicts (Supabase style)
        result_rows = []
        for row in rows:
            row_dict = dict(row)
            for join_table in self._joins:
                join_fields = self._join_cols.get(join_table, [])
                if join_fields == ["*"]:
                    # Include all columns from joined table
                    join_data = {k.replace(f"{join_table}.", ""): v for k, v in row_dict.items() if k.startswith(f"{join_table}.")}
                else:
                    join_data = {}
                    for f in join_fields:
                        key = f"{join_table}.{f}"
                        if key in row_dict:
                            join_data[f] = row_dict[key]
                if join_data:
                    row_dict[join_table] = join_data
                # Remove flattened join columns from root
                row_dict = {k: v for k, v in row_dict.items() if not k.startswith(f"{join_table}.")}
            result_rows.append(row_dict)

        serialized = [_serialize_row(r) for r in result_rows]

        if self._single and serialized:
            return _Result(serialized[0])
        if self._maybe_single and serialized:
            return _Result(serialized[0])
        if self._maybe_single and not serialized:
            return _Result(None)
        if self._single and not serialized:
            return _Result(None)

        return _Result(serialized)

    def _run_upsert(self, cur, conn) -> _Result:
        data = {k: _adapt_value(v) for k, v in self._upsert_data.items()}
        cols = ", ".join(f'"{k}"' for k in data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        conflict_col = self._upsert_conflict_col or "external_id"
        update_clause = ", ".join(
            f'"{k}" = EXCLUDED."{k}"' for k in data.keys() if k != conflict_col
        )
        sql = (
            f'INSERT INTO {self.table} ({cols}) VALUES ({placeholders}) '
            f'ON CONFLICT ("{conflict_col}") DO UPDATE SET {update_clause} RETURNING *'
        )
        cur.execute(sql, list(data.values()))
        conn.commit()
        rows = cur.fetchall()
        return _Result([_serialize_row(dict(r)) for r in rows])

    def _run_insert(self, cur, conn) -> _Result:
        data = {k: _adapt_value(v) for k, v in self._insert_data.items()}
        cols = ", ".join(f'"{k}"' for k in data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        sql = f'INSERT INTO {self.table} ({cols}) VALUES ({placeholders}) RETURNING *'
        cur.execute(sql, list(data.values()))
        conn.commit()
        rows = cur.fetchall()
        return _Result([_serialize_row(dict(r)) for r in rows])

    def _run_update(self, cur, conn) -> _Result:
        data = {k: _adapt_value(v) for k, v in self._update_data.items()}
        set_clause = ", ".join(f'"{k}" = %s' for k in data.keys())
        sql = f"UPDATE {self.table} SET {set_clause}"
        params = list(data.values())
        where, wparams = self._build_where()
        if where:
            sql += f" WHERE {where}"
            params.extend(wparams)
        sql += " RETURNING *"
        cur.execute(sql, params)
        conn.commit()
        rows = cur.fetchall()
        return _Result([_serialize_row(dict(r)) for r in rows])

    def _run_delete(self, cur, conn) -> _Result:
        sql = f"DELETE FROM {self.table}"
        where, params = self._build_where()
        if where:
            sql += f" WHERE {where}"
        sql += " RETURNING *"
        cur.execute(sql, params)
        conn.commit()
        rows = cur.fetchall()
        return _Result([_serialize_row(dict(r)) for r in rows])

    def _build_where(self):
        parts = []
        params = []
        for op, col, val in self._filters:
            # Qualify column with table name when joins are present to avoid ambiguity
            qualified = f'{self.table}."{col}"' if self._joins else f'"{col}"'
            if op == "IN":
                placeholders = ", ".join(["%s"] * len(val))
                parts.append(f'{qualified} IN ({placeholders})')
                params.extend(val)
            elif op in ("LIKE", "ILIKE"):
                parts.append(f'{qualified} {op} %s')
                params.append(val)
            elif val is None:
                if op == "=":
                    parts.append(f'{qualified} IS NULL')
                else:
                    parts.append(f'{qualified} IS NOT NULL')
            else:
                parts.append(f'{qualified} {op} %s')
                params.append(val)
        return " AND ".join(parts), params

    def _guess_fk(self, join_table: str) -> str:
        """Guess the foreign key column name."""
        if join_table == "customers":
            return "customer_id"
        if join_table == "businesses":
            return "business_id"
        if join_table == "live_events":
            return "customer_id"
        if join_table == "conversations":
            return "conversation_id"
        if join_table == "business_users":
            return "assigned_to"
        return f"{join_table.rstrip('s')}_id"


# ── Supabase-compatible proxy ────────────────────────────────────────────────

class _RpcBuilder:
    def __init__(self, fn_name: str, params: Dict[str, Any]):
        self.fn_name = fn_name
        self.params = params

    def execute(self) -> _Result:
        if self.fn_name == "match_knowledge":
            return _Result([])
        if self.fn_name == "match_items":
            return self._match_items()
        raise NotImplementedError(f"RPC '{self.fn_name}' is not implemented for local PostgreSQL")

    def _match_items(self) -> _Result:
        """Vector similarity search with pgvector, falls back to popularity ranking."""
        source = self.params.get("target_source", "yelp")
        limit = self.params.get("match_count", 10)
        embedding = self.params.get("query_embedding")
        conn = _get_conn()
        conn.rollback()
        cur = conn.cursor()
        try:
            # Try pgvector cosine similarity first
            if embedding:
                try:
                    cur.execute(
                        """
                        SELECT id, external_id, name, category, average_stars,
                               review_count, attributes,
                               1 - (embedding <=> %s::vector) AS similarity
                        FROM external_items
                        WHERE source = %s AND embedding IS NOT NULL
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                        """,
                        [str(embedding), source, str(embedding), limit],
                    )
                    rows = cur.fetchall()
                    if rows:
                        return _Result([_serialize_row(dict(r)) for r in rows])
                except Exception:
                    pass  # pgvector not installed — fall through to popularity
            # Fallback: popularity ranking
            cur.execute(
                """
                SELECT id, external_id, name, category, average_stars,
                       review_count, attributes, 0.5::FLOAT AS similarity
                FROM external_items
                WHERE source = %s
                ORDER BY review_count DESC
                LIMIT %s
                """,
                [source, limit],
            )
            rows = cur.fetchall()
            return _Result([_serialize_row(dict(r)) for r in rows])
        finally:
            cur.close()


class _SupabaseProxy:
    def table(self, name: str) -> _QueryBuilder:
        return _QueryBuilder(name)

    def rpc(self, fn_name: str, params: Dict[str, Any]) -> _RpcBuilder:
        return _RpcBuilder(fn_name, params)


supabase = _SupabaseProxy()


# ── Business helpers ──────────────────────────────────────────────────────────

async def get_business_by_id(business_id: str) -> Optional[Dict]:
    result = supabase.table("businesses").select("*").eq("id", business_id).single().execute()
    return result.data


async def get_business_by_owner(app_user_id: str) -> Optional[Dict]:
    result = supabase.table("businesses").select("*").eq("owner_user_id", app_user_id).maybeSingle().execute()
    return result.data


# ── Customer helpers ──────────────────────────────────────────────────────────

async def get_customer_by_phone(business_id: str, phone: str) -> Optional[Dict]:
    result = supabase.table("customers").select("*").eq("business_id", business_id).eq("phone", phone).maybeSingle().execute()
    return result.data


async def get_customer_by_id(business_id: str, customer_id: str) -> Optional[Dict]:
    result = supabase.table("customers").select("*").eq("id", customer_id).eq("business_id", business_id).single().execute()
    return result.data


async def get_business_customers(business_id: str) -> List[Dict]:
    result = supabase.table("customers").select("*").eq("business_id", business_id).order("total_revenue", desc=True).execute()
    return result.data


async def get_all_customers_for_agents(business_id: str) -> List[Dict]:
    result = supabase.table("customers").select("*, live_events(event_type, created_at, resolved)").eq("business_id", business_id).execute()
    return result.data


async def create_customer(customer_data: Dict) -> Dict:
    result = supabase.table("customers").insert(customer_data).execute()
    return result.data[0]


async def update_customer(business_id: str, customer_id: str, updates: Dict) -> Dict:
    result = supabase.table("customers").update(updates).eq("id", customer_id).eq("business_id", business_id).execute()
    return result.data[0]


# ── Conversation helpers ──────────────────────────────────────────────────────

async def get_or_create_conversation(business_id: str, customer_id: str) -> Dict:
    existing = supabase.table("conversations").select("*").eq("business_id", business_id).eq("customer_id", customer_id).eq("status", "open").maybeSingle().execute()
    if existing.data:
        return existing.data
    new_conv = supabase.table("conversations").insert({
        "business_id": business_id,
        "customer_id": customer_id,
        "status": "open",
        "assigned_to": None,
        "unread_count": 0,
    }).execute()
    return new_conv.data[0]


# ── Message helpers ───────────────────────────────────────────────────────────

async def insert_message(message_data: Dict) -> Dict:
    result = supabase.table("messages").insert(message_data).execute()
    return result.data[0]


# ── Event helpers ─────────────────────────────────────────────────────────────

async def insert_event(event_data: Dict) -> Dict:
    result = supabase.table("live_events").insert(event_data).execute()
    return result.data[0]


# ── Agent action helpers ──────────────────────────────────────────────────────

async def insert_agent_action(action_data: Dict) -> Dict:
    result = supabase.table("agent_actions").insert(action_data).execute()
    return result.data[0]


async def get_pending_approvals(business_id: str) -> List[Dict]:
    result = supabase.table("agent_actions").select("*, customers(name, business_name, total_revenue)").eq("business_id", business_id).eq("status", "pending").order("created_at", desc=True).execute()
    return result.data


async def has_pending_action(business_id: str, customer_id: str, agent_name: str) -> bool:
    result = supabase.table("agent_actions").select("id").eq("business_id", business_id).eq("customer_id", customer_id).eq("agent_name", agent_name).eq("status", "pending").maybeSingle().execute()
    return result.data is not None


# ── Business user helpers ─────────────────────────────────────────────────────

async def get_business_user(business_id: str, app_user_id: str) -> Optional[Dict]:
    result = supabase.table("business_users").select("*").eq("business_id", business_id).eq("app_user_id", app_user_id).maybeSingle().execute()
    return result.data


async def get_business_user_by_phone(phone: str) -> Optional[Dict]:
    result = supabase.table("business_users").select("*, businesses(*)").eq("phone", phone).eq("active", True).maybeSingle().execute()
    return result.data
