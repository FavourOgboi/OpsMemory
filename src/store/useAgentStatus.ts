import { create } from 'zustand';
import type { AgentState } from '@/types';
import { api } from '@/lib/api';

interface AgentStatusStore {
  agents: AgentState[];
  updateAgent: (name: string, updates: Partial<AgentState>) => void;
  triggeredCount: number;
  fetchAgents: () => Promise<void>;
}

export const useAgentStatus = create<AgentStatusStore>((set) => ({
  agents: [],
  triggeredCount: 0,
  updateAgent: (name, updates) =>
    set((state) => {
      const newAgents = state.agents.map((a) =>
        a.name === name ? { ...a, ...updates } : a
      );
      return {
        agents: newAgents,
        triggeredCount: newAgents.filter((a) => a.status === 'triggered').length,
      };
    }),
  fetchAgents: async () => {
    try {
      const data = await api.get('/api/analytics/agents/status');
      const agents: AgentState[] = data.map((a: any) => ({
        name: a.name,
        status: a.status,
        color: a.color,
        eventCount: a.event_count || 0,
        pendingCount: a.pending_count || 0,
      }));
      set({
        agents,
        triggeredCount: agents.filter((a) => a.status === 'triggered').length,
      });
    } catch (e) {
      console.error('Failed to fetch agent status:', e);
    }
  },
}));
