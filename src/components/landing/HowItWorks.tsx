import { motion } from 'framer-motion';
import { Brain, Cpu, MessageSquare } from 'lucide-react';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';

const STEPS = [
  {
    icon: MessageSquare,
    label: 'Capture',
    title: 'WhatsApp message arrives',
    body: 'Text, voice notes, payment screenshots, and order requests land in one business number.',
  },
  {
    icon: Brain,
    label: 'Extract',
    title: 'AI turns chat into memory',
    body: 'Language, intent, amounts, order references, promises, and urgency become structured records.',
  },
  {
    icon: Cpu,
    label: 'Act',
    title: 'Agents propose next moves',
    body: 'Collections, churn, fulfillment, deals, revenue, and relationship agents draft actions for humans.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">How it works</div>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
              From chat to intelligence to action in seconds.
            </h2>
          </motion.div>

          <div className="relative mt-20 grid gap-8 md:grid-cols-3">
            <svg className="absolute inset-x-0 top-16 hidden md:block" height="40" width="100%" preserveAspectRatio="none">
              <motion.path
                d="M 90 20 C 260 20, 330 20, 500 20 S 760 20, 930 20"
                fill="none"
                stroke="url(#flow-grad)"
                strokeWidth="2"
                strokeDasharray="5 6"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5 }}
              />
              <motion.circle
                r="5"
                fill="oklch(0.74 0.18 160)"
                initial={{ offsetDistance: '0%' }}
                whileInView={{ offsetDistance: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 2.4, delay: 0.4, ease: 'easeInOut' }}
                style={{
                  offsetPath: 'path("M 90 20 C 260 20, 330 20, 500 20 S 760 20, 930 20")',
                  filter: 'drop-shadow(0 0 10px oklch(0.74 0.18 160))',
                }}
              />
              <defs>
                <linearGradient id="flow-grad" x1="0" x2="1">
                  <stop offset="0%" stopColor="oklch(0.74 0.18 160)" />
                  <stop offset="50%" stopColor="oklch(0.78 0.13 210)" />
                  <stop offset="100%" stopColor="oklch(0.78 0.16 75)" />
                </linearGradient>
              </defs>
            </svg>

            {STEPS.map((step, index) => (
              <motion.div
                key={step.label}
                variants={fadeUp}
                className="relative rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur-sm"
              >
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-background font-mono text-[10px] font-semibold text-primary shadow-glow">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">{step.label}</div>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
