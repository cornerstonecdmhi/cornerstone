import { useAuth } from '../auth';

/** Shown when someone is signed in to the TMS but not yet approved as staff. */
export default function PendingApproval() {
  const { logout } = useAuth();
  return (
    <div className="login-wrap">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-brand" style={{ justifyContent: 'center' }}>
          <span className="brand-mark lg">C</span>
          <div>
            <div className="brand-name lg">Cornerstone</div>
            <div className="brand-sub">Therapies Management System</div>
          </div>
        </div>
        <div style={{ fontSize: 40, margin: '8px 0' }}>⏳</div>
        <h2>Access pending approval</h2>
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
          Your request has been recorded. An administrator will review it and grant you
          the right access shortly. You'll be able to sign in once approved.
        </p>
        <button className="btn-ghost" style={{ marginTop: 16 }} onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}
