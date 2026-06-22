// Actionable in-app alerts for the TMS notification center. These are DERIVED from
// live data (leads, bookings, packages, children, consent) rather than stored — so
// acting on the item (e.g. confirming a booking) resolves the underlying condition
// and the alert disappears on its own. No stale "unread" state to manage.
import type { Lead, Child, ChildPackage, Client, Appointment, Therapist } from './types';
import { type InvoiceDoc, compute } from './invoice';

export type AlertKind =
  | 'lead' | 'booking' | 'credits' | 'review' | 'consent' | 'assessment'
  | 'invoice' | 'noshow' | 'leave';
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
  appts: Appointment[]; // today's (for bookings / no-shows / leave cover)
  children: Child[];
  packages: ChildPackage[];
  clients: Client[];
  invoices?: InvoiceDoc[];   // admin-only — unpaid / overdue
  therapists?: Therapist[];  // on-leave-with-sessions
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
  // Unpaid / overdue invoices
  for (const i of s.invoices || []) {
    if (i.docType !== 'Invoice') continue;
    const total = i.total ?? compute(i).total;
    const paid = i.amountPaid ?? (+i.paid || 0);
    if (paid < total - 0.5) {
      const overdue = !!(i.due && i.due < t);
      out.push({
        id: 'inv-' + i.id, kind: 'invoice', severity: overdue ? 'urgent' : 'info',
        title: `${overdue ? 'Overdue' : 'Unpaid'} invoice: ${i.billTo?.name || i.child || ''}`,
        detail: `${i.number || ''} · ₹${Math.round(total - paid)} due`, to: '/billing',
      });
    }
  }
  // Today's no-shows
  for (const a of s.appts || []) {
    if (a.status === 'No-show') {
      out.push({ id: 'ns-' + a.id, kind: 'noshow', severity: 'warn', title: `No-show: ${a.childName}`, detail: `${a.serviceName} · ${a.time}`, to: '/schedule' });
    }
  }
  // Therapist on leave who still has sessions booked today
  for (const th of s.therapists || []) {
    const onLeave = th.status === 'On Leave'
      || (!!th.leaveFrom && !!th.leaveTo && th.leaveFrom <= t && t <= th.leaveTo)
      || (!!th.leaveFrom && th.leaveFrom === t);
    if (!onLeave) continue;
    const n = (s.appts || []).filter((a) => a.therapistId === th.id && a.status !== 'Cancelled').length;
    if (n > 0) {
      out.push({ id: 'lv-' + th.id, kind: 'leave', severity: 'urgent', title: `${th.name} on leave — ${n} session${n === 1 ? '' : 's'} to cover`, detail: 'Reschedule or reassign today', to: '/schedule' });
    }
  }

  const rank: Record<AlertSeverity, number> = { urgent: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// Only surface alerts a given role can actually act on (matches route access).
const ROLE_KINDS: Record<string, AlertKind[] | 'all'> = {
  admin: 'all',
  senior: ['booking', 'review', 'assessment', 'consent', 'noshow', 'leave'],
  therapist: ['review', 'assessment', 'noshow'],
  parent: [],
};
export function alertsForRole(alerts: Alert[], role: string): Alert[] {
  const allowed = ROLE_KINDS[role] ?? [];
  return allowed === 'all' ? alerts : alerts.filter((a) => allowed.includes(a.kind));
}
