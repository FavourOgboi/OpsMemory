import { AnimatePresence, motion } from 'framer-motion';
import { X, Bot } from 'lucide-react';
import type { AgentAction } from '@/types';
import { slideUpPanel } from '@/lib/motion-variants';

interface Props {
  action: AgentAction | null;
  onClose: () => void;
}

export function AgentReasoningPanel({ action, onClose }: Props) {
  return (
    <AnimatePresence>
      {action && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          />
          <motion.div
            variants={slideUpPanel}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-t-3xl border border-border bg-surface shadow-elevated"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-6" style={{ background: `linear-gradient(135deg, ${action.agentColor}30, transparent)` }}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: action.agentColor }}>
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">reasoning · trace</div>
                  <div className="font-display text-lg font-semibold tracking-tight">{action.agentName}</div>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-6 scrollbar-thin">
              <Section label="Trigger">{action.triggerSummary}</Section>
              <Section label="Proposed action">{action.proposedAction}</Section>
              {action.proposedMessage && (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Drafted message</div>
                  <div className="mt-2 rounded-2xl rounded-tl-sm bg-emerald/15 px-4 py-3 text-sm text-foreground">
                    {action.proposedMessage}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Confidence" value={`${Math.round(action.confidence * 100)}%`} />
                <Stat label="Risk" value={action.riskLevel} />
                <Stat label="Track" value={action.track} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold capitalize">{value}</div>
    </div>
  );
}
