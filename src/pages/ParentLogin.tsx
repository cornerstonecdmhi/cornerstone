import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function ParentLogin() {
  const { login, signup, rejected } = useAuth();
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
