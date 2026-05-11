'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  HelpCircle,
  FileText,
  Upload,
  Eye,
  X,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '@/store/useTheme';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CatalogForm } from './CatalogForm';
import { FAQForm } from './FAQForm';
import { PolicyForm } from './PolicyForm';
import { DocumentUploader } from './DocumentUploader';
import { KnowledgeList } from './KnowledgeList';

type Tab = 'catalog' | 'faq' | 'policy' | 'upload' | 'view';

// Demo data for initial display
const DEMO_KNOWLEDGE = [
  {
    id: '1',
    title: 'iPhone 15 Pro',
    content: 'Premium smartphone with advanced camera system, A17 Pro chip, titanium design. Available in 256GB, 512GB, 1TB variants.',
    category: 'catalog',
    metadata: { price: '450000', unit: 'piece', sku: 'IPHONE-15-PRO-256' },
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'What is our return policy?',
    content: 'Question: What is our return policy?\nAnswer: We offer 7-day money-back guarantee for unopened items. 30-day replacement for defects. No questions asked returns within 48 hours of purchase.',
    category: 'faq',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Delivery Policy',
    content: 'Free delivery on orders above ₦50,000 within Lagos. Nationwide delivery 2-5 business days via courier. Track your order using the tracking code in your receipt.',
    category: 'policy',
    created_at: new Date().toISOString(),
  },
];

export function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState<Tab>('view');
  const [knowledge, setKnowledge] = useState(DEMO_KNOWLEDGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isDark } = useTheme();

  // Fetch knowledge entries on mount
  const fetchKnowledge = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch from API, but fall back to demo data if not available
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const response = await fetch('/api/knowledge/', {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setKnowledge(data);
      } else {
        // Keep demo data if API fails
        setKnowledge(DEMO_KNOWLEDGE);
      }
    } catch (err) {
      // Silently fail and keep demo data
      console.log('Using demo knowledge data');
      setKnowledge(DEMO_KNOWLEDGE);
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

  const tabs = [
    {
      id: 'catalog',
      label: 'Add Product',
      icon: Package,
      description: 'Add products, services, and pricing',
    },
    {
      id: 'faq',
      label: 'Add FAQ',
      icon: HelpCircle,
      description: 'Add common questions and answers',
    },
    {
      id: 'policy',
      label: 'Add Policy',
      icon: FileText,
      description: 'Add delivery, payment, or return policies',
    },
    {
      id: 'upload',
      label: 'Upload Document',
      icon: Upload,
      description: 'Upload PDF, TXT, or Markdown documents',
    },
    {
      id: 'view',
      label: 'View All',
      icon: Eye,
      description: 'See all knowledge base entries',
    },
  ];

  return (
    <div className={`flex-1 overflow-hidden flex flex-col ${
      isDark 
        ? 'bg-gradient-to-b from-slate-950 to-slate-900' 
        : 'bg-gradient-to-b from-slate-50 to-slate-100'
    }`}>
      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Knowledge Base</h1>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            Train your AI agents with products, FAQs, policies, and documents
          </p>
        </div>

        {/* Alerts */}
        {successMessage && (
          <Alert className={`mb-6 ${isDark ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-emerald-300/50 bg-emerald-50'}`}>
            <AlertCircle className={`h-4 w-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <AlertDescription className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className={`mb-6 ${isDark ? 'border-rose-500/50 bg-rose-500/10' : 'border-rose-300/50 bg-rose-50'}`}>
            <AlertCircle className={`h-4 w-4 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
            <AlertDescription className={isDark ? 'text-rose-400' : 'text-rose-700'}>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`relative p-4 rounded-lg border transition-all ${
                  isActive
                    ? isDark 
                      ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : 'border-cyan-400/60 bg-cyan-50 shadow-lg shadow-cyan-400/20'
                    : isDark
                      ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <p className={`text-sm font-medium text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {tab.label}
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tab.description}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {loading && activeTab === 'view' && (
            <Card className={`border p-8 flex items-center justify-center ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
              <Loader className={`w-8 h-8 animate-spin ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
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
    </div>
  );
}
