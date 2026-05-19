import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export const Route = createFileRoute('/sign-up/$')({
  head: () => ({
    meta: [
      { title: 'Get early access | OpsMemory' },
      { name: 'description', content: 'Create your OpsMemory account and set up your business agent.' },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Registration failed');
        return;
      }
      login(data.token, data.user, false);
      navigate({ to: '/onboarding' });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen bg-background">
      {/* LEFT — Hero image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/sign in.png"
          alt="OpsMemory — AI-powered WhatsApp business agent"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* Bottom text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-10">
          <div className="flex items-center gap-2.5 mb-4">
            <img src="/opsmem icon.png" alt="OpsMemory" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold text-white tracking-tight">OpsMemory</span>
          </div>
          <p className="text-sm text-white/70 max-w-sm leading-relaxed">
            Your WhatsApp messages become business intelligence.
            Six AI agents watch your operations 24/7.
          </p>
        </div>
      </div>

      {/* RIGHT — Sign up form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2.5 mb-8"
            onDoubleClick={() => {
              localStorage.setItem('opsmemory-demo-mode', 'true');
              window.location.href = '/dashboard';
            }}
          >
            <img src="/opsmem icon.png" alt="OpsMemory" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-semibold text-foreground tracking-tight">OpsMemory</span>
          </Link>

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Your business agent is ready in 5 minutes.</p>

          {/* Form card */}
          <div className="mt-8 rounded-2xl border border-border bg-surface/50 p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm text-foreground placeholder-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                  {error}
                </div>
              )}

              <button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </div>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
