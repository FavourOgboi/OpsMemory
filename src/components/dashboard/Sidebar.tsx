import { Link, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  Bot,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Menu,
  MessageCircle,
  Settings,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { getAlertTarget } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { useAgentStatus } from '@/store/useAgentStatus';
import { useApprovalQueue } from '@/store/useApprovalQueue';
import { useEventStream } from '@/store/useEventStream';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
  { to: '/dashboard/agents', label: 'Agents', icon: Bot },
  { to: '/dashboard/approvals', label: 'Approvals', icon: CheckSquare },
  { to: '/dashboard/finance', label: 'Finance', icon: BarChart3 },
  { to: '/dashboard/team', label: 'Team', icon: Users },
  { to: '/dashboard/chat', label: 'Intelligence', icon: MessageCircle },
  { to: '/dashboard/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/dashboard/review-intelligence', label: 'Review AI', icon: Star },
  { to: '/dashboard/recommendations', label: 'Recommendations', icon: Sparkles },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const severityClass = {
  positive: 'border-emerald bg-emerald/10 text-emerald',
  info: 'border-cyan bg-cyan/10 text-cyan',
  warning: 'border-amber bg-amber/10 text-amber',
  critical: 'border-rose bg-rose/10 text-rose',
};

export function Sidebar() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [businessName, setBusinessName] = useState('My Business');

  useEffect(() => {
    api.get('/api/onboarding/business').then((b) => {
      if (b?.name) setBusinessName(b.name);
    }).catch(() => {});
  }, []);
  const agents = useAgentStatus((state) => state.agents);
  const pendingCount = useApprovalQueue((state) => state.pendingCount);
  const events = useEventStream((state) => state.events);
  const unresolved = events.filter((event) => !event.resolved);

  // Triple-click logo for demo mode
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      const isDemoNow = localStorage.getItem('opsmemory-demo-mode') === 'true';
      if (isDemoNow) {
        localStorage.removeItem('opsmemory-demo-mode');
        window.location.href = '/';
      } else {
        localStorage.setItem('opsmemory-demo-mode', 'true');
        window.location.reload();
      }
      return;
    }
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 600);
  };

  const sidebarContent = (
    <>
      <div onClick={handleLogoClick} className="flex h-16 items-center gap-2.5 border-b border-border px-4 cursor-pointer">
        <img src="/opsmem icon.png" alt="OpsMemory" className="h-8 w-8 shrink-0 rounded-lg" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold tracking-tight">OpsMemory</div>
            <div className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{businessName}</div>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {NAV.map((item) => {
            const active = item.to === '/dashboard' ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            const count = item.to === '/dashboard/approvals' ? pendingCount : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              data-tour={item.to === '/dashboard/approvals' ? 'approvals-nav' : item.to === '/dashboard/knowledge' ? 'knowledge-nav' : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="active-sidebar-pill"
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                {!collapsed && count > 0 && (
                  <span className="rounded-full bg-amber/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber">{count}</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="my-5 border-t border-border" />

        {!collapsed && (
          <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Agent Status</div>
        )}
        <div className="space-y-1" data-tour="agent-status">
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-accent/40" title={agent.name}>
              <span className="relative flex h-2 w-2 shrink-0">
                {agent.status !== 'idle' && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: agent.color }} />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: agent.color, boxShadow: agent.status !== 'idle' ? `0 0 8px ${agent.color}` : 'none' }} />
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-foreground/80">{agent.name}</span>
                  {agent.eventCount > 0 && <span className="font-mono text-[10px] text-muted-foreground">{agent.eventCount}</span>}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="my-5 border-t border-border" />

        {!collapsed && (
          <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Alerts ({unresolved.length})
          </div>
        )}
        <div className="space-y-1.5">
          {unresolved.slice(0, 5).map((alert) => (
            <Link
              key={alert.id}
              to={getAlertTarget(alert)}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-lg border-l-2 px-3 py-2 text-xs transition-colors hover:bg-accent/40 ${severityClass[alert.severity]}`}
              title={alert.description}
            >
              {collapsed ? <span className="block h-2 w-2 rounded-full bg-current" /> : <span className="line-clamp-2">{alert.title}</span>}
            </Link>
          ))}
        </div>
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-elevated text-muted-foreground transition-colors hover:text-foreground lg:flex"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col border-r border-border bg-sidebar shadow-elevated lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className={`relative hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-300 lg:flex ${collapsed ? 'w-16' : 'w-64'}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
