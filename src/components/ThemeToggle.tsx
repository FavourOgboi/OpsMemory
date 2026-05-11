import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/store/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const isDark = useTheme((state) => state.isDark);
  const toggle = useTheme((state) => state.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4 text-amber" /> : <Moon className="h-4 w-4 text-cyan" />}
    </button>
  );
}
