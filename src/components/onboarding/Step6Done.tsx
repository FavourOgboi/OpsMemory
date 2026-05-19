import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from '@/store/useOnboarding';

export function Step6Done() {
  const { businessName, whatsappNumber } = useOnboarding();
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="text-center py-8">
      {/* Confetti dots */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div key={i}
              initial={{ opacity: 1, y: -20, x: Math.random() * window.innerWidth }}
              animate={{ opacity: 0, y: window.innerHeight + 20 }}
              transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5 }}
              className="absolute h-2 w-2 rounded-full"
              style={{ backgroundColor: ['#10B981', '#06B6D4', '#F59E0B', '#8B5CF6'][i % 4] }} />
          ))}
        </div>
      )}

      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="mb-6 text-6xl">✅</motion.div>

      <h2 className="text-3xl font-semibold text-foreground">You're all set.</h2>
      <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
        OpsMemory is now active for <strong className="text-foreground">{businessName || 'your business'}</strong>.
        {whatsappNumber && <> Your agent is listening on <strong className="text-foreground">{whatsappNumber}</strong>.</>}
      </p>

      <div className="mt-8 space-y-3 text-left max-w-sm mx-auto">
        {[
          { icon: '📱', text: 'Customers message your WhatsApp number' },
          { icon: '🧠', text: 'Your agent reads, understands, and responds' },
          { icon: '📊', text: 'You see everything on your dashboard' },
          { icon: '🎯', text: 'Agents flag what needs your attention' },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3">
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm text-muted-foreground">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
