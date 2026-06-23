import { useEffect, useState } from 'react';
import {
  listAccessRequests, approveAccess, denyAccess, listStaff, saveStaff, deleteStaff,
  listInvites, inviteStaff, deleteInvite,
  listParentInvites, inviteParent, deleteParentInvite, listClients,
} from '../lib/data';
import { type AccessRequest, type StaffMember, type Invite, type ParentInvite, type Client, STAFF_ROLES } from '../lib/types';
import { useAuth } from '../auth';

type Role = StaffMember['role'];
const when = (n?: number) => (n ? new Date(n).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function StaffAccess() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [pInvites, setPInvites] = useState<ParentInvite[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [roleSel, setRoleSel] = useState<Record<string, Role>>({});
  const [msg, setMsg] = useState('');
  // Invite-staff form
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<Role>('therapist');
  // Invite-parent form
  const [pEmail, setPEmail] = useState('');
  const [pClient, setPClient] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async () => {
    try { setRequests((await listAccessRequests()).filter((r) => r.status === 'pending')); } catch { /* preview */ }
    try { setStaff(await listStaff()); } catch { /* preview */ }
    try { setInvites((await listInvites()).filter((i) => i.status !== 'accepted')); } catch { /* preview */ }
    try { setPInvites((await listParentInvites()).filter((i) => i.status !== 'accepted')); } catch { /* preview */ }
    try { setClients(await listClients()); } catch { /* preview */ }
  };
  useEffect(() => { load(); }, []);

  // ── Reactive: approve/deny self-service access requests ──
  const approve = async (r: AccessRequest) => {
    const role = roleSel[r.uid] || 'therapist';
    try { await approveAccess(r, role); flash(`Approved ${r.email} as ${role}.`); await load(); }
    catch { flash('Approve failed — deploy + sign in as admin.'); }
  };
  const deny = async (r: AccessRequest) => {
    try { await denyAccess(r); flash('Request denied.'); await load(); } catch { flash('Failed.'); }
  };

  // ── Proactive: invite staff by email ──
  const sendInvite = async () => {
    if (!emailOk(invEmail)) { flash('Enter a valid email.'); return; }
    try {
      await inviteStaff(invEmail, invRole, user?.email);
      flash(`Invited ${invEmail.trim().toLowerCase()} as ${invRole}. They get access on first sign-in.`);
      setInvEmail(''); setInvRole('therapist'); await load();
    } catch { flash('Invite failed — sign in as admin.'); }
  };
  const revokeInvite = async (i: Invite) => {
    try { if (i.id) await deleteInvite(i.id); flash('Invite revoked.'); await load(); } catch { flash('Failed.'); }
  };

  // ── Staff roster management ──
  const setRole = async (s: StaffMember, role: Role) => {
    try { await saveStaff({ ...s, role }); await load(); } catch { flash('Save failed.'); }
  };
  const toggleActive = async (s: StaffMember) => {
    try { await saveStaff({ ...s, active: !(s.active !== false) }); flash(`${s.name} ${s.active !== false ? 'disabled' : 'enabled'}.`); await load(); } catch { flash('Failed.'); }
  };
  const remove = async (s: StaffMember) => {
    const admins = staff.filter((x) => x.role === 'admin' && x.active !== false);
    if (s.role === 'admin' && admins.length <= 1) { flash("Can't remove the last admin."); return; }
    if (s.id === user?.uid && !window.confirm('This removes YOUR OWN access. Continue?')) return;
    try { if (s.id) await deleteStaff(s.id); await load(); flash('Removed.'); } catch { flash('Failed.'); }
  };

  // ── Parent portal invites ──
  const sendParentInvite = async () => {
    if (!emailOk(pEmail)) { flash('Enter a valid parent email.'); return; }
    if (!pClient) { flash('Pick the family (client) this parent belongs to.'); return; }
    const c = clients.find((x) => x.id === pClient);
    try {
      await inviteParent(pEmail, pClient, c?.name, user?.email);
      flash(`Invited ${pEmail.trim().toLowerCase()} to the parent portal.`);
      setPEmail(''); setPClient(''); await load();
    } catch { flash('Invite failed.'); }
  };
  const revokeParentInvite = async (i: ParentInvite) => {
    try { if (i.id) await deleteParentInvite(i.id); flash('Parent invite revoked.'); await load(); } catch { flash('Failed.'); }
  };
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name || id;

  return (
    <>
      <div className="page-head"><h1>Staff &amp; Access</h1><p className="muted">Invite teammates and parents, approve requests, and manage roles. TMS access is gated by this list — admins see financials; senior/therapist see clinical only.</p></div>
      <div className="tabs-bar"><span style={{ fontWeight: 600, color: 'var(--teal-dark)' }}>{requests.length} pending · {staff.length} staff · {invites.length} invited</span><span style={{ flex: 1 }} />{msg && <span className="save-flash">{msg}</span>}</div>

      {/* ── Invite staff (proactive) ── */}
      {isAdmin && (
        <div className="card">
          <h3>Invite a teammate</h3>
          <p className="muted" style={{ marginTop: -4 }}>They’ll be granted the chosen role automatically the first time they sign in with this email — no separate approval needed.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <input type="email" placeholder="teammate@email.com" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} style={{ flex: '1 1 240px' }} />
            <select value={invRole} onChange={(e) => setInvRole(e.target.value as Role)}>{STAFF_ROLES.map((ro) => <option key={ro}>{ro}</option>)}</select>
            <button className="mini save" onClick={sendInvite}>Send invite</button>
          </div>
          {invites.length > 0 && (
            <table className="grid" style={{ marginTop: 12 }}>
              <thead><tr><th>Invited email</th><th>Role</th><th>Sent</th><th></th></tr></thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td><b>{i.email}</b></td>
                    <td>{i.role}</td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{when(i.createdAt)}</td>
                    <td className="acts"><button className="mini del" onClick={() => revokeInvite(i)}>Revoke</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Pending access requests (reactive) ── */}
      <div className="card">
        <h3>Pending access requests {requests.length > 0 && <span className="pill noshow" style={{ marginLeft: 6 }}>{requests.length}</span>}</h3>
        {requests.length === 0 && <p className="muted">No pending requests. Someone who signs in without an invite appears here for approval.</p>}
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

      {/* ── Staff roster ── */}
      <div className="card">
        <h3>Staff &amp; roles</h3>
        {staff.length === 0 && <p className="muted">No staff provisioned yet.</p>}
        {staff.length > 0 && (
          <table className="grid">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b>{s.id === user?.uid && <span className="pill active" style={{ marginLeft: 6 }}>you</span>}</td>
                  <td className="muted">{s.email || '—'}</td>
                  <td><select value={s.role} disabled={!isAdmin} onChange={(e) => setRole(s, e.target.value as Role)}>{STAFF_ROLES.map((ro) => <option key={ro}>{ro}</option>)}</select></td>
                  <td><button className={'pill ' + (s.active !== false ? 'active' : 'discharged')} style={{ cursor: isAdmin ? 'pointer' : 'default', border: 'none' }} disabled={!isAdmin} onClick={() => toggleActive(s)}>{s.active !== false ? 'Active' : 'Disabled'}</button></td>
                  <td className="acts">{isAdmin && <button className="mini del" onClick={() => remove(s)}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Parent portal access ── */}
      {isAdmin && (
        <div className="card">
          <h3>Parent portal access</h3>
          <p className="muted" style={{ marginTop: -4 }}>Invite a parent/guardian by email and link them to their family record. They’ll see only that family’s child(ren) — care plan, sessions, shared reports and receipts — after signing in.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <input type="email" placeholder="parent@email.com" value={pEmail} onChange={(e) => setPEmail(e.target.value)} style={{ flex: '1 1 220px' }} />
            <select value={pClient} onChange={(e) => setPClient(e.target.value)} style={{ flex: '1 1 200px' }}>
              <option value="">Select family…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ''}</option>)}
            </select>
            <button className="mini save" onClick={sendParentInvite}>Invite parent</button>
          </div>
          {pInvites.length > 0 && (
            <table className="grid" style={{ marginTop: 12 }}>
              <thead><tr><th>Parent email</th><th>Family</th><th>Sent</th><th></th></tr></thead>
              <tbody>
                {pInvites.map((i) => (
                  <tr key={i.id}>
                    <td><b>{i.email}</b></td>
                    <td>{clientName(i.clientId)}</td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{when(i.createdAt)}</td>
                    <td className="acts"><button className="mini del" onClick={() => revokeParentInvite(i)}>Revoke</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
