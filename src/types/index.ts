export type Role = 'ceo' | 'sales' | 'finance' | 'operations' | 'manager';
export type Language = 'english' | 'pidgin' | 'yoruba' | 'igbo';
export type EventSeverity = 'positive' | 'warning' | 'critical' | 'info';
export type AgentName =
  | 'Collections Agent'
  | 'Fulfillment Agent'
  | 'Churn Detection Agent'
  | 'Deal Intelligence Agent'
  | 'Revenue Pulse Agent'
  | 'Relationship Health Agent';
export type AgentStatus = 'active' | 'idle' | 'triggered';
export type MessageDirection = 'inbound' | 'outbound';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';
export type DecisionTrack = 'auto' | 'assign' | 'escalate';
export type ConversationStatus = 'open' | 'resolved' | 'escalated';
export type MediaType = 'text' | 'image' | 'voice' | 'document' | null;

export interface ExtractedData {
  intent: string;
  amount: number | null;
  orderRef: string | null;
  customerName: string | null;
  confidence: number;
}

export interface Customer {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  language: Language;
  healthScore: number;
  churnRisk: ChurnRisk;
  totalRevenue: number;
  outstandingBalance: number;
  daysSinceLastOrder: number;
  openInvoices: number;
  assignedTo: string;
  joinedAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface Invoice {
  id: string;
  ref: string;
  amount: number;
  status: 'overdue' | 'paid' | 'pending';
  customerId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  customerId: string;
  direction: MessageDirection;
  content: string;
  mediaType: MediaType;
  extractedData: ExtractedData | null;
  timestamp: string;
  sentBy: string | null;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  status: ConversationStatus;
  assignedTo: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface AgentAction {
  id: string;
  agentName: AgentName;
  agentColor: string;
  triggerSummary: string;
  proposedAction: string;
  proposedMessage: string | null;
  customerId: string;
  customerName: string;
  customerRevenue: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  track: DecisionTrack;
  status: ApprovalStatus;
  createdAt: string;
}

export interface LiveEvent {
  id: string;
  severity: EventSeverity;
  title: string;
  description: string;
  customerName: string;
  agentName: AgentName | null;
  timestamp: string;
  resolved: boolean;
}

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  color: string;
  eventCount: number;
  lastTriggered: string | null;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  whatsappNumber: string;
  whatsappConnected: boolean;
  autoReplyEnabled: boolean;
  dealApprovalThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMetrics {
  revenueThisWeek: number;
  outstandingTotal: number;
  activeConversations: number;
  healthScore: number;
}

export interface TimelineEvent {
  id: string;
  type: 'payment' | 'order' | 'conversation' | 'alert' | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  metadata?: Record<string, string>;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  evidence: string;
  recommendedAction: string;
  type: 'risk' | 'opportunity' | 'pattern';
}

export interface InsightCard {
  id: string;
  title: string;
  body: string;
  confidence: number;
  agentName: AgentName;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tableData?: {
    headers: string[];
    rows: string[][];
  } | null;
  timestamp: string;
}

export interface MockChatResponse {
  answer: string;
  tableData: {
    headers: string[];
    rows: string[][];
  } | null;
}
