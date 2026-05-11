"""
OpsMemory — Passport Router

Generates and serves the Business Health Passport PDF.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from app.auth import get_current_user
from app.services.passport_generator import generate_passport
from datetime import datetime

router = APIRouter(prefix="/passport", tags=["passport"])


@router.get("/download")
async def download_passport(user: dict = Depends(get_current_user)):
    """Generates and returns the Business Health Passport as a PDF."""
    pdf_bytes = await generate_passport(user["business_id"])
    filename = f"OpsMemory_Passport_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
