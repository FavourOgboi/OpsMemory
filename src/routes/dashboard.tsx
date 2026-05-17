import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { installDevAuth } from '@/lib/dev-auth';
import { useEventStream } from '@/store/useEventStream';
import { useAgentStatus } from '@/store/useAgentStatus';
import { useApprovalQueue } from '@/store/useApprovalQueue';

// DEMO MODE: Simplified auth check
const requireAuth = createServerFn({ method: 'GET' }).handler(async () => {
  // In demo mode, always allow access
  return { userId: 'demo-user-1' };
});

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => requireAuth(),
  head: () => ({
    meta: [
      { title: 'Mission Control · OpsMemory' },
      { name: 'description', content: 'Live operational intelligence for your WhatsApp business.' },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const fetchEvents = useEventStream((s) => s.fetchEvents);
  const fetchAgents = useAgentStatus((s) => s.fetchAgents);
  const fetchApprovals = useApprovalQueue((s) => s.fetchApprovals);

  useEffect(() => {
    installDevAuth('ceo');
    const load = () => {
      fetchEvents();
      fetchAgents();
      fetchApprovals();
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents, fetchAgents, fetchApprovals]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
