import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { AGENT_DESCRIPTIONS, AGENT_LAST_ACTIVE, AGENT_STATES } from '@/lib/mock-data';
import { agentCardStagger, fadeUp } from '@/lib/motion-variants';

export function AgentGrid() {
  return (
    <section className="relative overflow-hidden py-32">
      <div className="absolute inset-0 bg-[url('/agents-visual.jpg')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={agentCardStagger}>
          <motion.div variants={fadeUp} className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Six agents always on</div>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
              A nervous system for the operations you cannot watch yourself.
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {AGENT_STATES.map((agent, index) => (
              <motion.div
                key={agent.name}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur-sm"
              >
                <div
                  className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
                  style={{ background: agent.color }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: agent.color, boxShadow: `0 0 12px ${agent.color}` }}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {agent.status === 'idle' ? 'Monitoring' : agent.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{agent.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{AGENT_DESCRIPTIONS[agent.name]}</p>

                  <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-mono text-muted-foreground">
                      <Activity className="h-3 w-3" style={{ color: agent.color }} />
                      {agent.eventCount} events
                    </span>
                    <span className="font-mono text-muted-foreground">{AGENT_LAST_ACTIVE[agent.name]}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
