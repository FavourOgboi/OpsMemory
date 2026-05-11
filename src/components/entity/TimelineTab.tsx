import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AlertTriangle, Award, MessageSquare, ShoppingCart, Wallet } from 'lucide-react';
import { fadeUp, staggerContainer, timelineDraw } from '@/lib/motion-variants';
import { formatNaira, getCustomerTimeline } from '@/lib/mock-data';
import type { TimelineEvent } from '@/types';

const ICONS = {
  order: ShoppingCart,
  conversation: MessageSquare,
  payment: Wallet,
  alert: AlertTriangle,
  milestone: Award,
};

const COLORS = {
  order: 'oklch(0.78 0.13 210)',
  conversation: 'oklch(0.66 0.21 295)',
  payment: 'oklch(0.74 0.18 160)',
  alert: 'oklch(0.78 0.16 75)',
  milestone: 'oklch(0.60 0.20 260)',
};

export function TimelineTab({ customerId }: { customerId: string }) {
  const events: TimelineEvent[] = getCustomerTimeline(customerId);

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="relative pl-10">
      <svg className="absolute left-5 top-0 h-full w-px" preserveAspectRatio="none">
        <motion.line
          x1="0.5"
          y1="0"
          x2="0.5"
          y2="100%"
          stroke="oklch(0.30 0.03 260)"
          strokeWidth="2"
          strokeDasharray="3 4"
          variants={timelineDraw}
        />
      </svg>
      {events.map((event) => {
        const Icon = ICONS[event.type];
        const color = COLORS[event.type];
        return (
          <motion.div key={event.id} variants={fadeUp} className="group relative pb-7 last:pb-0">
            <div
              className="absolute -left-[26px] top-0 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-background transition-transform group-hover:scale-110"
              style={{ background: color }}
            >
              <Icon className="h-3.5 w-3.5 text-background" />
            </div>
            <div className="rounded-xl border border-border bg-surface/60 p-4 transition-colors group-hover:border-primary/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-sm font-semibold">{event.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{event.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  {event.amount && <div className="font-mono text-sm font-semibold">{formatNaira(event.amount)}</div>}
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {format(new Date(event.timestamp), 'MMM d')}
                  </div>
                </div>
              </div>
              <div className="mt-3 hidden border-t border-border/60 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground group-hover:block">
                {event.type} memory signal
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
