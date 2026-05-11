import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const Route = createFileRoute('/sign-up/$')({
  head: () => ({
    meta: [
      { title: 'Get early access | OpsMemory' },
      { name: 'description', content: 'Create your OpsMemory account and connect a business workspace.' },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ownerName: 'Emeka Okonkwo',
    businessName: 'Emeka Global Supplies',
    email: 'emeka@global-supplies.com',
    phone: '+2348123456789',
    businessType: 'Trading / Distribution',
    location: 'Lagos, Nigeria',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignUp = () => {
    // Demo: Save to localStorage and redirect to dashboard
    localStorage.setItem('demoUser', JSON.stringify({
      id: 'demo-user-1',
      name: formData.ownerName,
      email: formData.email,
      business: {
        name: formData.businessName,
        type: formData.businessType,
        location: formData.location,
        phone: formData.phone,
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

      <div className="relative z-10 grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_450px] lg:items-center">
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
            Create the workspace before the business memory starts flowing.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground">
            This account becomes the owner identity for the demo workspace. All details are pre-filled with example data from <strong>Emeka Global Supplies</strong>, a Lagos trading company. Customize any field and proceed to see the full OpsMemory dashboard in action.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-surface/70 p-6 shadow-elevated backdrop-blur">
          <h2 className="font-display text-xl font-semibold">Create your account</h2>
          <p className="mt-1 text-xs text-muted-foreground">Demo data is pre-filled. Edit as needed.</p>
          
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium">Owner Name</label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Business Name</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Business Type</label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Trading / Distribution</option>
                <option>Logistics</option>
                <option>Healthcare</option>
                <option>Services</option>
                <option>Manufacturing</option>
                <option>Food and Beverage</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <Button
              onClick={handleSignUp}
              className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Enter Demo Dashboard
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account? <Link to="/sign-in" className="text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
