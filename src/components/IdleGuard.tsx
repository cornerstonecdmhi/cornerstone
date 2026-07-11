import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { useAuth } from '../auth';

// 30 min idle, 60-second warning — protects clinical data on unattended machines.
const IDLE_MS = 30 * 60 * 1000;
const WARN_MS = 60 * 1000;

/**
 * Rendered inside an authenticated shell (staff Layout + parent portal). When the
 * session has been idle too long it signs the user out; a 60-second warning modal
 * lets them stay. Self-contained inline styles so it doesn't depend on app CSS.
 */
export function IdleGuard() {
  const { logout } = useAuth();
  const { warning, secondsLeft, stayActive } = useIdleTimeout({
    timeoutMs: IDLE_MS,
    warnMs: WARN_MS,
    enabled: true,
    onIdle: () => { void logout(); },
  });

  if (!warning) return null;

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', padding: 16,
  };
  const box: React.CSSProperties = {
    background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,.25)',
    border: '1px solid #eef0f2', width: '100%', maxWidth: 360, padding: 24, textAlign: 'center',
  };
  const btn: React.CSSProperties = {
    flex: 1, padding: '10px 12px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Inactivity warning">
      <div style={box}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>⏸️</div>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Still there?</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          You'll be signed out for inactivity to protect patient data.
        </p>
        <p style={{ fontSize: 30, fontWeight: 800, color: '#b45309', margin: '12px 0' }} aria-live="polite">{secondsLeft}s</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button style={{ ...btn, background: '#fff', color: '#475569', border: '1px solid #e2e8f0' }} onClick={() => { void logout(); }}>
            Sign out now
          </button>
          <button style={{ ...btn, background: '#15603a', color: '#fff', border: '1px solid #15603a' }} onClick={stayActive}>
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
