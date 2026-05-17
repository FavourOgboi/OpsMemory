import { createFileRoute, Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';
import { formatNaira } from '@/lib/format-utils';
import { api } from '@/lib/api';
import { mapCustomer } from '@/lib/api-mappers';
import type { Customer } from '@/types';

export const Route = createFileRoute('/dashboard/customers/')({
  component: CustomersPage,
});

const riskColors = {
  low: 'border-emerald/40 text-emerald',
  medium: 'border-amber/40 text-amber',
  high: 'border-rose/40 text-rose',
  critical: 'border-rose/40 text-rose',
};

function CustomersPage() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    api.get('/api/customers').then((data: any[]) => {
      setCustomers((data || []).map(mapCustomer));
    }).catch(() => {});
  }, []);

  const filtered = customers.filter((c: Customer) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.businessName.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || c.churnRisk === riskFilter;
    return matchSearch && matchRisk;
  });

  const highRisk = customers.filter((c: Customer) => c.churnRisk === 'high').length;
  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const totalOutstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">customers · crm</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-2 text-sm text-muted-foreground">{customers.length} accounts tracked · {highRisk} at risk</p>
      </motion.header>

      {/* Stats */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-6 grid gap-4 sm:grid-cols-3">
        <motion.div variants={fadeUp}>
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total Revenue</div>
              <div className="mt-1 font-display text-2xl font-bold text-emerald">{formatNaira(totalRevenue, true)}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Outstanding</div>
              <div className="mt-1 font-display text-2xl font-bold text-amber">{formatNaira(totalOutstanding, true)}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">At Risk</div>
              <div className="mt-1 font-display text-2xl font-bold text-rose">{highRisk}</div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Search + filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full rounded-xl border border-border bg-surface/60 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-muted-foreground" /></button>
          )}
        </div>
        {['all', 'low', 'medium', 'high'].map(f => (
          <button
            key={f}
            onClick={() => setRiskFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${riskFilter === f ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {f === 'all' ? 'All' : `${f.charAt(0).toUpperCase() + f.slice(1)} Risk`}
          </button>
        ))}
      </div>

      {/* Customer List */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-6 space-y-3 mb-8">
        {filtered.map((customer, idx) => (
          <motion.div key={customer.id} variants={fadeUp} transition={{ delay: idx * 0.04 }}>
            <Link
              to="/dashboard/customers/$id"
              params={{ id: customer.id }}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-4 backdrop-blur-sm transition-all hover:border-border/80 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-bold text-primary">
                {customer.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{customer.name}</span>
                  <Badge variant="outline" className={`text-[10px] ${riskColors[customer.churnRisk]}`}>{customer.churnRisk}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{customer.businessName}</div>
              </div>
              <div className="hidden sm:block text-right">
                <div className="font-mono text-xs font-semibold">{formatNaira(customer.totalRevenue, true)}</div>
                <div className="text-[10px] text-muted-foreground">lifetime</div>
              </div>
              <div className="hidden md:block text-right">
                <div className="font-mono text-xs font-semibold">{customer.healthScore}</div>
                <div className="text-[10px] text-muted-foreground">health</div>
              </div>
              <div className="hidden lg:block text-right">
                <div className="font-mono text-xs">{customer.daysSinceLastOrder}d</div>
                <div className="text-[10px] text-muted-foreground">last order</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center text-sm text-muted-foreground">No customers match your search.</div>
      )}
    </div>
  );
}
