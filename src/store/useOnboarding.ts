import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  currentStep: number;
  // Step 1
  businessName: string;
  ownerName: string;
  businessType: string;
  city: string;
  // Step 2
  websiteUrl: string;
  instagramHandle: string;
  otherLink: string;
  // Step 3
  whatsappNumber: string;
  whatsappConnected: boolean;
  // Step 4
  catalogUrl: string;
  catalogUploaded: boolean;
  businessDescription: string;
  productsText: string;
  // Step 5
  dealThreshold: number;
  autoReplyEnabled: boolean;
  agentLanguages: string[];
  // Actions
  setStep: (step: number) => void;
  setField: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      businessName: '',
      ownerName: '',
      businessType: '',
      city: '',
      websiteUrl: '',
      instagramHandle: '',
      otherLink: '',
      whatsappNumber: '',
      whatsappConnected: false,
      catalogUrl: '',
      catalogUploaded: false,
      businessDescription: '',
      productsText: '',
      dealThreshold: 100000,
      autoReplyEnabled: true,
      agentLanguages: ['english', 'pidgin', 'yoruba', 'igbo'],
      setStep: (step) => set({ currentStep: step }),
      setField: (field, value) => set({ [field]: value } as any),
      nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 6) })),
      prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
      reset: () =>
        set({
          currentStep: 1,
          businessName: '',
          ownerName: '',
          businessType: '',
          city: '',
          websiteUrl: '',
          instagramHandle: '',
          otherLink: '',
          whatsappNumber: '',
          whatsappConnected: false,
          catalogUrl: '',
          catalogUploaded: false,
          businessDescription: '',
          productsText: '',
          dealThreshold: 100000,
          autoReplyEnabled: true,
          agentLanguages: ['english', 'pidgin', 'yoruba', 'igbo'],
        }),
    }),
    { name: 'opsmemory-onboarding' },
  ),
);
