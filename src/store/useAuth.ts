import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  onboardingCompleted: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (token: string, user: AuthUser, onboardingCompleted?: boolean) => void;
  logout: () => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
}

const API_BASE = '';

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      onboardingCompleted: false,
      isAuthenticated: false,
      isLoading: true,

      login: (token, user, onboardingCompleted = false) => {
        localStorage.setItem('opsmemory-token', token);
        // Also install dev auth for backward compat with existing API calls
        localStorage.setItem('opsmemory-demo-token', token);
        localStorage.setItem('opsmemory-demo-role', 'ceo');
        set({
          user,
          token,
          onboardingCompleted,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        localStorage.removeItem('opsmemory-token');
        localStorage.removeItem('opsmemory-demo-token');
        localStorage.removeItem('opsmemory-demo-role');
        localStorage.removeItem('opsmemory-demo-mode');
        localStorage.removeItem('opsmemory_tour_completed');
        localStorage.removeItem('demoUser');
        set({
          user: null,
          token: null,
          onboardingCompleted: false,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setOnboardingCompleted: (completed) => {
        set({ onboardingCompleted: completed });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('opsmemory-token');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            // Token invalid — clear auth
            get().logout();
            return;
          }

          const data = await res.json();
          set({
            user: data.user,
            token,
            onboardingCompleted: data.onboarding_completed || false,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Network error — keep token, assume authenticated
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'opsmemory-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        onboardingCompleted: state.onboardingCompleted,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
