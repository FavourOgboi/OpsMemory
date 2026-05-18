/**
 * OpsMemory — API Response Mappers
 *
 * Transforms snake_case Supabase responses into camelCase frontend types.
 */

import type { Business, Customer, Message, Conversation, TimelineEvent, Insight } from '@/types';

export function mapBusiness(raw: any): Business {
  return {
    id: raw.id,
    name: raw.name || '',
    type: raw.type || '',
    whatsappNumber: raw.whatsapp_number || '',
    whatsappConnected: raw.whatsapp_connected ?? false,
    autoReplyEnabled: raw.auto_reply_enabled ?? true,
    dealApprovalThreshold: Number(raw.deal_approval_threshold || 100000),
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
  };
}

export function mapCustomer(raw: any): Customer {
  return {
    id: raw.id,
    name: raw.name,
    businessName: raw.business_name || '',
    phone: raw.phone || '',
    language: raw.language || 'english',
    healthScore: raw.health_score ?? 0,
    churnRisk: raw.churn_risk || 'low',
    totalRevenue: Number(raw.total_revenue || 0),
    outstandingBalance: Number(raw.outstanding_balance || 0),
    daysSinceLastOrder: raw.days_since_last_order ?? 0,
    openInvoices: raw.open_invoices ?? 0,
    assignedTo: raw.assigned_to || '',
    joinedAt: raw.created_at || raw.joined_at || '',
  };
}

export function mapMessage(raw: any): Message {
  const extracted = raw.extracted_data || raw.extractedData || null;
  return {
    id: raw.id,
    conversationId: raw.conversation_id || '',
    customerId: raw.customer_id || '',
    direction: raw.direction || 'inbound',
    content: raw.content || '',
    mediaType: raw.media_type || 'text',
    extractedData: extracted
      ? {
          intent: extracted.intent || 'general_inquiry',
          amount: extracted.amount ?? null,
          orderRef: extracted.order_ref || extracted.orderRef || null,
          customerName: extracted.customer_name || extracted.customerName || null,
          confidence: extracted.confidence ?? 0,
        }
      : null,
    timestamp: raw.created_at || raw.timestamp || new Date().toISOString(),
    sentBy: raw.sent_by_agent || raw.sent_by || raw.sentBy || null,
  };
}

export function mapConversation(raw: any): Conversation {
  return {
    id: raw.id,
    customerId: raw.customer_id || '',
    customerName: raw.customer_name || raw.customers?.name || '',
    status: raw.status || 'open',
    assignedTo: raw.assigned_to || '',
    lastMessage: raw.last_message || '',
    lastMessageTime: raw.last_message_at || raw.created_at || '',
    unreadCount: raw.unread_count ?? 0,
    messages: [],
  };
}

export function mapTimelineFromApi(raw: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // live_events → conversation/alert/milestone
  if (Array.isArray(raw.events)) {
    for (const e of raw.events) {
      const type: TimelineEvent['type'] =
        e.event_type === 'order'
          ? 'order'
          : e.event_type === 'payment'
            ? 'payment'
            : e.severity === 'critical' || e.severity === 'warning'
              ? 'alert'
              : 'milestone';
      events.push({
        id: e.id,
        type,
        title: e.title,
        description: e.description,
        timestamp: e.created_at,
        amount: e.metadata?.amount ? Number(e.metadata.amount) : undefined,
      });
    }
  }

  // agent_actions → alert
  if (Array.isArray(raw.agent_actions)) {
    for (const a of raw.agent_actions) {
      events.push({
        id: a.id,
        type: 'alert',
        title: a.agent_name,
        description: a.trigger_summary || a.proposed_action,
        timestamp: a.created_at,
      });
    }
  }

  // orders → order
  if (Array.isArray(raw.orders)) {
    for (const o of raw.orders) {
      events.push({
        id: o.id,
        type: 'order',
        title: o.order_ref ? `Order ${o.order_ref}` : 'Order placed',
        description: o.items ? formatItems(o.items) : 'New order',
        timestamp: o.created_at,
        amount: Number(o.total_amount || 0),
      });
    }
  }

  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events;
}

function formatItems(items: any[]): string {
  if (!Array.isArray(items)) return 'New order';
  const first = items.slice(0, 2).map((i: any) => `${i.qty || 1}x ${i.name || 'item'}`);
  const suffix = items.length > 2 ? ` +${items.length - 2} more` : '';
  return first.join(', ') + suffix;
}

export function mapInsight(raw: any): Insight {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    confidence: raw.confidence ?? 0.7,
    evidence: raw.evidence || '',
    recommendedAction: raw.recommendedAction || raw.recommended_action || 'Review details',
    type: raw.type || 'pattern',
  };
}
