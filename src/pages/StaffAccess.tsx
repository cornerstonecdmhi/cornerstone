import { useEffect, useState } from 'react';
import { listAccessRequests, approveAccess, denyAccess, listStaff, saveStaff, deleteStaff } from '../lib/data';
import { type AccessRequest, type StaffMember, STAFF_ROLES } from '../lib/types';

type Role = StaffMember['role'];
const when = (n?: number) => (n ? new Date(n).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export default function StaffAccess() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roleSel, setRoleSel] = useState<Record<string, Role>>({});
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async () => {
    try { setRequests((await listAccessRequests()).filter((r) => r.status === 'pending')); } catch { /* preview */ }
    try { setStaff(await listStaff()); } catch { /* preview */ }
  };
  useEffect(() => { load(); }, []);

  const approve = async (r: AccessRequest) => {
    const role = roleSel[r.uid] || 'therapist';
    try { await approveAccess(r, role); flash(`Approved ${r.email} as ${role}.`); await load(); }
    catch { flash('Approve failed — deploy + sign in as admin.'); }
  };
  const deny = async (r: AccessRequest) => {
    try { await denyAccess(r); flash('Request denied.'); await load(); } catch { flash('Failed.'); }
  };
  const setRole = async (s: StaffMember, role: Role) => {
    try { await saveStaff({ ...s, role }); await load(); } catch { flash('Save failed.'); }
  };
  const toggleActive = async (s: StaffMember) => {
    try { await saveStaff({ ...s, active: !(s.active !== false) }); flash(`${s.name} ${s.active !== false ? 'disabled' : 'enabled'}.`); await load(); } catch { flash('Failed.'); }
  };
  const remove = async (s: StaffMember) => {
    try { if (s.id) await deleteStaff(s.id); await load(); flash('Removed.'); } catch { flash('Failed.'); }
  };

  return (
    <>
      <div className="page-head"><h1>Staff &amp; Access</h1><p className="muted">Approve new staff and manage roles. TMS access is gated by this list — admins see financials; senior/therapist see clinical only.</p></div>
      <div className="tabs-bar"><span style={{ fontWeight: 600, color: 'var(--teal-dark)' }}>{requests.length} pending · {staff.length} staff</span><span style={{ flex: 1 }} />{msg && <span className="save-flash">{msg}</span>}</div>

      <div className="card">
        <h3>Pending access requests {requests.length > 0 && <span className="pill noshow" style={{ marginLeft: 6 }}>{requests.length}</span>}</h3>
        {requests.length === 0 && <p className="muted">No pending requests. New people who sign in appear here for approval.</p>}
        {requests.length > 0 && (
          <table className="grid">
            <thead><tr><th>Requested</th><th>Name / email</th><th>Approve as</th><th></th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.uid}>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(r.requestedAt)}</td>
                  <td><b>{r.name || '—'}</b><div className="muted" style={{ fontSize: 11 }}>{r.email}</div></td>
                  <td><select value={roleSel[r.uid] || 'therapist'} onChange={(e) => setRoleSel((s) => ({ ...s, [r.uid]: e.target.value as Role }))}>{STAFF_ROLES.map((ro) => <option key={ro}>{ro}</option>)}</select></td>
                  <td className="acts"><button className="mini save" onClick={() => approve(r)}>Approve</button> <button className="mini del" onClick={() => deny(r)}>Deny</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Staff &amp; roles</h3>
        {staff.length === 0 && <p className="muted">No staff provisioned yet.</p>}
        {staff.length > 0 && (
          <table className="grid">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td className="muted">{s.email || '—'}</td>
                  <td><select value={s.role} onChange={(e) => setRole(s, e.target.value as Role)}>{STAFF_ROLES.map((ro) => <option key={ro}>{ro}</option>)}</select></td>
                  <td><button className={'pill ' + (s.active !== false ? 'active' : 'discharged')} style={{ cursor: 'pointer', border: 'none' }} onClick={() => toggleActive(s)}>{s.active !== false ? 'Active' : 'Disabled'}</button></td>
                  <td className="acts"><button className="mini del" onClick={() => remove(s)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
