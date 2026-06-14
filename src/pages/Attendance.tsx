import { useEffect, useState } from 'react';
import { listTherapists, listAttendance, saveAttendance, listAppointments } from '../lib/data';
import { type Therapist, type AttendanceRecord, type Appointment, ATTEND_STATUS } from '../lib/types';
import { dmy } from '../lib/invoice';

const today = () => new Date().toISOString().slice(0, 10);
const shift = (d: string, n: number) => new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10);
const nowHHMM = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function Attendance() {
  const [date, setDate] = useState(today());
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  useEffect(() => { listTherapists().then(setTherapists).catch(() => {}); }, []);
  const loadDay = async (d: string) => {
    try { setRecords(await listAttendance(d)); } catch { setRecords([]); }
    try { setAppts(await listAppointments(d)); } catch { setAppts([]); }
  };
  useEffect(() => { loadDay(date); }, [date]);

  const active = therapists.filter((t) => t.status === 'Active');
  const recOf = (id: string) => records.find((r) => r.therapistId === id);
  const apptCount = (id: string) => appts.filter((a) => a.therapistId === id).length;

  const mark = async (t: Therapist, status: string) => {
    try {
      await saveAttendance({ date, therapistId: t.id!, therapistName: t.name, status, checkInTime: status === 'Present' || status === 'Late' ? nowHHMM() : '' });
      await loadDay(date);
      const n = apptCount(t.id!);
      if ((status === 'Absent' || status === 'On Leave') && n > 0) flash(`${t.name} marked ${status} — ${n} session${n === 1 ? '' : 's'} need rescheduling (Schedule).`);
    } catch { flash('Save failed — deploy + sign in as admin.'); }
  };

  const count = (s: string) => active.filter((t) => recOf(t.id!)?.status === s).length;
  const atRisk = active.filter((t) => { const r = recOf(t.id!); return (r?.status === 'Absent' || r?.status === 'On Leave') && apptCount(t.id!) > 0; });

  return (
    <>
      <div className="page-head"><h1>Therapist Attendance</h1><p className="muted">Daily work-attendance. Marking Absent/On-leave flags that day's sessions for rescheduling.</p></div>

      <div className="tabs-bar">
        <button className="btn-ghost" onClick={() => setDate(shift(date, -1))}>← Prev</button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 9 }} />
        <button className="btn-ghost" onClick={() => setDate(shift(date, 1))}>Next →</button>
        <button className="btn-ghost" onClick={() => setDate(today())}>Today</button>
        <span style={{ flex: 1 }} />
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      <div className="kpi-row">
        <div className="kpi teal"><div className="kpi-val">{count('Present')}</div><div className="kpi-label">Present</div></div>
        <div className="kpi amber"><div className="kpi-val">{count('Late')}</div><div className="kpi-label">Late</div></div>
        <div className={'kpi' + (count('Absent') ? ' red' : '')}><div className="kpi-val">{count('Absent')}</div><div className="kpi-label">Absent</div></div>
        <div className="kpi"><div className="kpi-val">{active.length - records.filter((r) => active.some((t) => t.id === r.therapistId)).length}</div><div className="kpi-label">Not marked</div></div>
      </div>

      {atRisk.length > 0 && (
        <div className="hint-note" style={{ borderColor: '#f3b4b4', background: '#fdeaea', color: '#a33', marginBottom: 14 }}>
          ⚠ {atRisk.length} therapist(s) Absent/On-leave with booked sessions today: {atRisk.map((t) => `${t.name} (${apptCount(t.id!)})`).join(', ')}. Reschedule with the same therapist where possible (continuity-first).
        </div>
      )}

      <div className="card">
        <h3>{dmy(date)}</h3>
        {active.length === 0 && <p className="muted">No active therapists.</p>}
        {active.length > 0 && (
          <table className="grid">
            <thead><tr><th>Therapist</th><th>Sessions today</th><th>Status</th><th>Check-in</th><th>Mark</th></tr></thead>
            <tbody>
              {active.map((t) => {
                const r = recOf(t.id!);
                return (
                  <tr key={t.id}>
                    <td><b>{t.name}</b><div className="muted" style={{ fontSize: 11 }}>{t.specialties.join(', ')}</div></td>
                    <td className="n">{apptCount(t.id!)}</td>
                    <td>{r ? <span className={'pill ' + r.status.replace(/\s/g, '').toLowerCase()}>{r.status}</span> : <span className="muted">—</span>}</td>
                    <td className="muted">{r?.checkInTime || '—'}</td>
                    <td className="acts">
                      {ATTEND_STATUS.map((s) => (
                        <button key={s} className={'mini ' + (r?.status === s ? 'save' : '')} style={r?.status === s ? {} : { background: 'var(--panel)', color: 'var(--teal)' }} onClick={() => mark(t, s)}>{s}</button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
