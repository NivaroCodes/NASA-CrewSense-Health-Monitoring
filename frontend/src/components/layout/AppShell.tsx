import { NavLink, Outlet } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import { SyntheticNotice } from '../ui/SyntheticNotice';
import { Header } from './Header';

// Persistent frame: simulated-data strip, header and a grouped navigation rail. Mounted once; never unmounted on navigation.
const NAV_GROUPS = [
  {
    heading: 'Today',
    items: [
      { to: '/dashboard', label: 'Overview' },
      { to: '/alerts', label: 'Alerts' },
      { to: '/scan', label: 'Daily check-in' },
    ],
  },
  {
    heading: 'Records',
    items: [
      { to: '/history', label: 'History' },
      { to: '/sync', label: 'Devices & sync' },
    ],
  },
];

export function AppShell() {
  const d = useDashboard().data?.data;
  const synthetic = Boolean(d && (d.astronaut.is_synthetic || d.indicators.some((i) => i.latest?.is_synthetic)));

  return (
    <div className="flex h-full flex-col">
      {synthetic ? <SyntheticNotice /> : null}
      <Header />
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Primary" className="hidden w-52 shrink-0 border-r border-border-subtle bg-bg-surface-raised p-3 md:block">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className="mb-5">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{group.heading}</p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `block rounded-full px-3 py-2 text-sm font-medium ${
                          isActive ? 'bg-bg-surface text-text-primary shadow-card' : 'text-text-secondary hover:text-text-primary'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <main className="min-w-0 flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
