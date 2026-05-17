import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { SUGGESTED_QUERIES } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { fadeUp } from '@/lib/motion-variants';

type ChatMsg =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; tableData: { headers: string[]; rows: string[][] } | null }
  | { role: 'thinking' }
  | { role: 'error'; content: string };

function getDemoRole(): string {
  if (typeof window === 'undefined') return 'ceo';
  return localStorage.getItem('opsmemory-demo-role') || 'ceo';
}

export function IntelligenceChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: q }, { role: 'thinking' }]);
    setInput('');
    try {
      const res = await api.post('/api/chat/query', {
        question: q,
        role: getDemoRole(),
      });
      setMessages((m) => {
        const copy = m.slice(0, -1);
        return [...copy, { role: 'assistant', content: res.answer, tableData: res.table_data || null }];
      });
    } catch (err: any) {
      setMessages((m) => {
        const copy = m.slice(0, -1);
        return [...copy, { role: 'error', content: err.message || 'Something went wrong. Try again.' }];
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> intelligence · chat
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Ask your business anything</h1>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Suggested · for {getDemoRole()}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SUGGESTED_QUERIES[getDemoRole() as keyof typeof SUGGESTED_QUERIES]?.map((q) => (
                <motion.button
                  key={q}
                  whileHover={{ y: -2 }}
                  onClick={() => send(q)}
                  className="rounded-xl border border-border bg-surface/60 p-4 text-left text-sm text-foreground transition-colors hover:bg-accent/50"
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div key={i} variants={fadeUp} initial="hidden" animate="visible" className="flex gap-3">
                  {m.role === 'user' ? (
                    <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                      {m.content}
                    </div>
                  ) : m.role === 'thinking' ? (
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-surface/60 px-4 py-3 font-mono text-xs text-muted-foreground">
                      <span>Checking records</span>
                      <span className="flex gap-1">
                        {[0, 1, 2].map((d) => (
                          <motion.span key={d} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}>·</motion.span>
                        ))}
                      </span>
                    </div>
                  ) : m.role === 'error' ? (
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[90%] space-y-3">
                      <div className="rounded-2xl rounded-tl-sm border border-border bg-surface/60 px-4 py-3 text-sm text-foreground">
                        {m.content}
                      </div>
                      {m.tableData && (
                        <div className="overflow-hidden rounded-2xl border border-border bg-surface/40">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-accent/30">
                                {m.tableData.headers.map((h) => (
                                  <th key={h} className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.tableData.rows.map((row, ri) => (
                                <tr key={ri} className="border-b border-border/50 last:border-0">
                                  {row.map((c, ci) => <td key={ci} className="px-4 py-2.5 font-mono text-xs">{c}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="border-t border-border p-4"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-border bg-surface/60 p-2 focus-within:border-primary/50 focus-within:shadow-glow transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about customers, payments, agents…"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" className="rounded-xl bg-primary p-2.5 text-primary-foreground shadow-glow disabled:opacity-50" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
