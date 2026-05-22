import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { AgentGrid } from '@/components/landing/AgentGrid';
import { MemoryTimeline } from '@/components/landing/MemoryTimeline';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { ThemeToggle } from '@/components/ThemeToggle';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'OpsMemory — Mission control for WhatsApp businesses' },
      { name: 'description', content: 'Six AI agents extract memory, watch your operations, and draft action — all from your existing WhatsApp Business number.' },
      { property: 'og:title', content: 'OpsMemory — Mission control for WhatsApp businesses' },
      { property: 'og:description', content: 'Every customer message becomes operational memory. Six agents on watch.' },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, onboardingCompleted, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && !onboardingCompleted) {
      navigate({ to: '/onboarding' });
    }
  }, [isAuthenticated, onboardingCompleted, isLoading, navigate]);

  return (
    <div className="relative min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/opsmem icon.png" alt="OpsMemory" className="h-8 w-8 rounded-lg" />




            <span className="font-display text-base font-semibold tracking-tight">OpsMemory</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">How it works</a>
            <a href="#agents" className="text-sm text-muted-foreground hover:text-foreground">Agents</a>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden md:inline-flex" />
            <Link
              to="/sign-up"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              Set up your business
            </Link>
          </div>
        </div>
      </header>

      <Hero />
      <HowItWorks />
      <div id="agents"><AgentGrid /></div>
      <MemoryTimeline />
      <LandingCTA />
    </div>
  );
}
