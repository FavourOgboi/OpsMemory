import { create } from 'zustand';
import type { AgentState } from '@/types';
import { AGENT_STATES } from '@/lib/mock-data';

interface AgentStatusStore {
  agents: AgentState[];
  updateAgent: (name: string, updates: Partial<AgentState>) => void;
  triggeredCount: number;
}

export const useAgentStatus = create<AgentStatusStore>((set) => ({
  agents: AGENT_STATES,
  triggeredCount: AGENT_STATES.filter((a) => a.status === 'triggered').length,
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
}));
