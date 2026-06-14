import { useEffect, useState } from 'react';
import { listTherapists, saveTherapist, deleteTherapist } from '../lib/data';
import { type Therapist, DISCIPLINES, THERAPIST_STATUS } from '../lib/types';

const blank = (): Therapist => ({
  name: '', phone: '', email: '', specialties: [], qualifications: '', location: 'Hyderabad',
  workingDays: 'Mon–Sat', workingHours: '10:00–18:00', maxSessionsPerDay: 6, status: 'Active',
  joinDate: new Date().toISOString().slice(0, 10), notes: '',
});

export default function Therapists() {
  const [list, setList] = useState<Therapist[]>([]);
  const [t, setT] = useState<Therapist | null>(null);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = async () => { try { setList(await listTherapists()); } catch { /* preview */ } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!t) return;
    if (!t.name.trim()) return flash('Therapist name is required.');
    try { const id = await saveTherapist(t); setT({ ...t, id }); flash('Saved.'); await load(); }
    catch { flash('Save failed — deploy + sign in as admin.'); }
  };
  const remove = async () => {
    if (!t?.id) { setT(null); return; }
    try { await deleteTherapist(t.id); setT(null); await load(); flash('Removed.'); }
    catch { flash('Delete failed.'); }
  };
  const toggle = (d: string) => {
    if (!t) return;
    const has = t.specialties.includes(d);
    setT({ ...t, specialties: has ? t.specialties.filter((x) => x !== d) : [...t.specialties, d] });
  };

  // Capacity by discipline (active therapists only)
  const capacity = DISCIPLINES.map((d) => {
    const who = list.filter((x) => x.status === 'Active' && x.specialties.includes(d));
    return { d, count: who.length, perDay: who.reduce((a, x) => a + (+x.maxSessionsPerDay || 0), 0) };
  }).filter((c) => c.count > 0);

  return (
    <>
      <div className="page-head"><h1>Therapists</h1><p className="muted">Profiles, specialties, capacity and availability.</p></div>

      <div className="tabs-bar">
        <span style={{ fontWeight: 600, color: 'var(--teal-dark)' }}>{list.length} therapist{list.length === 1 ? '' : 's'}</span>
        <span style={{ flex: 1 }} />
        {!t && <button className="btn-primary" onClick={() => setT(blank())}>+ Add therapist</button>}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {!t && capacity.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Capacity by discipline (active)</h3>
          <div className="kpi-row" style={{ marginBottom: 0 }}>
            {capacity.map((c) => (
              <div className="kpi teal" key={c.d}>
                <div className="kpi-val">{c.count}</div>
                <div className="kpi-label">{c.d}<br /><b>{c.perDay}</b> sessions/day capacity</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!t && (
        <div className="card">
          {list.length === 0 && <p className="muted">No therapists yet. Click “Add therapist”. (If you just deployed, sign in as admin to load saved records.)</p>}
          {list.length > 0 && (
            <table className="grid">
              <thead><tr><th>Name</th><th>Specialties</th><th>Max/day</th><th>Hours</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id}>
                    <td><b>{x.name}</b><div className="muted" style={{ fontSize: 11 }}>{x.phone}</div></td>
                    <td>{x.specialties.map((s) => <span className="chip" key={s}>{s}</span>)}</td>
                    <td className="n">{x.maxSessionsPerDay}</td>
                    <td>{x.workingDays} · {x.workingHours}</td>
                    <td><span className={'pill ' + x.status.replace(/\s/g, '').toLowerCase()}>{x.status}</span></td>
                    <td className="acts"><button className="mini save" onClick={() => setT(x)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {t && (
        <div className="card">
          <div className="row-between"><h3>{t.id ? 'Edit therapist' : 'New therapist'}</h3>
            <button className="btn-ghost" onClick={() => setT(null)}>← Back to list</button></div>
          <div className="form-grid">
            <label className="f"><span>Full name *</span><input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></label>
            <label className="f"><span>Phone</span><input value={t.phone} onChange={(e) => setT({ ...t, phone: e.target.value })} /></label>
            <label className="f"><span>Email (login)</span><input value={t.email} onChange={(e) => setT({ ...t, email: e.target.value })} /></label>
            <label className="f"><span>Qualifications</span><input value={t.qualifications} onChange={(e) => setT({ ...t, qualifications: e.target.value })} /></label>
            <label className="f"><span>Location</span><input value={t.location} onChange={(e) => setT({ ...t, location: e.target.value })} /></label>
            <label className="f"><span>Status</span><select value={t.status} onChange={(e) => setT({ ...t, status: e.target.value })}>{THERAPIST_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="f"><span>Working days</span><input value={t.workingDays} onChange={(e) => setT({ ...t, workingDays: e.target.value })} /></label>
            <label className="f"><span>Working hours</span><input value={t.workingHours} onChange={(e) => setT({ ...t, workingHours: e.target.value })} /></label>
            <label className="f"><span>Max sessions / day</span><input type="number" min={0} value={t.maxSessionsPerDay} onChange={(e) => setT({ ...t, maxSessionsPerDay: +e.target.value })} /></label>
            <label className="f"><span>Join date</span><input type="date" value={t.joinDate} onChange={(e) => setT({ ...t, joinDate: e.target.value })} /></label>
            <label className="f"><span>Leave from</span><input type="date" value={t.leaveFrom || ''} onChange={(e) => setT({ ...t, leaveFrom: e.target.value })} /></label>
            <label className="f"><span>Leave to</span><input type="date" value={t.leaveTo || ''} onChange={(e) => setT({ ...t, leaveTo: e.target.value })} /></label>
          </div>

          <h3 style={{ marginTop: 14 }}>Specialties / disciplines</h3>
          <div className="chip-pick">
            {DISCIPLINES.map((d) => (
              <button key={d} type="button" className={'chip-btn' + (t.specialties.includes(d) ? ' on' : '')} onClick={() => toggle(d)}>{d}</button>
            ))}
          </div>
          <label className="f full"><span>Notes</span><textarea rows={2} value={t.notes} onChange={(e) => setT({ ...t, notes: e.target.value })} /></label>

          <div className="row-between" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={save}>Save therapist</button>
            <button className="mini del" onClick={remove}>{t.id ? 'Delete' : 'Discard'}</button>
          </div>
        </div>
      )}
    </>
  );
}
