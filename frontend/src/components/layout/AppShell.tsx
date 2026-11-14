import { NavLink, Outlet } from 'react-router-dom';

// Persistent frame: header plus navigation rail (Spec, Phase 5.1 and 5.2).
// Mounted once; never unmounted on navigation.
const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/scan', label: 'Daily Scan' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/history', label: 'History' },
];

export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border-subtle bg-bg-surface px-4 py-3">
        <span className="font-sans text-lg font-semibold">CrewSense</span>
        <span className="font-mono text-xs text-text-secondary">MET --:--:--</span>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Primary" className="w-40 shrink-0 border-r border-border-subtle bg-bg-surface p-2">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-chip px-3 py-2 text-sm ${
                      isActive ? 'bg-bg-surface-raised text-accent-cyan' : 'text-text-secondary hover:text-text-primary'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
