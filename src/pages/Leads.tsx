import { useEffect, useState } from 'react';
import { listLeads, saveLead, deleteLead, listServices, listWebsiteSubmissions, saveClient, saveChild, sendNotification } from '../lib/data';
import { type Lead, type Service, type WebSubmission, LEAD_STATUS, LEAD_SOURCE, PAYMENT_STATUS } from '../lib/types';
import { dmy, fmt } from '../lib/invoice';

const todayStr = () => new Date().toISOString().slice(0, 10);

const blank = (): Lead => ({
  parentName: '', phone: '', email: '', childName: '', concern: '', service: '',
  source: 'Phone', status: 'New', appointmentDate: '', appointmentTime: '', fee: 0, paymentStatus: 'NA', notes: '',
});

export default function Leads() {
  const [list, setList] = useState<Lead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [l, setL] = useState<Lead | null>(null);
  const [tab, setTab] = useState<'leads' | 'web'>('leads');
  const [web, setWeb] = useState<WebSubmission[]>([]);
  const [done, setDone] = useState<Record<string, string>>({}); // imported/onboarded markers
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async () => { try { setList(await listLeads()); } catch { /* preview */ } };
  const loadWeb = async () => { try { setWeb(await listWebsiteSubmissions()); } catch { /* preview */ } };
  useEffect(() => { load(); loadWeb(); listServices().then(setServices).catch(() => {}); }, []);

  const importToLead = async (w: WebSubmission) => {
    try {
      await saveLead({ parentName: w.parentName, phone: w.phone, email: w.email, childName: w.childName, concern: w.concern, service: w.service, source: 'Website', status: 'New', appointmentDate: w.date, appointmentTime: w.time, fee: 0, paymentStatus: 'NA', notes: `${w.sourceLabel}${w.concern ? ' — ' + w.concern : ''}` });
      setDone((d) => ({ ...d, [w.id]: 'Imported → Lead' })); flash('Imported to Leads.'); await load();
    } catch { flash('Import failed — deploy + sign in.'); }
  };
  const onboard = async (w: WebSubmission) => {
    try {
      const r = w.raw as Record<string, string>;
      const cid = await saveClient({ name: w.parentName, relationship: r.parentRelation || 'Parent', phone: w.phone, email: w.email, address: r.parentAddress || '', consentGiven: w.hasConsents, consentDate: r.dateSigned || '', source: 'Website', notes: 'Onboarded from website intake form' });
      await saveChild({ name: w.childName, dob: r.childDob || '', gender: r.childSex || '', parentId: cid, concern: w.concern, disciplinesNeeded: [], requirementsNote: '', assignedTherapists: '', caseManager: '', startDate: todayStr(), status: 'In Assessment', school: r.childSchool || '', notes: r.history || '' });
      setDone((d) => ({ ...d, [w.id]: 'Onboarded → Client + Child' })); flash('Onboarded: client + child created' + (w.hasConsents ? ' (consent captured).' : '.'));
    } catch { flash('Onboard failed — deploy + sign in.'); }
  };

  const save = async () => {
    if (!l) return;
    if (!l.parentName.trim() && !l.phone.trim()) return flash('Add a name or phone.');
    try { const id = await saveLead(l); setL({ ...l, id }); flash('Lead saved.'); await load(); }
    catch { flash('Save failed — deploy + sign in as admin.'); }
  };
  const remove = async () => {
    if (!l?.id) { setL(null); return; }
    try { await deleteLead(l.id); setL(null); await load(); flash('Removed.'); }
    catch { flash('Delete failed.'); }
  };

  const website = list.filter((x) => x.source === 'Website');
  const websitePaid = website.filter((x) => x.paymentStatus === 'Paid');
  const websiteRevenue = websitePaid.reduce((a, x) => a + (+x.fee || 0), 0);

  // Speed-to-lead: flag uncontacted New leads by age.
  const ageMin = (c?: unknown) => (c ? Math.floor((Date.now() - Number(c)) / 60000) : null);
  const sla = (x: Lead) => {
    if (x.status !== 'New') return null;
    const m = ageMin(x.createdAt); if (m == null) return null;
    if (m > 30) return <span className="pill noshow" style={{ marginLeft: 4 }}>overdue {m}m</span>;
    if (m > 10) return <span className="pill onhold" style={{ marginLeft: 4 }}>{m}m</span>;
    return <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>{m}m</span>;
  };
  const ack = async (x: Lead) => {
    try {
      await sendNotification({ channel: 'whatsapp', to: x.phone, name: x.parentName, recipientName: x.parentName, type: 'Acknowledgement', message: `Hi ${x.parentName || 'there'}, thanks for reaching out to Cornerstone — our team will call you shortly to confirm your appointment with Rajkumar.` });
      flash('Acknowledgement sent.');
    } catch { flash('Send failed — deploy + configure WhatsApp.'); }
  };

  return (
    <>
      <div className="page-head"><h1>Leads &amp; Intake</h1><p className="muted">Enquiries from website, phone &amp; walk-ins — confirm, charge, and onboard.</p></div>

      <div className="tabs-bar">
        <button className={'tab' + (tab === 'leads' ? ' active' : '')} onClick={() => setTab('leads')}>Leads ({list.length})</button>
        <button className={'tab' + (tab === 'web' ? ' active' : '')} onClick={() => { setTab('web'); loadWeb(); }}>Website Inbox ({web.length})</button>
        <span style={{ flex: 1 }} />
        {tab === 'leads' && !l && <button className="btn-primary" onClick={() => setL(blank())}>+ Add lead</button>}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {tab === 'leads' && !l && (
        <div className="kpi-row">
          <div className="kpi"><div className="kpi-val">{list.length}</div><div className="kpi-label">Total leads</div></div>
          <div className="kpi teal"><div className="kpi-val">{website.length}</div><div className="kpi-label">From website</div></div>
          <div className="kpi teal"><div className="kpi-val">{websitePaid.length}</div><div className="kpi-label">Website paid appointments</div></div>
          <div className="kpi teal"><div className="kpi-val">₹ {fmt(websiteRevenue)}</div><div className="kpi-label">Website appt revenue</div></div>
        </div>
      )}

      {tab === 'leads' && !l && (
        <div className="card">
          {list.length === 0 && <p className="muted">No leads yet. Import from the Website Inbox tab, or add one.</p>}
          {list.length > 0 && (
            <table className="grid">
              <thead><tr><th>Received</th><th>Parent</th><th>Child</th><th>Service</th><th>Source</th><th>Payment</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{x.createdAt ? dmy(new Date(Number(x.createdAt)).toISOString()) : ''}</td>
                    <td><b>{x.parentName}</b><div className="muted" style={{ fontSize: 11 }}>{x.phone}</div></td>
                    <td>{x.childName}</td>
                    <td>{x.service || x.concern}</td>
                    <td>{x.source === 'Website' ? <span className="chip" style={{ background: '#fff4e6', color: 'var(--orange)' }}>Website</span> : x.source}</td>
                    <td>{x.paymentStatus === 'Paid' ? <span className="pill attended">Paid ₹{x.fee}</span> : <span className="muted">{x.paymentStatus}</span>}</td>
                    <td><span className={'pill ' + x.status.toLowerCase()}>{x.status}</span>{sla(x)}</td>
                    <td className="acts">{x.status === 'New' && x.phone && <button className="mini" style={{ background: 'var(--panel)', color: 'var(--teal)' }} onClick={() => ack(x)}>Ack</button>}<button className="mini save" onClick={() => setL(x)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'web' && (
        <div className="card">
          <div className="hint-note" style={{ marginBottom: 12 }}>Live read of your website's own form collections (appointments · intake bookings · contacts · referrals). <b>Import → Lead</b> an enquiry, or <b>Onboard</b> a full intake straight to a Client + Child (consent carried over).</div>
          {web.length === 0 && <p className="muted">No website submissions found (or not yet deployed/readable).</p>}
          {web.length > 0 && (
            <table className="grid">
              <thead><tr><th>Received</th><th>Source</th><th>Parent / Child</th><th>Contact</th><th>Concern / Service</th><th></th></tr></thead>
              <tbody>
                {web.map((w) => (
                  <tr key={w.coll + w.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{w.createdAt ? dmy(typeof w.createdAt === 'string' ? w.createdAt : new Date(Number(w.createdAt)).toISOString()) : ''}</td>
                    <td><span className="chip" style={{ background: '#fff4e6', color: 'var(--orange)' }}>{w.sourceLabel}</span>{w.hasConsents && <span className="pill attended" style={{ marginLeft: 4 }}>Consent ✓</span>}</td>
                    <td><b>{w.parentName || '—'}</b>{w.childName && <div className="muted" style={{ fontSize: 11 }}>Child: {w.childName}</div>}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{w.phone}<br />{w.email}</td>
                    <td>{w.service || w.concern}{w.date && <div className="muted" style={{ fontSize: 11 }}>{w.date} {w.time}</div>}</td>
                    <td className="acts">
                      {done[w.id] ? <span className="pill onboarded">{done[w.id]}</span> : <>
                        <button className="mini save" onClick={() => importToLead(w)}>Import → Lead</button>
                        {w.coll === 'bookings' && <button className="mini" style={{ background: 'var(--panel)', color: 'var(--teal)' }} onClick={() => onboard(w)}>Onboard</button>}
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {l && (
        <div className="card">
          <div className="row-between"><h3>{l.id ? 'Edit lead' : 'New lead'}</h3>
            <button className="btn-ghost" onClick={() => setL(null)}>← Back</button></div>
          <div className="form-grid">
            <label className="f"><span>Parent / guardian</span><input value={l.parentName} onChange={(e) => setL({ ...l, parentName: e.target.value })} /></label>
            <label className="f"><span>Phone</span><input value={l.phone} onChange={(e) => setL({ ...l, phone: e.target.value })} /></label>
            <label className="f"><span>Email</span><input value={l.email} onChange={(e) => setL({ ...l, email: e.target.value })} /></label>
            <label className="f"><span>Child</span><input value={l.childName} onChange={(e) => setL({ ...l, childName: e.target.value })} /></label>
            <label className="f"><span>Service of interest</span>
              <select value={l.service} onChange={(e) => setL({ ...l, service: e.target.value })}>
                <option value="">—</option>{services.map((s) => <option key={s.id || s.name}>{s.name}</option>)}
              </select></label>
            <label className="f"><span>Source</span><select value={l.source} onChange={(e) => setL({ ...l, source: e.target.value })}>{LEAD_SOURCE.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="f"><span>Status</span><select value={l.status} onChange={(e) => setL({ ...l, status: e.target.value })}>{LEAD_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="f"><span>Appointment date</span><input type="date" value={l.appointmentDate} onChange={(e) => setL({ ...l, appointmentDate: e.target.value })} /></label>
            <label className="f"><span>Appointment time</span><input type="time" value={l.appointmentTime} onChange={(e) => setL({ ...l, appointmentTime: e.target.value })} /></label>
            <label className="f"><span>Appointment fee ₹</span><input type="number" value={l.fee} onChange={(e) => setL({ ...l, fee: +e.target.value })} /></label>
            <label className="f"><span>Payment status</span><select value={l.paymentStatus} onChange={(e) => setL({ ...l, paymentStatus: e.target.value })}>{PAYMENT_STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <label className="f full"><span>Concern / notes</span><textarea rows={2} value={l.notes} onChange={(e) => setL({ ...l, notes: e.target.value })} /></label>
          <div className="row-between" style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={save}>Save lead</button>
            <button className="mini del" onClick={remove}>{l.id ? 'Delete' : 'Discard'}</button>
          </div>
        </div>
      )}
    </>
  );
}
