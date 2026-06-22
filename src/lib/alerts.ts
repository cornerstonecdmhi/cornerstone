// Actionable in-app alerts for the TMS notification center. These are DERIVED from
// live data (leads, bookings, packages, children, consent) rather than stored — so
// acting on the item (e.g. confirming a booking) resolves the underlying condition
// and the alert disappears on its own. No stale "unread" state to manage.
import type { Lead, Child, ChildPackage, Client, Appointment } from './types';

export type AlertKind = 'lead' | 'booking' | 'credits' | 'review' | 'consent' | 'assessment';
export type AlertSeverity = 'urgent' | 'warn' | 'info';

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  to: string; // route to act on it
}

export interface AlertSources {
  leads: Lead[];
  appts: Appointment[]; // today's (for website-requested bookings)
  children: Child[];
  packages: ChildPackage[];
  clients: Client[];
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function deriveAlerts(s: AlertSources): Alert[] {
  const out: Alert[] = [];
  const t = todayStr();

  for (const l of s.leads || []) {
    if (l.status === 'New') {
      const ageMin = l.createdAt ? Math.floor((Date.now() - Number(l.createdAt)) / 60000) : 0;
      out.push({
        id: 'lead-' + (l.id || l.phone), kind: 'lead', severity: ageMin > 30 ? 'urgent' : 'warn',
        title: `New lead: ${l.parentName || l.childName || 'enquiry'}`,
        detail: `${l.concern || l.service || 'Uncontacted'}${ageMin ? ` · ${ageMin}m ago` : ''}`, to: '/leads',
      });
    }
  }
  for (const a of s.appts || []) {
    if (a.status === 'Requested') {
      out.push({
        id: 'book-' + a.id, kind: 'booking', severity: 'warn',
        title: `Confirm booking: ${a.childName || a.therapistName}`,
        detail: `${a.serviceName} · ${a.time}`, to: '/schedule',
      });
    }
  }
  for (const p of s.packages || []) {
    const left = p.creditsTotal - p.creditsUsed;
    if (p.status === 'active' && left <= 2) {
      out.push({
        id: 'cred-' + p.id, kind: 'credits', severity: left <= 0 ? 'urgent' : 'warn',
        title: `Low credits: ${p.childName}`, detail: `${p.discipline} · ${left} left`, to: '/billing',
      });
    }
  }
  for (const c of s.children || []) {
    if (c.nextReviewDate && c.nextReviewDate <= t && c.status === 'Active') {
      out.push({ id: 'rev-' + c.id, kind: 'review', severity: 'warn', title: `Review due: ${c.name}`, detail: c.concern || '', to: '/clinical' });
    }
    if (c.status === 'In Assessment' && !c.assessmentDone) {
      out.push({ id: 'asm-' + c.id, kind: 'assessment', severity: 'info', title: `Assessment pending: ${c.name}`, detail: c.concern || '', to: '/assessments' });
    }
  }
  for (const cl of s.clients || []) {
    if (!cl.consentGiven) {
      out.push({ id: 'con-' + cl.id, kind: 'consent', severity: 'info', title: `Consent pending: ${cl.name}`, detail: 'DPDP parental consent not recorded', to: '/clients' });
    }
  }

  const rank: Record<AlertSeverity, number> = { urgent: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// Only surface alerts a given role can actually act on (matches route access).
const ROLE_KINDS: Record<string, AlertKind[] | 'all'> = {
  admin: 'all',
  senior: ['booking', 'review', 'assessment', 'consent'],
  therapist: ['review', 'assessment'],
  parent: [],
};
export function alertsForRole(alerts: Alert[], role: string): Alert[] {
  const allowed = ROLE_KINDS[role] ?? [];
  return allowed === 'all' ? alerts : alerts.filter((a) => allowed.includes(a.kind));
}
