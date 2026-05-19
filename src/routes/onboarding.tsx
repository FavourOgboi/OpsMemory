import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';

export const Route = createFileRoute('/onboarding')({
  head: () => ({
    meta: [
      { title: 'Set up your business · OpsMemory' },
      { name: 'description', content: 'Configure your business agent in 5 minutes.' },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, onboardingCompleted, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate({ to: '/sign-up' });
      return;
    }
    if (onboardingCompleted) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, onboardingCompleted, isLoading, navigate]);

  if (isLoading || !isAuthenticated) return null;

  return <OnboardingShell />;
}
