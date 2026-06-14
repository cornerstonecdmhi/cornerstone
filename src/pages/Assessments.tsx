import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth';
import {
  listAssessments, saveAssessment, deleteAssessment, listChildren, listTherapists,
  saveChild, getSettings, listServices, saveInvoice, listClients,
} from '../lib/data';
import {
  type Assessment, type Child, type Client, type Therapist, type Service, type AssessToolScore,
  DISCIPLINES, ASSESSMENT_STATUS, ASSESSMENT_TOOLS, DEFAULT_SETTINGS, DEFAULT_ASSESSMENT_SERVICES,
} from '../lib/types';
import { dmy, blankInvoice, type InvLine } from '../lib/invoice';
import { instrumentForTool } from '../lib/instruments';
import { openAssessmentPrint } from '../lib/assessmentPrint';
import InstrumentForm from '../components/InstrumentForm';

const blank = (assessor: string): Assessment => ({
  childId: '', childName: '', assessor, date: new Date().toISOString().slice(0, 10), tool: ASSESSMENT_TOOLS[0],
  tools: [], findings: '', impression: '', recommendedDisciplines: [], intensity: '', assignedTeam: [], status: 'Scheduled',
});

export default function Assessments() {
  const [list, setList] = useState<Assessment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [assessorName, setAssessorName] = useState(DEFAULT_SETTINGS.assessorName);
  const [assessorCred, setAssessorCred] = useState(DEFAULT_SETTINGS.assessorCredential);
  const [a, setA] = useState<Assessment | null>(null);
  const [openTool, setOpenTool] = useState<number | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin'; // invoice creation is admin-only (Cloud Function enforces it too)
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  // Assessment-to-assessment tracking: group scored tools by child + instrument,
  // ordered over time. Any child with ≥2 administrations of the same scored tool
  // gets a baseline → latest progression. (Severity scales like ISAA/CARS: a lower
  // score = less severe = improvement.)
  const progress = useMemo(() => {
    const map = new Map<string, { childName: string; tool: string; points: { date: string; total: number; band: string }[] }>();
    for (const a of list) {
      for (const t of a.tools || []) {
        if (!t.autoScored || typeof t.total !== 'number') continue;
        const key = a.childId + '|' + t.tool;
        if (!map.has(key)) map.set(key, { childName: a.childName, tool: t.tool, points: [] });
        map.get(key)!.points.push({ date: a.date, total: t.total, band: t.band || '' });
      }
    }
    return [...map.values()]
      .map((g) => ({ ...g, points: g.points.sort((x, y) => (x.date || '').localeCompare(y.date || '')) }))
      .filter((g) => g.points.length >= 2);
  }, [list]);

  const load = async () => { try { setList(await listAssessments()); } catch { /* preview */ } };
  useEffect(() => {
    load();
    listChildren().then(setChildren).catch(() => {});
    listClients().then(setClients).catch(() => {});
    listTherapists().then(setTherapists).catch(() => {});
    listServices().then(setServices).catch(() => {});
    getSettings().then((s) => { setAssessorName(s.assessorName); setAssessorCred(s.assessorCredential); }).catch(() => {});
  }, []);

  // Each assessment carries its own fee, looked up from the priced catalog (Settings → Services).
  const feeFor = (label: string): number => {
    const s = services.find((x) => x.name === label && x.chargeable);
    if (s) return s.price;
    const d = DEFAULT_ASSESSMENT_SERVICES.find((x) => x.name === label);
    return d ? d.price : 0;
  };

  const toggleDiscipline = (d: string) => {
    if (!a) return;
    const has = a.recommendedDisciplines.includes(d);
    const recommendedDisciplines = has ? a.recommendedDisciplines.filter((x) => x !== d) : [...a.recommendedDisciplines, d];
    const assignedTeam = a.assignedTeam.filter((t) => recommendedDisciplines.includes(t.discipline));
    setA({ ...a, recommendedDisciplines, assignedTeam });
  };
  const setTeam = (discipline: string, therapist: string) => {
    if (!a) return;
    const others = a.assignedTeam.filter((t) => t.discipline !== discipline);
    setA({ ...a, assignedTeam: therapist ? [...others, { discipline, therapist }] : others });
  };
  const teamFor = (d: string) => a?.assignedTeam.find((t) => t.discipline === d)?.therapist || '';

  // Battery of standardized tools (each with its own digital form, score and fee).
  const addTool = () => a && setA({ ...a, tools: [...(a.tools || []), { tool: ASSESSMENT_TOOLS[0], score: '', interpretation: '', fee: feeFor(ASSESSMENT_TOOLS[0]) }] });
  const setToolAt = (i: number, patch: Partial<AssessToolScore>) =>
    a && setA({ ...a, tools: (a.tools || []).map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const removeToolAt = (i: number) => { a && setA({ ...a, tools: (a.tools || []).filter((_, j) => j !== i) }); setOpenTool(null); };

  const totalFee = (a?.tools || []).reduce((s, t) => s + (t.fee || 0), 0);

  const billAssessment = async () => {
    if (!a) return;
    const items: InvLine[] = (a.tools || []).filter((t) => t.fee).map((t) => ({ svc: t.tool, period: '', qty: 1, price: t.fee || 0, tax: 'Exempt' }));
    if (!items.length) return flash('No chargeable assessments to bill.');
    const child = children.find((c) => c.id === a.childId);
    const parent = child ? clients.find((c) => c.id === child.parentId) : undefined;
    const inv = blankInvoice('');
    inv.child = a.childName;
    inv.childId = a.childId;
    inv.billTo = parent
      ? { name: parent.name, addr: parent.address || '', phone: parent.phone || '', email: parent.email || '' }
      : { name: a.childName, addr: '', phone: '', email: '' };
    inv.items = items;
    try { const { number } = await saveInvoice(inv); flash(`Invoice ${number} created — ₹${totalFee}.`); }
    catch { flash('Invoice failed — deploy + sign in as admin.'); }
  };

  const save = async () => {
    if (!a) return;
    if (!a.childId) return flash('Pick a child.');
    try {
      const id = await saveAssessment(a);
      // Completing an assessment clears the booking gate; assigning the care team
      // onboards the child → Active and sets the case manager.
      const child = children.find((c) => c.id === a.childId);
      if (child) {
        const patch: Partial<Child> = {};
        if (a.status === 'Completed') patch.assessmentDone = true;
        if (a.assignedTeam.length) {
          patch.assessmentDone = true;
          patch.assignedTherapists = a.assignedTeam.map((t) => `${t.discipline}: ${t.therapist}`).join('; ');
          patch.caseManager = a.assessor;
          patch.status = 'Active';
          patch.disciplinesNeeded = Array.from(new Set([...(child.disciplinesNeeded || []), ...a.recommendedDisciplines]));
        }
        if (Object.keys(patch).length) await saveChild({ ...child, ...patch });
      }
      setA({ ...a, id });
      flash(a.assignedTeam.length ? 'Assessment saved & care team assigned.' : 'Assessment saved.');
      await load();
    } catch { flash('Save failed — deploy + sign in as admin.'); }
  };
  const remove = async () => {
    if (!a?.id) { setA(null); return; }
    try { await deleteAssessment(a.id); setA(null); await load(); flash('Removed.'); }
    catch { flash('Delete failed.'); }
  };

  return (
    <>
      <div className="page-head"><h1>Assessments</h1><p className="muted">Digital assessment battery, auto-scored &amp; individually priced — by {assessorName}, {assessorCred}.</p></div>

      <div className="tabs-bar">
        <span style={{ fontWeight: 600, color: 'var(--teal-dark)' }}>{list.length} assessment{list.length === 1 ? '' : 's'}</span>
        <span style={{ flex: 1 }} />
        {!a && <button className="btn-primary" onClick={() => { setA(blank(assessorName)); setOpenTool(null); }}>+ New assessment</button>}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {!a && progress.length > 0 && (
        <div className="card">
          <h3>Progress over time <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· re-assessment tracking</span></h3>
          <table className="grid">
            <thead><tr><th>Child</th><th>Instrument</th><th>Progression (oldest → latest)</th><th>Change</th></tr></thead>
            <tbody>
              {progress.map((g, i) => {
                const first = g.points[0], last = g.points[g.points.length - 1];
                const delta = last.total - first.total;
                const improved = delta < 0; // lower severity score = improvement
                return (
                  <tr key={i}>
                    <td><b>{g.childName}</b></td>
                    <td>{g.tool}</td>
                    <td>{g.points.map((pt, j) => (
                      <span key={j}>
                        {j > 0 && <span className="muted"> → </span>}
                        <span title={pt.date}>{dmy(pt.date)}: <b>{pt.total}</b>{pt.band ? ` (${pt.band})` : ''}</span>
                      </span>
                    ))}</td>
                    <td>{delta === 0
                      ? <span className="muted">no change</span>
                      : <span className={'pill ' + (improved ? 'attended' : 'noshow')}>{improved ? '▼ ' : '▲ '}{Math.abs(delta)}{improved ? ' improved' : ' increased'}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Severity scales (ISAA/CARS): a lower score means lower severity — i.e. improvement.</p>
        </div>
      )}

      {!a && (
        <div className="card">
          {list.length === 0 && <p className="muted">No assessments yet. Click “New assessment”.</p>}
          {list.length > 0 && (
            <table className="grid">
              <thead><tr><th>Date</th><th>Child</th><th>Battery</th><th>Result</th><th>Recommended</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((x) => {
                  const scored = (x.tools || []).filter((t) => t.autoScored && t.band);
                  return (
                    <tr key={x.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{dmy(x.date)}</td>
                      <td><b>{x.childName}</b></td>
                      <td>{x.tools && x.tools.length ? `${x.tools.length} test${x.tools.length === 1 ? '' : 's'}` : x.tool}</td>
                      <td>{scored.map((t, i) => <span className="chip" key={i} title={t.tool}>{t.band}</span>)}</td>
                      <td>{x.recommendedDisciplines.map((d) => <span className="chip" key={d}>{d}</span>)}</td>
                      <td><span className={'pill ' + (x.status === 'Completed' ? 'attended' : 'scheduled')}>{x.status}</span></td>
                      <td className="acts"><button className="mini save" onClick={() => { setA(x); setOpenTool(null); }}>Open</button> <button className="mini" title="Download / print" onClick={() => openAssessmentPrint(x)}>⤓</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {a && (
        <div className="card">
          <div className="row-between"><h3>{a.id ? 'Assessment' : 'New assessment'}</h3>
            <button className="btn-ghost" onClick={() => { setA(null); setOpenTool(null); }}>← Back</button></div>
          <div className="form-grid">
            <label className="f"><span>Child *</span>
              <select value={a.childId} onChange={(e) => { const c = children.find((x) => x.id === e.target.value); setA({ ...a, childId: e.target.value, childName: c?.name || '' }); }}>
                <option value="">— select child —</option>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            <label className="f"><span>Assessor</span><input value={a.assessor} onChange={(e) => setA({ ...a, assessor: e.target.value })} /></label>
            <label className="f"><span>Date</span><input type="date" value={a.date} onChange={(e) => setA({ ...a, date: e.target.value })} /></label>
            <label className="f"><span>Status</span><select value={a.status} onChange={(e) => setA({ ...a, status: e.target.value })}>{ASSESSMENT_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" checked={!!a.sharedWithParent} onChange={(e) => setA({ ...a, sharedWithParent: e.target.checked })} /> Share this report in the parent's portal (they can view &amp; download it)</label>

          <div className="row-between" style={{ marginTop: 14 }}><h3 style={{ margin: 0 }}>Tests administered, scores &amp; fees</h3>
            <button className="btn-ghost" onClick={addTool}>+ Add test</button></div>
          {(a.tools || []).length === 0 && <p className="muted" style={{ fontSize: 12 }}>Add each test. Standardized tools (ISAA, CARS, Multiple Intelligence, Kolb…) open a digital form that auto-scores; others record the instrument's own score. Each test carries its own fee.</p>}

          {(a.tools || []).map((tl, i) => {
            const inst = instrumentForTool(tl.tool);
            const open = openTool === i;
            const hasData = tl.autoScored || (tl.responses && Object.keys(tl.responses).length > 0);
            return (
              <div className="li-card" key={i}>
                <div className="li-3" style={{ gridTemplateColumns: '1fr 110px' }}>
                  <label className="f"><span>Test</span>
                    <select value={tl.tool} onChange={(e) => setToolAt(i, { tool: e.target.value, fee: feeFor(e.target.value), responses: {}, score: '', interpretation: '', band: undefined, bandClass: undefined, total: undefined, domains: undefined, autoScored: false })}>
                      {ASSESSMENT_TOOLS.map((t) => <option key={t}>{t}</option>)}
                    </select></label>
                  <label className="f"><span>Fee ₹</span><input type="number" value={tl.fee ?? 0} onChange={(e) => setToolAt(i, { fee: +e.target.value })} /></label>
                </div>
                <div className="li-3" style={{ gridTemplateColumns: '180px 1fr' }}>
                  <label className="f"><span>Score{tl.autoScored ? ' (auto)' : ''}</span>
                    <input value={tl.score} readOnly={!!tl.autoScored} onChange={(e) => setToolAt(i, { score: e.target.value })} placeholder="e.g. DQ 72 / IQ 85 / mild" /></label>
                  <label className="f"><span>Interpretation</span><input value={tl.interpretation} onChange={(e) => setToolAt(i, { interpretation: e.target.value })} /></label>
                </div>
                <div className="row-between">
                  {inst
                    ? <button className="btn-ghost" onClick={() => setOpenTool(open ? null : i)}>{open ? '▾ Hide digital form' : (hasData ? '▸ Edit digital form' : '▸ Open digital form')}</button>
                    : <span className="muted" style={{ fontSize: 12 }}>Free-text score (no structured form for this tool yet)</span>}
                  <button className="mini del" onClick={() => removeToolAt(i)}>Remove test</button>
                </div>
                {inst && open && <InstrumentForm inst={inst} value={tl} onChange={(v) => setToolAt(i, v)} />}
              </div>
            );
          })}

          {(a.tools || []).length > 0 && (
            <div className="row-between" style={{ marginTop: 8, padding: '10px 0 2px', borderTop: '1px solid #e4e9ee' }}>
              <b>Assessment fee total: ₹{totalFee}</b>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" onClick={() => openAssessmentPrint(a)}>⤓ Download / print (form format)</button>
                {isAdmin && <button className="btn-ghost" onClick={billAssessment}>Create invoice (₹{totalFee})</button>}
              </div>
            </div>
          )}

          <label className="f full" style={{ marginTop: 14 }}><span>Findings (case-history summary)</span><textarea rows={2} value={a.findings} onChange={(e) => setA({ ...a, findings: e.target.value })} /></label>
          <label className="f full"><span>Clinical impression / diagnosis</span><input value={a.impression} onChange={(e) => setA({ ...a, impression: e.target.value })} /></label>

          <h3 style={{ marginTop: 14 }}>Recommended disciplines</h3>
          <div className="chip-pick">
            {DISCIPLINES.map((d) => <button key={d} type="button" className={'chip-btn' + (a.recommendedDisciplines.includes(d) ? ' on' : '')} onClick={() => toggleDiscipline(d)}>{d}</button>)}
          </div>
          <label className="f full"><span>Recommended intensity</span><input value={a.intensity} onChange={(e) => setA({ ...a, intensity: e.target.value })} placeholder="e.g. Speech 3×/week, OT 2×/week" /></label>

          {a.recommendedDisciplines.length > 0 && (
            <>
              <h3 style={{ marginTop: 14 }}>Assign care team</h3>
              <div className="form-grid">
                {a.recommendedDisciplines.map((d) => (
                  <label className="f" key={d}><span>{d}</span>
                    <select value={teamFor(d)} onChange={(e) => setTeam(d, e.target.value)}>
                      <option value="">— assign therapist —</option>
                      {therapists.filter((t) => t.status === 'Active' && t.specialties.includes(d)).map((t) => <option key={t.id}>{t.name}</option>)}
                    </select></label>
                ))}
              </div>
              <div className="hint-note">Assigning therapists onboards the child (status → Active) and sets {assessorName} as case manager.</div>
            </>
          )}

          <div className="row-between" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={save}>Save{a.assignedTeam.length ? ' & assign' : ''}</button>
            <button className="mini del" onClick={remove}>{a.id ? 'Delete' : 'Discard'}</button>
          </div>
        </div>
      )}
    </>
  );
}
