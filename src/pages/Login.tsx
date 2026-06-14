import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, roleHome } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await login(email.trim(), pw);
      nav('/');
    } catch (x: any) {
      setErr(x?.code === 'auth/invalid-credential' ? 'Incorrect email or password.' : (x?.message || 'Sign in failed.'));
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
            <div className="brand-sub">Therapies Management System</div>
          </div>
        </div>
        <h2>Sign in</h2>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <label>Password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
        {err && <div className="login-err">{err}</div>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="login-hint">Staff access only. Contact your administrator for an account.</p>
      </form>
    </div>
  );
}
