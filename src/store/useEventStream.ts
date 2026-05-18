import { create } from 'zustand';
import type { LiveEvent } from '@/types';
import { api } from '@/lib/api';

interface EventStreamStore {
  events: LiveEvent[];
  addEvent: (event: LiveEvent) => void;
  resolveEvent: (id: string) => void;
  unreadCount: number;
  markAllRead: () => void;
  fetchEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export const useEventStream = create<EventStreamStore>((set) => ({
  events: [],
  unreadCount: 0,
  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events],
      unreadCount: state.unreadCount + 1,
    })),
  resolveEvent: (id) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, resolved: true } : e
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllRead: () => set({ unreadCount: 0 }),
  fetchEvents: async () => {
    try {
      const data = await api.get('/api/analytics/events');
      const events: LiveEvent[] = (data || []).map((e: any) => ({
        id: e.id,
        eventType: e.event_type,
        severity: e.severity,
        title: e.title,
        description: e.description,
        customerId: e.customer_id,
        customerName: e.customer_name || e.customerName || '',
        agentName: e.agent_name,
        resolved: e.resolved,
        timestamp: e.created_at,
      }));
      set({
        events,
        unreadCount: events.filter((e) => !e.resolved).length,
      });
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  },
  refreshEvents: async () => {
    try {
      const data = await api.get('/api/analytics/events');
      const events: LiveEvent[] = (data || []).map((e: any) => ({
        id: e.id,
        eventType: e.event_type,
        severity: e.severity,
        title: e.title,
        description: e.description,
        customerId: e.customer_id,
        customerName: e.customer_name || e.customerName || '',
        agentName: e.agent_name,
        resolved: e.resolved,
        timestamp: e.created_at,
      }));
      set({
        events,
        unreadCount: events.filter((e) => !e.resolved).length,
      });
    } catch (err) {
      console.error('Failed to refresh events:', err);
    }
  },
}));
