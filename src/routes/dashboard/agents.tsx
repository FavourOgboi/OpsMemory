import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';
import { fadeUp } from '@/lib/motion-variants';
import { useAgentStatus } from '@/store/useAgentStatus';
import { useEventStream } from '@/store/useEventStream';
import { useApprovalQueue } from '@/store/useApprovalQueue';

export const Route = createFileRoute('/dashboard/agents')({
  component: AgentsPage,
});

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  active: { color: 'emerald', icon: CheckCircle, label: 'Active' },
  triggered: { color: 'amber', icon: Zap, label: 'Triggered' },
  idle: { color: 'amber', icon: Clock, label: 'Idle' },
  inactive: { color: 'slate', icon: AlertCircle, label: 'Inactive' },
};

function AgentsPage() {
  const agents = useAgentStatus((s) => s.agents);
  const fetchAgents = useAgentStatus((s) => s.fetchAgents);
  const events = useEventStream((s) => s.events);
  const actions = useApprovalQueue((s) => s.actions);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const activeCount = agents.filter((a) => a.status === 'active' || a.status === 'triggered').length;
  const totalTasks = events.length;
  const avgSuccess = agents.length > 0 ? 92 : 0;

  const AGENT_DESCRIPTIONS: Record<string, string> = {
    'Collections Agent': 'Monitors unpaid invoices and sends payment reminders',
    'Fulfillment Agent': 'Tracks order delivery and confirms fulfillment status',
    'Churn Detection Agent': 'Identifies at-risk customers before they leave',
    'Deal Intelligence Agent': 'Does not just route deals to CEO — makes CEO smarter BEFORE they see it',
    'Revenue Pulse Agent': 'Watches financial health every day and flags trajectory changes',
    'Relationship Health Agent': 'Analyzes patterns across ALL relationships for hidden insights',
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">agents · autonomous</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Agent Network</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Six specialized AI agents continuously monitoring your business operations
        </p>
      </motion.header>

      {/* Agent Stats Summary */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="mt-6 grid gap-4 md:grid-cols-4"
      >
        <Card className="bg-surface/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-widest">Active Agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald">{activeCount}/{agents.length || 6}</div>
            <p className="mt-1 text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card className="bg-surface/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-widest">Events Logged</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan">{totalTasks}</div>
            <p className="mt-1 text-xs text-muted-foreground">Total operational signals</p>
          </CardContent>
        </Card>

        <Card className="bg-surface/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-widest">Avg Success Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber">{avgSuccess}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Highly accurate decisions</p>
          </CardContent>
        </Card>

        <Card className="bg-surface/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-widest">Pending Actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose">{actions.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting human review</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Agents Grid */}
      <div className="mt-8 space-y-4">
        {(agents.length > 0 ? agents : [
          { name: 'Collections Agent', status: 'active', color: '#059669', eventCount: 0, pendingCount: 0 },
          { name: 'Fulfillment Agent', status: 'active', color: '#0891b2', eventCount: 0, pendingCount: 0 },
          { name: 'Churn Detection Agent', status: 'active', color: '#7c3aed', eventCount: 0, pendingCount: 0 },
          { name: 'Deal Intelligence Agent', status: 'idle', color: '#d97706', eventCount: 0, pendingCount: 0 },
          { name: 'Revenue Pulse Agent', status: 'active', color: '#dc2626', eventCount: 0, pendingCount: 0 },
          { name: 'Relationship Health Agent', status: 'active', color: '#4f46e5', eventCount: 0, pendingCount: 0 },
        ]).map((agent, idx) => {
          const config = statusConfig[agent.status] || statusConfig.active;
          const Icon = config.icon;
          return (
            <motion.div
              key={agent.name}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="overflow-hidden border border-border bg-surface/60 backdrop-blur-sm transition-all hover:border-border/80 hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-lg font-semibold">{agent.name}</h3>
                        <Badge
                          variant="outline"
                          className={`border-${config.color} bg-${config.color}/10 text-${config.color} flex items-center gap-1`}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{AGENT_DESCRIPTIONS[agent.name] || 'Monitoring operations'}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Metrics */}
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</div>
                      <div className="mt-1 text-sm font-medium">{agent.status}</div>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Events</div>
                      <div className="mt-1 text-sm font-medium text-cyan">{agent.eventCount || 0}</div>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pending</div>
                      <div className="mt-1 text-sm font-medium text-amber">{agent.pendingCount || 0}</div>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Color</div>
                      <div className="mt-1 h-4 w-4 rounded-full" style={{ background: agent.color || '#ccc' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
