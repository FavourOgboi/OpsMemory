import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fadeUp, staggerContainer } from '@/lib/motion-variants';
import { formatNaira } from '@/lib/format-utils';
import { api } from '@/lib/api';
import { mapMessage } from '@/lib/api-mappers';
import type { Message } from '@/types';

export function ConversationTab({ customerId }: { customerId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = () => {
    api
      .get(`/api/conversations?customer_id=${customerId}`)
      .then((convs: any[]) => {
        if (convs && convs.length > 0) {
          return api.get(`/api/conversations/${convs[0].id}`);
        }
        return null;
      })
      .then((detail: any) => {
        const rows = detail?.messages ?? detail?.data?.messages;
        if (rows?.length) {
          setMessages(rows.map(mapMessage));
        } else {
          setMessages([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load conversation:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [customerId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading conversation…</div>;
  }

  if (messages.length === 0) {
    return <div className="text-sm text-muted-foreground">No conversation captured yet.</div>;
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-5">
      {messages.map((message) => (
        <motion.div
          key={message.id}
          variants={fadeUp}
          className={`relative flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
        >
          <div className="max-w-[75%] space-y-2">
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm ${
                message.direction === 'outbound'
                  ? 'rounded-tr-sm border border-emerald/30 bg-emerald/20 text-foreground'
                  : 'rounded-tl-sm border border-border bg-surface text-foreground'
              }`}
            >
              {message.content}
            </div>
            {message.direction === 'outbound' && message.sentBy && (
              <div className="px-1">
                <span className="inline-flex items-center rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-mono text-[10px] text-cyan">
                  {message.sentBy}
                </span>
              </div>
            )}

            {message.extractedData && (
              <div className="flex flex-wrap gap-1.5 md:absolute md:left-[calc(100%+16px)] md:top-1 md:w-56">
                <Chip label="intent" value={message.extractedData.intent} />
                {message.extractedData.amount && <Chip label="amount" value={formatNaira(message.extractedData.amount)} />}
                {message.extractedData.orderRef && <Chip label="order" value={message.extractedData.orderRef} />}
                <Chip label="confidence" value={`${Math.round(message.extractedData.confidence * 100)}%`} />
              </div>
            )}

            <div className="px-1 font-mono text-[10px] text-muted-foreground">
              {format(new Date(message.timestamp), 'MMM d, HH:mm')}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-2 py-0.5 font-mono text-[10px] shadow-sm backdrop-blur">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
