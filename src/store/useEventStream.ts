import { create } from 'zustand';
import type { LiveEvent } from '@/types';
import { LIVE_EVENTS } from '@/lib/mock-data';

interface EventStreamStore {
  events: LiveEvent[];
  addEvent: (event: LiveEvent) => void;
  resolveEvent: (id: string) => void;
  unreadCount: number;
  markAllRead: () => void;
}

export const useEventStream = create<EventStreamStore>((set) => ({
  events: LIVE_EVENTS,
  unreadCount: LIVE_EVENTS.filter((e) => !e.resolved).length,
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
}));
