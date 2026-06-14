// Parent-portal entry — a SEPARATE app/bundle from the staff TMS. It accepts only
// parents (tms_parent_users) via AuthProvider audience="portal", so a staff member
// signing in here is rejected, and parents never download the staff console.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import ParentPortal from './pages/ParentPortal';
import ParentLogin from './pages/ParentLogin';
import './styles.css';

function PortalRoot() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <ParentLogin />;
  return <ParentPortal />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider audience="portal">
        <PortalRoot />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
