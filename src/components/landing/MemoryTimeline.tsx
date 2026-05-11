import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { AlertTriangle, Award, MessageCircle, ShoppingCart, Wallet } from 'lucide-react';
import { fadeUp } from '@/lib/motion-variants';
import { formatNaira, TIMELINE_EVENTS } from '@/lib/mock-data';

const CONFIG = {
  payment: { icon: Wallet, color: 'oklch(0.74 0.18 160)' },
  order: { icon: ShoppingCart, color: 'oklch(0.78 0.13 210)' },
  conversation: { icon: MessageCircle, color: 'oklch(0.66 0.21 295)' },
  alert: { icon: AlertTriangle, color: 'oklch(0.78 0.16 75)' },
  milestone: { icon: Award, color: 'oklch(0.60 0.20 260)' },
};

export function MemoryTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    const container = scrollRef.current;
    const id = setInterval(() => {
      const max = container.scrollWidth - container.clientWidth;
      container.scrollLeft = container.scrollLeft >= max - 2 ? 0 : container.scrollLeft + 1;
    }, 28);
    return () => clearInterval(id);
  }, [autoScroll]);

  return (
    <section className="relative overflow-hidden py-32">
      <div className="absolute inset-0 bg-[url('/timeline-visual.jpg')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Business memory</div>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
            Every interaction remembered
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Orders, payments, complaints, promises, and agent interventions become a permanent relationship timeline.
          </p>
        </motion.div>

        <div className="relative mt-16">
          <div
            ref={scrollRef}
            className="scrollbar-thin flex cursor-grab gap-6 overflow-x-auto pb-4 active:cursor-grabbing"
            onMouseEnter={() => setAutoScroll(false)}
            onMouseLeave={() => setAutoScroll(true)}
          >
            {TIMELINE_EVENTS.map((event) => {
              const config = CONFIG[event.type];
              const Icon = config.icon;
              return (
                <div key={event.id} className="w-72 shrink-0 rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${config.color}22` }}>
                      <Icon className="h-4 w-4" style={{ color: config.color }} />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{format(new Date(event.timestamp), 'MMM d, yyyy')}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{event.title}</h3>
                  <p className="mt-1.5 min-h-10 text-xs leading-relaxed text-muted-foreground">{event.description}</p>
                  {event.amount && (
                    <div className="mt-3 font-mono text-sm font-semibold" style={{ color: config.color }}>
                      {formatNaira(event.amount)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-0 top-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute bottom-4 right-0 top-0 w-16 bg-gradient-to-l from-background to-transparent" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4"
        >
          {[
            ['12,847', 'Conversations tracked'],
            ['48,291', 'Data points extracted'],
            ['3,562', 'Actions proposed'],
            ['N24.7M', 'Revenue recovered'],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-semibold tracking-tight text-primary md:text-3xl">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
