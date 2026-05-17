import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EntityHeader } from '@/components/entity/EntityHeader';
import { ConversationTab } from '@/components/entity/ConversationTab';
import { TimelineTab } from '@/components/entity/TimelineTab';
import { InsightsTab } from '@/components/entity/InsightsTab';
import { api } from '@/lib/api';
import { mapCustomer } from '@/lib/api-mappers';
import type { Customer } from '@/types';

export const Route = createFileRoute('/dashboard/customers/$id')({
  component: EntityPage,
});

const TABS = ['Conversation', 'Timeline', 'Insights'] as const;

function EntityPage() {
  const { id } = Route.useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>('Conversation');

  useEffect(() => {
    api
      .get(`/api/customers/${id}`)
      .then((raw) => setCustomer(mapCustomer(raw)))
      .catch(() => setCustomer(null));
  }, [id]);

  if (!customer) {
    return <motion.div className="p-8 text-sm text-muted-foreground">Loading customer…</motion.div>;
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <EntityHeader customer={customer} />
      <motion.div className="px-8 pt-4">
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
              {tab === t && (
                <motion.div
                  layoutId="entity-tab"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </motion.div>
      <div className="px-8 py-6">
        {tab === 'Conversation' && <ConversationTab customerId={customer.id} />}
        {tab === 'Timeline' && <TimelineTab customerId={customer.id} />}
        {tab === 'Insights' && <InsightsTab customerId={customer.id} />}
      </div>
    </div>
  );
}
