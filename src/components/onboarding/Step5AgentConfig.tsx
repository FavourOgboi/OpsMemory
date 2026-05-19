import { motion } from 'framer-motion';
import { useOnboarding } from '@/store/useOnboarding';

const LANGUAGES = [
  { id: 'english', label: 'English', enabled: true },
  { id: 'pidgin', label: 'Nigerian Pidgin', enabled: true },
  { id: 'yoruba', label: 'Yoruba', enabled: true },
  { id: 'igbo', label: 'Igbo', enabled: true },
  { id: 'hausa', label: 'Hausa (coming soon)', enabled: false },
];

export function Step5AgentConfig() {
  const { dealThreshold, autoReplyEnabled, agentLanguages, setField } = useOnboarding();

  const toggleLang = (id: string) => {
    const current = agentLanguages;
    if (current.includes(id)) {
      setField('agentLanguages', current.filter((l: string) => l !== id));
    } else {
      setField('agentLanguages', [...current, id]);
    }
  };

  return (
    <div>
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }} className="mb-6 text-center text-4xl">🤖</motion.div>
      <h2 className="text-center text-2xl font-semibold text-foreground">Configure your agent.</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">Set how your agent behaves. You can change these anytime in Settings.</p>

      <div className="mt-8 space-y-8">
        {/* Deal threshold */}
        <div>
          <h3 className="text-sm font-semibold text-foreground">Deal Approval Threshold</h3>
          <p className="mt-1 text-xs text-muted-foreground">Any deal above this amount requires your personal approval.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">₦</span>
            <input type="text" value={dealThreshold.toLocaleString()} onChange={(e) => {
              const num = parseInt(e.target.value.replace(/,/g, ''), 10);
              if (!isNaN(num)) setField('dealThreshold', num);
            }}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>

        {/* Languages */}
        <div>
          <h3 className="text-sm font-semibold text-foreground">Agent Response Language</h3>
          <p className="mt-1 text-xs text-muted-foreground">Your agent responds in the customer's detected language.</p>
          <div className="mt-3 space-y-2">
            {LANGUAGES.map((lang) => (
              <label key={lang.id} className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition hover:bg-background ${!lang.enabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <div onClick={() => lang.enabled && toggleLang(lang.id)}
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition ${agentLanguages.includes(lang.id) ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                  {agentLanguages.includes(lang.id) && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="text-sm text-foreground">{lang.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Auto-reply */}
        <div>
          <h3 className="text-sm font-semibold text-foreground">Auto-Reply to Routine Messages</h3>
          <p className="mt-1 text-xs text-muted-foreground">Allow the agent to reply automatically to FAQs without your approval.</p>
          <div className="mt-3">
            <button onClick={() => setField('autoReplyEnabled', !autoReplyEnabled)}
              className={`relative h-7 w-12 rounded-full transition-colors ${autoReplyEnabled ? 'bg-emerald-500' : 'bg-[#334155]'}`}>
              <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${autoReplyEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="ml-3 text-sm text-muted-foreground">{autoReplyEnabled ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
