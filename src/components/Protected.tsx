import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, roleHome, type Role } from '../auth';

/** Guards a route: requires login, and optionally a set of allowed roles. */
export function Protected({ allow, children }: { allow?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}
