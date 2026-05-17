'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  HelpCircle,
  FileText,
  Trash2,
  Filter,
  Loader,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  source_file?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface KnowledgeListProps {
  entries: KnowledgeEntry[];
  onDelete: () => void;
  onError: (message: string) => void;
}

const CATEGORY_CONFIG = {
  catalog: { icon: Package, color: 'bg-blue-500/10 border-blue-500/30' },
  faq: { icon: HelpCircle, color: 'bg-purple-500/10 border-purple-500/30' },
  policy: { icon: FileText, color: 'bg-amber-500/10 border-amber-500/30' },
  document: { icon: FileText, color: 'bg-cyan-500/10 border-cyan-500/30' },
  general: { icon: FileText, color: 'bg-slate-500/10 border-slate-500/30' },
};

export function KnowledgeList({
  entries,
  onDelete,
  onError,
}: KnowledgeListProps) {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (entryId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this entry? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeleting(entryId);
    try {
      await api.delete(`/api/knowledge/${entryId}`);
      onDelete();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setDeleting(null);
    }
  };

  const filteredEntries = filterCategory
    ? entries.filter((e) => e.category === filterCategory)
    : entries;

  const categories = [...new Set(entries.map((e) => e.category))];

  if (entries.length === 0) {
    return (
      <Alert className="border-slate-600 bg-slate-800/50">
        <AlertDescription className="text-slate-300">
          No knowledge base entries yet. Start by adding products, FAQs, or
          uploading documents.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-slate-400 text-sm font-semibold flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter by:
        </span>
        <motion.button
          onClick={() => setFilterCategory(null)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            filterCategory === null
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          whileHover={{ scale: 1.05 }}
        >
          All ({entries.length})
        </motion.button>
        {categories.map((cat) => {
          const count = entries.filter((e) => e.category === cat).length;
          return (
            <motion.button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all capitalize ${
                filterCategory === cat
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {cat} ({count})
            </motion.button>
          );
        })}
      </div>

      {/* Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.map((entry, idx) => {
          const config =
            CATEGORY_CONFIG[
              entry.category as keyof typeof CATEGORY_CONFIG
            ] || CATEGORY_CONFIG.general;
          const Icon = config.icon;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className={`${config.color} border p-4 hover:shadow-lg transition-all overflow-hidden`}
              >
                {entry.category === 'catalog' && entry.metadata?.image_url && (
                  <img
                    src={String(entry.metadata.image_url)}
                    alt={entry.title || 'Product'}
                    className="mb-3 h-32 w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-white">
                        {entry.title || entry.content.substring(0, 50)}
                      </h3>
                      <p className="text-xs text-slate-400 capitalize">
                        {entry.category}
                        {entry.source_file && ` • ${entry.source_file}`}
                        {entry.metadata?.sku && ` • ${entry.metadata.sku}`}
                      </p>
                      {entry.category === 'catalog' && entry.metadata?.price != null && (
                        <p className="mt-1 text-sm font-semibold text-emerald-400">
                          ₦{Number(entry.metadata.price).toLocaleString()}
                          {entry.metadata.unit ? ` / ${entry.metadata.unit}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    className="text-slate-400 hover:text-rose-400 disabled:opacity-50 p-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {deleting === entry.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>

                <p className="text-sm text-slate-300 line-clamp-3 mb-3">
                  {entry.content}
                </p>

                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-600/50">
                    {Object.entries(entry.metadata)
                      .filter(([key]) => !['image_url'].includes(key))
                      .map(([key, value]) => (
                      <div key={key}>
                        <span className="font-semibold">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-3">
                  Added {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredEntries.length === 0 && (
        <Alert className="border-slate-600 bg-slate-800/50">
          <AlertDescription className="text-slate-300">
            No entries in this category.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
