import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { fadeUp } from '@/lib/motion-variants';
import { VideoDemoModal } from './VideoDemoModal';

export function LandingCTA() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative py-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative overflow-hidden rounded-3xl border border-border bg-surface/70 p-10 text-center shadow-elevated backdrop-blur md:p-16"
        >
          <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-6xl text-balance">
              Stop missing what your customers already told you.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Connect your WhatsApp Business number. OpsMemory captures, extracts, remembers, and routes action.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/sign-up"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                Get Early Access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground hover:bg-surface"
              >
                <Play className="h-4 w-4" />
                Watch Demo
              </button>
            </div>
          </div>
        </motion.div>

        <footer className="mt-12 flex flex-col items-center gap-3 text-center">
          <div className="font-display text-sm tracking-tight text-muted-foreground">OpsMemory</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            DSN x BCT LLM Agent Challenge 3.0 | May 2026
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Support</a>
          </div>
        </footer>
      </div>
      <VideoDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}
