import { create } from 'zustand';
import type { AgentAction } from '@/types';
import { api } from '@/lib/api';

interface ApprovalStore {
  actions: AgentAction[];
  history: AgentAction[];
  approve: (id: string) => Promise<void>;
  reject: (id: string, reason?: string) => Promise<void>;
  pendingCount: number;
  fetchApprovals: () => Promise<void>;
}

export const useApprovalQueue = create<ApprovalStore>((set) => ({
  actions: [],
  history: [],
  pendingCount: 0,
  approve: async (id) => {
    await api.post(`/api/approvals/${id}/approve`, {});
    set((state) => {
      const action = state.actions.find((a) => a.id === id);
      if (!action) return state;
      return {
        actions: state.actions.filter((a) => a.id !== id),
        history: [{ ...action, status: 'approved' as const }, ...state.history],
        pendingCount: Math.max(0, state.pendingCount - 1),
      };
    });
  },
  reject: async (id, reason = '') => {
    await api.post(`/api/approvals/${id}/reject`, { reason });
    set((state) => {
      const action = state.actions.find((a) => a.id === id);
      if (!action) return state;
      return {
        actions: state.actions.filter((a) => a.id !== id),
        history: [{ ...action, status: 'rejected' as const }, ...state.history],
        pendingCount: Math.max(0, state.pendingCount - 1),
      };
    });
  },
  fetchApprovals: async () => {
    try {
      const data = await api.get('/api/approvals/');
      const actions: AgentAction[] = (data || []).map((a: any) => ({
        id: a.id,
        agentName: a.agent_name,
        agentColor: a.agent_color,
        triggerSummary: a.trigger_summary,
        proposedAction: a.proposed_action,
        proposedMessage: a.proposed_message,
        customerId: a.customer_id,
        customerName: a.customers?.name || 'Unknown',
        customerRevenue: a.customers?.total_revenue || 0,
        riskLevel: a.risk_level,
        confidence: a.confidence,
        track: a.track,
        status: a.status,
      }));
      set({ actions, pendingCount: actions.length });
    } catch (e) {
      console.error('Failed to fetch approvals:', e);
    }
  },
}));
