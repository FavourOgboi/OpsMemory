import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Zap, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEventStream } from '@/store/useEventStream';
import { eventSlideIn } from '@/lib/motion-variants';
import type { EventSeverity } from '@/types';

const SEV: Record<EventSeverity, { color: string; Icon: typeof CheckCircle2 }> = {
  positive: { color: 'oklch(0.74 0.18 160)', Icon: CheckCircle2 },
  warning: { color: 'oklch(0.78 0.16 75)', Icon: AlertTriangle },
  critical: { color: 'oklch(0.68 0.21 20)', Icon: XCircle },
  info: { color: 'oklch(0.78 0.13 210)', Icon: Zap },
};

export function EventStream() {
  const events = useEventStream((s) => s.events);
  const fetchEvents = useEventStream((s) => s.fetchEvents);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(() => {
      fetchEvents();
    }, 15000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface/60 backdrop-blur-sm" data-tour="event-stream">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">live · event · stream</div>
          <div className="font-display text-sm font-semibold tracking-tight">Operational signals</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald shadow-glow animate-pulse" />
          <span className="font-mono text-[10px] uppercase text-emerald">live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false} mode="popLayout">
          {events.map((e) => {
            const cfg = SEV[e.severity];
            return (
              <motion.div
                key={e.id}
                layout
                variants={eventSlideIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`group flex gap-3 border-b border-border/40 px-5 py-3.5 transition-colors hover:bg-accent/30 ${e.resolved ? 'opacity-40' : ''}`}
                style={{ borderLeft: `3px solid ${cfg.color}` }}
              >
                <cfg.Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: cfg.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">{e.title}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(e.timestamp), { addSuffix: false })}
                    </div>
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.description}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-accent/60 px-2 py-0.5 font-mono text-[10px] text-foreground/80">
                      {e.customerName}
                    </span>
                    {e.agentName && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                        <Bot className="h-3 w-3" />
                        {e.agentName.replace(' Agent', '')}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
