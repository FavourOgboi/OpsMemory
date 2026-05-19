import { create } from 'zustand';

interface TourStep {
  id: string;
  targetSelector: string | null;
  title: string;
  body: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: null,
    title: 'Welcome to OpsMemory 👋',
    body: "This is your operational command centre. Let us show you around — it takes 60 seconds.",
    position: 'center',
  },
  {
    id: 'health-score',
    targetSelector: '[data-tour="health-score"]',
    title: 'Your Business Health Score',
    body: 'This number tells you how your business is performing right now — based on payment collection, fulfillment rates, and customer relationship health.',
    position: 'bottom',
  },
  {
    id: 'event-stream',
    targetSelector: '[data-tour="event-stream"]',
    title: 'Live Event Stream',
    body: 'Every customer interaction appears here in real time. New messages, payments received, delivery confirmations, agent activations — nothing gets missed.',
    position: 'left',
  },
  {
    id: 'agent-status',
    targetSelector: '[data-tour="agent-status"]',
    title: 'Your 6 AI Agents',
    body: 'These agents run continuously in the background, monitoring your customers and operations. Green = active, amber = idle, red = triggered.',
    position: 'right',
  },
  {
    id: 'approvals',
    targetSelector: '[data-tour="approvals-nav"]',
    title: 'Approval Centre',
    body: "When your agents want to take action — send a message, escalate a deal, follow up on a payment — they ask you first. You stay in control.",
    position: 'right',
  },
  {
    id: 'knowledge',
    targetSelector: '[data-tour="knowledge-nav"]',
    title: 'Knowledge Base',
    body: "This is your agent's brain for product knowledge. Add your catalog, pricing, delivery policies, and FAQs so your agent can answer customer questions.",
    position: 'right',
  },
  {
    id: 'done',
    targetSelector: null,
    title: "You're ready. ✅",
    body: 'Your agent is active. The more customers message your WhatsApp number, the smarter your agent gets. Questions? Check Settings or update your Knowledge Base anytime.',
    position: 'center',
  },
];

interface TourState {
  active: boolean;
  currentStepIndex: number;
  steps: TourStep[];
  currentStep: TourStep;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
}

export const useTour = create<TourState>((set, get) => ({
  active: false,
  currentStepIndex: 0,
  steps: TOUR_STEPS,
  currentStep: TOUR_STEPS[0],
  start: () => {
    const completed = localStorage.getItem('opsmemory_tour_completed');
    if (completed === 'true') return;
    set({ active: true, currentStepIndex: 0, currentStep: TOUR_STEPS[0] });
  },
  next: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      const next = currentStepIndex + 1;
      set({ currentStepIndex: next, currentStep: steps[next] });
    } else {
      get().complete();
    }
  },
  prev: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex > 0) {
      const prev = currentStepIndex - 1;
      set({ currentStepIndex: prev, currentStep: steps[prev] });
    }
  },
  skip: () => {
    localStorage.setItem('opsmemory_tour_completed', 'true');
    set({ active: false });
  },
  complete: () => {
    localStorage.setItem('opsmemory_tour_completed', 'true');
    set({ active: false });
  },
}));
