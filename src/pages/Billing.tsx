import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getSettings, listServices, listInvoices, saveInvoice, listChildPackages, saveChildPackage, deleteChildPackage, listPackages, listChildren } from '../lib/data';
import { DEFAULT_SETTINGS, DEFAULT_SERVICES, DISCIPLINES, type ClinicSettings, type Service, type ChildPackage, type Child, type Package } from '../lib/types';
import { type InvoiceDoc as Inv, type DocType, blankInvoice, compute, statusOf, fmt, dmy } from '../lib/invoice';
import InvoiceDoc from '../components/InvoiceDoc';

export default function Billing() {
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [inv, setInv] = useState<Inv>(() => ({ ...blankInvoice(DEFAULT_SETTINGS.invoiceNote), gstRegistered: false }));
  const [saved, setSaved] = useState<Inv[]>([]);
  const [view, setView] = useState<'editor' | 'saved' | 'packages'>('editor');
  const [childPkgs, setChildPkgs] = useState<ChildPackage[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [templates, setTemplates] = useState<Package[]>([]);
  const [assign, setAssign] = useState<ChildPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const refreshSaved = async () => { try { setSaved(await listInvoices()); } catch { /* not deployed yet */ } };
  const refreshPkgs = async () => { try { setChildPkgs(await listChildPackages()); } catch { /* preview */ } };

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setSettings(s);
        setInv((v) => ({ ...v, gstRegistered: s.gstReg === 'yes', note: v.note || s.invoiceNote }));
      } catch { /* preview */ }
      try { const sv = await listServices(); if (sv.length) setServices(sv); } catch { /* preview */ }
      try { setChildren(await listChildren()); } catch { /* preview */ }
      try { setTemplates(await listPackages()); } catch { /* preview */ }
      refreshSaved();
      refreshPkgs();
    })();
  }, []);

  const blankAssign = (): ChildPackage => ({ childId: '', childName: '', packageName: '', discipline: DISCIPLINES[0], creditsTotal: 12, creditsUsed: 0, pricePaid: 0, expiresOn: new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10), status: 'active' });
  const saveAssignment = async () => {
    if (!assign) return;
    if (!assign.childId) return flash('Pick a child.');
    try { await saveChildPackage(assign); setAssign(null); flash('Package assigned.'); await refreshPkgs(); }
    catch { flash('Save failed — deploy + sign in as admin.'); }
  };

  // Scale the fixed-width invoice "paper" to fit the preview column.
  const wrapRef = useRef<HTMLDivElement>(null);
  const fit = () => {
    const wrap = wrapRef.current; if (!wrap) return;
    const doc = wrap.querySelector('.inv-doc') as HTMLElement | null; if (!doc) return;
    doc.style.transform = 'none';
    const sc = Math.min(1, wrap.clientWidth / 794);
    doc.style.transform = `scale(${sc})`;
    wrap.style.height = doc.offsetHeight * sc + 'px';
  };
  useLayoutEffect(() => { fit(); });
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const ro = new ResizeObserver(fit); ro.observe(wrap); return () => ro.disconnect();
  }, []);

  const up = (patch: Partial<Inv>) => setInv((v) => ({ ...v, ...patch }));
  const setItem = (i: number, patch: Partial<Inv['items'][number]>) =>
    setInv((v) => ({ ...v, items: v.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const save = async () => {
    if (!inv.billTo.name.trim()) { flash('Add the parent/guardian name first.'); return; }
    setBusy(true);
    try {
      const payload = {
        id: inv.id, number: inv.number, docType: inv.docType, date: inv.date, due: inv.due,
        statusMode: inv.statusMode, billTo: inv.billTo, child: inv.child, childId: inv.childId, items: inv.items,
        disc: inv.disc, round: +inv.round || 0, paid: +inv.paid || 0, note: inv.note,
        gstRegistered: !!inv.gstRegistered,
      };
      const { id, number } = await saveInvoice(payload as unknown as Parameters<typeof saveInvoice>[0]);
      setInv((v) => ({ ...v, id, number }));
      flash('Saved ' + number);
      refreshSaved();
    } catch (e) {
      flash((e as Error)?.message || 'Save failed — deploy functions + sign in as admin.');
    } finally { setBusy(false); }
  };

  const newInvoice = () => setInv({ ...blankInvoice(settings.invoiceNote), gstRegistered: settings.gstReg === 'yes' });
  const openInvoice = (d: Inv) => { setInv({ ...d }); setView('editor'); };

  return (
    <>
      <div className="page-head no-print"><h1>Billing</h1><p className="muted">Invoices, receipts &amp; payments — Admin / Accounts.</p></div>

      <div className="tabs-bar no-print">
        <button className={'tab' + (view === 'editor' ? ' active' : '')} onClick={() => setView('editor')}>Editor</button>
        <button className={'tab' + (view === 'saved' ? ' active' : '')} onClick={() => { setView('saved'); refreshSaved(); }}>Saved</button>
        <button className={'tab' + (view === 'packages' ? ' active' : '')} onClick={() => { setView('packages'); refreshPkgs(); }}>Packages</button>
        <span style={{ flex: 1 }} />
        {view === 'editor' && <>
          <button className="btn-ghost" onClick={newInvoice}>New</button>
          <button className="btn-ghost" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="btn-primary" onClick={() => window.print()}>Print / PDF</button>
        </>}
        {view === 'packages' && !assign && <button className="btn-primary" onClick={() => setAssign(blankAssign())}>+ Assign package</button>}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {view === 'editor' && (
        <div className="billing-grid">
          <div className="bill-form no-print">
            <h3>Document</h3>
            <div className="form-grid">
              <label className="f"><span>Type</span>
                <select value={inv.docType} onChange={(e) => up({ docType: e.target.value as DocType })}>
                  <option>Invoice</option><option>Estimate</option><option>Receipt</option><option>Credit Note</option>
                </select></label>
              <label className="f"><span>Status</span>
                <select value={inv.statusMode} onChange={(e) => up({ statusMode: e.target.value })}>
                  <option value="auto">Auto</option><option>Paid</option><option>Unpaid</option><option>Partially Paid</option><option>Overdue</option>
                </select></label>
              <label className="f"><span>Date</span><input type="date" value={inv.date} onChange={(e) => up({ date: e.target.value })} /></label>
              <label className="f"><span>Due date</span><input type="date" value={inv.due} onChange={(e) => up({ due: e.target.value })} /></label>
            </div>

            <h3 style={{ marginTop: 14 }}>Bill to (parent / guardian)</h3>
            <label className="f full"><span>Name</span><input value={inv.billTo.name} onChange={(e) => up({ billTo: { ...inv.billTo, name: e.target.value } })} /></label>
            <label className="f full"><span>Address</span><input value={inv.billTo.addr} onChange={(e) => up({ billTo: { ...inv.billTo, addr: e.target.value } })} /></label>
            <div className="form-grid">
              <label className="f"><span>Phone</span><input value={inv.billTo.phone} onChange={(e) => up({ billTo: { ...inv.billTo, phone: e.target.value } })} /></label>
              <label className="f"><span>Email</span><input value={inv.billTo.email} onChange={(e) => up({ billTo: { ...inv.billTo, email: e.target.value } })} /></label>
            </div>
            <label className="f full"><span>Patient (child) name</span><input value={inv.child} onChange={(e) => up({ child: e.target.value })} /></label>

            <h3 style={{ marginTop: 14 }}>Line items</h3>
            <div className="li-cards">
              {inv.items.map((it, i) => (
                <div className="li-card" key={i}>
                  <label className="f"><span>Service</span>
                    <select value={it.svc} onChange={(e) => {
                      const svc = services.find((x) => x.name === e.target.value);
                      setItem(i, svc ? { svc: svc.name, price: svc.price, tax: svc.tax } : { svc: e.target.value });
                    }}>
                      <option value="">— select —</option>
                      {services.map((sv) => <option key={sv.name}>{sv.name}</option>)}
                      {it.svc && !services.some((x) => x.name === it.svc) && <option>{it.svc}</option>}
                    </select></label>
                  <div className="li-3">
                    <label className="f"><span>Period</span><input placeholder="e.g. May 2024" value={it.period} onChange={(e) => setItem(i, { period: e.target.value })} /></label>
                    <label className="f"><span>Qty</span><input type="number" min={0} value={it.qty} onChange={(e) => setItem(i, { qty: +e.target.value })} /></label>
                    <label className="f"><span>Unit ₹</span><input type="number" min={0} step="0.01" value={it.price} onChange={(e) => setItem(i, { price: +e.target.value })} /></label>
                  </div>
                  <div className="li-foot">
                    <span className="li-amt">Amount: <b>₹ {fmt((+it.qty || 0) * (+it.price || 0))}</b></span>
                    <button className="mini del" onClick={() => up({ items: inv.items.length > 1 ? inv.items.filter((_, j) => j !== i) : inv.items })}>Remove line</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="add-line" onClick={() => up({ items: [...inv.items, { svc: '', period: '', qty: 1, price: 0, tax: 'Exempt' }] })}>+ Add line item</button>

            <h3 style={{ marginTop: 14 }}>Adjustments</h3>
            <div className="form-grid">
              <label className="f"><span>Discount type</span>
                <select value={inv.disc.type} onChange={(e) => up({ disc: { ...inv.disc, type: e.target.value as 'amount' | 'percent' } })}>
                  <option value="amount">₹ Amount</option><option value="percent">% Percent</option></select></label>
              <label className="f"><span>Discount value</span><input type="number" value={inv.disc.val} onChange={(e) => up({ disc: { ...inv.disc, val: +e.target.value } })} /></label>
              <label className="f"><span>Round-off ₹</span><input type="number" value={inv.round} onChange={(e) => up({ round: +e.target.value })} /></label>
              <label className="f"><span>Amount paid ₹</span><input type="number" value={inv.paid} onChange={(e) => up({ paid: +e.target.value })} /></label>
            </div>
            <label className="f full"><span>Note</span><textarea rows={2} value={inv.note} onChange={(e) => up({ note: e.target.value })} /></label>
          </div>

          <div className="paper-scroll" ref={wrapRef}>
            <InvoiceDoc inv={inv} settings={settings} />
          </div>
        </div>
      )}

      {view === 'saved' && (
        <div className="card no-print">
          <h3>Saved documents</h3>
          {saved.length === 0 && <p className="muted">No saved invoices yet (or not deployed). Create one in the Editor and Save.</p>}
          {saved.length > 0 && (
            <table className="grid">
              <thead><tr><th>Number</th><th>Type</th><th>Date</th><th>Bill To</th><th>Child</th><th className="n">Total ₹</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {saved.map((d) => {
                  const total = d.total ?? compute(d).total;
                  return (
                    <tr key={d.id}>
                      <td><b>{d.number}</b></td><td>{d.docType}</td><td>{dmy(d.date)}</td>
                      <td>{d.billTo?.name}</td><td>{d.child}</td><td className="n">{fmt(total)}</td>
                      <td>{statusOf(d, total)}</td>
                      <td className="acts"><button className="mini save" onClick={() => openInvoice(d)}>Open</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === 'packages' && !assign && (
        <div className="card no-print">
          <h3>Active packages &amp; credits</h3>
          {childPkgs.length === 0 && <p className="muted">No packages assigned yet. Click “Assign package”.</p>}
          {childPkgs.length > 0 && (
            <table className="grid">
              <thead><tr><th>Child</th><th>Package</th><th>Discipline</th><th>Credits</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {childPkgs.map((p) => {
                  const remaining = p.creditsTotal - p.creditsUsed;
                  return (
                    <tr key={p.id}>
                      <td><b>{p.childName}</b></td><td>{p.packageName}</td><td>{p.discipline}</td>
                      <td className="n">{p.creditsUsed}/{p.creditsTotal} {remaining <= 2 && p.status === 'active' ? <span className="pill noshow" style={{ marginLeft: 4 }}>{remaining} left — renew</span> : <span className="muted">({remaining} left)</span>}</td>
                      <td>{dmy(p.expiresOn)}</td>
                      <td><span className={'pill ' + (p.status === 'active' ? 'active' : 'discharged')}>{p.status}</span></td>
                      <td className="acts"><button className="mini del" onClick={async () => { if (p.id) { await deleteChildPackage(p.id); refreshPkgs(); } }}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === 'packages' && assign && (
        <div className="card no-print">
          <div className="row-between"><h3>Assign package</h3><button className="btn-ghost" onClick={() => setAssign(null)}>← Back</button></div>
          <div className="form-grid">
            <label className="f"><span>Child *</span>
              <select value={assign.childId} onChange={(e) => { const c = children.find((x) => x.id === e.target.value); setAssign({ ...assign, childId: e.target.value, childName: c?.name || '' }); }}>
                <option value="">— select child —</option>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            <label className="f"><span>Package template</span>
              <select value={assign.packageName} onChange={(e) => { const t = templates.find((x) => x.name === e.target.value); setAssign({ ...assign, packageName: e.target.value, creditsTotal: t?.totalSessions || assign.creditsTotal, pricePaid: t?.price || assign.pricePaid, expiresOn: t?.validityDays ? new Date(Date.now() + t.validityDays * 864e5).toISOString().slice(0, 10) : assign.expiresOn }); }}>
                <option value="">— custom —</option>
                {templates.map((t) => <option key={t.id || t.name}>{t.name}</option>)}
              </select></label>
            <label className="f"><span>Discipline</span><select value={assign.discipline} onChange={(e) => setAssign({ ...assign, discipline: e.target.value })}>{DISCIPLINES.map((d) => <option key={d}>{d}</option>)}</select></label>
            <label className="f"><span>Total sessions</span><input type="number" value={assign.creditsTotal} onChange={(e) => setAssign({ ...assign, creditsTotal: +e.target.value })} /></label>
            <label className="f"><span>Price paid ₹</span><input type="number" value={assign.pricePaid} onChange={(e) => setAssign({ ...assign, pricePaid: +e.target.value })} /></label>
            <label className="f"><span>Expires on</span><input type="date" value={assign.expiresOn} onChange={(e) => setAssign({ ...assign, expiresOn: e.target.value })} /></label>
          </div>
          <div className="hint-note">Credits decrement automatically when a session is marked Attended/No-show in Schedule. Low-balance prompts a renewal.</div>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={saveAssignment}>Assign package</button>
        </div>
      )}
    </>
  );
}
