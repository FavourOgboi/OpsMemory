import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';

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
