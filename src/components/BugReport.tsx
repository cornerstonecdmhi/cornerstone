import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { APP_VERSION } from '../version';

const SEVERITIES = ['low', 'medium', 'high', 'blocker'] as const;
type Severity = typeof SEVERITIES[number];

/**
 * In-app "Report Issue" — captures a problem plus automatic context (page, browser,
 * signed-in user, build version) so pilot bugs are actionable without guesswork.
 * Writes ONE doc to `bug_reports`. Cost: +1 write per report; reads only when an
 * admin reviews them. Negligible. Screenshots are intentionally NOT stored as base64
 * here (would bloat the doc) — attach separately if needed.
 */
export function BugReport() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'bug_reports'), {
        text: text.trim().slice(0, 2000),
        severity,
        app: 'tms',
        module: location.pathname,
        url: location.href.slice(0, 500),
        userAgent: navigator.userAgent.slice(0, 300),
        uid: user?.uid || 'anon',
        email: user?.email || '',
        role: user?.role || '',
        version: APP_VERSION,
        status: 'open',
        createdAt: serverTimestamp(),
        at: Date.now(),
      });
      setDone(true);
      setText('');
      setTimeout(() => { setOpen(false); setDone(false); }, 1600);
    } catch {
      alert('Could not submit the report. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', padding: 16 };
  const box: React.CSSProperties = { background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,.25)', border: '1px solid #eef0f2', width: '100%', maxWidth: 420, padding: 22 };
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4, marginTop: 12 };

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)} title="Report an issue" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        🐞 Report
      </button>

      {open && (
        <div style={overlay} role="dialog" aria-modal="true" aria-label="Report an issue" onClick={(e) => { if (e.target === e.currentTarget && !sending) setOpen(false); }}>
          <div style={box}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '18px 0' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
                <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Thanks — report sent.</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>The team can see the exact page and build.</p>
              </div>
            ) : (
              <>
                <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Report an issue</h2>
                <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>Page, browser, your account and the build ({APP_VERSION}) are attached automatically.</p>

                <label style={label}>What went wrong?</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Describe what you were doing and what happened…" style={{ width: '100%', resize: 'vertical', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }} />

                <label style={label}>Severity</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SEVERITIES.map((s) => (
                    <button key={s} onClick={() => setSeverity(s)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', border: '1px solid ' + (severity === s ? '#15603a' : '#e2e8f0'), background: severity === s ? '#15603a' : '#fff', color: severity === s ? '#fff' : '#475569' }}>{s}</button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                  <button onClick={() => setOpen(false)} disabled={sending} style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#475569', border: '1px solid #e2e8f0' }}>Cancel</button>
                  <button onClick={submit} disabled={sending || !text.trim()} style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#15603a', color: '#fff', border: '1px solid #15603a', opacity: sending || !text.trim() ? 0.6 : 1 }}>{sending ? 'Sending…' : 'Send report'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
