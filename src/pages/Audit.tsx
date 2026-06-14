import { useEffect, useState } from 'react';
import { listAuditLogs } from '../lib/data';
import type { AuditEntry } from '../lib/types';

function when(at: unknown): string {
  if (!at) return '';
  const ms = typeof at === 'number' ? at : (at as { seconds?: number })?.seconds ? (at as { seconds: number }).seconds * 1000 : Date.parse(String(at));
  if (!ms || isNaN(ms)) return '';
  return new Date(ms).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function Audit() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  useEffect(() => { listAuditLogs().then(setRows).catch(() => setRows([])); }, []);
  return (
    <>
      <div className="page-head"><h1>Audit Log</h1><p className="muted">Every create / edit / delete of invoices and records — who and when.</p></div>
      <div className="card">
        {rows.length === 0 && <p className="muted">No activity yet. Invoice and record changes appear here.</p>}
        {rows.length > 0 && (
          <table className="grid">
            <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Summary</th><th>By</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(r.at)}</td>
                  <td><span className={'pill ' + (r.action === 'delete' ? 'noshow' : r.action === 'update' ? 'scheduled' : 'attended')}>{r.action}</span></td>
                  <td>{r.entity}</td>
                  <td>{r.summary}</td>
                  <td className="muted">{r.by?.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
