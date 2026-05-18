import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, MessageSquare, TrendingUp, Wallet } from 'lucide-react';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';
import { formatNaira } from '@/lib/format-utils';
import { api } from '@/lib/api';

interface PulseData {
  revenue_this_week: number;
  outstanding_total: number;
  active_conversations: number;
  health_score: number;
  pending_approvals: number;
  critical_alerts: number;
  revenue_change_percent: number;
}

function usePulse() {
  const [data, setData] = useState<PulseData>({
    revenue_this_week: 0,
    outstanding_total: 0,
    active_conversations: 0,
    health_score: 0,
    pending_approvals: 0,
    critical_alerts: 0,
    revenue_change_percent: 0,
  });

  useEffect(() => {
    const load = () => api.get('/api/analytics/pulse').then(setData).catch(() => {});
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return data;
}

function Counter({ to, fmt }: { to: number; fmt: (n: number) => string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(to * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);

  return <span>{fmt(value)}</span>;
}

export function MetricCards() {
  const pulse = usePulse();

  const CARDS = [
    {
      key: 'rev',
      label: 'Revenue this week',
      value: pulse.revenue_this_week,
      fmt: (n: number) => formatNaira(Math.round(n), true),
      delta: `${pulse.revenue_change_percent >= 0 ? '+' : ''}${pulse.revenue_change_percent}%`,
      deltaPositive: pulse.revenue_change_percent >= 0,
      icon: TrendingUp,
      color: 'oklch(0.74 0.18 160)',
    },
    {
      key: 'out',
      label: 'Outstanding',
      value: pulse.outstanding_total,
      fmt: (n: number) => formatNaira(Math.round(n), true),
      delta: `${pulse.critical_alerts} alerts`,
      deltaPositive: pulse.critical_alerts === 0,
      icon: Wallet,
      color: 'oklch(0.78 0.16 75)',
    },
    {
      key: 'conv',
      label: 'Active conversations',
      value: pulse.active_conversations,
      fmt: (n: number) => String(Math.round(n)),
      delta: `${pulse.pending_approvals} pending`,
      deltaPositive: true,
      icon: MessageSquare,
      color: 'oklch(0.78 0.13 210)',
    },
    {
      key: 'health',
      label: 'Health score',
      value: pulse.health_score,
      fmt: (n: number) => String(Math.round(n)),
      delta: '/100',
      deltaPositive: pulse.health_score >= 70,
      icon: HeartPulse,
      color: 'oklch(0.66 0.21 295)',
    },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map((card) => (
        <motion.div
          key={card.key}
          variants={fadeUp}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur-sm"
        >
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl" style={{ background: card.color }} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{card.label}</div>
              <card.icon className="h-4 w-4" style={{ color: card.color }} />
            </div>
            <div className="mt-3 font-display text-3xl font-semibold tracking-tight">
              <Counter to={card.value} fmt={card.fmt} />
            </div>
            <div className={`mt-2 font-mono text-xs ${card.deltaPositive ? 'text-emerald' : 'text-amber'}`}>{card.delta}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
