import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { RelationshipGraph } from '@/components/dashboard/RelationshipGraph';
import { EventStream } from '@/components/dashboard/EventStream';
import { AgentReasoningPanel } from '@/components/dashboard/AgentReasoningPanel';
import type { AgentAction, Customer } from '@/types';
import { useApprovalQueue } from '@/store/useApprovalQueue';
import { useEventStream } from '@/store/useEventStream';
import { useAgentStatus } from '@/store/useAgentStatus';
import { ChevronRight } from 'lucide-react';
import { fadeUp } from '@/lib/motion-variants';
import { api } from '@/lib/api';
import { mapCustomer } from '@/lib/api-mappers';

export const Route = createFileRoute('/dashboard/')({
  component: Overview,
});

function Overview() {
  const [reasoning, setReasoning] = useState<AgentAction | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const pending = useApprovalQueue((s) => s.actions);
  const fetchEvents = useEventStream((s) => s.fetchEvents);
  const fetchAgents = useAgentStatus((s) => s.fetchAgents);
  const fetchApprovals = useApprovalQueue((s) => s.fetchApprovals);

  useEffect(() => {
    const refresh = () => {
      fetchEvents();
      fetchAgents();
      fetchApprovals();
      api
        .get('/api/customers/')
        .then((data) => {
          const rows = (data || [])
            .map(mapCustomer)
            .filter((c) => c.name && c.name !== '+' && !/^\+?\d+$/.test(c.name.trim()));
          setCustomers(rows);
        })
        .catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, [fetchEvents, fetchAgents, fetchApprovals]);

  return (
    <div className="flex h-full overflow-hidden">
      <section className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">overview · live</div>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Mission control</h1>
          </motion.div>
          <div className="flex items-center gap-2 self-start rounded-full border border-border bg-surface/60 px-3 py-1 backdrop-blur sm:self-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald shadow-glow animate-pulse" />
            <span className="font-mono text-[10px] uppercase text-emerald">all systems go</span>
          </div>
        </header>

        <div className="mt-6"><MetricCards /></div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="h-[560px]">
            <RelationshipGraph />
          </div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur-sm">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pending approvals</div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight">{pending.length}</div>
              <Link to="/dashboard/approvals" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Open approval center <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex-1 rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur-sm">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Watched accounts</div>
              <div className="mt-3 space-y-2.5">
                {customers.slice(0, 8).map((c) => (
                  <Link
                    key={c.id}
                    to="/dashboard/customers/$id"
                    params={{ id: c.id }}
                    className="group flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-foreground">{c.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{c.businessName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-semibold">{c.healthScore}</div>
                      <div className="font-mono text-[10px]" style={{
                        color: c.churnRisk === 'low' ? 'oklch(0.74 0.18 160)' : c.churnRisk === 'medium' ? 'oklch(0.78 0.16 75)' : 'oklch(0.68 0.21 20)'
                      }}>{c.churnRisk}</div>
                    </div>
                  </Link>
                ))}
                {customers.length === 0 && (
                  <div className="text-xs text-muted-foreground py-2">Loading customers...</div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <aside className="hidden w-[360px] shrink-0 border-l border-border bg-background/60 xl:block">
        <div className="h-full px-4 pb-4 pt-16">
          <EventStream />
        </div>
      </aside>

      <AgentReasoningPanel action={reasoning} onClose={() => setReasoning(null)} />
    </div>
  );
}
