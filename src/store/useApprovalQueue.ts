import { create } from 'zustand';
import type { AgentAction } from '@/types';
import { AGENT_ACTIONS } from '@/lib/mock-data';

interface ApprovalStore {
  actions: AgentAction[];
  history: AgentAction[];
  approve: (id: string) => void;
  reject: (id: string) => void;
  pendingCount: number;
}

export const useApprovalQueue = create<ApprovalStore>((set) => ({
  actions: AGENT_ACTIONS,
  history: [],
  pendingCount: AGENT_ACTIONS.length,
  approve: (id) =>
    set((state) => {
      const action = state.actions.find((a) => a.id === id);
      if (!action) return state;
      return {
        actions: state.actions.filter((a) => a.id !== id),
        history: [{ ...action, status: 'approved' as const }, ...state.history],
        pendingCount: Math.max(0, state.pendingCount - 1),
      };
    }),
  reject: (id) =>
    set((state) => {
      const action = state.actions.find((a) => a.id === id);
      if (!action) return state;
      return {
        actions: state.actions.filter((a) => a.id !== id),
        history: [{ ...action, status: 'rejected' as const }, ...state.history],
        pendingCount: Math.max(0, state.pendingCount - 1),
      };
    }),
}));
