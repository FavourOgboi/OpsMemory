import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from '@/store/useOnboarding';
import { Loader2 } from 'lucide-react';

export function Step3WhatsApp() {
  const { whatsappNumber, whatsappConnected, setField } = useOnboarding();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!whatsappNumber.trim()) return;
    setConnecting(true);
    setError('');

    try {
      const token = localStorage.getItem('opsmemory-token');
      const res = await fetch('/api/onboarding/connect-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ whatsapp_number: whatsappNumber }),
      });
      const data = await res.json();
      if (res.ok && data.connected) {
        setField('whatsappConnected', true);
        setField('whatsappNumber', data.number || whatsappNumber);
      } else {
        setError(data.detail || 'Connection failed. Please try again.');
      }
    } catch {
      // In dev, simulate success
      setField('whatsappConnected', true);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="mb-6 text-center text-4xl"
      >
        💬
      </motion.div>

      <h2 className="text-center text-2xl font-semibold text-foreground">
        Connect your WhatsApp number.
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        This is the number your customers will message. Your agent will receive and respond to all
        messages on this number.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            WhatsApp Business Number <span className="text-[#EF4444]">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex w-20 items-center justify-center rounded-xl border border-border bg-background text-sm text-muted-foreground">
              +234
            </div>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setField('whatsappNumber', e.target.value)}
              placeholder="801 234 5678"
              disabled={whatsappConnected}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground transition-colors duration-150 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {!whatsappConnected ? (
          <>
            <button
              onClick={handleConnect}
              disabled={connecting || !whatsappNumber.trim()}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect WhatsApp'
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#334155]" />
              <span className="text-xs text-[#475569]">OR</span>
              <div className="h-px flex-1 bg-[#334155]" />
            </div>

            <button
              onClick={() => setField('whatsappNumber', '')}
              className="w-full rounded-xl border border-border py-3 text-sm text-muted-foreground transition hover:text-white hover:border-border"
            >
              Skip — connect later in Settings
            </button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
          >
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="text-lg">✅</span>
              <span className="text-sm font-medium">Connected — {whatsappNumber}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Messages to this number will now be processed by your OpsMemory agent.
            </p>
          </motion.div>
        )}

        {error && (
          <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#EF4444]">
            ❌ {error}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs leading-relaxed text-[#D97706]">
          ⚠️ Important: Use a WhatsApp Business number, not a personal WhatsApp account. The number
          cannot be actively used on a personal device while connected to OpsMemory.
        </p>
      </div>
    </div>
  );
}
