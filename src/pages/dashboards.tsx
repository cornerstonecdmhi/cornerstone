import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { listAppointments, listChildren, listLeads } from '../lib/data';
import type { Appointment, Child, Lead } from '../lib/types';

const today = () => new Date().toISOString().slice(0, 10);

function PageHead({ title, sub }: { title: string; sub?: string }) {
  return <div className="page-head"><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>;
}
function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return <div className={'kpi' + (tone ? ' ' + tone : '')}><div className="kpi-val">{value}</div><div className="kpi-label">{label}</div></div>;
}

function ApptTable({ rows }: { rows: Appointment[] }) {
  if (rows.length === 0) return <p className="muted">Nothing scheduled for today.</p>;
  return (
    <table className="grid">
      <thead><tr><th>Time</th><th>Child</th><th>Therapist</th><th>Service</th><th>Status</th></tr></thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id}>
            <td><b>{a.time}</b></td><td>{a.childName}</td><td>{a.therapistName}</td>
            <td>{a.serviceName}<div className="muted" style={{ fontSize: 11 }}>{a.type}</div></td>
            <td><span className={'pill ' + a.status.replace(/\W/g, '').toLowerCase()}>{a.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function useToday() {
  const [appts, setAppts] = useState<Appointment[]>([]);
  useEffect(() => { listAppointments(today()).then(setAppts).catch(() => setAppts([])); }, []);
  return appts;
}

export function Today() {
  const { user } = useAuth();
  const appts = useToday();
  const [leads, setLeads] = useState<Lead[]>([]);
  useEffect(() => { listLeads().then(setLeads).catch(() => {}); }, []);
  const attended = appts.filter((a) => a.status === 'Attended').length;
  const scheduled = appts.filter((a) => a.status === 'Scheduled').length;
  const newLeads = leads.filter((l) => l.status === 'New').length;
  return (
    <>
      <PageHead title={`Good day, ${user?.name?.split(' ')[0] || 'there'}`} sub="Front-desk overview — today at a glance." />
      <div className="kpi-row">
        <Kpi label="Sessions today" value={appts.length} />
        <Kpi label="Upcoming today" value={scheduled} tone="teal" />
        <Kpi label="Attended" value={attended} tone="teal" />
        <Kpi label="New leads — call now" value={newLeads} tone={newLeads ? 'red' : undefined} />
      </div>
      <div className="card"><h3>Today's schedule</h3><ApptTable rows={appts} /></div>
    </>
  );
}

export function MyDay() {
  const { user } = useAuth();
  const all = useToday();
  const mine = all.filter((a) => a.therapistName === user?.name);
  const rows = mine.length ? mine : all; // demo/admin sees all
  const done = rows.filter((a) => a.status === 'Attended').length;
  return (
    <>
      <PageHead title="My Day" sub={`${user?.name || 'Therapist'} — your sessions and plan for today.`} />
      <div className="kpi-row">
        <Kpi label="Sessions today" value={rows.length} />
        <Kpi label="Completed" value={done} tone="teal" />
        <Kpi label="Remaining" value={rows.length - done} tone="amber" />
      </div>
      <div className="card"><h3>Today's sessions</h3><ApptTable rows={rows} /></div>
    </>
  );
}

export function Clinical() {
  const [children, setChildren] = useState<Child[]>([]);
  useEffect(() => { listChildren().then(setChildren).catch(() => setChildren([])); }, []);
  const active = children.filter((c) => c.status === 'Active').length;
  const assessing = children.filter((c) => c.status === 'In Assessment').length;
  const t = today();
  const due = children.filter((c) => c.nextReviewDate && c.nextReviewDate <= t);
  return (
    <>
      <PageHead title="Clinical" sub="Assessments, treatment plans, goals and supervision." />
      <div className="kpi-row">
        <Kpi label="Active children" value={active} tone="teal" />
        <Kpi label="In assessment" value={assessing} tone="amber" />
        <Kpi label="Reviews due" value={due.length} tone={due.length ? 'red' : undefined} />
        <Kpi label="Total caseload" value={children.length} />
      </div>
      <div className="card">
        <h3>Caseload {due.length > 0 && <span className="pill noshow" style={{ marginLeft: 6 }}>{due.length} review{due.length === 1 ? '' : 's'} due</span>}</h3>
        {children.length === 0 && <p className="muted">No children yet.</p>}
        {children.length > 0 && (
          <table className="grid">
            <thead><tr><th>Child</th><th>Concern</th><th>Needs</th><th>Review due</th><th>Status</th></tr></thead>
            <tbody>
              {children.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b>{c.continuityCritical && <span className="pill onhold" style={{ marginLeft: 4, fontSize: 10 }}>continuity</span>}</td>
                  <td>{c.concern}</td>
                  <td>{c.disciplinesNeeded.map((d) => <span className="chip" key={d}>{d}</span>)}</td>
                  <td>{c.nextReviewDate ? <span className={c.nextReviewDate <= t ? 'pill noshow' : 'muted'}>{c.nextReviewDate <= t ? 'Due ' + c.nextReviewDate : c.nextReviewDate}</span> : <span className="muted">—</span>}</td>
                  <td><span className={'pill ' + c.status.replace(/\s/g, '').toLowerCase()}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
