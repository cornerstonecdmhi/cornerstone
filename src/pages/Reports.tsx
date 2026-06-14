import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { listInvoicesBetween, listAppointmentsBetween, listChildren, listTherapists, listGoals } from '../lib/data';
import { type InvoiceDoc, compute, fmt, dmy } from '../lib/invoice';
import type { Appointment, Child, Therapist, Goal } from '../lib/types';
import { DISCIPLINES } from '../lib/types';

// Work in the same UTC-date space the rest of the app uses (dates are stored as
// `new Date().toISOString().slice(0,10)`), so period boundaries line up exactly.
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + '01';
const weekStart = () => { const d = new Date(today() + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const fyStart = () => { const t = today(); const y = +t.slice(0, 4); return `${+t.slice(5, 7) >= 4 ? y : y - 1}-04-01`; };

type PresetKey = 'today' | 'week' | 'month' | 'fy' | 'custom';
const PRESETS: { key: PresetKey; label: string; range: () => [string, string] }[] = [
  { key: 'today', label: 'Today', range: () => [today(), today()] },
  { key: 'week', label: 'This week', range: () => [weekStart(), today()] },
  { key: 'month', label: 'This month', range: () => [monthStart(), today()] },
  { key: 'fy', label: 'This FY', range: () => [fyStart(), today()] },
];

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return <div className={'kpi' + (tone ? ' ' + tone : '')}><div className="kpi-val">{value}</div><div className="kpi-label">{label}</div></div>;
}

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin'; // only admins may read financials (tms_invoices)
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [preset, setPreset] = useState<PresetKey>('month');
  const [inv, setInv] = useState<InvoiceDoc[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Caseload/capacity/outcomes are current snapshots (not range-bound).
  useEffect(() => {
    listChildren().then(setChildren).catch(() => {});
    listTherapists().then(setTherapists).catch(() => {});
    listGoals().then(setGoals).catch(() => {});
  }, []);
  // Revenue + sessions follow the selected date range. Invoices are admin-only.
  useEffect(() => {
    if (isAdmin) listInvoicesBetween(from, to).then(setInv).catch(() => setInv([]));
    else setInv([]);
    listAppointmentsBetween(from, to).then(setAppts).catch(() => setAppts([]));
  }, [from, to, isAdmin]);

  const applyPreset = (k: PresetKey) => {
    setPreset(k);
    const p = PRESETS.find((x) => x.key === k);
    if (p) { const [f, t] = p.range(); setFrom(f); setTo(t); }
  };

  const totalInvoiced = inv.reduce((a, i) => a + (i.total ?? compute(i).total), 0);
  const collected = inv.reduce((a, i) => a + (i.amountPaid ?? (+i.paid || 0)), 0);
  const outstanding = Math.max(0, totalInvoiced - collected);
  const attended = appts.filter((a) => a.status === 'Attended').length;
  const noShows = appts.filter((a) => a.status === 'No-show').length;
  const completed = attended + noShows;
  const attendanceRate = completed ? Math.round((attended / completed) * 100) : 0;
  const activeChildren = children.filter((c) => c.status === 'Active').length;
  const avgGas = goals.length ? (goals.reduce((a, g) => a + (g.gasScore || 0), 0) / goals.length) : 0;
  const onTrack = goals.filter((g) => g.gasScore >= 0).length;

  const capacity = DISCIPLINES.map((d) => {
    const who = therapists.filter((t) => t.status === 'Active' && t.specialties.includes(d));
    return { d, count: who.length, perDay: who.reduce((a, t) => a + (+t.maxSessionsPerDay || 0), 0) };
  }).filter((c) => c.count > 0);

  return (
    <>
      <div className="page-head"><h1>Reports &amp; Analytics</h1><p className="muted">Revenue, sessions, outcomes and capacity — for the selected period.</p></div>

      <div className="tabs-bar">
        {PRESETS.map((p) => (
          <button key={p.key} className={'tab' + (preset === p.key ? ' active' : '')} onClick={() => applyPreset(p.key)}>{p.label}</button>
        ))}
        <span style={{ flex: 1 }} />
        <label className="f" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12 }}>From</span>
          <input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }} style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8 }} /></label>
        <label className="f" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12 }}>To</span>
          <input type="date" value={to} min={from} max={today()} onChange={(e) => { setTo(e.target.value); setPreset('custom'); }} style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8 }} /></label>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 14 }}>Showing <b>{dmy(from)}</b> → <b>{dmy(to)}</b>.</p>

      {isAdmin && (
        <>
          <h3 className="sec">Revenue ({dmy(from)} – {dmy(to)})</h3>
          <div className="kpi-row">
            <Kpi label="Total invoiced (₹)" value={fmt(totalInvoiced)} tone="teal" />
            <Kpi label="Collected (₹)" value={fmt(collected)} tone="teal" />
            <Kpi label="Outstanding (₹)" value={fmt(outstanding)} tone={outstanding ? 'red' : undefined} />
            <Kpi label="Invoices" value={inv.length} />
          </div>
        </>
      )}

      <h3 className="sec">Sessions ({dmy(from)} – {dmy(to)})</h3>
      <div className="kpi-row">
        <Kpi label="Sessions" value={appts.length} />
        <Kpi label="Attended" value={attended} tone="teal" />
        <Kpi label="Attendance rate" value={attendanceRate + '%'} tone={attendanceRate >= 90 ? 'teal' : 'amber'} />
        <Kpi label="No-shows" value={noShows} tone={noShows ? 'amber' : undefined} />
      </div>

      <h3 className="sec">Outcomes &amp; caseload <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· current</span></h3>
      <div className="kpi-row">
        <Kpi label="Active children" value={activeChildren} tone="teal" />
        <Kpi label="Active goals" value={goals.length} />
        <Kpi label="Avg GAS score" value={(avgGas > 0 ? '+' : '') + avgGas.toFixed(1)} tone="teal" />
        <Kpi label="Goals on track (≥0)" value={onTrack + '/' + goals.length} />
      </div>

      <h3 className="sec">Capacity by discipline <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· current</span></h3>
      <div className="card">
        {capacity.length === 0 && <p className="muted">Add therapists to see capacity.</p>}
        {capacity.length > 0 && (
          <table className="grid">
            <thead><tr><th>Discipline</th><th className="n">Therapists</th><th className="n">Sessions/day capacity</th></tr></thead>
            <tbody>{capacity.map((c) => <tr key={c.d}><td>{c.d}</td><td className="n">{c.count}</td><td className="n">{c.perDay}</td></tr>)}</tbody>
          </table>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Revenue &amp; sessions reflect the selected date range; outcomes &amp; capacity are current snapshots. Parent-facing progress reports land in Phase 4.</p>
    </>
  );
}
