import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, Play, TrendingUp, Zap } from 'lucide-react';
import { fadeUp, heroStagger, wordReveal } from '@/lib/motion-variants';
import { VideoDemoModal } from './VideoDemoModal';

const HEADLINE = ['Businesses', 'run', 'on', 'WhatsApp.', 'OpsMemory', 'runs', 'the', 'business.'];

const EVENTS = [
  { icon: CheckCircle2, text: 'Payment received - N150,000', color: '#10B981', sub: 'Alhaji Musa Traders' },
  { icon: Zap, text: 'Collections Agent activated', color: '#06B6D4', sub: 'Invoice #2841 overdue' },
  { icon: TrendingUp, text: 'CEO approved N450K deal', color: '#F59E0B', sub: 'Emeka Distribution Co' },
  { icon: AlertTriangle, text: 'Churn risk detected', color: '#EF4444', sub: 'Chidinma Foods' },
  { icon: CheckCircle2, text: 'Delivery confirmed', color: '#10B981', sub: 'Adaeze Supermarket' },
];

function SimulatedEventStream() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentIndex((index) => (index + 1) % EVENTS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const event = EVENTS[currentIndex];
  const Icon = event.icon;

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
      <div className="space-y-3 opacity-50">
        {EVENTS.map((item) => (
          <div key={item.text} className="h-16 rounded-xl border border-border bg-surface/40" />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={event.text}
          initial={{ opacity: 0, x: 28, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -28, scale: 0.96 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="absolute left-0 right-0 top-0 z-20"
        >
          <div
            className="flex items-center gap-3 rounded-xl border p-4 backdrop-blur-xl"
            style={{
              backgroundColor: `${event.color}14`,
              borderColor: `${event.color}40`,
              borderLeft: `3px solid ${event.color}`,
            }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${event.color}22` }}>
              <Icon className="h-4.5 w-4.5" style={{ color: event.color }} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{event.text}</p>
              <p className="text-xs text-muted-foreground">{event.sub}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// User avatars with gradient backgrounds
const USER_AVATARS = [
  { name: 'AM', gradient: 'from-blue-500 to-cyan-500' },
  { name: 'CF', gradient: 'from-purple-500 to-pink-500' },
  { name: 'ED', gradient: 'from-amber-500 to-orange-500' },
  { name: 'AS', gradient: 'from-emerald-500 to-teal-500' },
];

export function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative flex h-screen items-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <img src="/hero-bg.jpg" alt="" className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/70" />
      </div>
      <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center h-full">
        <motion.div variants={heroStagger} initial="hidden" animate="visible">
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance md:text-5xl lg:text-6xl">
            {HEADLINE.map((word) => (
              <motion.span
                key={word}
                variants={wordReveal}
                className={`mr-[0.25em] inline-block ${word === 'OpsMemory' ? 'text-primary' : ''}`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Connect your WhatsApp Business number. Six AI agents monitor every conversation, extract structured data, and propose actions in real time.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/sign-up"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              Get Early Access
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/40 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-surface"
            >
              <Play className="h-4 w-4" />
              Watch Demo
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex -space-x-3">
              {USER_AVATARS.map((user) => (
                <div
                  key={user.name}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br ${user.gradient} text-xs font-bold text-white shadow-md`}
                  title={user.name}
                >
                  {user.name}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Built for Lagos distributors, retailers, finance teams, and owner-operators.
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
          className="relative hidden h-full lg:flex lg:items-center lg:justify-center"
        >
          {/* Phone with spinning animation */}
          <motion.div
            animate={{ rotateZ: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-[520px] w-80"
            style={{ perspective: '1000px' }}
          >
            <img
              src="/phone-mockup.png"
              alt="WhatsApp Business phone mockup"
              className="h-full w-full object-contain drop-shadow-2xl"
            />
          </motion.div>
        </motion.div>
      </div>

      <VideoDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}
