import { createFileRoute } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';
import { fadeUp } from '@/lib/motion-variants';

export const Route = createFileRoute('/dashboard/agents')({
  component: AgentsPage,
});

// Mock agent data
const AGENTS = [
  {
    id: 'agent-1',
    name: 'Collections Agent',
    description: 'Monitors unpaid invoices and sends payment reminders',
    status: 'active',
    lastRun: '2 minutes ago',
    tasksCompleted: 1247,
    successRate: 94.2,
    nextRun: '5 minutes',
    recentActions: [
      'Sent payment reminder to Alhaji Musa',
      'Flagged overdue invoice from Kemi Lawal',
      'Updated customer payment history',
    ],
  },
  {
    id: 'agent-2',
    name: 'Fulfillment Agent',
    description: 'Tracks order delivery and confirms fulfillment status',
    status: 'active',
    lastRun: '1 minute ago',
    tasksCompleted: 892,
    successRate: 96.8,
    nextRun: '3 minutes',
    recentActions: [
      'Confirmed delivery for order #2841',
      'Sent update to customer on order status',
      'Flagged delayed delivery route',
    ],
  },
  {
    id: 'agent-3',
    name: 'Churn Detection Agent',
    description: 'Identifies at-risk customers before they leave',
    status: 'active',
    lastRun: '5 minutes ago',
    tasksCompleted: 156,
    successRate: 89.5,
    nextRun: '10 minutes',
    recentActions: [
      'Detected churn risk for Emeka Nwosu',
      'Recommended recovery strategy',
      'Scheduled follow-up outreach',
    ],
  },
  {
    id: 'agent-4',
    name: 'Anomaly Detection Agent',
    description: 'Detects unusual patterns in operations',
    status: 'active',
    lastRun: '8 minutes ago',
    tasksCompleted: 423,
    successRate: 91.7,
    nextRun: '12 minutes',
    recentActions: [
      'Flagged unusual pricing from vendor',
      'Detected spike in complaints',
      'Alerted to delivery delays',
    ],
  },
  {
    id: 'agent-5',
    name: 'Procurement Agent',
    description: 'Manages supplier relationships and orders',
    status: 'idle',
    lastRun: '15 minutes ago',
    tasksCompleted: 567,
    successRate: 93.1,
    nextRun: '20 minutes',
    recentActions: [
      'Monitored supplier delivery times',
      'Verified invoice amounts',
      'Updated purchase order status',
    ],
  },
  {
    id: 'agent-6',
    name: 'Voice Agent',
    description: 'Handles voice interactions and queries',
    status: 'inactive',
    lastRun: 'N/A',
    tasksCompleted: 0,
    successRate: 0,
    nextRun: 'N/A',
    recentActions: [
      'Voice agent is in development',
      'Coming soon',
    ],
  },
];

const statusConfig = {
  active: { color: 'emerald', icon: CheckCircle, label: 'Active' },
  idle: { color: 'amber', icon: Clock, label: 'Idle' },
  inactive: { color: 'slate', icon: AlertCircle, label: 'Inactive' },
};

function AgentsPage() {
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
            <div className="text-2xl font-bold text-emerald">4/6</div>
            <p className="mt-1 text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card className="bg-surface/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-widest">Tasks Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan">3,285</div>
            <p className="mt-1 text-xs text-muted-foreground">+247 this week</p>
          </CardContent>
        </Card>

        <Card className="bg-surface/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-widest">Avg Success Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber">92.7%</div>
            <p className="mt-1 text-xs text-muted-foreground">Highly accurate decisions</p>
          </CardContent>
        </Card>

        <Card className="bg-surface/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-widest">Avg Wait</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose">2.3s</div>
            <p className="mt-1 text-xs text-muted-foreground">Per agent decision</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Agents Grid */}
      <div className="mt-8 space-y-4">
        {AGENTS.map((agent, idx) => {
          const config = statusConfig[agent.status as keyof typeof statusConfig];
          const Icon = config.icon;
          return (
            <motion.div
              key={agent.id}
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
                      <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Metrics */}
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Last Run</div>
                      <div className="mt-1 text-sm font-medium">{agent.lastRun}</div>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Next Run</div>
                      <div className="mt-1 text-sm font-medium text-cyan">{agent.nextRun}</div>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Success Rate</div>
                      <div className="mt-1 text-sm font-medium text-emerald">{agent.successRate}%</div>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tasks</div>
                      <div className="mt-1 text-sm font-medium text-amber">{agent.tasksCompleted.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Recent Actions */}
                  <div className="space-y-2">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recent Actions</div>
                    <ul className="space-y-1">
                      {agent.recentActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                          {action}
                        </li>
                      ))}
                    </ul>
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
