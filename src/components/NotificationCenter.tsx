import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { listLeads, listChildren, listChildPackages, listClients, listAppointments } from '../lib/data';
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
      const [leads, children, packages, clients, appts] = await Promise.all([
        listLeads().catch(() => []),
        listChildren().catch(() => []),
        listChildPackages().catch(() => []),
        listClients().catch(() => []),
        listAppointments(today()).catch(() => []),
      ]);
      const all = deriveAlerts({ leads, children, packages, clients, appts });
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
            <button key={a.id} className="notif-item" onClick={() => go(a)}>
              <span className={'notif-dot ' + a.severity} />
              <span className="notif-text"><b>{a.title}</b><span className="notif-detail">{a.detail}</span></span>
              <span className="notif-go">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
