import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, type Role } from '../auth';
import { DEMO } from '../firebase';
import NotificationCenter from './NotificationCenter';

interface NavItem { to: string; label: string; icon: string; roles: Role[]; }

// Module navigation — filtered per role. Billing is admin-only.
export const NAV: NavItem[] = [
  { to: '/today',     label: 'Today',            icon: '🏠', roles: ['admin'] },
  { to: '/my-day',    label: 'My Day',           icon: '📋', roles: ['therapist'] },
  { to: '/clinical',  label: 'Clinical',         icon: '🩺', roles: ['senior'] },
  { to: '/leads',     label: 'Leads & Intake',   icon: '📥', roles: ['admin'] },
  { to: '/schedule',  label: 'Schedule',         icon: '🗓️', roles: ['admin', 'senior', 'therapist'] },
  { to: '/clients',   label: 'Clients & Children', icon: '👨‍👩‍👧', roles: ['admin', 'senior', 'therapist'] },
  { to: '/therapists',label: 'Therapists',       icon: '🧑‍⚕️', roles: ['admin', 'senior'] },
  { to: '/care-plans', label: 'Care Plans',      icon: '📑', roles: ['admin', 'senior'] },
  { to: '/assessments', label: 'Assessments',    icon: '🧪', roles: ['admin', 'senior'] },
  { to: '/attendance',  label: 'Attendance',     icon: '🕒', roles: ['admin', 'senior'] },
  { to: '/goals',     label: 'Goals',            icon: '🎯', roles: ['admin', 'senior', 'therapist'] },
  { to: '/billing',   label: 'Billing',          icon: '🧾', roles: ['admin'] },
  { to: '/reports',   label: 'Reports',          icon: '📊', roles: ['admin', 'senior'] },
  { to: '/notifications', label: 'Notifications', icon: '🔔', roles: ['admin'] },
  { to: '/audit',     label: 'Audit Log',        icon: '🛡️', roles: ['admin'] },
  { to: '/settings',  label: 'Settings',         icon: '⚙️', roles: ['admin'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV.filter((n) => user && n.roles.includes(user.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <div>
            <div className="brand-name">Cornerstone</div>
            <div className="brand-sub">TMS</div>
          </div>
        </div>
        <nav>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span className="nav-ic">{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>{DEMO && <span className="demo-badge">● Demo data — sample records (not your real data)</span>}</div>
          <div className="user-box">
            <NotificationCenter />
            <div className="user-meta">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
            <button className="btn-ghost" onClick={async () => { await logout(); nav('/login'); }}>Sign out</button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
