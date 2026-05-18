"""
OpsMemory — Pydantic Schemas

All request/response models for the API. Shared between routers and services.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ── Enums ─────────────────────────────────────────────────────────────────────

class Language(str, Enum):
    english = "english"
    pidgin = "pidgin"
    yoruba = "yoruba"
    igbo = "igbo"
    hausa = "hausa"


class ChurnRisk(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class DecisionTrack(str, Enum):
    auto = "auto"
    assign = "assign"
    escalate = "escalate"


class EventSeverity(str, Enum):
    positive = "positive"
    warning = "warning"
    critical = "critical"
    info = "info"


# ── Extraction ────────────────────────────────────────────────────────────────

class ExtractedData(BaseModel):
    intent: str
    # Intent options: 'payment_claim', 'order_request', 'delivery_inquiry',
    # 'complaint', 'price_inquiry', 'general_inquiry', 'payment_promise',
    # 'deal_negotiation', 'confirmation', 'greeting'
    amount: Optional[float] = None
    order_ref: Optional[str] = None
    customer_name: Optional[str] = None
    product_mentioned: Optional[str] = None
    date_mentioned: Optional[str] = None
    language: Language = Language.english
    sentiment: str = "neutral"  # 'positive', 'neutral', 'negative', 'urgent'
    confidence: float = Field(ge=0, le=1)
    is_payment_proof: bool = False
    payment_amount_from_image: Optional[float] = None
    bank_name: Optional[str] = None
    transaction_id: Optional[str] = None


# ── Webhooks ──────────────────────────────────────────────────────────────────

class WhatsAppWebhookPayload(BaseModel):
    object: str
    entry: List[Dict[str, Any]]


class TwilioWebhookPayload(BaseModel):
    From: str
    To: str
    Body: Optional[str] = None
    MediaUrl0: Optional[str] = None
    MediaContentType0: Optional[str] = None
    MessageSid: str
    NumMedia: str = "0"


# ── Conversations ─────────────────────────────────────────────────────────────

class SendReplyRequest(BaseModel):
    message: str
    conversation_id: str


class ConversationListItem(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    customer_business_name: Optional[str] = None
    health_score: int
    churn_risk: ChurnRisk
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int
    status: str
    assigned_to: Optional[str] = None


class MessageItem(BaseModel):
    id: str
    direction: str
    content: str
    media_type: Optional[str] = None
    extracted_data: Optional[ExtractedData] = None
    created_at: datetime


class ConversationDetail(BaseModel):
    conversation: Dict
    messages: List[MessageItem]
    customer: Dict
    agent_recommendation: Optional[Dict] = None


# ── Customers ─────────────────────────────────────────────────────────────────

class UpdateCustomerRequest(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    language: Optional[Language] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


# ── Approvals ─────────────────────────────────────────────────────────────────

class ApproveActionRequest(BaseModel):
    notes: Optional[str] = None


class RejectActionRequest(BaseModel):
    reason: str


# ── Analytics ─────────────────────────────────────────────────────────────────

class BusinessMetrics(BaseModel):
    revenue_this_week: float
    outstanding_total: float
    active_conversations: int
    health_score: int
    revenue_change_percent: float
    critical_alerts: int
    pending_approvals: int


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatQueryRequest(BaseModel):
    question: str
    role: str  # 'ceo', 'sales', 'finance', 'operations', 'manager'


class ChatQueryResponse(BaseModel):
    answer: str
    table_data: Optional[Dict] = None
    # table_data format: { headers: [str], rows: [[str]] }


# ── Onboarding ────────────────────────────────────────────────────────────────

class RegisterBusinessRequest(BaseModel):
    name: str
    type: str
    owner_email: str
    owner_name: str
    ceo_phone: Optional[str] = None
    deal_approval_threshold: float = 100000


class InviteTeamMemberRequest(BaseModel):
    email: str
    name: str
    role: str  # 'sales', 'finance', 'operations', 'manager'
    phone: Optional[str] = None


class ConnectWhatsAppRequest(BaseModel):
    business_id: str
    whatsapp_number: str
    pairing_code: str
    use_twilio_sandbox: bool = True  # True for dev, False for Meta API production


# ── Voice ─────────────────────────────────────────────────────────────────────

class VoiceCallContext(BaseModel):
    business_id: str
    user_id: str
    caller_phone: str
    role: str
