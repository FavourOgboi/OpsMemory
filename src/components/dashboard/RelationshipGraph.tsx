import { useMemo } from 'react';
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
import { CUSTOMERS, STAFF } from '@/lib/mock-data';
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
  const ring = RING[c.churnRisk];
  return (
    <div className="group relative flex flex-col items-center">
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-surface font-display text-base font-semibold text-foreground transition-transform group-hover:scale-110"
        style={{
          border: `3px solid ${ring}`,
          boxShadow: `0 0 0 0 ${ring}`,
          animation: c.churnRisk !== 'low' ? `pulse-ring 2.5s infinite` : undefined,
        }}
      >
        {initials}
      </div>
      <div className="mt-2 max-w-[120px] truncate text-center text-xs font-medium text-foreground">{c.name}</div>
      <div className="font-mono text-[10px] text-muted-foreground">health · {c.healthScore}</div>
      <style>{`@keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 ${ring}66; } 70% { box-shadow: 0 0 0 14px ${ring}00; } 100% { box-shadow: 0 0 0 0 ${ring}00; } }`}</style>
    </div>
  );
}

function StaffNode({ data }: NodeProps) {
  const s = data as { name: string; role: string };
  const initials = s.name.split(' ').map((n) => n[0]).join('');
  const isCEO = s.role === 'CEO';
  return (
    <div className="flex flex-col items-center">
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div
        className="flex h-16 w-16 items-center justify-center rounded-xl font-display text-sm font-semibold"
        style={{
          background: isCEO ? 'linear-gradient(135deg, oklch(0.78 0.16 175), oklch(0.66 0.21 295))' : 'oklch(0.28 0.03 260)',
          color: isCEO ? 'oklch(0.16 0.03 260)' : 'oklch(0.95 0.01 250)',
          border: '1px solid oklch(0.40 0.03 260)',
        }}
      >
        {initials}
      </div>
      <div className="mt-2 text-xs font-medium text-foreground">{s.name}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.role}</div>
    </div>
  );
}

function InvoiceNode({ data }: NodeProps) {
  const i = data as { ref: string; amount: number; status: 'paid' | 'overdue' };
  const color = i.status === 'overdue' ? 'oklch(0.68 0.21 20)' : 'oklch(0.74 0.18 160)';
  return (
    <div className="flex flex-col items-end">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div
        className="rounded-lg border bg-surface px-3 py-2 text-right font-mono"
        style={{ borderColor: color }}
      >
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{i.ref}</div>
        <div className="text-sm font-semibold text-foreground">₦{(i.amount / 1000).toFixed(0)}k</div>
        <div className="text-[10px] uppercase" style={{ color }}>{i.status}</div>
      </div>
    </div>
  );
}

const nodeTypes = { customer: CustomerNode, staff: StaffNode, invoice: InvoiceNode };

export function RelationshipGraph() {
  const nodes: Node[] = useMemo(
    () => [
      { id: 'c-001', type: 'customer', position: { x: 40, y: 60 }, data: CUSTOMERS[0] as unknown as Record<string, unknown> },
      { id: 'c-002', type: 'customer', position: { x: 40, y: 220 }, data: CUSTOMERS[1] as unknown as Record<string, unknown> },
      { id: 'c-003', type: 'customer', position: { x: 40, y: 380 }, data: CUSTOMERS[2] as unknown as Record<string, unknown> },
      { id: 'c-004', type: 'customer', position: { x: 40, y: 540 }, data: CUSTOMERS[3] as unknown as Record<string, unknown> },
      { id: 'u-ceo', type: 'staff', position: { x: 320, y: 0 }, data: STAFF[2] },
      { id: 'u-001', type: 'staff', position: { x: 320, y: 200 }, data: STAFF[0] },
      { id: 'u-002', type: 'staff', position: { x: 320, y: 440 }, data: STAFF[1] },
      { id: 'inv-001', type: 'invoice', position: { x: 580, y: 80 }, data: { ref: '#2841', amount: 150000, status: 'overdue' } },
      { id: 'inv-002', type: 'invoice', position: { x: 580, y: 280 }, data: { ref: '#2836', amount: 320000, status: 'overdue' } },
      { id: 'inv-003', type: 'invoice', position: { x: 580, y: 480 }, data: { ref: '#2877', amount: 95000, status: 'paid' } },
    ],
    []
  );

  const edges: Edge[] = useMemo(
    () => [
      { id: 'e-c1-u1', source: 'c-001', target: 'u-001', animated: true, style: { stroke: 'oklch(0.74 0.18 160)', strokeWidth: 2 } },
      { id: 'e-c2-u1', source: 'c-002', target: 'u-001', style: { stroke: 'oklch(0.50 0.02 260)', strokeWidth: 1.5 } },
      { id: 'e-c3-u2', source: 'c-003', target: 'u-002', animated: true, style: { stroke: 'oklch(0.78 0.16 75)', strokeWidth: 2 } },
      { id: 'e-c4-u2', source: 'c-004', target: 'u-002', style: { stroke: 'oklch(0.50 0.02 260)', strokeWidth: 1.5 } },
      { id: 'e-c1-inv1', source: 'c-001', target: 'inv-001', style: { stroke: 'oklch(0.68 0.21 20)', strokeWidth: 1, strokeDasharray: '4 4' } },
      { id: 'e-c3-inv2', source: 'c-003', target: 'inv-002', style: { stroke: 'oklch(0.68 0.21 20)', strokeWidth: 1, strokeDasharray: '4 4' } },
      { id: 'e-c4-inv3', source: 'c-004', target: 'inv-003', style: { stroke: 'oklch(0.74 0.18 160)', strokeWidth: 1 } },
      { id: 'e-u1-ceo', source: 'u-001', target: 'u-ceo', style: { stroke: 'oklch(0.40 0.03 260)', strokeWidth: 1 } },
      { id: 'e-u2-ceo', source: 'u-002', target: 'u-ceo', style: { stroke: 'oklch(0.40 0.03 260)', strokeWidth: 1 } },
    ],
    []
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-surface/40">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 backdrop-blur">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald shadow-glow" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">relationship · graph</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        zoomOnScroll={false}
        panOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={'dots' as never} gap={24} size={1} color="oklch(0.30 0.03 260)" />
        <Controls className="!bg-surface !border-border" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
