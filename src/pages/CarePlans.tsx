import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import {
  listCarePlans, saveCarePlan, deleteCarePlan, listChildren, listClients, listTherapists,
  listServices, getSettings, saveChild, saveInvoice, saveChildPackage,
} from '../lib/data';
import {
  type CarePlan, type CarePlanTherapy, type Child, type Client, type Therapist, type Service,
  DISCIPLINES, ASSESSMENT_TOOLS, DEFAULT_ASSESSMENT_SERVICES, DEFAULT_SETTINGS,
  CAREPLAN_STATUS, PLAN_TYPES, AUTISM_SCREEN,
} from '../lib/types';
import { dmy, blankInvoice, type InvLine } from '../lib/invoice';

const blank = (assessor: string): CarePlan => ({
  childId: '', childName: '', assessor, date: new Date().toISOString().slice(0, 10),
  opFee: 0, screenIQ: '', screenAutism: 'Not screened', developmentalImpression: '',
  recommendedAssessments: [], therapies: [], intensityNote: '',
  planType: PLAN_TYPES[0], planPrice: 0, scheduleNote: '',
  counsellingNote: '', parentAgreed: false, agreedDate: '', status: 'Proposed', notes: '',
});

export default function CarePlans() {
  const [list, setList] = useState<CarePlan[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [assessorName, setAssessorName] = useState(DEFAULT_SETTINGS.assessorName);
  const [p, setP] = useState<CarePlan | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin'; // invoice creation is admin-only
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async () => { try { setList(await listCarePlans()); } catch { /* preview */ } };
  useEffect(() => {
    load();
    listChildren().then(setChildren).catch(() => {});
    listClients().then(setClients).catch(() => {});
    listTherapists().then(setTherapists).catch(() => {});
    listServices().then(setServices).catch(() => {});
    getSettings().then((s) => setAssessorName(s.assessorName)).catch(() => {});
  }, []);

  // Fee for an assessment, from the priced catalog (Settings → Services).
  const feeFor = (label: string): number => {
    const s = services.find((x) => x.name === label && x.chargeable);
    if (s) return s.price;
    const d = DEFAULT_ASSESSMENT_SERVICES.find((x) => x.name === label);
    return d ? d.price : 0;
  };
  const opServicePrice = (): number => services.find((s) => s.name === 'Initial Consultation (OP)')?.price ?? 1000;

  const startNew = () => {
    const np = blank(assessorName);
    np.opFee = opServicePrice();
    setP(np);
  };

  const assessmentTotal = (p?.recommendedAssessments || []).reduce((s, t) => s + feeFor(t), 0);

  const toggleAssessment = (t: string) => {
    if (!p) return;
    const has = p.recommendedAssessments.includes(t);
    setP({ ...p, recommendedAssessments: has ? p.recommendedAssessments.filter((x) => x !== t) : [...p.recommendedAssessments, t] });
  };
  const addTherapy = () => p && setP({ ...p, therapies: [...p.therapies, { discipline: DISCIPLINES[0], sessionsPerWeek: 2, therapist: '' }] });
  const setTherapyAt = (i: number, patch: Partial<CarePlanTherapy>) =>
    p && setP({ ...p, therapies: p.therapies.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const removeTherapyAt = (i: number) => p && setP({ ...p, therapies: p.therapies.filter((_, j) => j !== i) });

  const parentOf = (childId: string) => {
    const c = children.find((x) => x.id === childId);
    return c ? clients.find((cl) => cl.id === c.parentId) : undefined;
  };

  const save = async () => {
    if (!p) return;
    if (!p.childId) return flash('Pick a child.');
    try { const id = await saveCarePlan(p); setP({ ...p, id }); flash('Care plan saved.'); await load(); }
    catch { flash('Save failed — deploy + sign in as admin.'); }
  };
  const remove = async () => {
    if (!p?.id) { setP(null); return; }
    try { await deleteCarePlan(p.id); setP(null); await load(); flash('Removed.'); }
    catch { flash('Delete failed.'); }
  };

  // Bill the recommended assessment battery to the parent (one line per test).
  const billAssessments = async () => {
    if (!p) return;
    const items: InvLine[] = (p.recommendedAssessments || []).filter((t) => feeFor(t)).map((t) => ({ svc: t, period: '', qty: 1, price: feeFor(t), tax: 'Exempt' }));
    if (!items.length) return flash('No chargeable assessments in this plan.');
    const parent = parentOf(p.childId);
    const inv = blankInvoice('');
    inv.child = p.childName; inv.childId = p.childId;
    inv.billTo = parent ? { name: parent.name, addr: parent.address || '', phone: parent.phone || '', email: parent.email || '' } : { name: p.childName };
    inv.items = items;
    try { const { number } = await saveInvoice(inv); flash(`Assessment invoice ${number} created — ₹${assessmentTotal}.`); }
    catch { flash('Invoice failed — deploy + sign in as admin.'); }
  };

  // Activate the plan → drives the child record (disciplines, intensity, team, review)
  // so scheduling/booking can proceed, and optionally seeds therapy packages.
  const activatePlan = async () => {
    if (!p) return;
    if (!p.parentAgreed) return flash('Mark "parent agreed" before activating the plan.');
    const child = children.find((c) => c.id === p.childId);
    if (!child) return flash('Child not found.');
    try {
      const disciplines = Array.from(new Set(p.therapies.map((t) => t.discipline)));
      const team = p.therapies.filter((t) => t.therapist).map((t) => `${t.discipline}: ${t.therapist}`).join('; ');
      await saveChild({
        ...child,
        disciplinesNeeded: Array.from(new Set([...(child.disciplinesNeeded || []), ...disciplines])),
        requirementsNote: p.intensityNote || child.requirementsNote,
        caseManager: p.assessor,
        assignedTherapists: team || child.assignedTherapists,
        status: child.status === 'In Assessment' ? 'Active' : child.status,
      });
      // Seed one therapy package per discipline (credits ≈ sessions/week × 4 weeks — adjust in Billing).
      for (const t of p.therapies) {
        if (!t.sessionsPerWeek) continue;
        await saveChildPackage({
          childId: p.childId, childName: p.childName,
          packageName: `${t.discipline} — ${p.planType}`, discipline: t.discipline,
          creditsTotal: t.sessionsPerWeek * 4, creditsUsed: 0, pricePaid: 0,
          expiresOn: new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10), status: 'active',
        });
      }
      const next = { ...p, status: 'Active' };
      const id = await saveCarePlan(next);
      setP({ ...next, id }); await load();
      flash('Plan activated — child is Active, packages seeded (adjust credits/price in Billing).');
    } catch { flash('Activate failed — deploy + sign in as admin.'); }
  };

  const eligibleTherapists = (discipline: string) =>
    therapists.filter((t) => t.status === 'Active' && t.specialties.includes(discipline));

  return (
    <>
      <div className="page-head"><h1>Care Plans</h1><p className="muted">Initial consultation &amp; screening → recommended assessments, therapies, plan &amp; pricing — agreed with the parent, then it drives billing &amp; scheduling.</p></div>

      <div className="tabs-bar">
        <span style={{ fontWeight: 600, color: 'var(--teal-dark)' }}>{list.length} care plan{list.length === 1 ? '' : 's'}</span>
        <span style={{ flex: 1 }} />
        {!p && <button className="btn-primary" onClick={startNew}>+ New care plan</button>}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {!p && (
        <div className="card">
          {list.length === 0 && <p className="muted">No care plans yet. After the initial consultation, click “New care plan”.</p>}
          {list.length > 0 && (
            <table className="grid">
              <thead><tr><th>Date</th><th>Child</th><th>Screening</th><th>Plan</th><th>Therapies</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dmy(x.date)}</td>
                    <td><b>{x.childName}</b></td>
                    <td>{x.screenAutism && x.screenAutism !== 'Not screened' ? <span className="chip">{x.screenAutism}</span> : <span className="muted">—</span>}</td>
                    <td>{x.planType}{x.planPrice ? ` · ₹${x.planPrice}` : ''}</td>
                    <td>{x.therapies.map((t) => <span className="chip" key={t.discipline}>{t.discipline} {t.sessionsPerWeek}×</span>)}</td>
                    <td><span className={'pill ' + x.status.toLowerCase()}>{x.status}</span></td>
                    <td className="acts"><button className="mini save" onClick={() => setP(x)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {p && (
        <div className="card">
          <div className="row-between"><h3>{p.id ? 'Care plan' : 'New care plan'}</h3>
            <button className="btn-ghost" onClick={() => setP(null)}>← Back</button></div>

          <div className="form-grid">
            <label className="f"><span>Child *</span>
              <select value={p.childId} onChange={(e) => { const c = children.find((x) => x.id === e.target.value); setP({ ...p, childId: e.target.value, childName: c?.name || '' }); }}>
                <option value="">— select child —</option>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            <label className="f"><span>Assessor</span><input value={p.assessor} onChange={(e) => setP({ ...p, assessor: e.target.value })} /></label>
            <label className="f"><span>Consultation date</span><input type="date" value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} /></label>
            <label className="f"><span>Status</span><select value={p.status} onChange={(e) => setP({ ...p, status: e.target.value })}>{CAREPLAN_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>

          <h3 style={{ marginTop: 16 }}>1 · Initial consultation &amp; quick screening</h3>
          <div className="form-grid">
            <label className="f"><span>OP consultation fee ₹</span><input type="number" value={p.opFee} onChange={(e) => setP({ ...p, opFee: +e.target.value })} /></label>
            <label className="f"><span>IQ / DQ screen</span><input value={p.screenIQ} onChange={(e) => setP({ ...p, screenIQ: e.target.value })} placeholder="e.g. DQ ~75 — mild delay" /></label>
            <label className="f"><span>Autism screen</span><select value={p.screenAutism} onChange={(e) => setP({ ...p, screenAutism: e.target.value })}>{AUTISM_SCREEN.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <label className="f full"><span>Developmental-phase impression</span><textarea rows={2} value={p.developmentalImpression} onChange={(e) => setP({ ...p, developmentalImpression: e.target.value })} placeholder="Summary to gauge developmental phase and what to assess next." /></label>

          <h3 style={{ marginTop: 16 }}>2 · Recommended assessment battery</h3>
          <div className="chip-pick">
            {ASSESSMENT_TOOLS.filter((t) => t !== 'Other').map((t) => (
              <button key={t} type="button" className={'chip-btn' + (p.recommendedAssessments.includes(t) ? ' on' : '')} onClick={() => toggleAssessment(t)} title={feeFor(t) ? `₹${feeFor(t)}` : 'no catalog fee'}>{t}</button>
            ))}
          </div>
          {p.recommendedAssessments.length > 0 && (
            <div className="row-between" style={{ marginTop: 8 }}>
              <b>Assessment fee total: ₹{assessmentTotal}</b>
              {isAdmin && <button className="btn-ghost" onClick={billAssessments}>Create assessment invoice (₹{assessmentTotal})</button>}
            </div>
          )}

          <h3 style={{ marginTop: 16 }}>3 · Recommended therapies &amp; intensity</h3>
          {p.therapies.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Add the therapies you recommend, with sessions/week and the therapist.</p>}
          {p.therapies.map((t, i) => (
            <div className="li-card" key={i}>
              <div className="li-3" style={{ gridTemplateColumns: '1fr 120px 1fr 90px' }}>
                <label className="f"><span>Discipline</span>
                  <select value={t.discipline} onChange={(e) => setTherapyAt(i, { discipline: e.target.value, therapist: '' })}>{DISCIPLINES.map((d) => <option key={d}>{d}</option>)}</select></label>
                <label className="f"><span>Sessions / week</span><input type="number" min={0} value={t.sessionsPerWeek} onChange={(e) => setTherapyAt(i, { sessionsPerWeek: +e.target.value })} /></label>
                <label className="f"><span>Therapist</span>
                  <select value={t.therapist || ''} onChange={(e) => setTherapyAt(i, { therapist: e.target.value })}>
                    <option value="">— assign later —</option>
                    {eligibleTherapists(t.discipline).map((th) => <option key={th.id}>{th.name}</option>)}
                  </select></label>
                <label className="f"><span>&nbsp;</span><button className="mini del" onClick={() => removeTherapyAt(i)}>Remove</button></label>
              </div>
            </div>
          ))}
          <button className="add-line" onClick={addTherapy}>+ Add therapy</button>
          <label className="f full" style={{ marginTop: 10 }}><span>Intensity note</span><input value={p.intensityNote} onChange={(e) => setP({ ...p, intensityNote: e.target.value })} placeholder="e.g. Speech 3×/week, OT 2×/week" /></label>

          <h3 style={{ marginTop: 16 }}>4 · Plan, pricing &amp; slots</h3>
          <div className="form-grid">
            <label className="f"><span>Plan type</span><select value={p.planType} onChange={(e) => setP({ ...p, planType: e.target.value })}>{PLAN_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="f"><span>Plan price ₹ (per period)</span><input type="number" value={p.planPrice} onChange={(e) => setP({ ...p, planPrice: +e.target.value })} /></label>
          </div>
          <label className="f full"><span>Agreed slots / timings</span><input value={p.scheduleNote} onChange={(e) => setP({ ...p, scheduleNote: e.target.value })} placeholder="e.g. Mon/Wed/Fri 4:00 PM Speech; Tue/Thu 5:00 PM OT" /></label>
          <div className="hint-note">Recurring/combo pricing rules are being finalised with the clinic — the plan type &amp; price here are captured as agreed; package credits seeded on activation are an estimate you can adjust in Billing.</div>

          <h3 style={{ marginTop: 16 }}>5 · Parent counselling &amp; agreement</h3>
          <label className="f full"><span>Counselling note (what was explained to the parent)</span><textarea rows={2} value={p.counsellingNote} onChange={(e) => setP({ ...p, counsellingNote: e.target.value })} /></label>
          <div className="form-grid">
            <label className="f"><span>Agreed date</span><input type="date" value={p.agreedDate} onChange={(e) => setP({ ...p, agreedDate: e.target.value })} /></label>
          </div>
          <label className="chk"><input type="checkbox" checked={p.parentAgreed} onChange={(e) => setP({ ...p, parentAgreed: e.target.checked, agreedDate: e.target.checked && !p.agreedDate ? new Date().toISOString().slice(0, 10) : p.agreedDate })} /> Parent has agreed to this care plan &amp; pricing</label>
          <label className="f full"><span>Notes</span><textarea rows={2} value={p.notes} onChange={(e) => setP({ ...p, notes: e.target.value })} /></label>

          <div className="row-between" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={save}>Save</button>
              <button className="btn-ghost" onClick={activatePlan} disabled={!p.parentAgreed} title={p.parentAgreed ? 'Drive the child record + seed packages' : 'Mark parent agreed first'}>Activate plan</button>
            </div>
            <button className="mini del" onClick={remove}>{p.id ? 'Delete' : 'Discard'}</button>
          </div>
        </div>
      )}
    </>
  );
}
