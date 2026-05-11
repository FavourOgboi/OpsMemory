import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import type { Customer } from '@/types';

const RING: Record<string, string> = {
  low: 'oklch(0.74 0.18 160)',
  medium: 'oklch(0.78 0.16 75)',
  high: 'oklch(0.68 0.21 20)',
  critical: 'oklch(0.65 0.22 25)',
};

export function EntityHeader({ customer }: { customer: Customer }) {
  const initials = customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const ring = RING[customer.churnRisk];
  return (
    <div className="border-b border-border bg-surface/40 px-8 py-6 backdrop-blur-sm">
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> back to mission control
      </Link>
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-surface font-display text-2xl font-semibold"
            style={{ border: `3px solid ${ring}`, boxShadow: `0 0 30px -5px ${ring}` }}
          >
            {initials}
          </motion.div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{customer.businessName}</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{customer.name}</h1>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" /> {customer.phone}</span>
              <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3 w-3" /> WhatsApp · {customer.language}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Health" value={String(customer.healthScore)} accent={ring} />
          <Stat label="Lifetime" value={`₦${(customer.totalRevenue / 1000000).toFixed(2)}M`} />
          <Stat label="Outstanding" value={`₦${(customer.outstandingBalance / 1000).toFixed(0)}k`} accent={customer.outstandingBalance > 0 ? 'oklch(0.68 0.21 20)' : undefined} />
          <Stat label="Last order" value={`${customer.daysSinceLastOrder}d`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 px-4 py-3 backdrop-blur">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold tracking-tight" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}
