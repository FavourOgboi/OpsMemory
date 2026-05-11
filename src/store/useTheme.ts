import { create } from 'zustand';

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

// Read initial theme from localStorage (falls back to true/dark if not set)
function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem('ops-theme');
    if (stored === 'light') return false;
    if (stored === 'dark') return true;
  } catch {
    // SSR or storage error
  }
  return true;
}

export const useTheme = create<ThemeStore>((set) => ({
  isDark: getInitialTheme(),
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      try {
        localStorage.setItem('ops-theme', next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      return { isDark: next };
    }),
  setDark: (v) => {
    try {
      localStorage.setItem('ops-theme', v ? 'dark' : 'light');
    } catch {
      // ignore
    }
    set({ isDark: v });
  },
}));
