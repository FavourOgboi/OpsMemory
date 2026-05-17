import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { installDevAuth } from '@/lib/dev-auth';
import { useState } from 'react';

export const Route = createFileRoute('/sign-in/$')({
  head: () => ({
    meta: [
      { title: 'Sign in | OpsMemory' },
      { name: 'description', content: 'Sign in to the OpsMemory operational intelligence dashboard.' },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('emeka@global-supplies.com');
  const [password, setPassword] = useState('demo');

  const handleSignIn = () => {
    installDevAuth('ceo');
    localStorage.setItem('demoUser', JSON.stringify({
      id: 'demo-user-1',
      name: 'Emeka Okonkwo',
      email: email,
      business: {
        name: 'Emeka Global Supplies',
        type: 'Trading / Distribution',
        location: 'Lagos, Nigeria',
        phone: '+2348123456789',
      },
      isDemo: true,
    }));
    navigate({ to: '/dashboard' });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="absolute inset-0 bg-mesh opacity-70" />
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-primary to-cyan shadow-glow" />
              <div className="absolute inset-1 rounded-sm bg-background/80" />
              <div className="absolute inset-2 rounded-[2px] bg-primary" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight">OpsMemory</span>
          </Link>
          <div className="mt-10 font-mono text-xs uppercase tracking-[0.22em] text-primary">DEMO MODE</div>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Return to the live memory layer for your WhatsApp operations.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Sign in to review agent decisions, customer dossiers, payments, and operational alerts for Emeka Global Supplies.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-surface/70 p-6 shadow-elevated backdrop-blur">
          <h2 className="font-display text-xl font-semibold">Sign in</h2>
          <p className="mt-1 text-xs text-muted-foreground">Demo account ready. Just click below.</p>
          
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <Button
              onClick={handleSignIn}
              className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Enter Demo Dashboard
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              New user? <Link to="/sign-up" className="text-primary hover:underline">Create account</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
