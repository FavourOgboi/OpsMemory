import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, RefreshCw, Globe, MessageSquare, Loader2, Zap, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { fadeUp, staggerContainer, scaleIn } from '@/lib/motion-variants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  external_id: string;
  average_stars: number;
  review_count: number;
  behavior_profile: {
    tone?: string;
    language_style?: string;
    writing_personality?: string;
    common_praises?: string[];
    common_complaints?: string[];
    nigerian_context?: boolean;
  } | null;
  nigerian_signals: boolean;
}

interface Item {
  id: string;
  name: string;
  category: string;
  average_stars: number;
  review_count: number;
  description?: string;
}

interface GeneratedReview {
  predicted_stars: number;
  review_text: string;
  language: string;
  reasoning: string;
  confidence: number;
  nigerian_mode?: boolean;
  item_name?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4"
          fill={i < Math.round(value) ? '#F59E0B' : 'transparent'}
          stroke={i < Math.round(value) ? '#F59E0B' : '#6B7280'}
        />
      ))}
      <span className="ml-1.5 text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  );
}

function ToneBadge({ tone }: { tone?: string }) {
  const map: Record<string, string> = {
    enthusiastic: 'bg-emerald-500/15 text-emerald-400',
    detailed_critic: 'bg-rose-500/15 text-rose-400',
    brief: 'bg-slate-500/15 text-slate-400',
    storyteller: 'bg-cyan-500/15 text-cyan-400',
    balanced: 'bg-amber-500/15 text-amber-400',
  };
  const cls = map[tone || 'balanced'] || map.balanced;
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cls}`}>
      {tone || 'balanced'}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReviewIntelligence() {
  const [source, setSource] = useState<'yelp'>('yelp');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [forceNigerian, setForceNigerian] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [result, setResult] = useState<GeneratedReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedReview[]>([]);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const [u, i, h] = await Promise.all([
        api.get(`/api/reviews/users?source=${source}&limit=12`),
        api.get(`/api/reviews/items?source=${source}&limit=12`),
        api.get('/api/reviews/generated?limit=5'),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setItems(Array.isArray(i) ? i : []);
      setHistory(Array.isArray(h) ? h : []);
      setSelectedUser(null);
      setSelectedItem(null);
    } catch {
      // Silently handle — could be no data yet
    } finally {
      setFetching(false);
    }
  }, [source]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generate = async () => {
    if (!selectedUser || !selectedItem) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.post('/api/reviews/simulate/profile', {
        user_id: selectedUser.id,
        item_id: selectedItem.id,
        force_nigerian: forceNigerian,
      });
      setResult(data);
      setHistory((prev) => [data, ...prev.slice(0, 4)]);
    } catch (e: any) {
      setError(e?.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const langColor = (lang: string) =>
    lang === 'pidgin' ? 'bg-emerald-500/20 text-emerald-400'
    : lang === 'mixed' ? 'bg-amber-500/20 text-amber-400'
    : 'bg-slate-500/20 text-slate-400';

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          task a · review intelligence
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Review Simulation Engine
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a user profile and item to generate an AI-simulated review that mirrors how that person actually writes.
        </p>
      </motion.header>

      {/* Source toggle */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mt-6 flex items-center gap-3">
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Data source</span>
        <div className="flex rounded-lg border border-border bg-surface/60 p-0.5">
          <button
            className="rounded-md px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground shadow-sm"
          >
            🍽️ Yelp
          </button>
        </div>
        <button
          onClick={fetchData}
          disabled={fetching}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <RefreshCw className={`h-3 w-3 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* No-data state */}
      {!fetching && users.length === 0 && (
        <motion.div
          variants={scaleIn} initial="hidden" animate="visible"
          className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border/50 bg-surface/40 p-12 text-center"
        >
          <AlertCircle className="mb-4 h-10 w-10 text-amber-400" />
          <h3 className="font-display text-lg font-semibold">No data yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Run the ingestion script to load Yelp data into the database.
          </p>
          <code className="mt-4 block rounded-lg bg-background px-4 py-2 font-mono text-xs text-emerald-400">
            python scripts/ingest_datasets.py --source yelp --limit 3000
          </code>
        </motion.div>
      )}

      {/* Selection grid */}
      {!fetching && users.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-6 grid gap-6 lg:grid-cols-2"
        >
          {/* Users */}
          <div>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              User Profiles ({users.length})
            </div>
            <div className="space-y-2">
              {users.map((u) => {
                const profile = u.behavior_profile || {};
                const selected = selectedUser?.id === u.id;
                return (
                  <motion.button
                    key={u.id}
                    variants={fadeUp}
                    onClick={() => setSelectedUser(selected ? null : u)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                        : 'border-border bg-surface/50 hover:border-border/80 hover:bg-surface/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-foreground truncate">
                            {u.external_id.slice(0, 16)}...
                          </span>
                          {u.nigerian_signals && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] uppercase text-emerald-400 tracking-wider">
                              🇳🇬 Pidgin
                            </span>
                          )}
                          {profile.tone && <ToneBadge tone={profile.tone} />}
                        </div>
                        {profile.writing_personality && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                            {profile.writing_personality}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <StarRating value={u.average_stars} />
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {u.review_count} reviews
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Items / Businesses ({items.length})
            </div>
            <div className="space-y-2">
              {items.map((item) => {
                const selected = selectedItem?.id === item.id;
                return (
                  <motion.button
                    key={item.id}
                    variants={fadeUp}
                    onClick={() => setSelectedItem(selected ? null : item)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-purple-500 bg-purple-500/10 shadow-sm'
                        : 'border-border bg-surface/50 hover:border-border/80 hover:bg-surface/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground truncate">
                          {item.category}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <StarRating value={item.average_stars} />
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {item.review_count.toLocaleString()} reviews
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Controls */}
      {!fetching && users.length > 0 && (
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="mt-6 flex flex-wrap items-center gap-4"
        >
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <div
              onClick={() => setForceNigerian(!forceNigerian)}
              className={`relative h-5 w-9 rounded-full transition-colors ${forceNigerian ? 'bg-emerald-500' : 'bg-border'}`}
            >
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${forceNigerian ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-muted-foreground">Force Nigerian Pidgin 🇳🇬</span>
          </label>

          <button
            onClick={generate}
            disabled={!selectedUser || !selectedItem || loading}
            className="ml-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Zap className="h-4 w-4" /> Generate Review</>
            )}
          </button>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div variants={scaleIn} initial="hidden" animate="visible" className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-400">
          {error}
        </motion.div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mt-8 rounded-2xl border border-emerald-500/30 bg-surface/60 p-6 shadow-lg backdrop-blur-sm"
          >
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="font-display text-base font-semibold">Generated Review</div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${langColor(result.language)}`}>
                  {result.language === 'pidgin' ? '🇳🇬 Pidgin' : result.language === 'mixed' ? '🔀 Mixed' : '🌐 English'}
                </span>
                {result.item_name && (
                  <span className="text-xs text-muted-foreground">{result.item_name}</span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <StarRating value={result.predicted_stars} />
            </div>

            <blockquote className="font-mono text-sm leading-relaxed text-foreground/90 border-l-2 border-emerald-500/50 pl-4">
              {result.review_text}
            </blockquote>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-background/40 border border-border/50 p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Reasoning</div>
                <div className="mt-1 text-xs text-foreground/80">{result.reasoning}</div>
              </div>
              <div className="rounded-lg bg-background/40 border border-border/50 p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-border">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${((result.confidence || 0.75) * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-emerald-400">
                    {((result.confidence || 0.75) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mt-8">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Recent Simulations
          </div>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-surface/40 p-4">
                <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                  <StarRating value={h.predicted_stars} />
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${langColor(h.language)}`}>
                    {h.language}
                  </span>
                </div>
                <p className="text-xs text-foreground/70 line-clamp-2">{h.review_text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
