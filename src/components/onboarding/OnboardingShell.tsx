import { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/store/useOnboarding';
import { useAuth } from '@/store/useAuth';
import { saveOnboardingProgress, completeOnboarding } from '@/lib/onboarding-api';
import { Step1Identity } from './Step1Identity';
import { Step2Presence } from './Step2Presence';
import { Step3WhatsApp } from './Step3WhatsApp';
import { Step4Catalog } from './Step4Catalog';
import { Step5AgentConfig } from './Step5AgentConfig';
import { Step6Done } from './Step6Done';

const STEPS = [Step1Identity, Step2Presence, Step3WhatsApp, Step4Catalog, Step5AgentConfig, Step6Done];

export function OnboardingShell() {
  const navigate = useNavigate();
  const { currentStep, nextStep, prevStep, setStep } = useOnboarding();
  const { setOnboardingCompleted } = useAuth();
  const [direction, setDirection] = useState(1);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const StepComponent = STEPS[currentStep - 1];

  const handleNext = async () => {
    setSaveError('');
    setSaving(true);
    try {
      const state = useOnboarding.getState();
      await saveOnboardingProgress(state as Record<string, unknown>, currentStep);
      setDirection(1);
      nextStep();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save to database');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    prevStep();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    setSaveError('');
    setSaving(true);
    try {
      const state = useOnboarding.getState();
      await completeOnboarding(state as Record<string, unknown>);
      setOnboardingCompleted(true);
      localStorage.setItem('opsmemory_tour_completed', 'false');
      useOnboarding.getState().reset();
      navigate({ to: '/dashboard' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save business setup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/opsmem icon.png" alt="OpsMemory" className="h-8 w-8 rounded-lg" />
          <span className="text-base font-semibold text-foreground tracking-tight">OpsMemory</span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-muted-foreground sm:block">Step {currentStep} of 6</span>
          {currentStep < 6 && (
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Skip →
            </button>
          )}
        </div>
      </header>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2.5 py-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              i + 1 < currentStep
                ? 'bg-primary'
                : i + 1 === currentStep
                  ? 'bg-foreground scale-110'
                  : 'bg-border'
            }`}
          />
        ))}
      </div>

      {saveError && (
        <div className="mx-auto max-w-lg px-6">
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">
            {saveError}
          </p>
        </div>
      )}

      {/* Step content */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 pb-24">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer navigation */}
      {currentStep < 6 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-4">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {currentStep === 6 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-4">
          <div className="mx-auto flex max-w-lg items-center justify-center">
            <button
              onClick={handleComplete}
              disabled={saving}
              className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            >
              {saving ? 'Indexing for WhatsApp…' : 'Go to Dashboard →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
