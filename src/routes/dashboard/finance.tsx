import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';
import { formatNaira, CUSTOMERS, INVOICES } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/finance')({
  component: FinancePage,
});

/* ─── Mock finance data ─── */
const REVENUE_MONTHS = [
  { month: 'Jan', revenue: 1800000, collected: 1620000 },
  { month: 'Feb', revenue: 2100000, collected: 1890000 },
  { month: 'Mar', revenue: 1950000, collected: 1755000 },
  { month: 'Apr', revenue: 2400000, collected: 2040000 },
  { month: 'May', revenue: 2650000, collected: 2120000 },
  { month: 'Jun', revenue: 2300000, collected: 2070000 },
];

const RECENT_TRANSACTIONS = [
  { id: 'txn-1', customer: 'Danladi Grains', type: 'payment' as const, amount: 450000, date: '2 hours ago', method: 'Bank Transfer', status: 'confirmed' as const },
  { id: 'txn-2', customer: 'Adaeze Supermarket', type: 'payment' as const, amount: 95000, date: '5 hours ago', method: 'Screenshot', status: 'confirmed' as const },
  { id: 'txn-3', customer: 'Nnamdi Provisions', type: 'payment' as const, amount: 320000, date: '8 hours ago', method: 'Bank Alert', status: 'confirmed' as const },
  { id: 'txn-4', customer: 'Alhaji Musa Traders', type: 'invoice' as const, amount: 150000, date: '1 day ago', method: 'Pending', status: 'pending' as const },
  { id: 'txn-5', customer: 'Emeka Distribution Co', type: 'invoice' as const, amount: 320000, date: '3 days ago', method: 'Overdue', status: 'overdue' as const },
  { id: 'txn-6', customer: 'Mama Funke Stores', type: 'invoice' as const, amount: 180000, date: '5 days ago', method: 'Overdue', status: 'overdue' as const },
  { id: 'txn-7', customer: 'Amina Mart', type: 'payment' as const, amount: 45000, date: '1 week ago', method: 'Mobile Transfer', status: 'confirmed' as const },
];

const EXPENSE_CATEGORIES = [
  { category: 'Procurement', amount: 1420000, percentage: 58, color: 'oklch(0.78 0.16 175)' },
  { category: 'Logistics', amount: 380000, percentage: 16, color: 'oklch(0.78 0.13 210)' },
  { category: 'Staff Salaries', amount: 340000, percentage: 14, color: 'oklch(0.78 0.16 75)' },
  { category: 'Utilities', amount: 165000, percentage: 7, color: 'oklch(0.66 0.21 295)' },
  { category: 'Other', amount: 120000, percentage: 5, color: 'oklch(0.68 0.21 20)' },
];

const maxRevenue = Math.max(...REVENUE_MONTHS.map(m => m.revenue));

function FinancePage() {
  const [txnFilter, setTxnFilter] = useState<'all' | 'payment' | 'invoice'>('all');

  const totalRevenue = 2400000;
  const totalCollected = 1510000;
  const totalOutstanding = 890000;
  const collectionRate = 84;
  const overdueInvoices = INVOICES.filter(i => i.status === 'overdue');
  const pendingInvoices = INVOICES.filter(i => i.status === 'pending');

  const filteredTxns = txnFilter === 'all'
    ? RECENT_TRANSACTIONS
    : RECENT_TRANSACTIONS.filter(t => t.type === txnFilter);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">finance · overview</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Financial Intelligence</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revenue tracking, payment monitoring, and financial health for {CUSTOMERS.length} accounts
        </p>
      </motion.header>

      {/* KPI Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {/* Revenue */}
        <motion.div variants={fadeUp}>
          <Card className="group relative overflow-hidden border border-border bg-surface/60 backdrop-blur-sm transition-all hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Weekly Revenue</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/10">
                  <Wallet className="h-4 w-4 text-emerald" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold tracking-tight">{formatNaira(totalRevenue, true)}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald">
                <ArrowUpRight className="h-3 w-3" />
                <span>+12% vs last week</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Collected */}
        <motion.div variants={fadeUp}>
          <Card className="group relative overflow-hidden border border-border bg-surface/60 backdrop-blur-sm transition-all hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Collected</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10">
                  <CircleDollarSign className="h-4 w-4 text-cyan" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold tracking-tight">{formatNaira(totalCollected, true)}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-cyan">
                <Banknote className="h-3 w-3" />
                <span>{collectionRate}% collection rate</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Outstanding */}
        <motion.div variants={fadeUp}>
          <Card className="group relative overflow-hidden border border-border bg-surface/60 backdrop-blur-sm transition-all hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-amber/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Outstanding</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/10">
                  <Clock className="h-4 w-4 text-amber" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold tracking-tight">{formatNaira(totalOutstanding, true)}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-amber">
                <ArrowDownRight className="h-3 w-3" />
                <span>{overdueInvoices.length} overdue invoices</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invoices */}
        <motion.div variants={fadeUp}>
          <Card className="group relative overflow-hidden border border-border bg-surface/60 backdrop-blur-sm transition-all hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-violet/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Open Invoices</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/10">
                  <FileText className="h-4 w-4 text-violet" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold tracking-tight">{overdueInvoices.length + pendingInvoices.length}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-violet">
                <Receipt className="h-3 w-3" />
                <span>{pendingInvoices.length} pending, {overdueInvoices.length} overdue</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Revenue Chart + Expense Breakdown */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Revenue Bar Chart */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Revenue vs Collected</div>
                  <h3 className="mt-1 font-display text-lg font-semibold">Monthly Trend</h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cyan" /> Collected</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {REVENUE_MONTHS.map((m, idx) => (
                  <motion.div
                    key={m.month}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="group"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{m.month}</span>
                      <span className="text-foreground/80">{formatNaira(m.revenue, true)}</span>
                    </div>
                    <div className="relative h-6 overflow-hidden rounded-md bg-background/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.08, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-md bg-primary/25"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.collected / maxRevenue) * 100}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.08 + 0.1, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-primary to-cyan"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expense Breakdown */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
          <Card className="h-full border border-border bg-surface/60 backdrop-blur-sm">
            <CardHeader>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Operating Expenses</div>
              <h3 className="mt-1 font-display text-lg font-semibold">Expense Breakdown</h3>
              <div className="mt-1 font-display text-2xl font-bold tracking-tight text-rose">{formatNaira(2425000, true)}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {EXPENSE_CATEGORIES.map((cat, idx) => (
                  <motion.div
                    key={cat.category}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.08 }}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{cat.category}</span>
                      <span className="font-mono text-muted-foreground">{formatNaira(cat.amount, true)}</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-background/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ duration: 0.6, delay: 0.3 + idx * 0.08 }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: cat.color }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Net Profit Margin</span>
                  <span className="flex items-center gap-1 font-mono font-semibold text-emerald">
                    <TrendingUp className="h-3 w-3" />
                    32%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transactions Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }} className="mt-8">
        <Card className="border border-border bg-surface/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Activity Log</div>
                <h3 className="mt-1 font-display text-lg font-semibold">Recent Transactions</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                {(['all', 'payment', 'invoice'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTxnFilter(f)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      txnFilter === f ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredTxns.map((txn, idx) => (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 rounded-xl border border-border/50 bg-background/40 px-4 py-3 transition-colors hover:bg-accent/30"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    txn.type === 'payment' ? 'bg-emerald/10' : 'bg-amber/10'
                  }`}>
                    {txn.type === 'payment'
                      ? <ArrowDownRight className="h-4 w-4 text-emerald" />
                      : <CreditCard className="h-4 w-4 text-amber" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{txn.customer}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          txn.status === 'confirmed' ? 'border-emerald/40 text-emerald' :
                          txn.status === 'pending' ? 'border-amber/40 text-amber' :
                          'border-rose/40 text-rose'
                        }`}
                      >
                        {txn.status}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{txn.method}</span>
                      <span>·</span>
                      <span>{txn.date}</span>
                    </div>
                  </div>
                  <div className={`text-right font-mono text-sm font-semibold ${
                    txn.type === 'payment' ? 'text-emerald' : 'text-foreground'
                  }`}>
                    {txn.type === 'payment' ? '+' : ''}{formatNaira(txn.amount, true)}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Accounts Receivable */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.4 }} className="mt-8 mb-8">
        <Card className="border border-border bg-surface/60 backdrop-blur-sm">
          <CardHeader>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Accounts Receivable</div>
            <h3 className="mt-1 font-display text-lg font-semibold">Outstanding Balances by Customer</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CUSTOMERS.filter(c => c.outstandingBalance > 0).sort((a, b) => b.outstandingBalance - a.outstandingBalance).map((customer, idx) => {
                const pct = (customer.outstandingBalance / totalOutstanding) * 100;
                return (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.08 }}
                    className="group rounded-xl border border-border/50 bg-background/40 p-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">{customer.businessName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-rose">{formatNaira(customer.outstandingBalance, true)}</div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <TrendingDown className="h-3 w-3" />
                          {customer.daysSinceLastOrder}d since last order
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 relative h-1.5 overflow-hidden rounded-full bg-background/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.5 + idx * 0.08 }}
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose to-amber"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
