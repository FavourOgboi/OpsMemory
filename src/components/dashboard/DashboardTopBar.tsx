// import { SignedIn, UserButton } from '@clerk/tanstack-react-start'; // DEMO MODE: Disabled
import { Bell, X, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getAlertTarget } from '@/lib/mock-data';
import { useEventStream } from '@/store/useEventStream';
import { Link, useNavigate } from '@tanstack/react-router';

export function DashboardTopBar() {
  const [open, setOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [demoUser, setDemoUser] = useState({ name: '', email: '' });
  const navigate = useNavigate();
  const events = useEventStream((state) => state.events);
  const unreadCount = useEventStream((state) => state.unreadCount);
  const unresolved = events.filter((event) => !event.resolved).slice(0, 8);

  // DEMO MODE: Get demo user from localStorage (client-side only)
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('demoUser') || '{}');
    setDemoUser(userData);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('demoUser');
    navigate({ to: '/' });
  };

  return (
    <>
      {/* 
        On mobile (< lg): render as a static bar at the top of the main area 
        so it doesn't overlap page headers. Left space for hamburger button.
        On desktop (lg+): keep fixed positioning in top-right corner.
      */}
      
      {/* Mobile: static top bar */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 lg:hidden" style={{ paddingLeft: '3.5rem' }}>
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-amber px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold text-background">
              {unreadCount}
            </span>
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-gradient-to-br from-primary/20 to-cyan/20 backdrop-blur hover:bg-accent transition-colors text-sm font-semibold text-foreground"
            title={demoUser.name}
          >
            {demoUser.name?.charAt(0) || 'E'}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface shadow-lg z-50">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{demoUser.name}</p>
                <p className="text-xs text-muted-foreground">{demoUser.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-red-500 flex items-center gap-2 transition-colors rounded-b-lg"
              >
                <LogOut className="h-3 w-3" />
                Sign out (Demo)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: fixed position top-right */}
      <div className="pointer-events-none fixed right-4 top-4 z-40 hidden items-center gap-2 lg:flex">
        <ThemeToggle className="pointer-events-auto" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/70 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-amber px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold text-background">
              {unreadCount}
            </span>
          )}
        </button>
        {/* DEMO MODE: Demo user menu */}
        <div className="pointer-events-auto relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-gradient-to-br from-primary/20 to-cyan/20 backdrop-blur hover:bg-accent transition-colors text-sm font-semibold text-foreground"
            title={demoUser.name}
          >
            {demoUser.name?.charAt(0) || 'E'}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface shadow-lg z-50">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{demoUser.name}</p>
                <p className="text-xs text-muted-foreground">{demoUser.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-red-500 flex items-center gap-2 transition-colors rounded-b-lg"
              >
                <LogOut className="h-3 w-3" />
                Sign out (Demo)
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md border-l border-border bg-background shadow-elevated"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notifications</div>
                  <h2 className="font-display text-lg font-semibold">Unresolved alerts</h2>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-accent" aria-label="Close notifications">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 p-4">
                {unresolved.map((event) => (
                  <Link
                    key={event.id}
                    to={getAlertTarget(event)}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="text-sm font-semibold">{event.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{event.description}</div>
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {event.customerName}
                    </div>
                  </Link>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
