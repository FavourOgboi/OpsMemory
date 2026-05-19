import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { useAuth } from '@/store/useAuth';
import { useTour } from '@/store/useTour';
import { useEventStream } from '@/store/useEventStream';
import { useAgentStatus } from '@/store/useAgentStatus';
import { useApprovalQueue } from '@/store/useApprovalQueue';

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Mission Control · OpsMemory' },
      { name: 'description', content: 'Live operational intelligence for your WhatsApp business.' },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, onboardingCompleted, isLoading } = useAuth();
  const startTour = useTour((s) => s.start);
  const fetchEvents = useEventStream((s) => s.fetchEvents);
  const fetchAgents = useAgentStatus((s) => s.fetchAgents);
  const fetchApprovals = useApprovalQueue((s) => s.fetchApprovals);
  const isDemoMode = typeof window !== 'undefined' && localStorage.getItem('opsmemory-demo-mode') === 'true';

  useEffect(() => {
    if (isLoading) return;
    // Allow demo mode access without auth
    if (!isAuthenticated && !isDemoMode) {
      navigate({ to: '/sign-up' });
      return;
    }
    // Check onboarding
    if (isAuthenticated && !onboardingCompleted && !isDemoMode) {
      navigate({ to: '/onboarding' });
      return;
    }
  }, [isAuthenticated, onboardingCompleted, isLoading, isDemoMode, navigate]);

  useEffect(() => {
    // Install dev auth token for API calls (backward compat)
    const token = localStorage.getItem('opsmemory-token');
    if (token) {
      localStorage.setItem('opsmemory-demo-token', token);
      localStorage.setItem('opsmemory-demo-role', 'ceo');
    } else if (isDemoMode) {
      // For demo mode, use installDevAuth from dev-auth
      import('@/lib/dev-auth').then(({ installDevAuth }) => {
        installDevAuth('ceo');
      });
    }

    const load = () => {
      fetchEvents();
      fetchAgents();
      fetchApprovals();
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents, fetchAgents, fetchApprovals, isDemoMode]);

  // Start tour after first onboarding completion
  useEffect(() => {
    const tourCompleted = localStorage.getItem('opsmemory_tour_completed');
    if (tourCompleted !== 'true' && !isDemoMode) {
      // Small delay to let dashboard render
      const t = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(t);
    }
  }, [startTour, isDemoMode]);

  // Show demo mode banner
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {isDemoMode && (
          <div className="flex items-center justify-center gap-2 bg-amber-600/90 px-4 py-1.5 text-xs font-medium text-white">
            <span>🔬 Demo Mode — Viewing sample data</span>
            <button
              onClick={() => {
                localStorage.removeItem('opsmemory-demo-mode');
                window.location.href = '/';
              }}
              className="ml-4 rounded bg-amber-800/50 px-2 py-0.5 text-[10px] transition hover:bg-amber-800"
            >
              Exit Demo
            </button>
          </div>
        )}
        <DashboardTopBar />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
      <TourOverlay />
    </div>
  );
}
