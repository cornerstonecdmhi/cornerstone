import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type Role = 'admin' | 'senior' | 'therapist' | 'parent';
/** Which access surface this app instance serves. Each accepts ONLY its own members. */
export type Audience = 'tms' | 'portal';

export interface TmsUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  clientId?: string; // for parents: links to their tms_clients record
}

interface AuthState {
  user: TmsUser | null;
  loading: boolean;
  pending: boolean;  // signed in to the TMS but awaiting admin approval
  rejected: boolean; // portal: signed in with an email that isn't registered/invited
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

// DEV ONLY: set VITE_FAKE_AUTH=1 to preview the shell without real Firebase auth.
const FAKE = import.meta.env.DEV && import.meta.env.VITE_FAKE_AUTH === '1';

/**
 * Resolve a signed-in Firebase user to a STAFF user, from tms_staff/{uid} only.
 * Website admins (admin_users) get NO TMS access — this is the decoupling.
 * If no staff doc exists but a matching invite does, the staff doc is created on the
 * spot with the invited role (the standard "invite → first sign-in → provisioned" flow).
 * Throws on a transient read error (caller distinguishes that from non-membership).
 */
async function resolveStaff(u: User): Promise<TmsUser | null> {
  const snap = await getDoc(doc(db, 'tms_staff', u.uid));
  if (snap.exists()) {
    const d = snap.data() as { name?: string; role?: Role; active?: boolean };
    if (d.active === false) return null;
    return { uid: u.uid, email: u.email || '', name: d.name || u.email || 'Staff', role: (d.role as Role) || 'therapist' };
  }
  // Not yet staff — was this email invited? If so, auto-provision with the invited role.
  const email = (u.email || '').toLowerCase();
  if (email) {
    const inv = await getDoc(doc(db, 'tms_invites', email));
    if (inv.exists()) {
      const role = ((inv.data() as { role?: Role }).role as Role) || 'therapist';
      const name = u.displayName || u.email || 'Staff';
      await setDoc(doc(db, 'tms_staff', u.uid), { name, email: u.email || '', role, active: true }, { merge: true });
      try { await setDoc(doc(db, 'tms_invites', email), { status: 'accepted', acceptedAt: Date.now() }, { merge: true }); } catch { /* best-effort */ }
      return { uid: u.uid, email: u.email || '', name, role };
    }
  }
  // FIRST-RUN BOOTSTRAP: if no TMS admin exists yet (the tms_config/bootstrap sentinel
  // is absent) and this user is an existing WEBSITE admin (already a vetted identity),
  // claim them as the first TMS admin. Secure: only a website admin, only once — the
  // sentinel locks it so a later website admin can NOT self-promote into the clinic.
  try {
    const claimed = await getDoc(doc(db, 'tms_config', 'bootstrap'));
    if (!claimed.exists()) {
      const webAdmin = await getDoc(doc(db, 'admin_users', u.uid));
      if (webAdmin.exists()) {
        const name = u.displayName || u.email || 'Admin';
        await setDoc(doc(db, 'tms_staff', u.uid), { name, email: u.email || '', role: 'admin', active: true }, { merge: true });
        try { await setDoc(doc(db, 'tms_config', 'bootstrap'), { claimedBy: u.uid, claimedAt: Date.now() }); } catch { /* best-effort lock */ }
        return { uid: u.uid, email: u.email || '', name, role: 'admin' };
      }
    }
  } catch { /* fall through to pending */ }
  return null;
}
/** Resolve a signed-in Firebase user to a PARENT, from tms_parent_users/{uid} only.
 *  Falls back to a matching tms_parent_invites/{email} → auto-provision on first sign-in. */
async function resolveParent(u: User): Promise<TmsUser | null> {
  const snap = await getDoc(doc(db, 'tms_parent_users', u.uid));
  if (snap.exists()) {
    const d = snap.data() as { name?: string; clientId?: string };
    return { uid: u.uid, email: u.email || '', name: d.name || u.email || 'Parent', role: 'parent', clientId: d.clientId };
  }
  const email = (u.email || '').toLowerCase();
  if (email) {
    const inv = await getDoc(doc(db, 'tms_parent_invites', email));
    if (inv.exists()) {
      const d = inv.data() as { name?: string; clientId?: string };
      const name = d.name || u.displayName || u.email || 'Parent';
      await setDoc(doc(db, 'tms_parent_users', u.uid), { name, email: u.email || '', clientId: d.clientId || '' }, { merge: true });
      try { await setDoc(doc(db, 'tms_parent_invites', email), { status: 'accepted', acceptedAt: Date.now() }, { merge: true }); } catch { /* best-effort */ }
      return { uid: u.uid, email: u.email || '', name, role: 'parent', clientId: d.clientId };
    }
  }
  return null;
}

function fakeUser(audience: Audience): TmsUser {
  return audience === 'portal'
    ? { uid: 'dev-parent', email: 'parent@cornerstone', name: 'Demo Parent', role: 'parent', clientId: 'cl1' }
    : { uid: 'dev', email: 'dev@cornerstone', name: 'Dev Admin', role: 'admin' };
}

export function AuthProvider({ children, audience = 'tms' }: { children: ReactNode; audience?: Audience }) {
  const [user, setUser] = useState<TmsUser | null>(FAKE ? fakeUser(audience) : null);
  const [loading, setLoading] = useState(!FAKE);
  const [pending, setPending] = useState(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    if (FAKE) return;
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setPending(false); setLoading(false); return; }
      try {
        const resolved = audience === 'portal' ? await resolveParent(u) : await resolveStaff(u);
        if (resolved) { setUser(resolved); setPending(false); setRejected(false); }
        else if (audience === 'tms') {
          // Signed in but not yet provisioned staff → record an access request and
          // show the "pending approval" screen (an admin approves it in Staff & Access).
          try {
            await setDoc(doc(db, 'tms_access_requests', u.uid), {
              uid: u.uid, email: u.email || '', name: u.displayName || '', requestedAt: Date.now(), status: 'pending',
            }, { merge: true });
          } catch { /* ignore */ }
          setUser(null); setPending(true);
        } else {
          // Parent surface: this email isn't registered/invited → sign out and tell them.
          setRejected(true); await signOut(auth); setUser(null); setPending(false);
        }
      } catch {
        setUser(null); setPending(false); // transient read error — no access this load, no forced logout
      }
      setLoading(false);
    });
  }, [audience]);

  const login = async (email: string, password: string) => {
    setRejected(false);
    await signInWithEmailAndPassword(auth, email, password);
  };
  // First-time sign-up for an invited user — onAuthStateChanged then resolves their
  // invite and auto-provisions the right role (or shows "pending"/"rejected" if none).
  const signup = async (email: string, password: string) => {
    setRejected(false);
    await createUserWithEmailAndPassword(auth, email, password);
  };
  const logout = async () => {
    await signOut(auth);
    setUser(null); setPending(false); setRejected(false);
  };

  return <Ctx.Provider value={{ user, loading, pending, rejected, login, signup, logout }}>{children}</Ctx.Provider>;
}

/** Where each role lands after login. */
export function roleHome(role: Role): string {
  switch (role) {
    case 'therapist': return '/my-day';
    case 'senior': return '/clinical';
    case 'parent': return '/portal';
    default: return '/today';
  }
}
