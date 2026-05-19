import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES = [
  {
    type: 'incoming',
    text: '"Oga I don pay the 150k"',
    delay: 0,
  },
  {
    type: 'extract',
    text: 'Payment claim detected — ₦150,000',
    icon: '🧠',
    delay: 1,
  },
  {
    type: 'action',
    text: 'Send confirmation to Alhaji Musa?',
    icon: '🤖',
    delay: 2,
  },
  {
    type: 'done',
    text: 'Action approved — message sent',
    icon: '✅',
    delay: 3,
  },
];

export function AnimatedPreview() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= MESSAGES.length) {
          // Reset after a pause
          setTimeout(() => setVisibleCount(0), 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {MESSAGES.slice(0, visibleCount).map((msg, i) => (
          <motion.div
            key={`${msg.type}-${i}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`rounded-xl border px-4 py-3 ${
              msg.type === 'incoming'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : msg.type === 'extract'
                  ? 'border-cyan-500/30 bg-cyan-500/10'
                  : msg.type === 'action'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-emerald-500/30 bg-emerald-500/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {msg.icon && <span className="text-lg">{msg.icon}</span>}
              {msg.type === 'incoming' && <span className="text-lg">💬</span>}
              <span className="text-sm text-[#F8FAFC]">{msg.text}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {visibleCount === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 py-8"
        >
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs text-[#64748B]">Waiting for messages...</span>
        </motion.div>
      )}
    </div>
  );
}
