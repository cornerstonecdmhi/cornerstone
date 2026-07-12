// Parent-portal entry — a SEPARATE app/bundle from the staff TMS. It accepts only
// parents (tms_parent_users) via AuthProvider audience="portal", so a staff member
// signing in here is rejected, and parents never download the staff console.
import { Sentry } from './instrument'; // MUST be first — Sentry.init() before any app code
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import ParentPortal from './pages/ParentPortal';
import ParentLogin from './pages/ParentLogin';
import { IdleGuard } from './components/IdleGuard';
import './styles.css';

function PortalRoot() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <ParentLogin />;
  return <><IdleGuard /><ParentPortal /></>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="center muted" style={{ padding: 40 }}>Something went wrong. Please refresh.</div>}>
      <BrowserRouter>
        <AuthProvider audience="portal">
          <PortalRoot />
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
