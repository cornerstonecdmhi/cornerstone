import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

// DEV ONLY: set VITE_FAKE_AUTH=1 to preview the shell without real Firebase auth.
const FAKE = import.meta.env.DEV && import.meta.env.VITE_FAKE_AUTH === '1';

/**
 * Resolve a signed-in Firebase user to a STAFF user, from tms_staff/{uid} only.
 * Website admins (admin_users) get NO TMS access — this is the decoupling.
 * Throws on a transient read error (caller distinguishes that from non-membership).
 */
async function resolveStaff(u: User): Promise<TmsUser | null> {
  const snap = await getDoc(doc(db, 'tms_staff', u.uid));
  if (!snap.exists()) return null;
  const d = snap.data() as { name?: string; role?: Role; active?: boolean };
  if (d.active === false) return null;
  return { uid: u.uid, email: u.email || '', name: d.name || u.email || 'Staff', role: (d.role as Role) || 'therapist' };
}
/** Resolve a signed-in Firebase user to a PARENT, from tms_parent_users/{uid} only. */
async function resolveParent(u: User): Promise<TmsUser | null> {
  const snap = await getDoc(doc(db, 'tms_parent_users', u.uid));
  if (!snap.exists()) return null;
  const d = snap.data() as { name?: string; clientId?: string };
  return { uid: u.uid, email: u.email || '', name: d.name || u.email || 'Parent', role: 'parent', clientId: d.clientId };
}

function fakeUser(audience: Audience): TmsUser {
  return audience === 'portal'
    ? { uid: 'dev-parent', email: 'parent@cornerstone', name: 'Demo Parent', role: 'parent', clientId: 'cl1' }
    : { uid: 'dev', email: 'dev@cornerstone', name: 'Dev Admin', role: 'admin' };
}

export function AuthProvider({ children, audience = 'tms' }: { children: ReactNode; audience?: Audience }) {
  const [user, setUser] = useState<TmsUser | null>(FAKE ? fakeUser(audience) : null);
  const [loading, setLoading] = useState(!FAKE);

  useEffect(() => {
    if (FAKE) return;
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setLoading(false); return; }
      try {
        const resolved = audience === 'portal' ? await resolveParent(u) : await resolveStaff(u);
        if (resolved) { setUser(resolved); }
        else { await signOut(auth); setUser(null); } // signed in but not a member of THIS surface
      } catch {
        // Transient read error — deny access this load, but don't force a logout.
        setUser(null);
      }
      setLoading(false);
    });
  }, [audience]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
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
