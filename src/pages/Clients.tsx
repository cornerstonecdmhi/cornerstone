import { useEffect, useState } from 'react';
import {
  listClients, saveClient, deleteClient, listChildren, saveChild, deleteChild,
} from '../lib/data';
import { type Client, type Child, DISCIPLINES, CHILD_STATUS, REVIEW_CADENCE } from '../lib/types';

const blankClient = (): Client => ({ name: '', relationship: 'Mother', phone: '', email: '', address: '', consentGiven: false, consentDate: '', source: 'Walk-in', notes: '' });
const blankChild = (): Child => ({ name: '', dob: '', gender: 'Male', parentId: '', concern: '', disciplinesNeeded: [], requirementsNote: '', assignedTherapists: '', caseManager: '', startDate: new Date().toISOString().slice(0, 10), status: 'In Assessment', school: '', notes: '', continuityCritical: false, reviewCadence: 'Monthly', nextReviewDate: '', nextReassessDate: '', assessmentDone: false });

export default function Clients() {
  const [tab, setTab] = useState<'Children' | 'Parents'>('Children');
  const [clients, setClients] = useState<Client[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [child, setChild] = useState<Child | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = async () => {
    try { setClients(await listClients()); } catch { /* preview */ }
    try { setChildren(await listChildren()); } catch { /* preview */ }
  };
  useEffect(() => { load(); }, []);

  const parentName = (id: string) => clients.find((c) => c.id === id)?.name || '—';

  // ── Child form ──
  const saveChildForm = async () => {
    if (!child) return;
    if (!child.name.trim()) return flash('Child name is required.');
    try { const id = await saveChild(child); setChild({ ...child, id }); flash('Child saved.'); await load(); }
    catch { flash('Save failed — deploy + sign in as admin.'); }
  };
  const removeChild = async () => {
    if (!child?.id) { setChild(null); return; }
    try { await deleteChild(child.id); setChild(null); await load(); flash('Child removed.'); }
    catch { flash('Delete failed.'); }
  };
  const toggleDiscipline = (d: string) => {
    if (!child) return;
    const has = child.disciplinesNeeded.includes(d);
    setChild({ ...child, disciplinesNeeded: has ? child.disciplinesNeeded.filter((x) => x !== d) : [...child.disciplinesNeeded, d] });
  };

  // ── Parent form ──
  const saveClientForm = async () => {
    if (!client) return;
    if (!client.name.trim()) return flash('Parent name is required.');
    try { const id = await saveClient(client); setClient({ ...client, id }); flash('Parent saved.'); await load(); }
    catch { flash('Save failed — deploy + sign in as admin.'); }
  };
  const removeClient = async () => {
    if (!client?.id) { setClient(null); return; }
    try { await deleteClient(client.id); setClient(null); await load(); flash('Parent removed.'); }
    catch { flash('Delete failed.'); }
  };

  return (
    <>
      <div className="page-head"><h1>Clients &amp; Children</h1><p className="muted">Parents/guardians, children, requirements and care teams.</p></div>

      <div className="tabs-bar">
        <button className={'tab' + (tab === 'Children' ? ' active' : '')} onClick={() => { setTab('Children'); setChild(null); }}>Children</button>
        <button className={'tab' + (tab === 'Parents' ? ' active' : '')} onClick={() => { setTab('Parents'); setClient(null); }}>Parents</button>
        <span style={{ flex: 1 }} />
        {tab === 'Children' && !child && <button className="btn-primary" onClick={() => setChild(blankChild())}>+ Add child</button>}
        {tab === 'Parents' && !client && <button className="btn-primary" onClick={() => setClient(blankClient())}>+ Add parent</button>}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {/* ── CHILDREN ── */}
      {tab === 'Children' && !child && (
        <div className="card">
          {children.length === 0 && <p className="muted">No children yet. Click “Add child”. (If you just deployed, sign in as an admin to load saved records.)</p>}
          {children.length > 0 && (
            <table className="grid">
              <thead><tr><th>Name</th><th>Parent</th><th>Concern</th><th>Needs</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {children.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b></td>
                    <td>{parentName(c.parentId)}</td>
                    <td>{c.concern}</td>
                    <td>{c.disciplinesNeeded.map((d) => <span className="chip" key={d}>{d}</span>)}</td>
                    <td><span className={'pill ' + c.status.replace(/\s/g, '').toLowerCase()}>{c.status}</span></td>
                    <td className="acts"><button className="mini save" onClick={() => setChild(c)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Children' && child && (
        <div className="card">
          <div className="row-between"><h3>{child.id ? 'Edit child' : 'New child'}</h3>
            <button className="btn-ghost" onClick={() => setChild(null)}>← Back to list</button></div>
          <div className="form-grid">
            <label className="f"><span>Full name *</span><input value={child.name} onChange={(e) => setChild({ ...child, name: e.target.value })} /></label>
            <label className="f"><span>Date of birth</span><input type="date" value={child.dob} onChange={(e) => setChild({ ...child, dob: e.target.value })} /></label>
            <label className="f"><span>Gender</span><select value={child.gender} onChange={(e) => setChild({ ...child, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></label>
            <label className="f"><span>Parent / guardian</span>
              <select value={child.parentId} onChange={(e) => setChild({ ...child, parentId: e.target.value })}>
                <option value="">— link a parent —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            <label className="f"><span>Status</span><select value={child.status} onChange={(e) => setChild({ ...child, status: e.target.value })}>{CHILD_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="f"><span>Start date</span><input type="date" value={child.startDate} onChange={(e) => setChild({ ...child, startDate: e.target.value })} /></label>
            <label className="f"><span>School</span><input value={child.school} onChange={(e) => setChild({ ...child, school: e.target.value })} /></label>
            <label className="f"><span>Case manager (therapist)</span><input value={child.caseManager} onChange={(e) => setChild({ ...child, caseManager: e.target.value })} /></label>
          </div>
          <label className="f full"><span>Primary concern / diagnosis</span><input value={child.concern} onChange={(e) => setChild({ ...child, concern: e.target.value })} /></label>

          <h3 style={{ marginTop: 14 }}>Requirements (drives therapist capacity planning)</h3>
          <div className="chip-pick">
            {DISCIPLINES.map((d) => (
              <button key={d} type="button" className={'chip-btn' + (child.disciplinesNeeded.includes(d) ? ' on' : '')} onClick={() => toggleDiscipline(d)}>{d}</button>
            ))}
          </div>
          <label className="f full"><span>Intensity / notes (e.g. “Speech 3×/week, OT 2×/week”)</span><input value={child.requirementsNote} onChange={(e) => setChild({ ...child, requirementsNote: e.target.value })} /></label>

          <h3 style={{ marginTop: 14 }}>Clinical review &amp; continuity</h3>
          <div className="form-grid">
            <label className="f"><span>Review cadence</span><select value={child.reviewCadence || 'Monthly'} onChange={(e) => setChild({ ...child, reviewCadence: e.target.value })}>{REVIEW_CADENCE.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="f"><span>Next progress review</span><input type="date" value={child.nextReviewDate || ''} onChange={(e) => setChild({ ...child, nextReviewDate: e.target.value })} /></label>
            <label className="f"><span>Next formal re-assessment</span><input type="date" value={child.nextReassessDate || ''} onChange={(e) => setChild({ ...child, nextReassessDate: e.target.value })} /></label>
          </div>
          <label className="chk"><input type="checkbox" checked={!!child.continuityCritical} onChange={(e) => setChild({ ...child, continuityCritical: e.target.checked })} /> Continuity-critical (ASD/developmental) — block therapist swaps; reschedule with the same therapist where possible</label>

          {(child.status === 'Discharged' || child.status === 'Graduated') && (
            <label className="f full"><span>Discharge / graduation note (Rajkumar's decision)</span><textarea rows={2} value={child.dischargeNote || ''} onChange={(e) => setChild({ ...child, dischargeNote: e.target.value })} /></label>
          )}
          <label className="f full"><span>Notes</span><textarea rows={2} value={child.notes} onChange={(e) => setChild({ ...child, notes: e.target.value })} /></label>

          <div className="row-between" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={saveChildForm}>Save child</button>
            <button className="mini del" onClick={removeChild}>{child.id ? 'Delete' : 'Discard'}</button>
          </div>
        </div>
      )}

      {/* ── PARENTS ── */}
      {tab === 'Parents' && !client && (
        <div className="card">
          {clients.length === 0 && <p className="muted">No parents yet. Click “Add parent”.</p>}
          {clients.length > 0 && (
            <table className="grid">
              <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th><th>Consent</th><th></th></tr></thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b></td><td>{c.relationship}</td><td>{c.phone}</td><td>{c.email}</td>
                    <td>{c.consentGiven ? <span className="pill active">Given</span> : <span className="pill onhold">Pending</span>}</td>
                    <td className="acts"><button className="mini save" onClick={() => setClient(c)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Parents' && client && (
        <div className="card">
          <div className="row-between"><h3>{client.id ? 'Edit parent' : 'New parent'}</h3>
            <button className="btn-ghost" onClick={() => setClient(null)}>← Back to list</button></div>
          <div className="form-grid">
            <label className="f"><span>Name *</span><input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} /></label>
            <label className="f"><span>Relationship</span><select value={client.relationship} onChange={(e) => setClient({ ...client, relationship: e.target.value })}><option>Mother</option><option>Father</option><option>Guardian</option><option>Other</option></select></label>
            <label className="f"><span>Phone</span><input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} /></label>
            <label className="f"><span>Email</span><input value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} /></label>
            <label className="f"><span>Source</span><select value={client.source} onChange={(e) => setClient({ ...client, source: e.target.value })}><option>Walk-in</option><option>Website</option><option>Referral</option><option>Phone</option><option>Social Media</option></select></label>
            <label className="f"><span>Consent date</span><input type="date" value={client.consentDate} onChange={(e) => setClient({ ...client, consentDate: e.target.value })} /></label>
          </div>
          <label className="f full"><span>Address</span><input value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} /></label>
          <label className="chk"><input type="checkbox" checked={client.consentGiven} onChange={(e) => setClient({ ...client, consentGiven: e.target.checked })} /> Verifiable parental consent obtained (DPDP)</label>
          <label className="f full"><span>Notes</span><textarea rows={2} value={client.notes} onChange={(e) => setClient({ ...client, notes: e.target.value })} /></label>
          <div className="row-between" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={saveClientForm}>Save parent</button>
            <button className="mini del" onClick={removeClient}>{client.id ? 'Delete' : 'Discard'}</button>
          </div>
        </div>
      )}
    </>
  );
}
