import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, roleHome } from './auth';
import { Protected } from './components/Protected';
import Layout from './components/Layout';
import Login from './pages/Login';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Clients from './pages/Clients';
import Therapists from './pages/Therapists';
import Schedule from './pages/Schedule';
import Leads from './pages/Leads';
import Assessments from './pages/Assessments';
import CarePlans from './pages/CarePlans';
import Attendance from './pages/Attendance';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Notifications from './pages/Notifications';
import { Today, MyDay, Clinical } from './pages/dashboards';

/** Sends "/" to the right home for the signed-in role. */
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

function page(node: React.ReactNode, allow?: Parameters<typeof Protected>[0]['allow']) {
  return <Protected allow={allow}><Layout>{node}</Layout></Protected>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/today"      element={page(<Today />, ['admin'])} />
      <Route path="/my-day"     element={page(<MyDay />, ['therapist'])} />
      <Route path="/clinical"   element={page(<Clinical />, ['senior'])} />

      <Route path="/leads"      element={page(<Leads />, ['admin'])} />
      <Route path="/schedule"   element={page(<Schedule />, ['admin', 'senior', 'therapist'])} />
      <Route path="/clients"    element={page(<Clients />, ['admin', 'senior', 'therapist'])} />
      <Route path="/therapists" element={page(<Therapists />, ['admin', 'senior'])} />
      <Route path="/assessments" element={page(<Assessments />, ['admin', 'senior'])} />
      <Route path="/care-plans" element={page(<CarePlans />, ['admin', 'senior'])} />
      <Route path="/attendance" element={page(<Attendance />, ['admin', 'senior'])} />
      <Route path="/goals"      element={page(<Goals />, ['admin', 'senior', 'therapist'])} />
      <Route path="/billing"    element={page(<Billing />, ['admin'])} />
      <Route path="/reports"    element={page(<Reports />, ['admin', 'senior'])} />
      <Route path="/notifications" element={page(<Notifications />, ['admin'])} />
      <Route path="/audit"      element={page(<Audit />, ['admin'])} />
      <Route path="/settings"   element={page(<Settings />, ['admin'])} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
