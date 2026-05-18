import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
import { formatNaira } from '@/lib/format-utils';
import { api } from '@/lib/api';
import { mapCustomer } from '@/lib/api-mappers';
import type { Customer } from '@/types';

interface FinanceHistoryPoint {
  month: string;
  revenue: number;
  collected: number;
}

interface InvoiceItem {
  id: string;
  status: string;
  amount: number;
  total?: number;
  created_at?: string;
  date?: string;
  customers?: { name: string };
  customer_name?: string;
  payment_method?: string;
  method?: string;
}

interface PaymentItem {
  id: string;
  status: string;
  amount: number;
  amount_paid?: number;
  created_at?: string;
  date?: string;
  customers?: { name: string };
  customer_name?: string;
  payment_method?: string;
  method?: string;
}

interface FinanceStats {
  pending_total: number;
  overdue_total: number;
  paid_total: number;
  total_invoices: number;
  total_payments: number;
}

interface FinanceData {
  invoices: InvoiceItem[];
  payments: PaymentItem[];
  stats: FinanceStats;
}

export const Route = createFileRoute('/dashboard/finance')({
  component: FinancePage,
});

function FinancePage() {
  const [txnFilter, setTxnFilter] = useState<'all' | 'payment' | 'invoice'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [history, setHistory] = useState<FinanceHistoryPoint[]>([]);

  useEffect(() => {
    api.get('/api/customers').then((data) => setCustomers((data || []).map(mapCustomer))).catch(() => {});
    api.get('/api/finance/summary').then((data) => setFinanceData(data as FinanceData)).catch(() => {});
    api.get('/api/finance/history').then((data: { history?: FinanceHistoryPoint[] }) => setHistory(data.history || [])).catch(() => {});
  }, []);

  const totalRevenue = financeData?.stats?.paid_total || 0;
  const totalCollected = totalRevenue;
  const totalOutstanding = financeData?.stats?.overdue_total || 0;
  const collectionRate = totalRevenue > 0 ? Math.round((totalRevenue / (totalRevenue + totalOutstanding)) * 100) : 0;
  const invoices = financeData?.invoices || [];
  const payments = financeData?.payments || [];
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
  const pendingInvoices = invoices.filter((i) => i.status === 'pending');

  const allTxns: (InvoiceItem | PaymentItem)[] = txnFilter === 'all'
    ? [...payments, ...invoices]
    : txnFilter === 'payment'
    ? payments
    : invoices;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">finance · overview</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Financial Intelligence</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revenue tracking, payment monitoring, and financial health for {customers.length} accounts
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
              <div className="h-64">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => [`₦${value.toLocaleString()}`, '']}
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="collected" fill="var(--cyan)" radius={[4, 4, 0, 0]} name="Collected" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Monthly revenue chart will populate once data is seeded.</div>
              )}
            </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expense Breakdown */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
          <Card className="h-full border border-border bg-surface/60 backdrop-blur-sm">
            <CardHeader>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Finance Summary</div>
              <h3 className="mt-1 font-display text-lg font-semibold">Collection Overview</h3>
              <div className="mt-1 font-display text-2xl font-bold tracking-tight text-emerald">{formatNaira(totalRevenue, true)}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Pending</span>
                  <span className="font-mono text-muted-foreground">{formatNaira(financeData?.stats?.pending_total || 0, true)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Overdue</span>
                  <span className="font-mono text-rose">{formatNaira(totalOutstanding, true)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">Paid</span>
                  <span className="font-mono text-emerald">{formatNaira(totalRevenue, true)}</span>
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Collection Rate</span>
                  <span className="flex items-center gap-1 font-mono font-semibold text-emerald">
                    <TrendingUp className="h-3 w-3" />
                    {collectionRate}%
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
              {allTxns.map((txn, idx) => {
                const isPayment = txn.amount_paid !== undefined || txn.status === 'confirmed';
                const displayName = txn.customers?.name || txn.customer_name || 'Unknown';
                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 rounded-xl border border-border/50 bg-background/40 px-4 py-3 transition-colors hover:bg-accent/30"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isPayment ? 'bg-emerald/10' : 'bg-amber/10'
                    }`}>
                      {isPayment
                        ? <ArrowDownRight className="h-4 w-4 text-emerald" />
                        : <CreditCard className="h-4 w-4 text-amber" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{displayName}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            txn.status === 'confirmed' || txn.status === 'paid' ? 'border-emerald/40 text-emerald' :
                            txn.status === 'pending' ? 'border-amber/40 text-amber' :
                            'border-rose/40 text-rose'
                          }`}
                        >
                          {txn.status}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{txn.method || txn.payment_method || 'Bank'}</span>
                        <span>·</span>
                        <span>{txn.date || txn.created_at ? new Date(txn.created_at || txn.date).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                    <div className={`text-right font-mono text-sm font-semibold ${
                      isPayment ? 'text-emerald' : 'text-foreground'
                    }`}>
                      {isPayment ? '+' : ''}{formatNaira(('total' in txn ? txn.total : txn.amount) || 0, true)}
                    </div>
                  </motion.div>
                );
              })}
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
              {customers.filter((c: Customer) => c.outstandingBalance > 0).sort((a: Customer, b: Customer) => b.outstandingBalance - a.outstandingBalance).map((customer: Customer, idx: number) => {
                const pct = totalOutstanding > 0 ? (customer.outstandingBalance / totalOutstanding) * 100 : 0;
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
