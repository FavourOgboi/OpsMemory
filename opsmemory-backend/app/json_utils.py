"""JSON helpers for API responses and LLM prompts."""

from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID


def to_jsonable(obj: Any) -> Any:
    """Recursively convert DB/API values to JSON-serializable types."""
    if obj is None:
        return None
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, dict):
        return {k: to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_jsonable(v) for v in obj]
    return obj


def json_dumps_safe(obj: Any, **kwargs: Any) -> str:
    return json.dumps(to_jsonable(obj), **kwargs)
