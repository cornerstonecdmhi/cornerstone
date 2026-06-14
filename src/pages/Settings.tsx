import { useEffect, useState } from 'react';
import {
  getSettings, saveSettings, listServices, saveService, deleteService,
  listPackages, savePackage, deletePackage, listHolidays, saveHoliday, deleteHoliday,
  listWorkHours, saveWorkHour,
} from '../lib/data';
import {
  type ClinicSettings, type Service, type Package, type Holiday, type WorkHour,
  DEFAULT_SETTINGS, DEFAULT_SERVICES, WEEK,
} from '../lib/types';

const TABS = ['Clinic', 'Services', 'Packages', 'Holidays', 'Work Hours'] as const;
type Tab = typeof TABS[number];

function Field({ label, value, onChange, type = 'text', placeholder }:
  { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="f">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function Settings() {
  const [tab, setTab] = useState<Tab>('Clinic');
  const [s, setS] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [packages, setPackages] = useState<Package[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [hours, setHours] = useState<WorkHour[]>(WEEK.map((w) => ({ id: w.key, day: w.day, open: '10:00', close: '18:00' })));
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  useEffect(() => {
    (async () => {
      try {
        const [cs, sv, pk, hl, wh] = await Promise.all([
          getSettings(), listServices(), listPackages(), listHolidays(), listWorkHours(),
        ]);
        setS(cs);
        if (sv.length) setServices(sv);
        setPackages(pk);
        setHolidays(hl);
        if (wh.length) setHours(WEEK.map((w) => wh.find((x) => x.id === w.key) || { id: w.key, day: w.day, open: '10:00', close: '18:00' }));
      } catch {
        /* preview / not yet deployed — keep defaults so the screen still renders */
      }
    })();
  }, []);

  const up = (k: keyof ClinicSettings) => (v: string) => setS({ ...s, [k]: v });
  const onImg = (key: 'logo' | 'qr') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setS((prev) => ({ ...prev, [key]: String(r.result) }));
    r.readAsDataURL(f);
  };

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p className="muted">Clinic identity, services &amp; prices, packages, holidays and work hours.</p>
      </div>

      <div className="tabs-bar">
        {TABS.map((t) => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{t}</button>
        ))}
        {msg && <span className="save-flash">{msg}</span>}
      </div>

      {tab === 'Clinic' && (
        <div className="card">
          <h3>Clinic identity</h3>
          <div className="form-grid">
            <Field label="Clinic name" value={s.name} onChange={up('name')} />
            <Field label="Sub-line" value={s.subline} onChange={up('subline')} />
            <Field label="Tagline" value={s.tagline} onChange={up('tagline')} />
            <Field label="Website" value={s.website} onChange={up('website')} />
            <Field label="Phone" value={s.phone} onChange={up('phone')} />
            <Field label="Email" value={s.email} onChange={up('email')} />
            <Field label="Address" value={s.address} onChange={up('address')} />
            <Field label="Place of supply" value={s.placeOfSupply} onChange={up('placeOfSupply')} />
            <Field label="Lead assessor (owner)" value={s.assessorName} onChange={up('assessorName')} />
            <Field label="Assessor credential" value={s.assessorCredential} onChange={up('assessorCredential')} />
          </div>
          <h3 style={{ marginTop: 18 }}>Branding (shows on invoices)</h3>
          <div className="form-grid">
            <label className="f"><span>Logo image</span>
              <input type="file" accept="image/*" onChange={onImg('logo')} />
              {s.logo && <img src={s.logo} className="img-prev" alt="logo" />}</label>
            <label className="f"><span>Logo height on invoice (px)</span>
              <input type="number" value={s.logoH} onChange={(e) => setS({ ...s, logoH: +e.target.value || 92 })} /></label>
            <label className="f"><span>UPI QR image (Scan to Pay)</span>
              <input type="file" accept="image/*" onChange={onImg('qr')} />
              {s.qr && <img src={s.qr} className="img-prev" alt="qr" />}</label>
          </div>

          <h3 style={{ marginTop: 18 }}>Tax</h3>
          <div className="form-grid">
            <label className="f"><span>GST registered?</span>
              <select value={s.gstReg} onChange={(e) => setS({ ...s, gstReg: e.target.value as 'yes' | 'no' })}>
                <option value="no">No</option><option value="yes">Yes</option>
              </select>
            </label>
            <Field label="GSTIN (when registered)" value={s.gstin} onChange={up('gstin')} />
          </div>
          <div className="hint-note">Not registered &amp; clinical services are GST-exempt → invoices show 0% tax. Each service carries its own tax treatment, so nothing breaks if you register later.</div>

          <h3 style={{ marginTop: 18 }}>Payment details</h3>
          <div className="form-grid">
            <Field label="Bank name" value={s.bankName} onChange={up('bankName')} />
            <Field label="Account name" value={s.accName} onChange={up('accName')} />
            <Field label="Account number" value={s.accNo} onChange={up('accNo')} />
            <Field label="IFSC" value={s.ifsc} onChange={up('ifsc')} />
            <Field label="Account type" value={s.accType} onChange={up('accType')} />
            <Field label="UPI ID" value={s.upi} onChange={up('upi')} />
          </div>

          <h3 style={{ marginTop: 18 }}>Invoice defaults</h3>
          <div className="form-grid">
            <Field label="Authorized signatory" value={s.signatory} onChange={up('signatory')} />
            <Field label="Invoice prefix" value={s.prefixInvoice} onChange={up('prefixInvoice')} />
            <Field label="Receipt prefix" value={s.prefixReceipt} onChange={up('prefixReceipt')} />
            <Field label="Estimate prefix" value={s.prefixEstimate} onChange={up('prefixEstimate')} />
          </div>
          <label className="f full"><span>Invoice note</span>
            <textarea value={s.invoiceNote} onChange={(e) => setS({ ...s, invoiceNote: e.target.value })} rows={2} /></label>
          <label className="f full"><span>Terms / cancellation policy</span>
            <textarea value={s.terms} onChange={(e) => setS({ ...s, terms: e.target.value })} rows={3} /></label>

          <button className="btn-primary" onClick={async () => { try { await saveSettings(s); flash('Clinic settings saved.'); } catch { flash('Save failed — deploy + sign in first.'); } }}>Save clinic settings</button>
        </div>
      )}

      {tab === 'Services' && (
        <div className="card">
          <div className="row-between"><h3>Services &amp; prices</h3>
            <button className="btn-ghost" onClick={() => setServices([...services, { name: 'New Service', discipline: '', price: 0, durationMin: 45, chargeable: true, tax: 'Exempt', active: true }])}>+ Add service</button>
          </div>
          <table className="grid">
            <thead><tr><th>Name</th><th>Discipline</th><th>Price ₹</th><th>Min</th><th>Chargeable</th><th>Tax</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {services.map((sv, i) => {
                const set = (patch: Partial<Service>) => setServices(services.map((x, j) => j === i ? { ...x, ...patch } : x));
                return (
                  <tr key={sv.id || i}>
                    <td><input value={sv.name} onChange={(e) => set({ name: e.target.value })} /></td>
                    <td><input value={sv.discipline} onChange={(e) => set({ discipline: e.target.value })} /></td>
                    <td className="n"><input type="number" value={sv.price} onChange={(e) => set({ price: +e.target.value })} /></td>
                    <td className="n"><input type="number" value={sv.durationMin} onChange={(e) => set({ durationMin: +e.target.value })} /></td>
                    <td className="c"><input type="checkbox" checked={sv.chargeable} onChange={(e) => set({ chargeable: e.target.checked })} /></td>
                    <td><select value={sv.tax} onChange={(e) => set({ tax: e.target.value as Service['tax'] })}><option>Exempt</option><option>Taxable</option></select></td>
                    <td className="c"><input type="checkbox" checked={sv.active} onChange={(e) => set({ active: e.target.checked })} /></td>
                    <td className="acts">
                      <button className="mini save" onClick={async () => { try { const id = await saveService(sv); set({ id }); flash('Saved'); } catch { flash('Save failed'); } }}>Save</button>
                      <button className="mini del" onClick={async () => { try { if (sv.id) await deleteService(sv.id); setServices(services.filter((_, j) => j !== i)); } catch { flash('Delete failed'); } }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Packages' && (
        <div className="card">
          <div className="row-between"><h3>Packages</h3>
            <button className="btn-ghost" onClick={() => setPackages([...packages, { name: 'New Package', description: '', totalSessions: 12, price: 0, validityDays: 60 }])}>+ Add package</button>
          </div>
          <table className="grid">
            <thead><tr><th>Name</th><th>Description</th><th>Sessions</th><th>Price ₹</th><th>Validity (days)</th><th></th></tr></thead>
            <tbody>
              {packages.length === 0 && <tr><td colSpan={6} className="muted pad">No packages yet — add one.</td></tr>}
              {packages.map((p, i) => {
                const set = (patch: Partial<Package>) => setPackages(packages.map((x, j) => j === i ? { ...x, ...patch } : x));
                return (
                  <tr key={p.id || i}>
                    <td><input value={p.name} onChange={(e) => set({ name: e.target.value })} /></td>
                    <td><input value={p.description} onChange={(e) => set({ description: e.target.value })} /></td>
                    <td className="n"><input type="number" value={p.totalSessions} onChange={(e) => set({ totalSessions: +e.target.value })} /></td>
                    <td className="n"><input type="number" value={p.price} onChange={(e) => set({ price: +e.target.value })} /></td>
                    <td className="n"><input type="number" value={p.validityDays} onChange={(e) => set({ validityDays: +e.target.value })} /></td>
                    <td className="acts">
                      <button className="mini save" onClick={async () => { try { const id = await savePackage(p); set({ id }); flash('Saved'); } catch { flash('Save failed'); } }}>Save</button>
                      <button className="mini del" onClick={async () => { try { if (p.id) await deletePackage(p.id); setPackages(packages.filter((_, j) => j !== i)); } catch { flash('Delete failed'); } }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Holidays' && (
        <div className="card">
          <div className="row-between"><h3>Clinic holidays</h3>
            <button className="btn-ghost" onClick={() => setHolidays([{ date: '', name: '', type: 'Full Day' }, ...holidays])}>+ Add holiday</button>
          </div>
          <table className="grid">
            <thead><tr><th>Date</th><th>Name</th><th>Type</th><th></th></tr></thead>
            <tbody>
              {holidays.length === 0 && <tr><td colSpan={4} className="muted pad">No holidays added.</td></tr>}
              {holidays.map((h, i) => {
                const set = (patch: Partial<Holiday>) => setHolidays(holidays.map((x, j) => j === i ? { ...x, ...patch } : x));
                return (
                  <tr key={h.id || i}>
                    <td><input type="date" value={h.date} onChange={(e) => set({ date: e.target.value })} /></td>
                    <td><input value={h.name} onChange={(e) => set({ name: e.target.value })} /></td>
                    <td><select value={h.type} onChange={(e) => set({ type: e.target.value as Holiday['type'] })}><option>Full Day</option><option>Half Day</option></select></td>
                    <td className="acts">
                      <button className="mini save" onClick={async () => { try { const id = await saveHoliday(h); set({ id }); flash('Saved'); } catch { flash('Save failed'); } }}>Save</button>
                      <button className="mini del" onClick={async () => { try { if (h.id) await deleteHoliday(h.id); setHolidays(holidays.filter((_, j) => j !== i)); } catch { flash('Delete failed'); } }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Work Hours' && (
        <div className="card">
          <h3>Weekly work hours</h3>
          <table className="grid">
            <thead><tr><th>Day</th><th>Open</th><th>Close</th></tr></thead>
            <tbody>
              {hours.map((w, i) => {
                const set = (patch: Partial<WorkHour>) => setHours(hours.map((x, j) => j === i ? { ...x, ...patch } : x));
                return (
                  <tr key={w.id}>
                    <td>{w.day}</td>
                    <td><input value={w.open} onChange={(e) => set({ open: e.target.value })} placeholder="10:00 or Closed" /></td>
                    <td><input value={w.close} onChange={(e) => set({ close: e.target.value })} placeholder="18:00 or Closed" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button className="btn-primary" onClick={async () => { try { await Promise.all(hours.map(saveWorkHour)); flash('Work hours saved.'); } catch { flash('Save failed'); } }}>Save work hours</button>
        </div>
      )}
    </>
  );
}
