import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@/lib/api';
import { mapCustomer } from '@/lib/api-mappers';
import type { Customer } from '@/types';

const RING: Record<string, string> = {
  low: 'oklch(0.74 0.18 160)',
  medium: 'oklch(0.78 0.16 75)',
  high: 'oklch(0.68 0.21 20)',
  critical: 'oklch(0.65 0.22 25)',
};

function CustomerNode({ data }: NodeProps) {
  const c = data as unknown as Customer;
  const initials = c.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const ring = RING[c.churnRisk] || RING.low;
  return (
    <motion.div className="group relative flex flex-col items-center">
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-surface font-display text-base font-semibold text-foreground transition-transform group-hover:scale-110"
        style={{ border: `3px solid ${ring}` }}
      >
        {initials}
      </motion.div>
      <div className="mt-2 max-w-[120px] truncate text-center text-xs font-medium text-foreground">{c.name}</div>
      <div className="font-mono text-[10px] text-muted-foreground">health · {c.healthScore}</div>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = { customer: CustomerNode };

export function RelationshipGraph() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    api.get('/api/customers/').then((data) => {
      const rows = (data || [])
        .map(mapCustomer)
        .filter((c) => c.name && c.name !== '+' && !/^\+?\d+$/.test(c.name.trim()));
      setCustomers(rows);
    }).catch(() => {});
  }, []);

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = customers.slice(0, 8).map((c, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      return {
        id: c.id,
        type: 'customer',
        position: { x: col * 200 + 40, y: row * 160 + 40 },
        data: c as unknown as Record<string, unknown>,
      };
    });
    return { nodes: ns, edges: [] as Edge[] };
  }, [customers]);

  if (customers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading customer graph…
      </div>
    );
  }

  return (
    <motion.div className="h-full w-full rounded-2xl border border-border bg-background/40">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
        <Background gap={20} />
        <Controls />
      </ReactFlow>
    </motion.div>
  );
}
