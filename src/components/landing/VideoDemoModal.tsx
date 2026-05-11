import { AnimatePresence, motion } from 'framer-motion';
import { Play, X } from 'lucide-react';

interface VideoDemoModalProps {
  open: boolean;
  onClose: () => void;
}

export function VideoDemoModal({ open, onClose }: VideoDemoModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-[90] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-border bg-surface shadow-elevated"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Demo preview</div>
                <h2 className="font-display text-lg font-semibold tracking-tight">OpsMemory live flow</h2>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-accent" aria-label="Close demo modal">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-video bg-background">
              <div className="absolute inset-0 bg-[url('/dashboard-hero.jpg')] bg-cover bg-center opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-br from-background via-background/70 to-primary/20" />
              <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary/15 shadow-glow">
                  <Play className="h-8 w-8 fill-primary text-primary" />
                </div>
                <h3 className="mt-6 max-w-xl font-display text-2xl font-semibold tracking-tight">
                  Video asset coming soon.
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  This modal is wired and ready. Drop in the final demo video when the WhatsApp-to-agent approval sequence is recorded.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
