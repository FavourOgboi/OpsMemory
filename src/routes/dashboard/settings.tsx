import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  Bot,
  Building2,
  Globe,
  Key,
  Lock,
  MessageCircle,
  Palette,
  Save,
  Shield,
  Smartphone,
  User,
  Zap,
} from 'lucide-react';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';
import { useTheme } from '@/store/useTheme';
import { api } from '@/lib/api';
import { mapBusiness } from '@/lib/api-mappers';
import type { Business } from '@/types';

export const Route = createFileRoute('/dashboard/settings')({
  loader: async () => {
    const raw = await api.get('/api/onboarding/business');
    return { business: mapBusiness(raw) };
  },
  component: SettingsPage,
});

const TABS = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'agents', label: 'AI Agents', icon: Bot },
  { id: 'integrations', label: 'Integrations', icon: Zap },
  { id: 'security', label: 'Security', icon: Shield },
] as const;

type TabId = (typeof TABS)[number]['id'];

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const isDark = useTheme((s) => s.isDark);
  const toggle = useTheme((s) => s.toggle);
  const { business } = Route.useLoaderData();

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">settings · config</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure {business.name}&apos;s OpsMemory dashboard preferences
        </p>
      </motion.header>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/60 p-1 backdrop-blur-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-6 mb-8 space-y-6">
        {activeTab === 'general' && <GeneralTab business={business} isDark={isDark} toggleTheme={toggle} />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'agents' && <AgentsTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'security' && <SecurityTab />}
      </motion.div>
    </div>
  );
}

/* ─── Toggle row using Radix Switch ─── */
function Toggle({ enabled, onToggle, label, desc }: { enabled: boolean; onToggle: () => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/40 p-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

/* ─── General Tab ─── */
function GeneralTab({ business, isDark, toggleTheme }: { business: Business; isDark: boolean; toggleTheme: () => void }) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Business Info */}
      <motion.div variants={fadeUp}>
        <Card className="border border-border bg-surface/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg font-semibold">Business Profile</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Business Name</label>
                <input defaultValue={business.name} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Industry</label>
                <input defaultValue={business.type} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">WhatsApp Number</label>
                <input defaultValue={business.whatsappNumber || '+234'} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Time Zone</label>
                <input defaultValue="Africa/Lagos (WAT)" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Save className="h-3.5 w-3.5" /> Save Changes
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={fadeUp}>
        <Card className="border border-border bg-surface/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-violet" />
              <h3 className="font-display text-lg font-semibold">Appearance</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/40 p-4">
              <div>
                <div className="text-sm font-medium text-foreground">Dark Mode</div>
                <div className="mt-0.5 text-xs text-muted-foreground">Toggle between light and dark theme</div>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
            <div className="mt-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Language</div>
              <div className="flex gap-2">
                {['English', 'Pidgin', 'Yoruba', 'Igbo'].map(lang => (
                  <button key={lang} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${lang === 'English' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ─── Notifications Tab ─── */
function NotificationsTab() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [churnAlerts, setChurnAlerts] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [agentAlerts, setAgentAlerts] = useState(false);
  return (
    <Card className="border border-border bg-surface/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber" />
          <h3 className="font-display text-lg font-semibold">Notification Preferences</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Toggle enabled={emailAlerts} onToggle={() => setEmailAlerts(!emailAlerts)} label="Email Alerts" desc="Receive important alerts via email" />
        <Toggle enabled={pushAlerts} onToggle={() => setPushAlerts(!pushAlerts)} label="Push Notifications" desc="Browser push notifications for real-time events" />
        <Toggle enabled={churnAlerts} onToggle={() => setChurnAlerts(!churnAlerts)} label="Churn Risk Alerts" desc="Get notified when customer health drops below threshold" />
        <Toggle enabled={paymentAlerts} onToggle={() => setPaymentAlerts(!paymentAlerts)} label="Payment Confirmations" desc="Instant notification when payments are received" />
        <Toggle enabled={agentAlerts} onToggle={() => setAgentAlerts(!agentAlerts)} label="Agent Action Digest" desc="Hourly summary of all agent decisions" />
      </CardContent>
    </Card>
  );
}

/* ─── Agents Tab ─── */
function AgentsTab() {
  const agents = [
    { name: 'Collections Agent', auto: true, confidence: 85 },
    { name: 'Fulfillment Agent', auto: true, confidence: 90 },
    { name: 'Churn Detection Agent', auto: false, confidence: 75 },
    { name: 'Deal Intelligence Agent', auto: false, confidence: 80 },
    { name: 'Revenue Pulse Agent', auto: true, confidence: 70 },
    { name: 'Relationship Health Agent', auto: true, confidence: 60 },
  ];
  const [agentStates, setAgentStates] = useState(agents.map(a => ({ ...a })));

  return (
    <Card className="border border-border bg-surface/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-cyan" />
          <h3 className="font-display text-lg font-semibold">Agent Configuration</h3>
        </div>
        <p className="text-xs text-muted-foreground">Control auto-approval thresholds and agent behavior</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {agentStates.map((agent, idx) => (
          <div key={agent.name} className="rounded-xl border border-border/50 bg-background/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{agent.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Auto-approve when confidence ≥ {agent.confidence}%
                </div>
              </div>
              <Badge variant="outline" className={agent.auto ? 'border-emerald/40 text-emerald' : 'border-amber/40 text-amber'}>
                {agent.auto ? 'Auto' : 'Manual'}
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1 text-[10px] text-muted-foreground">
                <span>Confidence Threshold</span>
                <span className="font-mono">{agent.confidence}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={99}
                value={agent.confidence}
                onChange={(e) => {
                  const newStates = [...agentStates];
                  newStates[idx] = { ...newStates[idx], confidence: Number(e.target.value) };
                  setAgentStates(newStates);
                }}
                className="w-full accent-primary"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── Integrations Tab ─── */
function IntegrationsTab() {
  const integrations = [
    { name: 'WhatsApp Business API', status: 'connected', icon: MessageCircle, desc: 'Primary messaging channel' },
    { name: 'Paystack', status: 'connected', icon: Zap, desc: 'Payment processing & verification' },
    { name: 'Google Sheets', status: 'disconnected', icon: Globe, desc: 'Export reports to spreadsheets' },
    { name: 'Slack', status: 'disconnected', icon: Smartphone, desc: 'Team notifications via Slack' },
  ];
  return (
    <Card className="border border-border bg-surface/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald" />
          <h3 className="font-display text-lg font-semibold">Integrations</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {integrations.map(int => {
          const Icon = int.icon;
          return (
            <div key={int.name} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{int.name}</div>
                  <div className="text-xs text-muted-foreground">{int.desc}</div>
                </div>
              </div>
              <button className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${int.status === 'connected' ? 'border border-emerald/40 bg-emerald/10 text-emerald' : 'border border-border bg-surface/60 text-muted-foreground hover:text-foreground'}`}>
                {int.status === 'connected' ? 'Connected' : 'Connect'}
              </button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─── Security Tab ─── */
function SecurityTab() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp}>
        <Card className="border border-border bg-surface/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-rose" />
              <h3 className="font-display text-lg font-semibold">Account Security</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-4">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Password</div>
                  <div className="text-xs text-muted-foreground">Last changed 30 days ago</div>
                </div>
              </div>
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">Change</button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Two-Factor Authentication</div>
                  <div className="text-xs text-muted-foreground">Add extra security to your account</div>
                </div>
              </div>
              <Badge variant="outline" className="border-amber/40 text-amber">Off</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Active Sessions</div>
                  <div className="text-xs text-muted-foreground">1 active session on this device</div>
                </div>
              </div>
              <button className="rounded-lg border border-rose/30 bg-rose/5 px-3 py-1.5 text-xs font-medium text-rose transition-colors hover:bg-rose/10">Revoke All</button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="border border-border bg-surface/60 backdrop-blur-sm">
          <CardHeader>
            <h3 className="font-display text-lg font-semibold">Recent Login Activity</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { device: 'Chrome · Windows', ip: '102.89.xx.xx', time: 'Now', current: true },
                { device: 'Safari · iPhone', ip: '102.89.xx.xx', time: '2 hours ago', current: false },
                { device: 'Chrome · MacOS', ip: '41.58.xx.xx', time: 'Yesterday', current: false },
              ].map((session, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{session.device}</div>
                    <div className="text-xs text-muted-foreground">IP: {session.ip}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{session.time}</div>
                    {session.current && <Badge variant="outline" className="mt-0.5 border-emerald/40 text-emerald text-[10px]">Current</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
