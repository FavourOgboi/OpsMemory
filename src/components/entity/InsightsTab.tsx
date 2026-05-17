import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Brain, Lightbulb, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { mapInsight } from '@/lib/api-mappers';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';
import type { Insight } from '@/types';

const TYPE = {
  risk: { icon: AlertTriangle, color: 'oklch(0.68 0.21 20)', label: 'Risk' },
  opportunity: { icon: Lightbulb, color: 'oklch(0.74 0.18 160)', label: 'Opportunity' },
  pattern: { icon: Brain, color: 'oklch(0.66 0.21 295)', label: 'Pattern' },
};

export function InsightsTab({ customerId }: { customerId: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/customers/${customerId}/insights`)
      .then((data: any) => {
        if (data?.insights) {
          setInsights(data.insights.map(mapInsight));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading insights…</div>;
  }

  if (insights.length === 0) {
    return <div className="text-sm text-muted-foreground">No insights available yet.</div>;
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-4">
      <motion.div variants={fadeUp} className="flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-4 py-3">
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          AI-generated insights based on conversation analysis, payment history, and order rhythm.
        </span>
      </motion.div>

      {insights.map((insight) => {
        const config = TYPE[insight.type];
        const Icon = config.icon;
        const pct = Math.round(insight.confidence * 100);

        return (
          <motion.div
            key={insight.id}
            variants={fadeUp}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur-sm transition-colors hover:border-primary/30"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-25 blur-3xl" style={{ background: config.color }} />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${config.color}22` }}>
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: config.color }}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: config.color }}
                    />
                  </div>
                  <span className="font-mono text-xs font-semibold" style={{ color: config.color }}>{pct}%</span>
                </div>
              </div>

              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{insight.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{insight.description}</p>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-background/40 p-3">
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="text-foreground/80">Evidence: </span>
                  {insight.evidence}
                </p>
              </div>

              <button
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-transform hover:scale-[1.01]"
                style={{ background: `${config.color}22`, color: config.color }}
              >
                {insight.recommendedAction}
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
