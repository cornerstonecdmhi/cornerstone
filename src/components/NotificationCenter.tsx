import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { listLeads, listChildren, listChildPackages, listClients, listAppointments, listInvoices, listTherapists, sendNotification } from '../lib/data';
import { deriveAlerts, alertsForRole, type Alert } from '../lib/alerts';

const today = () => new Date().toISOString().slice(0, 10);

/** Bell + panel of actionable alerts derived from live data. Clicking an item
 *  takes you to where you resolve it (confirm booking, renew credits, call lead…). */
export default function NotificationCenter() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const isAdmin = user?.role === 'admin';
      const [leads, children, packages, clients, appts, invoices, therapists] = await Promise.all([
        listLeads().catch(() => []),
        listChildren().catch(() => []),
        listChildPackages().catch(() => []),
        listClients().catch(() => []),
        listAppointments(today()).catch(() => []),
        (isAdmin ? listInvoices() : Promise.resolve([])).catch(() => []), // invoices are admin-only
        listTherapists().catch(() => []),
      ]);
      const all = deriveAlerts({ leads, children, packages, clients, appts, invoices, therapists });
      setAlerts(user ? alertsForRole(all, user.role) : []);
    } catch { setAlerts([]); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = (a: Alert) => { setOpen(false); nav(a.to); };
  const [sent, setSent] = useState<Record<string, 'sending' | 'done' | 'fail'>>({});
  const sendReminder = async (a: Alert) => {
    if (!a.phone || !a.message) return;
    setSent((s) => ({ ...s, [a.id]: 'sending' }));
    try {
      const r = await sendNotification({ channel: 'whatsapp', to: a.phone, name: a.title, recipientName: a.title, type: a.sendLabel === 'Remind' ? 'Payment reminder' : 'Acknowledgement', message: a.message });
      setSent((s) => ({ ...s, [a.id]: r.status === 'Sent' ? 'done' : 'fail' }));
    } catch { setSent((s) => ({ ...s, [a.id]: 'fail' })); }
  };
  const count = alerts.length;

  return (
    <div className="notif-center" ref={ref}>
      <button className="notif-bell" onClick={() => { const n = !open; setOpen(n); if (n) load(); }} aria-label="Notifications" title="Notifications">
        <span className="notif-ic">🔔</span>
        {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">Notifications{count > 0 && <span className="muted"> · {count}</span>}</div>
          {count === 0 && <div className="notif-empty">You're all caught up 🎉</div>}
          {alerts.map((a) => (
            <div key={a.id} className="notif-item">
              <button className="notif-main" onClick={() => go(a)}>
                <span className={'notif-dot ' + a.severity} />
                <span className="notif-text"><b>{a.title}</b><span className="notif-detail">{a.detail}</span></span>
              </button>
              {a.phone && a.message && a.sendLabel ? (
                <button className="notif-send" disabled={sent[a.id] === 'sending' || sent[a.id] === 'done'} onClick={() => sendReminder(a)}>
                  {sent[a.id] === 'done' ? 'Sent ✓' : sent[a.id] === 'sending' ? '…' : sent[a.id] === 'fail' ? 'Retry' : a.sendLabel}
                </button>
              ) : (
                <button className="notif-go" onClick={() => go(a)} aria-label="Open">→</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
