import type {
  AgentAction,
  AgentName,
  AgentState,
  BusinessMetrics,
  ChatMessage,
  Conversation,
  Customer,
  Insight,
  Invoice,
  LiveEvent,
  MockChatResponse,
  Role,
  StaffMember,
  TimelineEvent,
} from '@/types';

export const BUSINESS_NAME = 'Your Business';

export const METRICS: BusinessMetrics = {
  revenueThisWeek: 2400000,
  outstandingTotal: 890000,
  activeConversations: 12,
  healthScore: 78,
};

export const formatNaira = (amount: number, compact = false) => {
  if (compact && Math.abs(amount) >= 1000000) {
    return `N${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (compact && Math.abs(amount) >= 1000) {
    return `N${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  }
  return `N${amount.toLocaleString('en-NG')}`;
};

export const CUSTOMERS: Customer[] = [
  {
    id: 'c-001',
    name: 'Alhaji Musa',
    businessName: 'Alhaji Musa Traders',
    phone: '+2348031234567',
    language: 'pidgin',
    healthScore: 71,
    churnRisk: 'low',
    totalRevenue: 2100000,
    outstandingBalance: 150000,
    daysSinceLastOrder: 7,
    openInvoices: 1,
    assignedTo: 'u-001',
    joinedAt: '2023-06-12',
  },
  {
    id: 'c-002',
    name: 'Chidinma Okonkwo',
    businessName: 'Chidinma Foods',
    phone: '+2348059876543',
    language: 'english',
    healthScore: 54,
    churnRisk: 'medium',
    totalRevenue: 890000,
    outstandingBalance: 0,
    daysSinceLastOrder: 12,
    openInvoices: 0,
    assignedTo: 'u-001',
    joinedAt: '2023-09-03',
  },
  {
    id: 'c-003',
    name: 'Emeka Nwosu',
    businessName: 'Emeka Distribution Co',
    phone: '+2348067654321',
    language: 'igbo',
    healthScore: 38,
    churnRisk: 'high',
    totalRevenue: 1400000,
    outstandingBalance: 320000,
    daysSinceLastOrder: 21,
    openInvoices: 3,
    assignedTo: 'u-002',
    joinedAt: '2023-03-17',
  },
  {
    id: 'c-004',
    name: 'Adaeze Ibe',
    businessName: 'Adaeze Supermarket',
    phone: '+2348041122334',
    language: 'english',
    healthScore: 91,
    churnRisk: 'low',
    totalRevenue: 670000,
    outstandingBalance: 0,
    daysSinceLastOrder: 2,
    openInvoices: 0,
    assignedTo: 'u-002',
    joinedAt: '2024-01-08',
  },
  {
    id: 'c-005',
    name: 'Ibrahim Danladi',
    businessName: 'Danladi Grains',
    phone: '+2348071122334',
    language: 'pidgin',
    healthScore: 65,
    churnRisk: 'low',
    totalRevenue: 3400000,
    outstandingBalance: 0,
    daysSinceLastOrder: 4,
    openInvoices: 0,
    assignedTo: 'u-001',
    joinedAt: '2022-11-20',
  },
  {
    id: 'c-006',
    name: 'Funke Adebayo',
    businessName: 'Mama Funke Stores',
    phone: '+2348082233445',
    language: 'yoruba',
    healthScore: 42,
    churnRisk: 'high',
    totalRevenue: 560000,
    outstandingBalance: 180000,
    daysSinceLastOrder: 18,
    openInvoices: 2,
    assignedTo: 'u-002',
    joinedAt: '2023-07-15',
  },
  {
    id: 'c-007',
    name: 'Obinna Nnamdi',
    businessName: 'Nnamdi Provisions',
    phone: '+2348093344556',
    language: 'igbo',
    healthScore: 88,
    churnRisk: 'low',
    totalRevenue: 1200000,
    outstandingBalance: 0,
    daysSinceLastOrder: 3,
    openInvoices: 0,
    assignedTo: 'u-001',
    joinedAt: '2023-04-22',
  },
  {
    id: 'c-008',
    name: 'Amina Bello',
    businessName: 'Amina Mart',
    phone: '+2348104455667',
    language: 'english',
    healthScore: 73,
    churnRisk: 'medium',
    totalRevenue: 980000,
    outstandingBalance: 45000,
    daysSinceLastOrder: 6,
    openInvoices: 1,
    assignedTo: 'u-002',
    joinedAt: '2023-08-30',
  },
];

export const STAFF: StaffMember[] = [
  { id: 'u-001', name: 'Tunde Bakare', role: 'Sales' },
  { id: 'u-002', name: 'Ngozi Eze', role: 'Sales' },
  { id: 'u-003', name: 'Kemi Lawal', role: 'Finance' },
  { id: 'u-004', name: 'Seyi Afolabi', role: 'Operations' },
  { id: 'u-ceo', name: 'Bola Adeyemi', role: 'CEO' },
];

export const INVOICES: Invoice[] = [
  { id: 'inv-001', ref: '#2841', amount: 150000, status: 'overdue', customerId: 'c-001' },
  { id: 'inv-002', ref: '#2836', amount: 320000, status: 'overdue', customerId: 'c-003' },
  { id: 'inv-003', ref: '#2877', amount: 95000, status: 'paid', customerId: 'c-004' },
  { id: 'inv-004', ref: '#2881', amount: 180000, status: 'overdue', customerId: 'c-006' },
  { id: 'inv-005', ref: '#2885', amount: 45000, status: 'pending', customerId: 'c-008' },
];

export const AGENT_STATES: AgentState[] = [
  {
    name: 'Collections Agent',
    status: 'triggered',
    color: 'oklch(0.60 0.20 260)',
    eventCount: 3,
    lastTriggered: new Date(Date.now() - 120000).toISOString(),
  },
  {
    name: 'Fulfillment Agent',
    status: 'active',
    color: 'oklch(0.74 0.18 160)',
    eventCount: 1,
    lastTriggered: new Date(Date.now() - 300000).toISOString(),
  },
  {
    name: 'Churn Detection Agent',
    status: 'triggered',
    color: 'oklch(0.66 0.21 295)',
    eventCount: 2,
    lastTriggered: new Date(Date.now() - 900000).toISOString(),
  },
  {
    name: 'Deal Intelligence Agent',
    status: 'triggered',
    color: 'oklch(0.78 0.16 75)',
    eventCount: 1,
    lastTriggered: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    name: 'Revenue Pulse Agent',
    status: 'idle',
    color: 'oklch(0.68 0.21 20)',
    eventCount: 0,
    lastTriggered: null,
  },
  {
    name: 'Relationship Health Agent',
    status: 'idle',
    color: 'oklch(0.60 0.16 175)',
    eventCount: 0,
    lastTriggered: null,
  },
];

export const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  'Collections Agent':
    'Monitors overdue invoices and payment promises, then drafts the right payment follow-up for each customer.',
  'Fulfillment Agent':
    'Tracks orders from placement to delivery, flags delays, and confirms receipt with customers.',
  'Churn Detection Agent':
    'Analyzes ordering gaps, sentiment changes, and reply speed to catch churn risk early.',
  'Deal Intelligence Agent':
    'Identifies bulk orders, discount requests, and CEO-level opportunities before terms drift.',
  'Revenue Pulse Agent':
    'Watches revenue pace, payment recovery, and abnormal dips across the trading week.',
  'Relationship Health Agent':
    'Scores customer relationships using order rhythm, complaint history, and payment behavior.',
};

export const AGENT_LAST_ACTIVE: Record<AgentName, string> = {
  'Collections Agent': '2m ago',
  'Fulfillment Agent': '5m ago',
  'Churn Detection Agent': '12m ago',
  'Deal Intelligence Agent': '31m ago',
  'Revenue Pulse Agent': '3h ago',
  'Relationship Health Agent': '6h ago',
};

export const AGENT_ACTIONS: AgentAction[] = [
  {
    id: 'a-001',
    agentName: 'Collections Agent',
    agentColor: 'oklch(0.60 0.20 260)',
    triggerSummary: 'Invoice #2841 is 7 days overdue. Customer has not responded to the last reminder.',
    proposedAction: 'Send a firm but respectful payment follow-up to Alhaji Musa via WhatsApp.',
    proposedMessage:
      'Good morning Alhaji, e don be 7 days since we send invoice #2841 for N150,000. Abeg confirm when you go settle am so we fit process your next order. Thank you sir.',
    customerId: 'c-001',
    customerName: 'Alhaji Musa Traders',
    customerRevenue: 2100000,
    riskLevel: 'medium',
    confidence: 0.91,
    track: 'assign',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'a-002',
    agentName: 'Churn Detection Agent',
    agentColor: 'oklch(0.66 0.21 295)',
    triggerSummary: 'Chidinma Foods has not ordered in 12 days. Usual order cycle is 7-9 days.',
    proposedAction: 'Send a check-in message to re-engage before the account drifts.',
    proposedMessage:
      "Hi Chidinma, hope business is going well. We noticed you have not placed your usual order recently. We have fresh stock available if you want us to prepare delivery this week.",
    customerId: 'c-002',
    customerName: 'Chidinma Foods',
    customerRevenue: 890000,
    riskLevel: 'medium',
    confidence: 0.84,
    track: 'assign',
    status: 'pending',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'a-003',
    agentName: 'Deal Intelligence Agent',
    agentColor: 'oklch(0.78 0.16 75)',
    triggerSummary:
      'Emeka Distribution Co requested a N450,000 bulk order with 10% discount. This exceeds staff approval threshold.',
    proposedAction:
      'Escalate to CEO with a 5% counter-offer recommendation to retain the account without margin erosion.',
    proposedMessage: null,
    customerId: 'c-003',
    customerName: 'Emeka Distribution Co',
    customerRevenue: 1400000,
    riskLevel: 'high',
    confidence: 0.88,
    track: 'escalate',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const LIVE_EVENTS: LiveEvent[] = [
  {
    id: 'e-001',
    severity: 'positive',
    title: 'Payment screenshot received',
    description: 'Alhaji Musa sent a bank transfer receipt for N150,000',
    customerName: 'Alhaji Musa Traders',
    agentName: 'Collections Agent',
    timestamp: new Date().toISOString(),
    resolved: false,
  },
  {
    id: 'e-002',
    severity: 'info',
    title: 'Delivery confirmed',
    description: 'Adaeze Supermarket confirmed receipt of Order #2876',
    customerName: 'Adaeze Supermarket',
    agentName: 'Fulfillment Agent',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    resolved: true,
  },
  {
    id: 'e-003',
    severity: 'warning',
    title: 'Churn risk elevated',
    description: 'Chidinma Foods health score dropped 18 points this week',
    customerName: 'Chidinma Foods',
    agentName: 'Churn Detection Agent',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    resolved: false,
  },
  {
    id: 'e-004',
    severity: 'critical',
    title: 'Deal escalated to CEO',
    description: 'N450K bulk deal from Emeka requires CEO approval',
    customerName: 'Emeka Distribution Co',
    agentName: 'Deal Intelligence Agent',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    resolved: false,
  },
  {
    id: 'e-005',
    severity: 'positive',
    title: 'New order placed',
    description: 'Adaeze Supermarket placed Order #2877 for N95,000',
    customerName: 'Adaeze Supermarket',
    agentName: null,
    timestamp: new Date(Date.now() - 2700000).toISOString(),
    resolved: true,
  },
  {
    id: 'e-006',
    severity: 'warning',
    title: 'Invoice overdue',
    description: 'Invoice #2841 passed 7-day threshold. Collections Agent activated',
    customerName: 'Alhaji Musa Traders',
    agentName: 'Collections Agent',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    resolved: false,
  },
  {
    id: 'e-007',
    severity: 'positive',
    title: 'Payment confirmed',
    description: 'Danladi Grains paid N450,000 for Invoice #2880',
    customerName: 'Danladi Grains',
    agentName: 'Collections Agent',
    timestamp: new Date(Date.now() - 4500000).toISOString(),
    resolved: true,
  },
  {
    id: 'e-008',
    severity: 'info',
    title: 'New conversation started',
    description: 'Nnamdi Provisions asked about bulk pricing for rice',
    customerName: 'Nnamdi Provisions',
    agentName: 'Deal Intelligence Agent',
    timestamp: new Date(Date.now() - 5200000).toISOString(),
    resolved: false,
  },
  {
    id: 'e-009',
    severity: 'critical',
    title: 'Health score critical',
    description: 'Mama Funke Stores health score dropped to 42. High churn risk detected',
    customerName: 'Mama Funke Stores',
    agentName: 'Churn Detection Agent',
    timestamp: new Date(Date.now() - 6100000).toISOString(),
    resolved: false,
  },
  {
    id: 'e-010',
    severity: 'warning',
    title: 'Delivery delayed',
    description: 'Order #2879 for Amina Mart delayed due to logistics',
    customerName: 'Amina Mart',
    agentName: 'Fulfillment Agent',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    resolved: false,
  },
  {
    id: 'e-011',
    severity: 'positive',
    title: 'Revenue milestone',
    description: 'Weekly revenue crossed N2.4M target',
    customerName: BUSINESS_NAME,
    agentName: 'Revenue Pulse Agent',
    timestamp: new Date(Date.now() - 8400000).toISOString(),
    resolved: true,
  },
  {
    id: 'e-012',
    severity: 'info',
    title: 'Profile updated',
    description: 'Alhaji Musa updated delivery address',
    customerName: 'Alhaji Musa Traders',
    agentName: 'Relationship Health Agent',
    timestamp: new Date(Date.now() - 9600000).toISOString(),
    resolved: true,
  },
];

export const EVENT_TEMPLATES: Omit<LiveEvent, 'id' | 'timestamp'>[] = [
  {
    severity: 'positive',
    title: 'Payment received',
    description: 'Bank transfer confirmed for Invoice #2841',
    customerName: 'Alhaji Musa Traders',
    agentName: 'Collections Agent',
    resolved: false,
  },
  {
    severity: 'warning',
    title: 'Order delay alert',
    description: 'Delivery for Order #2883 running 2 hours behind schedule',
    customerName: 'Amina Mart',
    agentName: 'Fulfillment Agent',
    resolved: false,
  },
  {
    severity: 'info',
    title: 'New inquiry',
    description: 'Nnamdi Provisions asked about seasonal pricing for rice',
    customerName: 'Nnamdi Provisions',
    agentName: 'Deal Intelligence Agent',
    resolved: false,
  },
  {
    severity: 'critical',
    title: 'Duplicate payment detected',
    description: 'Alhaji Musa may have paid Invoice #2841 twice',
    customerName: 'Alhaji Musa Traders',
    agentName: 'Collections Agent',
    resolved: false,
  },
  {
    severity: 'positive',
    title: 'Order fulfilled',
    description: 'Danladi Grains confirmed receipt of Order #2880',
    customerName: 'Danladi Grains',
    agentName: 'Fulfillment Agent',
    resolved: true,
  },
  {
    severity: 'warning',
    title: 'Health score drop',
    description: 'Mama Funke Stores health score fell below 50',
    customerName: 'Mama Funke Stores',
    agentName: 'Churn Detection Agent',
    resolved: false,
  },
];

export const NEW_EVENT_TEMPLATES = EVENT_TEMPLATES;

const baseMessages: Conversation['messages'] = [
  {
    id: 'm-001',
    conversationId: 'conv-001',
    customerId: 'c-001',
    direction: 'inbound',
    content: 'Good afternoon, I don send the money for the last order. N150,000. Here is the receipt.',
    mediaType: 'image',
    extractedData: {
      intent: 'payment_confirmation',
      amount: 150000,
      orderRef: '#2841',
      customerName: 'Alhaji Musa',
      confidence: 0.95,
    },
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    sentBy: null,
  },
  {
    id: 'm-002',
    conversationId: 'conv-001',
    customerId: 'c-001',
    direction: 'outbound',
    content: 'Thank you Alhaji. We have received your payment of N150,000 for Invoice #2841. Your next order can now be processed.',
    mediaType: 'text',
    extractedData: null,
    timestamp: new Date(Date.now() - 1700000).toISOString(),
    sentBy: 'u-001',
  },
  {
    id: 'm-003',
    conversationId: 'conv-001',
    customerId: 'c-001',
    direction: 'inbound',
    content: 'When can I expect my next delivery? I need the rice and beans by Friday.',
    mediaType: 'text',
    extractedData: {
      intent: 'delivery_request',
      amount: null,
      orderRef: null,
      customerName: 'Alhaji Musa',
      confidence: 0.89,
    },
    timestamp: new Date(Date.now() - 1600000).toISOString(),
    sentBy: null,
  },
  {
    id: 'm-004',
    conversationId: 'conv-001',
    customerId: 'c-001',
    direction: 'outbound',
    content: 'No problem Alhaji, we will arrange delivery for Thursday morning so you have everything before Friday.',
    mediaType: 'text',
    extractedData: null,
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    sentBy: 'u-001',
  },
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-001',
    customerId: 'c-001',
    customerName: 'Alhaji Musa Traders',
    status: 'open',
    assignedTo: 'u-001',
    lastMessage: 'When can I expect my next delivery?',
    lastMessageTime: new Date(Date.now() - 1500000).toISOString(),
    unreadCount: 1,
    messages: baseMessages,
  },
  {
    id: 'conv-002',
    customerId: 'c-003',
    customerName: 'Emeka Distribution Co',
    status: 'escalated',
    assignedTo: 'u-002',
    lastMessage: 'Can you give me 10% discount?',
    lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 2,
    messages: [
      {
        id: 'm-005',
        conversationId: 'conv-002',
        customerId: 'c-003',
        direction: 'inbound',
        content: 'I want to place a bulk order. 50 bags of rice, 30 cartons of vegetable oil. Can you give me 10% discount?',
        mediaType: 'text',
        extractedData: {
          intent: 'bulk_order_discount_request',
          amount: 450000,
          orderRef: null,
          customerName: 'Emeka Nwosu',
          confidence: 0.92,
        },
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        sentBy: null,
      },
      {
        id: 'm-006',
        conversationId: 'conv-002',
        customerId: 'c-003',
        direction: 'outbound',
        content: 'Thanks Emeka. I am checking the discount approval and will confirm shortly.',
        mediaType: 'text',
        extractedData: null,
        timestamp: new Date(Date.now() - 3300000).toISOString(),
        sentBy: 'u-002',
      },
    ],
  },
];

export const MOCK_MESSAGES = CONVERSATIONS.flatMap((conversation) => conversation.messages);

export const TIMELINE_EVENTS: TimelineEvent[] = [
  { id: 't-001', type: 'milestone', title: 'Customer onboarded', description: 'Alhaji Musa Traders joined your business', timestamp: '2023-06-12T10:00:00Z' },
  { id: 't-002', type: 'order', title: 'First order placed', description: 'Order #2401: 20 bags of rice, 10 cartons of oil', timestamp: '2023-06-15T14:30:00Z', amount: 280000 },
  { id: 't-003', type: 'payment', title: 'Payment received', description: 'Full payment for Order #2401', timestamp: '2023-06-18T09:15:00Z', amount: 280000 },
  { id: 't-004', type: 'order', title: 'Recurring order', description: 'Order #2550: 35 bags of rice, 15 cartons of oil', timestamp: '2023-09-20T11:00:00Z', amount: 420000 },
  { id: 't-005', type: 'conversation', title: 'Price negotiation', description: 'Customer requested a volume discount for rice orders', timestamp: '2023-11-05T16:45:00Z' },
  { id: 't-006', type: 'milestone', title: 'VIP status earned', description: 'Customer crossed N1M lifetime revenue threshold', timestamp: '2024-01-10T08:00:00Z' },
  { id: 't-007', type: 'order', title: 'Large order placed', description: 'Order #2841: 40 bags of rice, 20 cartons of oil, 10 bags of beans', timestamp: '2024-04-28T13:20:00Z', amount: 560000 },
  { id: 't-008', type: 'alert', title: 'Payment overdue', description: 'Invoice #2841 payment not received after 7 days', timestamp: '2024-05-05T09:00:00Z', amount: 150000 },
  { id: 't-009', type: 'payment', title: 'Partial payment received', description: 'Bank transfer receipt submitted for N150,000', timestamp: '2024-05-09T11:30:00Z', amount: 150000 },
  { id: 't-010', type: 'conversation', title: 'Next order discussion', description: 'Customer requested delivery by Friday for new order', timestamp: '2024-05-09T12:00:00Z' },
];

export const INSIGHTS: Insight[] = [
  {
    id: 'i-001',
    title: 'Payment reliability declining',
    description: 'Alhaji Musa used to pay within 3 days. Last 2 invoices took 7+ days.',
    confidence: 0.87,
    evidence: 'Average payment time increased from 2.8 to 7.5 days over the last 3 invoices.',
    recommendedAction: 'Offer split payment terms',
    type: 'risk',
  },
  {
    id: 'i-002',
    title: 'High lifetime value trajectory',
    description: 'At current order frequency, this account is projected to cross N3M lifetime value by Q3.',
    confidence: 0.91,
    evidence: 'Consistent N400K+ monthly orders across 8 months.',
    recommendedAction: 'Prioritize retention',
    type: 'opportunity',
  },
  {
    id: 'i-003',
    title: 'Language preference improves response',
    description: 'The customer responds faster to Pidgin than standard English.',
    confidence: 0.78,
    evidence: 'Average response time: Pidgin 2.1h versus English 3.5h.',
    recommendedAction: 'Keep follow-ups in Pidgin',
    type: 'pattern',
  },
];

export const SUGGESTED_QUERIES: Record<Role, string[]> = {
  ceo: ['Revenue trend this month', 'Top revenue this month', 'Customers at churn risk', 'Agent activity this week'],
  sales: ['Outstanding payments this week', "Which accounts haven't ordered in 14 days", 'Customers at churn risk', 'Top revenue this month'],
  finance: ['Outstanding payments this week', 'Confirmed payments this week', 'Invoices over 30 days overdue', 'Total outstanding balance'],
  operations: ['Top orders pending delivery', 'Delayed deliveries today', 'Vendor responses needed', 'Open fulfillment issues'],
  manager: ['Customers at churn risk', 'Team escalations today', 'Open approvals by priority', 'Agent activity this week'],
};

export const MOCK_CHAT_RESPONSES: Record<string, MockChatResponse> = {
  'Outstanding payments this week': {
    answer: 'You have 3 customers with outstanding payments totalling N650,000 this week.',
    tableData: {
      headers: ['Customer', 'Amount', 'Days overdue'],
      rows: [
        ['Alhaji Musa Traders', 'N150,000', '7'],
        ['Emeka Distribution Co', 'N320,000', '21'],
        ['Mama Funke Stores', 'N180,000', '14'],
      ],
    },
  },
  'Customers at churn risk': {
    answer: '2 customers are currently high risk, with one medium-risk account that needs a check-in.',
    tableData: {
      headers: ['Customer', 'Risk', 'Health', 'Last order'],
      rows: [
        ['Emeka Distribution Co', 'High', '38', '21 days ago'],
        ['Mama Funke Stores', 'High', '42', '18 days ago'],
        ['Chidinma Foods', 'Medium', '54', '12 days ago'],
      ],
    },
  },
  "Which accounts haven't ordered in 14 days": {
    answer: '3 accounts have not ordered in roughly 14 days. Combined revenue at risk is N2.84M.',
    tableData: {
      headers: ['Customer', 'Days since order', 'Lifetime value'],
      rows: [
        ['Emeka Distribution Co', '21', 'N1.4M'],
        ['Mama Funke Stores', '18', 'N560K'],
        ['Chidinma Foods', '12', 'N890K'],
      ],
    },
  },
  'Top revenue this month': {
    answer: 'Your top 5 customers generated N7.52M this month, led by Danladi Grains and Alhaji Musa Traders.',
    tableData: {
      headers: ['Customer', 'Monthly revenue', 'Share'],
      rows: [
        ['Danladi Grains', 'N2.1M', '28%'],
        ['Alhaji Musa Traders', 'N1.8M', '24%'],
        ['Nnamdi Provisions', 'N1.2M', '16%'],
        ['Emeka Distribution Co', 'N1.1M', '14%'],
        ['Amina Mart', 'N980K', '13%'],
      ],
    },
  },
  'Revenue trend this month': {
    answer: 'Revenue is up 12% month over month, but overdue balances are dragging cash collection.',
    tableData: {
      headers: ['Metric', 'Current', 'Previous'],
      rows: [
        ['Revenue', 'N9.6M', 'N8.5M'],
        ['Outstanding', 'N890K', 'N610K'],
        ['Collection rate', '84%', '91%'],
      ],
    },
  },
  'Agent activity this week': {
    answer: 'Collections and Churn Detection are the busiest agents this week.',
    tableData: {
      headers: ['Agent', 'Actions', 'Pending'],
      rows: [
        ['Collections', '18', '3'],
        ['Churn Detection', '9', '2'],
        ['Deal Intelligence', '4', '1'],
      ],
    },
  },
  'Confirmed payments this week': {
    answer: 'Five confirmed payments were captured this week for a total of N1.24M.',
    tableData: {
      headers: ['Customer', 'Amount', 'Source'],
      rows: [
        ['Danladi Grains', 'N450,000', 'Bank transfer'],
        ['Adaeze Supermarket', 'N95,000', 'Screenshot'],
        ['Nnamdi Provisions', 'N320,000', 'Bank alert'],
      ],
    },
  },
  'Invoices over 30 days overdue': {
    answer: 'Only one invoice is above 30 days overdue. It should be escalated today.',
    tableData: {
      headers: ['Invoice', 'Customer', 'Amount'],
      rows: [['#2836', 'Emeka Distribution Co', 'N320,000']],
    },
  },
  'Total outstanding balance': {
    answer: 'Total outstanding balance is N890,000 across four accounts.',
    tableData: {
      headers: ['Bucket', 'Amount', 'Accounts'],
      rows: [
        ['0-7 days', 'N195,000', '2'],
        ['8-30 days', 'N375,000', '2'],
        ['30+ days', 'N320,000', '1'],
      ],
    },
  },
  'Top orders pending delivery': {
    answer: 'Three orders need operations attention before close of business.',
    tableData: {
      headers: ['Order', 'Customer', 'Status'],
      rows: [
        ['#2883', 'Amina Mart', 'Running late'],
        ['#2881', 'Mama Funke Stores', 'Packed'],
        ['#2879', 'Danladi Grains', 'Awaiting driver'],
      ],
    },
  },
};

export const MOCK_RESPONSES = MOCK_CHAT_RESPONSES;

export const DEFAULT_RESPONSE: MockChatResponse = {
  answer: 'I checked the demo memory layer and found the closest matching operational records.',
  tableData: {
    headers: ['Signal', 'Value'],
    rows: [
      ['Active conversations', String(METRICS.activeConversations)],
      ['Outstanding balance', formatNaira(METRICS.outstandingTotal)],
      ['Pending agent actions', String(AGENT_ACTIONS.length)],
    ],
  },
};

export const DEMO_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'chat-001',
    role: 'assistant',
    content: 'Ask about payments, customers, churn, delivery, or agent activity.',
    tableData: null,
    timestamp: new Date(Date.now() - 600000).toISOString(),
  },
];

export function getCustomer(id: string): Customer | undefined {
  return CUSTOMERS.find((customer) => customer.id === id);
}

export function getStaffMember(id: string): StaffMember | undefined {
  return STAFF.find((member) => member.id === id);
}

export function getCustomerInvoices(customerId: string): Invoice[] {
  return INVOICES.filter((invoice) => invoice.customerId === customerId);
}

export function getConversation(customerId: string): Conversation | undefined {
  return CONVERSATIONS.find((conversation) => conversation.customerId === customerId);
}

export function getCustomerTimeline(_customerId: string): TimelineEvent[] {
  return TIMELINE_EVENTS;
}

export function getCustomerInsights(_customerId: string): Insight[] {
  return INSIGHTS;
}

export function getAlertTarget(event: LiveEvent): string {
  const customer = CUSTOMERS.find(
    (item) => item.businessName === event.customerName || item.name === event.customerName,
  );
  return customer ? `/dashboard/customers/${customer.id}` : '/dashboard';
}
