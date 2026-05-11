"""
OpsMemory — Knowledge Base Router

Endpoints for managing the business knowledge base:
- Adding catalog items, FAQs, policies
- Uploading documents (PDF, TXT, MD)
- Listing and deleting entries

All operations scoped by business_id.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from app.auth import get_current_user
from app.services.rag import (
    store_catalog_item, store_faq_entry, store_policy,
    store_document, list_knowledge_entries,
    delete_knowledge_entry, delete_all_from_source,
)
from pydantic import BaseModel
from typing import Optional
import logging
import io

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

# Try to import pdfplumber, but don't fail if it's not installed yet
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False


# ── REQUEST MODELS ─────────────────────────────────────────────────────────────

class CatalogItemRequest(BaseModel):
    name: str
    description: str
    price: float
    unit: Optional[str] = None
    sku: Optional[str] = None
    available: bool = True


class FAQRequest(BaseModel):
    question: str
    answer: str


class PolicyRequest(BaseModel):
    policy_type: str   # 'delivery', 'payment', 'returns', 'hours', 'contact'
    policy_text: str


class GeneralEntryRequest(BaseModel):
    title: str
    content: str


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@router.get("/")
async def get_knowledge_base(
    category: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Returns all knowledge base entries for the business."""
    entries = await list_knowledge_entries(user["business_id"], category)
    return {"entries": entries, "count": len(entries)}


@router.post("/catalog")
async def add_catalog_item(
    body: CatalogItemRequest,
    user: dict = Depends(get_current_user),
):
    """Adds a product or service to the knowledge base."""
    entry_id = await store_catalog_item(
        business_id=user["business_id"],
        name=body.name,
        description=body.description,
        price=body.price,
        unit=body.unit,
        sku=body.sku,
        available=body.available,
    )
    return {"id": entry_id, "message": "Catalog item added successfully"}


@router.post("/faq")
async def add_faq(
    body: FAQRequest,
    user: dict = Depends(get_current_user),
):
    """Adds a FAQ question-answer pair to the knowledge base."""
    entry_id = await store_faq_entry(
        business_id=user["business_id"],
        question=body.question,
        answer=body.answer,
    )
    return {"id": entry_id, "message": "FAQ added successfully"}


@router.post("/policy")
async def add_policy(
    body: PolicyRequest,
    user: dict = Depends(get_current_user),
):
    """Adds a business policy to the knowledge base."""
    entry_id = await store_policy(
        business_id=user["business_id"],
        policy_type=body.policy_type,
        policy_text=body.policy_text,
    )
    return {"id": entry_id, "message": "Policy added successfully"}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(default="document"),
    user: dict = Depends(get_current_user),
):
    """
    Uploads a PDF or text file, extracts the text,
    chunks it, embeds it, and stores it in the knowledge base.
    Supported formats: .pdf, .txt, .md
    """
    filename = file.filename or "uploaded_document"
    content_bytes = await file.read()

    # Extract text based on file type
    if filename.lower().endswith(".pdf"):
        if not PDFPLUMBER_AVAILABLE:
            raise HTTPException(
                status_code=500,
                detail="PDF support not available. Please contact support."
            )
        try:
            with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
                full_text = "\n".join(
                    page.extract_text() or ""
                    for page in pdf.pages
                )
        except Exception as e:
            logger.error(f"PDF extraction error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")
    elif filename.lower().endswith((".txt", ".md")):
        full_text = content_bytes.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF, TXT, or MD file."
        )

    if not full_text.strip():
        raise HTTPException(status_code=400, detail="Document appears to be empty")

    chunks_stored = await store_document(
        business_id=user["business_id"],
        full_text=full_text,
        filename=filename,
        category=category,
    )

    return {
        "message": f"Document uploaded and processed successfully",
        "filename": filename,
        "chunks_stored": chunks_stored,
    }


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: str,
    user: dict = Depends(get_current_user),
):
    """Deletes a single knowledge base entry."""
    deleted = await delete_knowledge_entry(user["business_id"], entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}


@router.delete("/source/{source_file}")
async def delete_document(
    source_file: str,
    user: dict = Depends(get_current_user),
):
    """Deletes all chunks from an uploaded document."""
    count = await delete_all_from_source(user["business_id"], source_file)
    return {"message": f"Deleted {count} chunks from {source_file}"}
