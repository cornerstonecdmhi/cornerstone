import { useEffect, useState } from 'react';
import { listAppointments, saveAppointment, deleteAppointment, listChildren, listTherapists, listServices, listWorkHours, listHolidays, getSettings, consumeCredit } from '../lib/data';
import { type Appointment, type Child, type Therapist, type Service, type WorkHour, type Holiday, APPT_TYPE, APPT_STATUS } from '../lib/types';
import { dmy } from '../lib/invoice';
import { generateSlots, unavailableReason, hasConflict } from '../lib/slots';

const today = () => new Date().toISOString().slice(0, 10);
const shift = (d: string, days: number) => new Date(new Date(d).getTime() + days * 864e5).toISOString().slice(0, 10);
const blank = (date: string): Appointment => ({
  childId: '', childName: '', therapistId: '', therapistName: '', serviceName: '',
  type: 'Session', date, time: '16:00', durationMin: 45, location: 'Hyderabad', status: 'Scheduled', notes: '',
});

export default function Schedule() {
  const [date, setDate] = useState(today());
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workhours, setWorkhours] = useState<WorkHour[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [formAppts, setFormAppts] = useState<Appointment[]>([]);
  const [edit, setEdit] = useState<Appointment | null>(null);
  const [assessorName, setAssessorName] = useState('Rajkumar');
  const [gateOverride, setGateOverride] = useState(false);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  useEffect(() => {
    (async () => {
      try { setChildren(await listChildren()); } catch { /* preview */ }
      try { setTherapists(await listTherapists()); } catch { /* preview */ }
      try { setServices(await listServices()); } catch { /* preview */ }
      try { setWorkhours(await listWorkHours()); } catch { /* preview */ }
      try { setHolidays(await listHolidays()); } catch { /* preview */ }
      try { setAssessorName((await getSettings()).assessorName); } catch { /* preview */ }
    })();
  }, []);
  const loadDay = async (d: string) => { try { setAppts(await listAppointments(d)); } catch { setAppts([]); } };
  useEffect(() => { loadDay(date); }, [date]);
  // Appointments on the form's date (for slot availability + conflict checks)
  useEffect(() => { if (edit?.date) listAppointments(edit.date).then(setFormAppts).catch(() => setFormAppts([])); }, [edit?.date]);

  const persist = async (a: Appointment) => {
    try { const id = await saveAppointment(a); await loadDay(date); return id; }
    catch { flash('Save failed — deploy + sign in as admin.'); return undefined; }
  };
  const quickStatus = async (a: Appointment, status: string) => {
    let consumed = a.creditConsumed;
    let note = '';
    // Attended / no-show consumes a package credit (no-show is a commitment device).
    if ((status === 'Attended' || status === 'No-show') && !a.creditConsumed) {
      const disc = services.find((s) => s.name === a.serviceName)?.discipline || '';
      try {
        const res = await consumeCredit(a.childId, disc);
        if (res) { consumed = true; note = ` · ${res.packageName}: ${res.remaining} left${res.remaining <= 2 ? ' ⚠ low — renew' : ''}`; }
      } catch { /* ignore */ }
    }
    await persist({ ...a, status, creditConsumed: consumed });
    if (note) flash(`${status}${note}`);
  };

  const saveForm = async () => {
    if (!edit) return;
    if (!edit.childId) return flash('Pick a child.');
    if (!edit.therapistId) return flash('Assign a therapist.');
    if (gateActive && rajkumar && edit.therapistId !== rajkumar.id) return flash(`This child needs an assessment first — book with ${assessorName}, or tick Override.`);
    const ex = formAppts.filter((a) => a.therapistId === edit.therapistId && a.id !== edit.id).map((a) => ({ time: a.time, durationMin: a.durationMin }));
    if (hasConflict(ex, edit.time, edit.durationMin)) return flash('⚠ That time overlaps another session for this therapist — pick a free slot.');
    const childEx = formAppts.filter((a) => a.childId === edit.childId && a.id !== edit.id && a.status !== 'Cancelled').map((a) => ({ time: a.time, durationMin: a.durationMin }));
    if (hasConflict(childEx, edit.time, edit.durationMin)) return flash('⚠ This child already has another session at that time — pick a different slot.');
    const toSave = (needsGate && gateOverride) ? { ...edit, notes: (edit.notes ? edit.notes + ' ' : '') + '[assessment-gate overridden]' } : edit;
    const id = await persist(toSave);
    if (id) { setEdit(null); flash('Appointment saved.'); }
  };
  const remove = async () => {
    if (!edit?.id) { setEdit(null); return; }
    try { await deleteAppointment(edit.id); setEdit(null); await loadDay(date); flash('Removed.'); }
    catch { flash('Delete failed.'); }
  };

  const therapistsForService = (svc: string) => {
    const disc = services.find((s) => s.name === svc)?.discipline;
    const elig = disc ? therapists.filter((t) => t.status === 'Active' && t.specialties.includes(disc)) : therapists.filter((t) => t.status === 'Active');
    return elig.length ? elig : therapists;
  };

  const selTherapist = edit ? therapists.find((t) => t.id === edit.therapistId) : undefined;
  const dur = (edit && (services.find((s) => s.name === edit.serviceName)?.durationMin || edit.durationMin)) || 45;
  const exForT = edit ? formAppts.filter((a) => a.therapistId === edit.therapistId && a.id !== edit.id).map((a) => ({ time: a.time, durationMin: a.durationMin })) : [];
  const slotArgs = edit && selTherapist ? { date: edit.date, workhours, holidays, therapist: selTherapist, durationMin: dur, existing: exForT } : null;
  const slots = slotArgs ? generateSlots(slotArgs) : [];
  const slotReason = slotArgs ? unavailableReason(slotArgs) : '';

  // Rajkumar booking gate: a child with no completed assessment can only be booked with Rajkumar.
  const selChild = edit ? children.find((c) => c.id === edit.childId) : undefined;
  const rajkumar = therapists.find((t) => t.name === assessorName) || therapists.find((t) => (t.specialties || []).includes('Assessment'));
  const needsGate = !!(selChild && !selChild.assessmentDone);
  const gateActive = needsGate && !gateOverride;
  const therapistOptions = gateActive && rajkumar ? [rajkumar] : therapistsForService(edit?.serviceName || '');

  return (
    <>
      <div className="page-head"><h1>Schedule</h1><p className="muted">Appointments &amp; sessions — assign therapists, mark attendance, reschedule.</p></div>

      <div className="tabs-bar">
        <button className="btn-ghost" onClick={() => setDate(shift(date, -1))}>← Prev</button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 9 }} />
        <button className="btn-ghost" onClick={() => setDate(shift(date, 1))}>Next →</button>
        <button className="btn-ghost" onClick={() => setDate(today())}>Today</button>
        <span style={{ flex: 1 }} />
        {!edit && <button className="btn-primary" onClick={() => { setGateOverride(false); setEdit(blank(date)); }}>+ Add appointment</button>}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {!edit && (
        <div className="card">
          <h3>{dmy(date)} — {appts.length} appointment{appts.length === 1 ? '' : 's'}</h3>
          {appts.length === 0 && <p className="muted">Nothing scheduled. Click “Add appointment”. (Sign in as admin after deploy to load real data.)</p>}
          {appts.length > 0 && (
            <table className="grid">
              <thead><tr><th>Time</th><th>Child</th><th>Therapist</th><th>Service</th><th>Status</th><th>Attendance</th><th></th></tr></thead>
              <tbody>
                {appts.map((a) => (
                  <tr key={a.id}>
                    <td><b>{a.time}</b><div className="muted" style={{ fontSize: 11 }}>{a.durationMin}m</div></td>
                    <td>{a.childName}</td>
                    <td>{a.therapistName}</td>
                    <td>{a.serviceName}<div className="muted" style={{ fontSize: 11 }}>{a.type}</div></td>
                    <td><span className={'pill ' + a.status.replace(/\W/g, '').toLowerCase()}>{a.status}</span></td>
                    <td className="acts">
                      {a.status === 'Requested'
                        ? <button className="mini save" onClick={async () => { await persist({ ...a, status: 'Scheduled' }); flash('Booking confirmed.'); }}>Confirm</button>
                        : <>
                            <button className="mini save" onClick={() => quickStatus(a, 'Attended')}>✓</button>
                            <button className="mini del" onClick={() => quickStatus(a, 'No-show')}>✗</button>
                          </>}
                    </td>
                    <td className="acts"><button className="mini" style={{ background: 'var(--panel)', color: 'var(--teal)' }} onClick={() => { setGateOverride(false); setEdit(a); }}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {edit && (
        <div className="card">
          <div className="row-between"><h3>{edit.id ? 'Edit appointment' : 'New appointment'}</h3>
            <button className="btn-ghost" onClick={() => setEdit(null)}>← Back</button></div>
          <div className="form-grid">
            <label className="f"><span>Child *</span>
              <select value={edit.childId} onChange={(e) => { const c = children.find((x) => x.id === e.target.value); const patch: Appointment = { ...edit, childId: e.target.value, childName: c?.name || '' }; if (c && !c.assessmentDone && rajkumar) { patch.therapistId = rajkumar.id || ''; patch.therapistName = rajkumar.name; if (patch.type === 'Session') patch.type = 'Consultation'; } setEdit(patch); }}>
                <option value="">— select child —</option>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name}{c.assessmentDone ? '' : ' — needs assessment'}</option>)}
              </select></label>
            <label className="f"><span>Type</span><select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{APPT_TYPE.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="f"><span>Service</span>
              <select value={edit.serviceName} onChange={(e) => { const sv = services.find((x) => x.name === e.target.value); setEdit({ ...edit, serviceName: e.target.value, durationMin: sv?.durationMin || edit.durationMin }); }}>
                <option value="">— select service —</option>
                {services.map((sv) => <option key={sv.id || sv.name}>{sv.name}</option>)}
              </select></label>
            <label className="f"><span>Therapist *</span>
              <select value={edit.therapistId} onChange={(e) => { const tp = therapists.find((x) => x.id === e.target.value); setEdit({ ...edit, therapistId: e.target.value, therapistName: tp?.name || '' }); }}>
                <option value="">— assign therapist —</option>
                {therapistOptions.map((tp) => <option key={tp.id} value={tp.id}>{tp.name} ({tp.specialties.join(', ')})</option>)}
              </select></label>
            <label className="f"><span>Date</span><input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></label>
            <label className="f"><span>Time</span><input type="time" value={edit.time} onChange={(e) => setEdit({ ...edit, time: e.target.value })} /></label>
            <label className="f"><span>Duration (min)</span><input type="number" value={edit.durationMin} onChange={(e) => setEdit({ ...edit, durationMin: +e.target.value })} /></label>
            <label className="f"><span>Status</span><select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{APPT_STATUS.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>

          {needsGate && (
            <div className="hint-note" style={{ borderColor: '#f3b4b4', background: '#fdeaea', color: '#a33' }}>
              🔒 <b>{selChild?.name}</b> has no completed assessment yet — bookable only with <b>{assessorName}</b> (consultation/assessment). Therapy sessions start after {assessorName} assesses &amp; assigns.
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}><input type="checkbox" checked={gateOverride} onChange={(e) => setGateOverride(e.target.checked)} /> Override (logged)</label>
            </div>
          )}

          <div className="f full" style={{ marginTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Available slots for {dmy(edit.date)}{selTherapist ? ` · ${selTherapist.name}` : ''}</span>
            {!edit.therapistId || !edit.serviceName
              ? <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>Pick a service and therapist to see free slots.</p>
              : slotReason
                ? <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>{slotReason} — no slots this day.</p>
                : slots.length === 0
                  ? <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>Fully booked — no free slots.</p>
                  : <div className="slot-grid">{slots.map((s) => <button key={s} type="button" className={'slot-btn' + (edit.time === s ? ' on' : '')} onClick={() => setEdit({ ...edit, time: s })}>{s}</button>)}</div>}
          </div>

          <label className="f full"><span>Notes</span><textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
          <div className="hint-note">Slots respect clinic hours, holidays, the therapist's hours/leave, capacity and existing bookings — so no double-booking. Reassign = change therapist; reschedule = change date/time.</div>
          <div className="row-between" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={saveForm}>Save appointment</button>
            <button className="mini del" onClick={remove}>{edit.id ? 'Delete' : 'Discard'}</button>
          </div>
        </div>
      )}
    </>
  );
}
