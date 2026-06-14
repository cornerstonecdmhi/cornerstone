import { useEffect, useState } from 'react';
import { listGoals, saveGoal, deleteGoal, listChildren } from '../lib/data';
import { type Goal, type Child, DISCIPLINES, GOAL_STATUS, GAS_LABELS, ICF_DOMAINS } from '../lib/types';

const SCORES = [-2, -1, 0, 1, 2];
const blank = (): Goal => ({
  childId: '', childName: '', discipline: 'Speech Therapy', description: '', icfDomain: ICF_DOMAINS[0],
  baseline: '', target: '', gasScore: -2, history: [], status: 'Active', therapist: '',
  setDate: new Date().toISOString().slice(0, 10), reviewDate: '',
});

export default function Goals() {
  const [list, setList] = useState<Goal[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [g, setG] = useState<Goal | null>(null);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = async () => { try { setList(await listGoals()); } catch { /* preview */ } };
  useEffect(() => { load(); listChildren().then(setChildren).catch(() => {}); }, []);

  const setScore = (score: number) => {
    if (!g) return;
    const today = new Date().toISOString().slice(0, 10);
    const history = [...(g.history || [])];
    if (history[history.length - 1]?.score !== score) history.push({ date: today, score });
    setG({ ...g, gasScore: score, history, status: score >= 2 ? 'Achieved' : g.status });
  };
  const save = async () => {
    if (!g) return;
    if (!g.childId) return flash('Pick a child.');
    if (!g.description.trim()) return flash('Describe the goal.');
    try { const id = await saveGoal(g); setG({ ...g, id }); flash('Goal saved.'); await load(); }
    catch { flash('Save failed — deploy + sign in as admin.'); }
  };
  const remove = async () => {
    if (!g?.id) { setG(null); return; }
    try { await deleteGoal(g.id); setG(null); await load(); flash('Removed.'); }
    catch { flash('Delete failed.'); }
  };

  return (
    <>
      <div className="page-head"><h1>Goals</h1><p className="muted">SMART goals mapped to ICF-CY domains, tracked with Goal Attainment Scaling (GAS).</p></div>
      <div className="tabs-bar">
        <span style={{ fontWeight: 600, color: 'var(--teal-dark)' }}>{list.length} goal{list.length === 1 ? '' : 's'}</span>
        <span style={{ flex: 1 }} />
        {!g && <button className="btn-primary" onClick={() => setG(blank())}>+ Add goal</button>}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {!g && (
        <div className="card">
          {list.length === 0 && <p className="muted">No goals yet. Click “Add goal”.</p>}
          {list.length > 0 && (
            <table className="grid">
              <thead><tr><th>Child</th><th>Discipline</th><th>Goal</th><th>GAS</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id}>
                    <td><b>{x.childName}</b></td><td>{x.discipline}</td><td>{x.description}</td>
                    <td><span className={'gas g' + (x.gasScore + 2)}>{x.gasScore > 0 ? '+' : ''}{x.gasScore}</span></td>
                    <td><span className={'pill ' + x.status.replace(/\s/g, '').toLowerCase()}>{x.status}</span></td>
                    <td className="acts"><button className="mini save" onClick={() => setG(x)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {g && (
        <div className="card">
          <div className="row-between"><h3>{g.id ? 'Edit goal' : 'New goal'}</h3>
            <button className="btn-ghost" onClick={() => setG(null)}>← Back</button></div>
          <div className="form-grid">
            <label className="f"><span>Child *</span>
              <select value={g.childId} onChange={(e) => { const c = children.find((x) => x.id === e.target.value); setG({ ...g, childId: e.target.value, childName: c?.name || '' }); }}>
                <option value="">— select child —</option>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            <label className="f"><span>Discipline</span><select value={g.discipline} onChange={(e) => setG({ ...g, discipline: e.target.value })}>{DISCIPLINES.map((d) => <option key={d}>{d}</option>)}</select></label>
            <label className="f"><span>ICF-CY domain</span><select value={g.icfDomain} onChange={(e) => setG({ ...g, icfDomain: e.target.value })}>{ICF_DOMAINS.map((d) => <option key={d}>{d}</option>)}</select></label>
            <label className="f"><span>Therapist</span><input value={g.therapist} onChange={(e) => setG({ ...g, therapist: e.target.value })} /></label>
            <label className="f"><span>Set date</span><input type="date" value={g.setDate} onChange={(e) => setG({ ...g, setDate: e.target.value })} /></label>
            <label className="f"><span>Review date</span><input type="date" value={g.reviewDate} onChange={(e) => setG({ ...g, reviewDate: e.target.value })} /></label>
          </div>
          <label className="f full"><span>Goal (SMART) *</span><input value={g.description} onChange={(e) => setG({ ...g, description: e.target.value })} placeholder="Specific, measurable, time-bound…" /></label>
          <div className="form-grid">
            <label className="f"><span>Baseline</span><input value={g.baseline} onChange={(e) => setG({ ...g, baseline: e.target.value })} /></label>
            <label className="f"><span>Target</span><input value={g.target} onChange={(e) => setG({ ...g, target: e.target.value })} /></label>
            <label className="f"><span>Status</span><select value={g.status} onChange={(e) => setG({ ...g, status: e.target.value })}>{GOAL_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>

          <h3 style={{ marginTop: 14 }}>Goal Attainment Scaling (current level)</h3>
          <div className="gas-pick">
            {SCORES.map((sc) => (
              <button key={sc} type="button" className={'gas-btn g' + (sc + 2) + (g.gasScore === sc ? ' on' : '')} onClick={() => setScore(sc)}>{GAS_LABELS[sc]}</button>
            ))}
          </div>
          {g.history?.length > 0 && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Progress: {g.history.map((h) => `${h.date}: ${h.score > 0 ? '+' : ''}${h.score}`).join('  →  ')}</div>}

          <div className="row-between" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={save}>Save goal</button>
            <button className="mini del" onClick={remove}>{g.id ? 'Delete' : 'Discard'}</button>
          </div>
        </div>
      )}
    </>
  );
}
