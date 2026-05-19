import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, RefreshCw, Sparkles, Star, Globe, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { fadeUp, staggerContainer, typingDot } from '@/lib/motion-variants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Recommendation {
  rank: number;
  name: string;
  stars?: number;
  reasoning: string;
}

interface SessionState {
  session_id: string;
  recommendations: Recommendation[];
  is_cold_start: boolean;
  cross_domain: boolean;
  source: string;
  turn: number;
}

// ── Suggestion chips ──────────────────────────────────────────────────────────

const CHIPS = [
  { label: 'Best Nigerian restaurant nearby', source: 'yelp', category: 'restaurants' },
  { label: 'Abeg, something affordable and spicy', source: 'yelp', category: 'restaurants' },
  { label: 'Great coffee shop with WiFi', source: 'yelp', category: 'coffee' },
  { label: 'Where can I get good suya?', source: 'yelp', category: 'food' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripJsonBlock(text: string): string {
  // Remove ```json ... ``` blocks from display
  return text.replace(/```json[\s\S]*?```/g, '').trim();
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          variants={typingDot}
          animate="animate"
          transition={{ delay: i * 0.2 }}
          className="block h-2 w-2 rounded-full bg-muted-foreground/60"
        />
      ))}
    </div>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl border border-border/50 bg-surface/50 p-4 hover:border-border/80 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-mono text-xs font-bold text-amber-400">
          {rec.rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{rec.name}</span>
            {rec.stars && (
              <span className="flex items-center gap-0.5 font-mono text-[10px] text-amber-400">
                <Star className="h-3 w-3 fill-amber-400" />
                {rec.stars.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{rec.reasoning}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RecommendationEngine() {
  const [source, setSource] = useState<'yelp'>('yelp');
  const [category, setCategory] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSession = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg = text.trim();
      setInput('');
      setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
      setLoading(true);
      setTyping(true);

      try {
        let data: SessionState & { agent_response: string };

        if (!session) {
          data = await api.post('/api/recommend/start', {
            message: userMsg,
            source,
            category: category || undefined,
          });
        } else {
          data = await api.post('/api/recommend/continue', {
            session_id: session.session_id,
            message: userMsg,
          });
        }

        setTyping(false);
        const displayText = stripJsonBlock(data.agent_response);
        setMessages((prev) => [...prev, { role: 'assistant', content: displayText }]);
        setSession({
          session_id: data.session_id,
          recommendations: data.recommendations,
          is_cold_start: data.is_cold_start,
          cross_domain: data.cross_domain,
          source: data.source,
          turn: data.turn,
        });
        if (data.recommendations?.length) {
          setRecs(data.recommendations);
        }
      } catch (e: any) {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Sorry, something went wrong: ${e?.message || 'unknown error'}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [session, source, category, loading]
  );

  const reset = () => {
    setMessages([]);
    setSession(null);
    setRecs([]);
    setInput('');
    setTyping(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSession(input);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-4 py-4 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              task b · recommendation engine
            </div>
            <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">
              AI Recommendations
            </h1>
          </motion.div>

          {/* Config bar */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Source */}
            <div className="flex rounded-lg border border-border bg-surface/60 p-0.5">
              <button
                className="rounded-md px-3 py-1 text-xs font-medium bg-purple-600 text-white shadow-sm"
              >
                🍽️ Yelp
              </button>
            </div>

            {/* Category input */}
            {!session && (
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (e.g. restaurants)"
                className="rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            )}

            {/* Session badges */}
            {session && (
              <div className="flex items-center gap-2">
                {session.is_cold_start && (
                  <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] uppercase text-cyan-400 tracking-wider">
                    Cold Start
                  </span>
                )}
                {session.cross_domain && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] uppercase text-amber-400 tracking-wider">
                    <Globe className="h-2.5 w-2.5" /> Cross-Domain
                  </span>
                )}
                <span className="font-mono text-[10px] text-muted-foreground">
                  Turn {session.turn}
                </span>
              </div>
            )}

            {session && (
              <button
                onClick={reset}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" /> New session
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:px-8">
          {messages.length === 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <Sparkles className="h-10 w-10 text-purple-400 mb-4" />
              <h3 className="font-display text-lg font-semibold">What are you looking for?</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Tell me what you want — restaurant, book, product. I'll personalise based on your style.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {CHIPS.map((chip) => (
                  <motion.button
                    key={chip.label}
                    variants={fadeUp}
                    onClick={() => {
                      setSource('yelp');
                      setCategory(chip.category);
                      handleSession(chip.label);
                    }}
                    className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs text-purple-300 transition hover:bg-purple-500/20"
                  >
                    {chip.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-sm'
                      : 'bg-surface border border-border/60 text-foreground rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 flex justify-start"
            >
              <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-surface">
                <TypingIndicator />
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3 sm:px-8">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type your request… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 max-h-32 overflow-y-auto"
            />
            <button
              onClick={() => handleSession(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg transition hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Recommendations panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {recs.length > 0 && (
          <motion.aside
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden w-80 shrink-0 flex-col border-l border-border bg-sidebar xl:flex"
          >
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <div className="font-display text-sm font-semibold">Recommendations</div>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {session?.source || 'yelp'} · {recs.length} results
              </p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                {recs.map((rec) => (
                  <RecCard key={rec.rank} rec={rec} />
                ))}
              </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
