import { createFileRoute, notFound } from '@tanstack/react-router';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { EntityHeader } from '@/components/entity/EntityHeader';
import { ConversationTab } from '@/components/entity/ConversationTab';
import { TimelineTab } from '@/components/entity/TimelineTab';
import { InsightsTab } from '@/components/entity/InsightsTab';
import { getCustomer } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/customers/$id')({
  loader: ({ params }) => {
    const customer = getCustomer(params.id);
    if (!customer) throw notFound();
    return { customer };
  },
  component: EntityPage,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Customer not found.</div>,
});

const TABS = ['Conversation', 'Timeline', 'Insights'] as const;

function EntityPage() {
  const { customer } = Route.useLoaderData();
  const [tab, setTab] = useState<typeof TABS[number]>('Conversation');

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <EntityHeader customer={customer} />
      <div className="px-8 pt-4">
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
      </div>
      <div className="px-8 py-6">
        {tab === 'Conversation' && <ConversationTab customerId={customer.id} />}
        {tab === 'Timeline' && <TimelineTab customerId={customer.id} />}
        {tab === 'Insights' && <InsightsTab customerId={customer.id} />}
      </div>
    </div>
  );
}
