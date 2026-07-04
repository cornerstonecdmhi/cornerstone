import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function ParentLogin() {
  const { login, signup, rejected, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'signup') await signup(email.trim(), pw);
      else await login(email.trim(), pw);
      nav('/portal');
    } catch (x: any) {
      const c = x?.code;
      setErr(
        c === 'auth/invalid-credential' ? 'Incorrect email or password.'
          : c === 'auth/email-already-in-use' ? 'An account already exists for this email — sign in instead.'
          : c === 'auth/weak-password' ? 'Choose a password of at least 6 characters.'
          : (x?.message || 'Sign in failed.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="brand-mark lg">C</span>
          <div>
            <div className="brand-name lg">Cornerstone</div>
            <div className="brand-sub">Parent Portal</div>
          </div>
        </div>
        <h2>{mode === 'signup' ? 'Create your account' : 'Parent sign in'}</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: -6, marginBottom: 12 }}>
          {mode === 'signup' ? 'Use the email the clinic invited you with — it links to your child.' : "See your child's progress, sessions and receipts."}
        </p>
        <button
          type="button"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 12px', marginBottom: 12,
            background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
          }}
          onClick={async () => {
            setErr(''); setBusy(true);
            try { await loginWithGoogle(); nav('/portal'); }
            catch (x: any) { if (x?.code !== 'auth/popup-closed-by-user' && x?.code !== 'auth/cancelled-popup-request') setErr(x?.message || 'Google sign-in failed'); }
            finally { setBusy(false); }
          }}
          disabled={busy}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 12px', color: '#9ca3af', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />or with email<div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <label>Password</label>
        <div className="pw-field">
          <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
          <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? 'Hide' : 'Show'}</button>
        </div>
        {rejected && !err && (
          <div className="login-err">
            This email isn’t registered for the parent portal yet. Please ask the clinic to
            invite you — you’ll then sign in with this same email.
          </div>
        )}
        {err && <div className="login-err">{err}</div>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        <p className="login-hint">
          {mode === 'signup'
            ? <>Already registered? <button type="button" className="link-btn" onClick={() => { setMode('login'); setErr(''); }}>Sign in →</button></>
            : <>First time here (and invited by the clinic)? <button type="button" className="link-btn" onClick={() => { setMode('signup'); setErr(''); }}>Create your account →</button></>}
        </p>
      </form>
    </div>
  );
}
