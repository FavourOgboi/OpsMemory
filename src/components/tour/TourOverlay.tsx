import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTour } from '@/store/useTour';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const { active, currentStep, currentStepIndex, steps, next, prev, skip, complete } = useTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top - 8,
      left: rect.left - 8,
      width: rect.width + 16,
      height: rect.height + 16,
    });

    // Position tooltip near target
    const pad = 16;
    const tooltipW = 340;
    const tooltipH = 200;
    let top = rect.bottom + pad;
    let left = rect.left;

    if (currentStep.position === 'top') {
      top = rect.top - tooltipH - pad;
    } else if (currentStep.position === 'left') {
      left = rect.left - tooltipW - pad;
      top = rect.top;
    } else if (currentStep.position === 'right') {
      left = rect.right + pad;
      top = rect.top;
    }

    // Keep in viewport
    if (left + tooltipW > window.innerWidth - pad) left = window.innerWidth - tooltipW - pad;
    if (left < pad) left = pad;
    if (top + tooltipH > window.innerHeight - pad) top = window.innerHeight - tooltipH - pad;
    if (top < pad) top = pad;

    setTooltipPos({ top, left });
  }, [currentStep]);

  useEffect(() => {
    if (!active) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [active, currentStepIndex, updatePosition]);

  if (!active) return null;

  const isCenter = !currentStep.targetSelector;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Backdrop */}
        {isCenter ? (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
        ) : (
          <>
            <div className="absolute inset-0 bg-black/70" />
            {/* Spotlight cutout */}
            {targetRect && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute"
                style={{
                  top: targetRect.top,
                  left: targetRect.left,
                  width: targetRect.width,
                  height: targetRect.height,
                  borderRadius: '12px',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
                  zIndex: 9998,
                  pointerEvents: 'none',
                }}
              />
            )}
          </>
        )}

        {/* Tooltip */}
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute z-[10000]"
          style={
            isCenter
              ? {
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }
              : {
                  top: tooltipPos.top,
                  left: tooltipPos.left,
                }
          }
        >
          <div
            className="w-[340px] rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-2xl"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
          >
            {/* Close button */}
            <button
              onClick={skip}
              className="absolute right-3 top-3 rounded-md p-1 text-slate-500 transition hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Title */}
            <h3 className="pr-6 text-base font-semibold text-[#F8FAFC]">{currentStep.title}</h3>

            {/* Body */}
            <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">{currentStep.body}</p>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between border-t border-[#1E293B] pt-4">
              <span className="font-mono text-xs text-[#475569]">
                {isFirst ? '' : `${currentStepIndex + 1} of ${steps.length}`}
              </span>

              <div className="flex items-center gap-2">
                {isFirst ? (
                  <>
                    <button
                      onClick={skip}
                      className="rounded-lg px-3 py-1.5 text-xs text-[#94A3B8] transition hover:text-white"
                    >
                      Skip Tour
                    </button>
                    <button
                      onClick={next}
                      className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Start →
                    </button>
                  </>
                ) : isLast ? (
                  <button
                    onClick={complete}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Close and go to dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={prev}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-[#94A3B8] transition hover:text-white"
                    >
                      <ChevronLeft className="h-3 w-3" /> Back
                    </button>
                    <button
                      onClick={next}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Next <ChevronRight className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
