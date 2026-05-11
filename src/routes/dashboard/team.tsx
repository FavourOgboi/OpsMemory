import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Crown,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Shield,
  Star,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { fadeUp, staggerContainer, scaleIn } from '@/lib/motion-variants';
import { STAFF, CUSTOMERS } from '@/lib/mock-data';

export const Route = createFileRoute('/dashboard/team')({
  component: TeamPage,
});

/* ─── Extended team mock data ─── */
const TEAM_MEMBERS = [
  {
    id: 'u-ceo',
    name: 'Bola Adeyemi',
    role: 'CEO',
    email: 'bola@bolaagro.com',
    phone: '+2348031000001',
    status: 'online' as const,
    avatar: 'B',
    department: 'Executive',
    customers: 0,
    tasksCompleted: 42,
    joinedDate: 'Mar 2020',
    permissions: ['full-access', 'approvals', 'finance', 'agents'],
    lastActive: 'Just now',
    color: 'oklch(0.78 0.16 175)',
  },
  {
    id: 'u-001',
    name: 'Tunde Bakare',
    role: 'Sales Lead',
    email: 'tunde@bolaagro.com',
    phone: '+2348031000002',
    status: 'online' as const,
    avatar: 'T',
    department: 'Sales',
    customers: CUSTOMERS.filter(c => c.assignedTo === 'u-001').length,
    tasksCompleted: 187,
    joinedDate: 'Jun 2021',
    permissions: ['customers', 'approvals', 'chat'],
    lastActive: '5 min ago',
    color: 'oklch(0.78 0.13 210)',
  },
  {
    id: 'u-002',
    name: 'Ngozi Eze',
    role: 'Sales Rep',
    email: 'ngozi@bolaagro.com',
    phone: '+2348031000003',
    status: 'online' as const,
    avatar: 'N',
    department: 'Sales',
    customers: CUSTOMERS.filter(c => c.assignedTo === 'u-002').length,
    tasksCompleted: 145,
    joinedDate: 'Sep 2021',
    permissions: ['customers', 'chat'],
    lastActive: '12 min ago',
    color: 'oklch(0.66 0.21 295)',
  },
  {
    id: 'u-003',
    name: 'Kemi Lawal',
    role: 'Finance Manager',
    email: 'kemi@bolaagro.com',
    phone: '+2348031000004',
    status: 'away' as const,
    avatar: 'K',
    department: 'Finance',
    customers: 0,
    tasksCompleted: 312,
    joinedDate: 'Jan 2022',
    permissions: ['finance', 'approvals', 'invoices'],
    lastActive: '1 hr ago',
    color: 'oklch(0.78 0.16 75)',
  },
  {
    id: 'u-004',
    name: 'Seyi Afolabi',
    role: 'Operations Manager',
    email: 'seyi@bolaagro.com',
    phone: '+2348031000005',
    status: 'offline' as const,
    avatar: 'S',
    department: 'Operations',
    customers: 0,
    tasksCompleted: 256,
    joinedDate: 'Apr 2022',
    permissions: ['fulfillment', 'logistics', 'approvals'],
    lastActive: '3 hrs ago',
    color: 'oklch(0.68 0.21 20)',
  },
];

const statusColors = {
  online: 'bg-emerald',
  away: 'bg-amber',
  offline: 'bg-muted-foreground/40',
};

const roleIcons: Record<string, typeof Crown> = {
  CEO: Crown,
  'Sales Lead': Star,
  'Sales Rep': UserCheck,
  'Finance Manager': Shield,
  'Operations Manager': UserCog,
};

function TeamPage() {
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<typeof TEAM_MEMBERS[0] | null>(null);

  const filteredMembers = TEAM_MEMBERS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    m.department.toLowerCase().includes(search.toLowerCase()),
  );

  const onlineCount = TEAM_MEMBERS.filter(m => m.status === 'online').length;
  const totalTasks = TEAM_MEMBERS.reduce((sum, m) => sum + m.tasksCompleted, 0);
  const totalCustomersCovered = TEAM_MEMBERS.reduce((sum, m) => sum + m.customers, 0);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-4 py-4 sm:px-8 sm:py-6">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">team · management</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Your Team</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage roles, permissions, and monitor team activity across all operations
        </p>
      </motion.header>

      {/* Stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <motion.div variants={fadeUp}>
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Team Size</span>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold tracking-tight">{TEAM_MEMBERS.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Online Now</span>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold tracking-tight text-emerald">{onlineCount}</div>
              <p className="mt-1 text-xs text-muted-foreground">{Math.round((onlineCount / TEAM_MEMBERS.length) * 100)}% availability</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tasks Done</span>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold tracking-tight text-cyan">{totalTasks.toLocaleString()}</div>
              <p className="mt-1 text-xs text-muted-foreground">All time completed</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border border-border bg-surface/60 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Accounts Covered</span>
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold tracking-tight text-amber">{totalCustomersCovered}/{CUSTOMERS.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">Assigned to reps</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Search + Add */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, or department…"
            className="w-full rounded-xl border border-border bg-surface/60 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-accent">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-border bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20">
          <Plus className="h-4 w-4" />
          Invite
        </button>
      </motion.div>

      {/* Team Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <AnimatePresence mode="popLayout">
          {filteredMembers.map((member) => {
            const RoleIcon = roleIcons[member.role] || Users;
            return (
              <motion.div
                key={member.id}
                layout
                variants={fadeUp}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card
                  className="group cursor-pointer border border-border bg-surface/60 backdrop-blur-sm transition-all hover:border-border/80 hover:shadow-md"
                  onClick={() => setSelectedMember(member)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
                          style={{ background: member.color }}
                        >
                          {member.avatar}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${statusColors[member.status]}`} />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-foreground">{member.name}</h3>
                          <RoleIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{member.role} · {member.department}</div>
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {member.customers} accounts
                          </span>
                          <span>·</span>
                          <span>{member.tasksCompleted} tasks</span>
                        </div>
                      </div>

                      <button
                        className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Permissions */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {member.permissions.map(p => (
                        <span
                          key={p}
                          className="rounded-md border border-border/50 bg-background/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                        >
                          {p}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-[10px] text-muted-foreground">
                      <span>Joined {member.joinedDate}</span>
                      <span>Active {member.lastActive}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {filteredMembers.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-16 flex flex-col items-center text-center">
          <Users className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No team members match your search.</p>
        </motion.div>
      )}

      {/* Member Detail Panel */}
      <AnimatePresence>
        {selectedMember && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            />
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md border-l border-border bg-background shadow-elevated overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Member Detail</div>
                  <button onClick={() => setSelectedMember(null)} className="rounded-full p-2 hover:bg-accent">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Profile Header */}
                <div className="mt-6 flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg"
                    style={{ background: selectedMember.color }}
                  >
                    {selectedMember.avatar}
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">{selectedMember.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedMember.role}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusColors[selectedMember.status]}`} />
                      <span className="text-xs capitalize text-muted-foreground">{selectedMember.status}</span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/60 px-4 py-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedMember.email}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/60 px-4 py-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedMember.phone}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-center">
                    <div className="font-display text-lg font-bold text-primary">{selectedMember.customers}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Accounts</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-center">
                    <div className="font-display text-lg font-bold text-cyan">{selectedMember.tasksCompleted}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tasks</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-center">
                    <div className="font-display text-lg font-bold text-amber">{selectedMember.permissions.length}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Perms</div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="mt-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Permissions</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMember.permissions.map(p => (
                      <Badge key={p} variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 space-y-2">
                  <button className="w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent">
                    Edit Permissions
                  </button>
                  <button className="w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent">
                    Reassign Accounts
                  </button>
                  <button className="w-full rounded-xl border border-rose/30 bg-rose/5 px-4 py-2.5 text-sm font-medium text-rose transition-colors hover:bg-rose/10">
                    Remove from Team
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
