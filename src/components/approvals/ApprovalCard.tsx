import { useMotionValue, useTransform, motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check, X, ChevronUp, Bot, Crown } from 'lucide-react';
import type { AgentAction } from '@/types';

interface Props {
  action: AgentAction;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onInspect: (action: AgentAction) => void;
}

export function ApprovalCard({ action, onApprove, onReject, onInspect }: Props) {
  const x = useMotionValue(0);
  const greenOpacity = useTransform(x, [0, 120], [0, 0.85]);
  const redOpacity = useTransform(x, [-120, 0], [0.85, 0]);
  const rotate = useTransform(x, [-200, 200], [-6, 6]);
  const [removing, setRemoving] = useState<'approve' | 'reject' | null>(null);

  const isEscalate = action.track === 'escalate';
  const conf = Math.round(action.confidence * 100);
  const confColor = action.confidence > 0.8 ? 'oklch(0.74 0.18 160)' : action.confidence > 0.5 ? 'oklch(0.78 0.16 75)' : 'oklch(0.68 0.21 20)';

  return (
    <AnimatePresence>
      {!removing || removing ? (
        <motion.div
          layout
          drag="x"
          dragConstraints={{ left: -200, right: 200 }}
          dragElastic={0.2}
          style={{ x, rotate }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 120) {
              setRemoving('approve');
              setTimeout(() => onApprove(action.id), 250);
            } else if (info.offset.x < -120) {
              setRemoving('reject');
              setTimeout(() => onReject(action.id), 250);
            }
          }}
          animate={removing === 'approve' ? { x: 600, opacity: 0, scale: 0.9 } : removing === 'reject' ? { x: -600, opacity: 0, scale: 0.9 } : {}}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated cursor-grab active:cursor-grabbing"
        >
          <motion.div style={{ opacity: greenOpacity }} className="pointer-events-none absolute inset-0 z-10 flex items-center justify-start pl-8 bg-emerald/30">
            <div className="flex items-center gap-2 text-emerald font-display text-2xl font-semibold"><Check className="h-7 w-7" /> Approve</div>
          </motion.div>
          <motion.div style={{ opacity: redOpacity }} className="pointer-events-none absolute inset-0 z-10 flex items-center justify-end pr-8 bg-rose/30">
            <div className="flex items-center gap-2 text-rose font-display text-2xl font-semibold">Reject <X className="h-7 w-7" /></div>
          </motion.div>

          {isEscalate && (
            <motion.div
              animate={{ borderLeftColor: ['oklch(0.78 0.16 75)', 'transparent', 'oklch(0.78 0.16 75)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-y-0 left-0 w-[3px] border-l-[3px]"
            />
          )}

          <div className="relative p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-glow" style={{ background: action.agentColor }}>
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{action.track}</div>
                  <div className="font-display text-base font-semibold">{action.agentName}</div>
                </div>
              </div>
              {isEscalate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber">
                  <Crown className="h-3 w-3" /> CEO
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-1.5">
              <div className="text-sm font-medium text-foreground">{action.customerName}</div>
              <div className="font-mono text-xs text-muted-foreground">lifetime · ₦{(action.customerRevenue / 1000000).toFixed(2)}M</div>
            </div>

            <div className="mt-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Trigger</div>
              <p className="mt-1.5 text-sm text-foreground">{action.triggerSummary}</p>
            </div>

            <div className="mt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Proposed action</div>
              <p className="mt-1.5 text-sm text-foreground/90">{action.proposedAction}</p>
            </div>

            {action.proposedMessage && (
              <div className="mt-3 rounded-2xl rounded-tl-sm bg-emerald/15 px-4 py-3 text-sm text-foreground">
                {action.proposedMessage}
              </div>
            )}

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</span>
                <span className="font-mono text-xs font-semibold" style={{ color: confColor }}>{conf}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${conf}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: confColor }}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => { setRemoving('reject'); setTimeout(() => onReject(action.id), 250); }}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-rose/10 hover:border-rose/40 hover:text-rose transition-colors"
              >Reject</button>
              <button
                onClick={() => onInspect(action)}
                className="rounded-xl border border-border p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Reasoning"
              ><ChevronUp className="h-4 w-4" /></button>
              <button
                onClick={() => { setRemoving('approve'); setTimeout(() => onApprove(action.id), 250); }}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.01] transition-transform"
              >Approve</button>
            </div>

            <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              ← swipe to reject · approve →
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
