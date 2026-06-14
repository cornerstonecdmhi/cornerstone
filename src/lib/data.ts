import {
  doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, orderBy, limit, where,
} from 'firebase/firestore';
import { db, DEMO, callSaveInvoice, callDeleteInvoice, callSendNotification } from '../firebase';
import {
  type ClinicSettings, type Service, type Package, type Holiday, type WorkHour,
  type Client, type Child, type Therapist, type Appointment, type AttendanceRecord, type ChildPackage,
  type Goal, type AppNotification, type AuditEntry, type Assessment, type CarePlan, type Lead, type WebSubmission, DEFAULT_SETTINGS,
} from './types';
import { type InvoiceDoc, compute, fyLabel } from './invoice';
import * as demo from './demo';

const SETTINGS_DOC = doc(db, 'tms_settings', 'clinic');

export async function getSettings(): Promise<ClinicSettings> {
  if (DEMO) return { ...DEFAULT_SETTINGS, ...demo.demoSettings };
  const snap = await getDoc(SETTINGS_DOC);
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<ClinicSettings>) } : { ...DEFAULT_SETTINGS };
}
export async function saveSettings(s: ClinicSettings): Promise<void> {
  if (DEMO) { Object.assign(demo.demoSettings, s); return; }
  await setDoc(SETTINGS_DOC, s, { merge: true });
}

// ── Generic collection helpers ──────────────────────────────────────────────
async function listCol<T>(name: string, orderField?: string): Promise<T[]> {
  if (DEMO) {
    const rows = demo.list(name) as T[];
    if (orderField) rows.sort((a: any, b: any) => String(a[orderField] ?? '').localeCompare(String(b[orderField] ?? '')));
    return rows;
  }
  const ref = collection(db, name);
  const q = orderField ? query(ref, orderBy(orderField)) : ref;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
}
async function saveDocIn<T extends { id?: string }>(name: string, item: T): Promise<string> {
  if (DEMO) return demo.save(name, item);
  const ref = item.id ? doc(db, name, item.id) : doc(collection(db, name));
  const { id, ...rest } = item;
  void id;
  await setDoc(ref, rest, { merge: true });
  return ref.id;
}
async function removeDoc(name: string, id: string): Promise<void> {
  if (DEMO) { demo.remove(name, id); return; }
  await deleteDoc(doc(db, name, id));
}

// ── Services ─────────────────────────────────────────────────────────────────
export const listServices = () => listCol<Service>('tms_services', 'name');
export const saveService = (s: Service) => saveDocIn('tms_services', s);
export const deleteService = (id: string) => removeDoc('tms_services', id);

// ── Packages ─────────────────────────────────────────────────────────────────
export const listPackages = () => listCol<Package>('tms_packages', 'name');
export const savePackage = (p: Package) => saveDocIn('tms_packages', p);
export const deletePackage = (id: string) => removeDoc('tms_packages', id);

// ── Holidays ─────────────────────────────────────────────────────────────────
export const listHolidays = () => listCol<Holiday>('tms_holidays', 'date');
export const saveHoliday = (h: Holiday) => saveDocIn('tms_holidays', h);
export const deleteHoliday = (id: string) => removeDoc('tms_holidays', id);

// ── Work hours (fixed 7 docs keyed by weekday) ───────────────────────────────
export const listWorkHours = () => listCol<WorkHour>('tms_workhours');
export async function saveWorkHour(w: WorkHour): Promise<void> {
  if (DEMO) { demo.save('tms_workhours', w); return; }
  await setDoc(doc(db, 'tms_workhours', w.id || w.day.toLowerCase()), w, { merge: true });
}

// ── Clients (parents) & Children ─────────────────────────────────────────────
export const listClients = () => listCol<Client>('tms_clients', 'name');
export const saveClient = (c: Client) => saveDocIn('tms_clients', c);
export const deleteClient = (id: string) => removeDoc('tms_clients', id);

export const listChildren = () => listCol<Child>('tms_children', 'name');
export const saveChild = (c: Child) => saveDocIn('tms_children', c);
export const deleteChild = (id: string) => removeDoc('tms_children', id);
/** A parent's own children (filtered by parentId — parent-portal safe; an unfiltered
 *  collection read would be rejected by the rules for a parent). */
export async function listChildrenForParent(clientId: string): Promise<Child[]> {
  if (DEMO) return (demo.list('tms_children') as Child[]).filter((c) => c.parentId === clientId);
  const snap = await getDocs(query(collection(db, 'tms_children'), where('parentId', '==', clientId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Child[];
}

export const listTherapists = () => listCol<Therapist>('tms_therapists', 'name');
export const saveTherapist = (t: Therapist) => saveDocIn('tms_therapists', t);
export const deleteTherapist = (id: string) => removeDoc('tms_therapists', id);

// ── Appointments / sessions (queried by date, sorted client-side) ────────────
export async function listAppointments(date: string): Promise<Appointment[]> {
  let rows: Appointment[];
  if (DEMO) {
    rows = (demo.list('tms_appointments') as Appointment[]).filter((a) => a.date === date);
  } else {
    const snap = await getDocs(query(collection(db, 'tms_appointments'), where('date', '==', date)));
    rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Appointment[];
  }
  return rows.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}
export const saveAppointment = (a: Appointment) => saveDocIn('tms_appointments', a);
export const deleteAppointment = (id: string) => removeDoc('tms_appointments', id);
/** Appointments within an inclusive date range (for date-ranged Reports). */
export async function listAppointmentsBetween(from: string, to: string): Promise<Appointment[]> {
  let rows: Appointment[];
  if (DEMO) rows = (demo.list('tms_appointments') as Appointment[]).filter((a) => a.date >= from && a.date <= to);
  else {
    const snap = await getDocs(query(collection(db, 'tms_appointments'), where('date', '>=', from), where('date', '<=', to)));
    rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Appointment[];
  }
  return rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// ── Therapist daily work-attendance ──────────────────────────────────────────
export async function listAttendance(date: string): Promise<AttendanceRecord[]> {
  if (DEMO) return (demo.list('tms_attendance') as AttendanceRecord[]).filter((a) => a.date === date);
  const snap = await getDocs(query(collection(db, 'tms_attendance'), where('date', '==', date)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as AttendanceRecord[];
}
export async function saveAttendance(r: AttendanceRecord): Promise<void> {
  const rec = { ...r, id: `${r.date}_${r.therapistId}` };
  if (DEMO) { demo.save('tms_attendance', rec); return; }
  await setDoc(doc(db, 'tms_attendance', rec.id), rec, { merge: true });
}
export async function listAppointmentsForChild(childId: string): Promise<Appointment[]> {
  let rows: Appointment[];
  if (DEMO) rows = (demo.list('tms_appointments') as Appointment[]).filter((a) => a.childId === childId);
  else {
    const snap = await getDocs(query(collection(db, 'tms_appointments'), where('childId', '==', childId)));
    rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Appointment[];
  }
  return rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// ── Child packages & credits ─────────────────────────────────────────────────
export const listChildPackages = () => listCol<ChildPackage>('tms_child_packages', 'childName');
export const saveChildPackage = (p: ChildPackage) => saveDocIn('tms_child_packages', p);
export const deleteChildPackage = (id: string) => removeDoc('tms_child_packages', id);
/** Decrement one credit from the child's active package for a discipline. */
export async function consumeCredit(childId: string, discipline: string): Promise<{ packageName: string; remaining: number } | null> {
  const all = await listChildPackages();
  const pkg = all.find((p) => p.childId === childId && p.status === 'active' && (!discipline || p.discipline === discipline) && p.creditsUsed < p.creditsTotal);
  if (!pkg) return null;
  const used = pkg.creditsUsed + 1;
  await saveChildPackage({ ...pkg, creditsUsed: used, status: used >= pkg.creditsTotal ? 'closed' : 'active' });
  return { packageName: pkg.packageName, remaining: pkg.creditsTotal - used };
}

// ── Leads / website intake ───────────────────────────────────────────────────
export async function listLeads(): Promise<Lead[]> {
  if (DEMO) return (demo.list('tms_leads') as Lead[]).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const snap = await getDocs(query(collection(db, 'tms_leads'), orderBy('createdAt', 'desc'), limit(200)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Lead[];
}
export async function saveLead(l: Lead): Promise<string> {
  if (!l.id && !l.createdAt) l = { ...l, createdAt: Date.now() };
  return saveDocIn('tms_leads', l);
}
export const deleteLead = (id: string) => removeDoc('tms_leads', id);

// ── Website Inbox: read-through of the website's own form collections ─────────
function normalizeWeb(coll: string, d: any): WebSubmission {
  const base = { id: d.id, coll, hasConsents: false, createdAt: d.createdAt, raw: d as Record<string, unknown>, date: '', time: '', service: '', childName: '', concern: '' };
  if (coll === 'appointments') return { ...base, sourceLabel: 'Website · Appointment', parentName: d.name || '', phone: d.phone || '', email: d.email || '', service: d.service || '', date: String(d.preferredDate || '').slice(0, 10), time: d.preferredTime || '' };
  if (coll === 'bookings') return { ...base, sourceLabel: 'Website · Intake', parentName: d.parentName || '', childName: d.childName || '', phone: d.parentPhone || '', email: d.parentEmail || '', concern: d.reason || '', hasConsents: !!d.consents };
  if (coll === 'contacts') return { ...base, sourceLabel: 'Website · Contact', parentName: d.name || '', phone: d.phone || '', email: d.email || '', concern: d.message || '' };
  return { ...base, sourceLabel: 'Website · Referral', parentName: d.parentName || d.name || '', childName: d.childName || '', phone: d.phone || d.parentPhone || '', email: d.email || '', concern: d.reason || '' };
}
export async function listWebsiteSubmissions(): Promise<WebSubmission[]> {
  const colls = ['appointments', 'bookings', 'contacts', 'referrals'];
  const out: WebSubmission[] = [];
  for (const c of colls) {
    try {
      let docs: any[];
      if (DEMO) docs = demo.list(c);
      else { const snap = await getDocs(collection(db, c)); docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })); }
      out.push(...docs.map((d) => normalizeWeb(c, d)));
    } catch { /* collection absent or not readable */ }
  }
  return out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

// ── Invoices (writes go through the Cloud Function; demo simulates it) ────────
export async function listInvoices(max = 100): Promise<InvoiceDoc[]> {
  if (DEMO) {
    return (demo.list('tms_invoices') as InvoiceDoc[])
      .sort((a, b) => Number((b as any).createdAt || 0) - Number((a as any).createdAt || 0))
      .slice(0, max);
  }
  const snap = await getDocs(query(collection(db, 'tms_invoices'), orderBy('createdAt', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as InvoiceDoc[];
}
export async function saveInvoice(payload: InvoiceDoc): Promise<{ id: string; number: string }> {
  if (DEMO) {
    const number = payload.number || `INV-${fyLabel(payload.date)}-${String(demo.invoiceCount() + 1).padStart(4, '0')}`;
    const total = compute(payload).total;
    const id = demo.save('tms_invoices', { ...payload, number, total, createdAt: Date.now() });
    return { id, number };
  }
  const res = await callSaveInvoice(payload as unknown as Record<string, unknown>);
  return res.data as { id: string; number: string };
}
export async function deleteInvoice(id: string): Promise<void> {
  if (DEMO) { demo.remove('tms_invoices', id); return; }
  await callDeleteInvoice({ id });
}
/** Invoices within an inclusive date range (for date-ranged Reports). */
export async function listInvoicesBetween(from: string, to: string): Promise<InvoiceDoc[]> {
  if (DEMO) return (demo.list('tms_invoices') as InvoiceDoc[]).filter((i) => (i.date || '') >= from && (i.date || '') <= to);
  const snap = await getDocs(query(collection(db, 'tms_invoices'), where('date', '>=', from), where('date', '<=', to)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as InvoiceDoc[];
}

// ── Assessments (Rajkumar's intake → assign workflow) ────────────────────────
export const listAssessments = () => listCol<Assessment>('tms_assessments', 'date');
export const saveAssessment = (a: Assessment) => saveDocIn('tms_assessments', a);
export const deleteAssessment = (id: string) => removeDoc('tms_assessments', id);
export async function listAssessmentsForChild(childId: string): Promise<Assessment[]> {
  if (DEMO) return (demo.list('tms_assessments') as Assessment[]).filter((x) => x.childId === childId).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const snap = await getDocs(query(collection(db, 'tms_assessments'), where('childId', '==', childId)));
  return (snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Assessment[]).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}
/** Assessments a parent is allowed to view in their portal (own child + explicitly shared). */
export async function listSharedAssessmentsForChild(childId: string): Promise<Assessment[]> {
  if (DEMO) return (demo.list('tms_assessments') as Assessment[]).filter((x) => x.childId === childId && x.sharedWithParent).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const snap = await getDocs(query(collection(db, 'tms_assessments'), where('childId', '==', childId), where('sharedWithParent', '==', true)));
  return (snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Assessment[]).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

// ── Care Plans (consultation + screening → recommended plan → drives billing/scheduling) ──
export const listCarePlans = () => listCol<CarePlan>('tms_care_plans', 'date');
export const saveCarePlan = (p: CarePlan) => saveDocIn('tms_care_plans', p);
export const deleteCarePlan = (id: string) => removeDoc('tms_care_plans', id);
export async function listCarePlansForChild(childId: string): Promise<CarePlan[]> {
  if (DEMO) return (demo.list('tms_care_plans') as CarePlan[]).filter((x) => x.childId === childId);
  const snap = await getDocs(query(collection(db, 'tms_care_plans'), where('childId', '==', childId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as CarePlan[];
}

// ── Goals (clinical) ─────────────────────────────────────────────────────────
export const listGoals = () => listCol<Goal>('tms_goals', 'childName');
export const saveGoal = (g: Goal) => saveDocIn('tms_goals', g);
export const deleteGoal = (id: string) => removeDoc('tms_goals', id);
/** Goals for one child (parent-portal safe: rules allow a parent to read only their own child's goals). */
export async function listGoalsForChild(childId: string): Promise<Goal[]> {
  if (DEMO) return (demo.list('tms_goals') as Goal[]).filter((g) => g.childId === childId);
  const snap = await getDocs(query(collection(db, 'tms_goals'), where('childId', '==', childId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Goal[];
}
/** Invoices for one child (by childId FK — parent-portal safe). */
export async function listInvoicesForChild(childId: string): Promise<InvoiceDoc[]> {
  if (DEMO) return (demo.list('tms_invoices') as InvoiceDoc[]).filter((i) => (i as InvoiceDoc).childId === childId);
  const snap = await getDocs(query(collection(db, 'tms_invoices'), where('childId', '==', childId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as InvoiceDoc[];
}

// ── Audit log (read-only; written by Cloud Functions) ────────────────────────
export async function listAuditLogs(max = 100): Promise<AuditEntry[]> {
  if (DEMO) {
    return (demo.list('tms_audit_logs') as AuditEntry[])
      .sort((a, b) => Number((b as any).at || 0) - Number((a as any).at || 0)).slice(0, max);
  }
  const snap = await getDocs(query(collection(db, 'tms_audit_logs'), orderBy('at', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as AuditEntry[];
}

// ── Notifications (read; sent by the integration Cloud Functions) ────────────
export async function listNotifications(max = 100): Promise<AppNotification[]> {
  if (DEMO) {
    return (demo.list('tms_notifications') as AppNotification[])
      .sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, max);
  }
  const snap = await getDocs(query(collection(db, 'tms_notifications'), orderBy('at', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as AppNotification[];
}
export async function sendNotification(args: { channel: 'whatsapp' | 'sms' | 'email'; to: string; name?: string; message: string; type?: string; recipientName?: string }): Promise<{ status: string; message: string }> {
  if (DEMO) {
    const label = args.channel === 'email' ? 'Email' : args.channel === 'sms' ? 'SMS' : 'WhatsApp';
    demo.save('tms_notifications', { type: args.type || 'Message', channel: label, recipient: args.recipientName || args.to, message: args.message, status: 'Sent', at: new Date().toISOString() });
    return { status: 'Sent', message: 'Simulated send (demo).' };
  }
  const res = await callSendNotification(args);
  return res.data as { status: string; message: string };
}
