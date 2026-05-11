import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { AgentReasoningPanel } from '@/components/dashboard/AgentReasoningPanel';
import { useApprovalQueue } from '@/store/useApprovalQueue';
import type { AgentAction } from '@/types';
import { Inbox } from 'lucide-react';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';

export const Route = createFileRoute('/dashboard/approvals')({
  component: Approvals,
});

function Approvals() {
  const actions = useApprovalQueue((s) => s.actions);
  const approve = useApprovalQueue((s) => s.approve);
  const reject = useApprovalQueue((s) => s.reject);
  const [reasoning, setReasoning] = useState<AgentAction | null>(null);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">approval · center</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Decisions to make</h1>
        <p className="mt-1 text-sm text-muted-foreground">Swipe right to approve. Left to reject. Or tap a card to inspect the reasoning.</p>
      </header>

      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {actions.map((a) => (
            <motion.div key={a.id} layout variants={fadeUp}>
              <ApprovalCard action={a} onApprove={approve} onReject={reject} onInspect={setReasoning} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {actions.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-20 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald/15 ring-1 ring-emerald/40">
            <Inbox className="h-7 w-7 text-emerald" />
          </div>
          <div className="mt-5 font-display text-xl font-semibold">Inbox zero</div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">No agent decisions waiting. Your operations are flowing.</p>
        </motion.div>
      )}

      <AgentReasoningPanel action={reasoning} onClose={() => setReasoning(null)} />
    </div>
  );
}
