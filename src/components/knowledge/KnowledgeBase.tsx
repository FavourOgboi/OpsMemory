'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  HelpCircle,
  FileText,
  Upload,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Brain,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CatalogForm } from './CatalogForm';
import { FAQForm } from './FAQForm';
import { PolicyForm } from './PolicyForm';
import { DocumentUploader } from './DocumentUploader';
import { KnowledgeList } from './KnowledgeList';
import { api } from '@/lib/api';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';
import { useTheme } from '@/store/useTheme';

type Tab = 'catalog' | 'faq' | 'policy' | 'upload' | 'view';

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const TABS = [
  { id: 'catalog' as Tab, label: 'Products',       icon: Package,    desc: 'Products & pricing' },
  { id: 'faq'     as Tab, label: 'FAQs',           icon: HelpCircle, desc: 'Common questions'   },
  { id: 'policy'  as Tab, label: 'Policies',       icon: FileText,   desc: 'Delivery & returns'  },
  { id: 'upload'  as Tab, label: 'Upload',         icon: Upload,     desc: 'PDF, TXT, Markdown' },
  { id: 'view'    as Tab, label: 'All Entries',    icon: Eye,        desc: 'Browse & manage'    },
] as const;

export function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState<Tab>('view');
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isDark } = useTheme();

  const fetchKnowledge = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/knowledge/');
      const entries = data?.entries ?? data ?? [];
      setKnowledge(Array.isArray(entries) ? entries : []);
    } catch {
      setError('Could not load knowledge base. Is the backend running?');
      setKnowledge([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
    fetchKnowledge();
    setActiveTab('view');
  };

  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const categoryCount = (cat: string) =>
    knowledge.filter((e) => e.category === cat).length;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          knowledge · base
        </div>
        <div className="mt-1 flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Knowledge Base
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Train your AI agents with products, FAQs, policies, and documents
        </p>
      </motion.header>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-6 grid gap-4 sm:grid-cols-4"
      >
        {[
          { label: 'Products',  value: categoryCount('catalog'),  color: 'text-emerald' },
          { label: 'FAQs',      value: categoryCount('faq'),      color: 'text-cyan'    },
          { label: 'Policies',  value: categoryCount('policy'),   color: 'text-violet'  },
          { label: 'Documents', value: categoryCount('document'), color: 'text-amber'   },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <Card className="border border-border bg-surface/60 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </span>
              </CardHeader>
              <CardContent>
                <div className={`font-display text-2xl font-bold tracking-tight ${stat.color}`}>
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">entries</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Toast alerts ──────────────────────────────────────── */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 flex items-center gap-3 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald" />
            <span className="text-sm text-emerald">{successMessage}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 flex items-center gap-3 rounded-xl border border-rose/30 bg-rose/10 px-4 py-3"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose" />
            <span className="text-sm text-rose">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab strip ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/60 p-1 backdrop-blur-sm"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'view' && knowledge.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
                >
                  {knowledge.length}
                </Badge>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* ── Active tab description ────────────────────────────── */}
      <motion.div
        key={activeTab + '-desc'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-3 flex items-center gap-1.5"
      >
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {TABS.find((t) => t.id === activeTab)?.desc}
        </span>
      </motion.div>

      {/* ── Content area ─────────────────────────────────────── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-4 mb-8"
      >
        {/* Loading state for "view" tab */}
        {loading && activeTab === 'view' && (
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {activeTab === 'catalog' && (
          <CatalogForm onSuccess={handleSuccess} onError={handleError} isDark={isDark} />
        )}
        {activeTab === 'faq' && (
          <FAQForm onSuccess={handleSuccess} onError={handleError} isDark={isDark} />
        )}
        {activeTab === 'policy' && (
          <PolicyForm onSuccess={handleSuccess} onError={handleError} isDark={isDark} />
        )}
        {activeTab === 'upload' && (
          <DocumentUploader onSuccess={handleSuccess} onError={handleError} isDark={isDark} />
        )}
        {activeTab === 'view' && !loading && (
          <KnowledgeList
            entries={knowledge}
            onDelete={fetchKnowledge}
            onError={handleError}
            isDark={isDark}
          />
        )}
      </motion.div>
    </div>
  );
}
