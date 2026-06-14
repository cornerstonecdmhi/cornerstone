// In-memory sample dataset used ONLY in demo/preview mode (VITE_FAKE_AUTH=1).
// Lets you click through a fully-populated, interconnected app without deploying.
// In real/deployed mode the data layer talks to Firestore instead.
import { DEFAULT_SETTINGS, DEFAULT_SERVICES, DEFAULT_ASSESSMENT_SERVICES, WEEK } from './types';
import type { AssessToolScore } from './types';
import { INSTRUMENTS, allItemCodes } from './instruments';

// Build a fully digitised, auto-scored ISAA tool entry for the demo dataset.
function builtISAA(pattern: number[] = [2, 3, 3, 4]): AssessToolScore {
  const inst = INSTRUMENTS.ISAA;
  const responses: Record<string, string> = {};
  allItemCodes(inst).forEach((c, i) => { responses[c] = String(pattern[i % pattern.length]); });
  const r = inst.score!(responses);
  return {
    tool: 'ISAA (Indian Scale for Assessment of Autism)',
    score: `${r.total} — ${r.band}`, interpretation: r.interpretation,
    responses, total: r.total, band: r.band, bandClass: r.bandClass, domains: r.domains,
    autoScored: true, fee: 2000,
  };
}

const today = new Date().toISOString().slice(0, 10);
const exp60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
let seq = 100;
const newId = (p: string) => `${p}_${seq++}`;

const clients = [
  { id: 'cl1', name: 'Rahul & Priya Sharma', relationship: 'Father', phone: '+91 91234 56789', email: 'rahul.sharma@email.com', address: '12-3-456, Banjara Hills, Hyderabad, Telangana 500034', consentGiven: true, consentDate: '2024-05-20', source: 'Website', notes: '' },
  { id: 'cl2', name: 'Anita Reddy', relationship: 'Mother', phone: '+91 90000 11111', email: 'anita.reddy@email.com', address: 'Jubilee Hills, Hyderabad', consentGiven: true, consentDate: '2024-04-10', source: 'Referral', notes: '' },
  { id: 'cl3', name: 'Mohammed Khan', relationship: 'Father', phone: '+91 98888 22222', email: 'm.khan@email.com', address: 'Toli Chowki, Hyderabad', consentGiven: false, consentDate: '', source: 'Walk-in', notes: 'Consent pending' },
];
const children = [
  { id: 'ch1', name: 'Aarav Sharma', dob: '2020-03-15', gender: 'Male', parentId: 'cl1', concern: 'Speech delay; sensory processing', disciplinesNeeded: ['Speech Therapy', 'Occupational Therapy'], requirementsNote: 'Speech 3×/week, OT 2×/week', assignedTherapists: 'th1, th2', caseManager: 'th1', startDate: '2024-05-22', status: 'Active', school: 'Little Stars Preschool', notes: '', continuityCritical: false, reviewCadence: 'Monthly', nextReviewDate: today, nextReassessDate: '', assessmentDone: true },
  { id: 'ch2', name: 'Diya Reddy', dob: '2019-07-02', gender: 'Female', parentId: 'cl2', concern: 'ASD — behavioural support', disciplinesNeeded: ['Behavioral Therapy', 'Special Education'], requirementsNote: 'Behavioural 3×/week', assignedTherapists: 'th3', caseManager: 'th3', startDate: '2024-04-12', status: 'Active', school: 'Sunshine School', notes: '', continuityCritical: true, reviewCadence: 'Monthly', nextReviewDate: today, nextReassessDate: '', assessmentDone: true },
  { id: 'ch3', name: 'Zoya Khan', dob: '2021-01-20', gender: 'Female', parentId: 'cl3', concern: 'Articulation difficulty', disciplinesNeeded: ['Speech Therapy'], requirementsNote: 'Speech 2×/week', assignedTherapists: '', caseManager: '', startDate: '', status: 'In Assessment', school: '', notes: '', assessmentDone: false },
];
const therapists = [
  { id: 'th0', name: 'Rajkumar', phone: '+91 99999 00000', email: 'rajkumar@cornerstonecdmhi.com', specialties: ['Assessment', 'Child Psychology', 'Counseling'], qualifications: 'Licensed Rehabilitation Counsellor — RCI, Delhi (Owner & Lead Assessor)', location: 'Hyderabad', workingDays: 'Mon–Sat', workingHours: '10:00–18:00', maxSessionsPerDay: 4, status: 'Active', joinDate: '2022-01-01', notes: 'Owner. First point of contact — takes assessments and assigns the care team.' },
  { id: 'th1', name: 'Dr. Ananya Rao', phone: '+91 90000 00001', email: 'ananya@cornerstonecdmhi.com', specialties: ['Speech Therapy', 'Child Psychology'], qualifications: 'MASLP', location: 'Hyderabad', workingDays: 'Mon–Sat', workingHours: '10:00–18:00', maxSessionsPerDay: 6, status: 'Active', joinDate: '2023-06-01', notes: 'Senior assessor' },
  { id: 'th2', name: 'Meera Iyer', phone: '+91 90000 00002', email: 'meera@cornerstonecdmhi.com', specialties: ['Occupational Therapy'], qualifications: 'MOT', location: 'Hyderabad', workingDays: 'Mon–Fri', workingHours: '10:00–17:00', maxSessionsPerDay: 7, status: 'Active', joinDate: '2023-09-01', notes: '' },
  { id: 'th3', name: 'Sanjay Kumar', phone: '+91 90000 00003', email: 'sanjay@cornerstonecdmhi.com', specialties: ['Behavioral Therapy', 'Special Education'], qualifications: 'M.Ed (Special)', location: 'Hyderabad', workingDays: 'Mon–Sat', workingHours: '09:00–16:00', maxSessionsPerDay: 6, status: 'Active', joinDate: '2024-01-15', notes: '' },
];
const services = [...DEFAULT_SERVICES, ...DEFAULT_ASSESSMENT_SERVICES].map((s, i) => ({ ...s, id: `sv${i + 1}` }));
const appointments = [
  { id: 'ap1', childId: 'ch1', childName: 'Aarav Sharma', therapistId: 'th1', therapistName: 'Dr. Ananya Rao', serviceName: 'Speech Therapy Session', type: 'Session', date: today, time: '10:00', durationMin: 45, location: 'Hyderabad', status: 'Attended', notes: '' },
  { id: 'ap2', childId: 'ch1', childName: 'Aarav Sharma', therapistId: 'th2', therapistName: 'Meera Iyer', serviceName: 'Occupational Therapy Session', type: 'Session', date: today, time: '11:00', durationMin: 45, location: 'Hyderabad', status: 'Scheduled', notes: '' },
  { id: 'ap3', childId: 'ch2', childName: 'Diya Reddy', therapistId: 'th3', therapistName: 'Sanjay Kumar', serviceName: 'Behavioral Therapy Session', type: 'Session', date: today, time: '14:00', durationMin: 45, location: 'Hyderabad', status: 'Scheduled', notes: '' },
  { id: 'ap4', childId: 'ch3', childName: 'Zoya Khan', therapistId: 'th1', therapistName: 'Dr. Ananya Rao', serviceName: 'Developmental Assessment', type: 'Assessment', date: today, time: '16:00', durationMin: 90, location: 'Hyderabad', status: 'Scheduled', notes: '' },
  { id: 'ap5', childId: '', childName: 'Vivaan Nair', therapistId: 'th0', therapistName: 'Rajkumar', serviceName: 'Initial Consultation', type: 'Consultation', date: today, time: '17:00', durationMin: 30, location: 'Hyderabad', status: 'Requested', notes: 'Website booking — Priya Nair +91 90100 20030', source: 'website' },
  // Earlier sessions (last month) so date-ranged Reports show a difference across periods.
  { id: 'ap6', childId: 'ch1', childName: 'Aarav Sharma', therapistId: 'th1', therapistName: 'Dr. Ananya Rao', serviceName: 'Speech Therapy Session', type: 'Session', date: daysAgo(25), time: '10:00', durationMin: 45, location: 'Hyderabad', status: 'Attended', notes: '' },
  { id: 'ap7', childId: 'ch2', childName: 'Diya Reddy', therapistId: 'th3', therapistName: 'Sanjay Kumar', serviceName: 'Behavioral Therapy Session', type: 'Session', date: daysAgo(25), time: '14:00', durationMin: 45, location: 'Hyderabad', status: 'No-show', notes: '' },
];
const invoices = [
  { id: 'in1', number: 'INV-2627-0001', docType: 'Invoice', date: today, due: today, statusMode: 'Paid', billTo: { name: 'Rahul & Priya Sharma', addr: '12-3-456, Banjara Hills, Hyderabad', phone: '+91 91234 56789', email: 'rahul.sharma@email.com' }, child: 'Aarav Sharma', childId: 'ch1', items: [{ svc: 'Speech Therapy Session', period: 'May 2024', qty: 4, price: 1500, tax: 'Exempt' }, { svc: 'Occupational Therapy Session', period: 'May 2024', qty: 4, price: 1500, tax: 'Exempt' }], disc: { type: 'amount', val: 0 }, round: 0, paid: 12000, note: '', gstRegistered: false, subtotal: 12000, discount: 0, tax: 0, total: 12000, balance: 0, createdAt: Date.now() },
  { id: 'in2', number: 'INV-2627-0000', docType: 'Invoice', date: daysAgo(25), due: daysAgo(25), statusMode: 'Paid', billTo: { name: 'Anita Reddy', addr: 'Jubilee Hills, Hyderabad', phone: '+91 90000 11111', email: 'anita.reddy@email.com' }, child: 'Diya Reddy', childId: 'ch2', items: [{ svc: 'Behavioral Therapy Session', period: 'Last month', qty: 8, price: 1500, tax: 'Exempt' }], disc: { type: 'amount', val: 0 }, round: 0, paid: 9000, note: '', gstRegistered: false, subtotal: 12000, discount: 0, tax: 0, total: 12000, balance: 3000, createdAt: Date.now() - 25 * 864e5 },
];

const goals = [
  { id: 'go1', childId: 'ch1', childName: 'Aarav Sharma', discipline: 'Speech Therapy', description: 'Use 2-word phrases in 8/10 prompts', icfDomain: 'Communication (d3)', baseline: 'Single words', target: '2-word phrases 8/10', gasScore: 0, history: [{ date: '2024-05-22', score: -2 }, { date: today, score: 0 }], status: 'Active', therapist: 'Dr. Ananya Rao', setDate: '2024-05-22', reviewDate: today },
  { id: 'go2', childId: 'ch1', childName: 'Aarav Sharma', discipline: 'Occupational Therapy', description: 'Independent pincer grasp for self-feeding', icfDomain: 'Self-care (d5)', baseline: 'Raking grasp', target: 'Pincer grasp 5/5 meals', gasScore: 1, history: [{ date: '2024-05-22', score: -2 }, { date: today, score: 1 }], status: 'Active', therapist: 'Meera Iyer', setDate: '2024-05-22', reviewDate: today },
  { id: 'go3', childId: 'ch2', childName: 'Diya Reddy', discipline: 'Behavioral Therapy', description: 'Reduce transition meltdowns to <2/day', icfDomain: 'Interpersonal interactions (d7)', baseline: '6+/day', target: '<2/day', gasScore: -1, history: [{ date: '2024-04-12', score: -2 }, { date: today, score: -1 }], status: 'Active', therapist: 'Sanjay Kumar', setDate: '2024-04-12', reviewDate: today },
];
const auditLogs = [
  { id: 'al1', action: 'create', entity: 'invoice', number: 'INV-2627-0001', summary: 'create Invoice INV-2627-0001 • ₹12000 • Rahul & Priya Sharma', by: { email: 'admin@cornerstonecdmhi.com' }, at: Date.now() - 36e5 },
  { id: 'al2', action: 'create', entity: 'child', summary: 'Onboarded child Aarav Sharma', by: { email: 'ananya@cornerstonecdmhi.com' }, at: Date.now() - 72e5 },
  { id: 'al3', action: 'update', entity: 'appointment', summary: 'Marked Aarav Sharma 10:00 session Attended', by: { email: 'admin@cornerstonecdmhi.com' }, at: Date.now() - 18e5 },
];
const notifications = [
  { id: 'no1', type: 'Appointment reminder', channel: 'WhatsApp', recipient: 'Rahul & Priya Sharma', message: 'Reminder: Aarav has Speech Therapy today at 10:00 with Dr. Ananya Rao.', status: 'Delivered', at: new Date(Date.now() - 9e6).toISOString() },
  { id: 'no2', type: 'Invoice sent', channel: 'Email', recipient: 'Rahul & Priya Sharma', message: 'Invoice INV-2627-0001 (₹12,000) attached.', status: 'Sent', at: new Date(Date.now() - 8e6).toISOString() },
  { id: 'no3', type: 'Payment reminder', channel: 'WhatsApp', recipient: 'Mohammed Khan', message: 'Gentle reminder: assessment fee pending.', status: 'Pending', at: new Date(Date.now() - 3e6).toISOString() },
  { id: 'no4', type: 'Report shared', channel: 'WhatsApp', recipient: 'Anita Reddy', message: "Diya's monthly progress report is ready to view.", status: 'Delivered', at: new Date(Date.now() - 2e6).toISOString() },
];

const assessments = [
  { id: 'as1', childId: 'ch1', childName: 'Aarav Sharma', assessor: 'Rajkumar', date: '2024-05-22', tool: 'ISAA (Indian Scale for Assessment of Autism)', tools: [builtISAA(), { tool: 'DST (Developmental Screening Test)', score: 'DQ 78', interpretation: 'Mild developmental delay', fee: 1500 }, { tool: 'VSMS (Vineland Social Maturity Scale)', score: 'SQ 80', interpretation: 'Social maturity below age', fee: 1500 }, { tool: 'SPM (Sensory Processing Measure)', score: 'Elevated', interpretation: 'Sensory seeking', fee: 1500 }], findings: 'Expressive language delay; sensory seeking behaviours.', impression: 'Mixed expressive-receptive language disorder; sensory processing difficulties.', recommendedDisciplines: ['Speech Therapy', 'Occupational Therapy'], intensity: 'Speech 3×/week, OT 2×/week', assignedTeam: [{ discipline: 'Speech Therapy', therapist: 'Dr. Ananya Rao' }, { discipline: 'Occupational Therapy', therapist: 'Meera Iyer' }], status: 'Completed', sharedWithParent: true },
  { id: 'as2', childId: 'ch3', childName: 'Zoya Khan', assessor: 'Rajkumar', date: today, tool: 'Speech & Language inventory', findings: 'Articulation errors on /r/, /s/.', impression: 'Articulation disorder.', recommendedDisciplines: ['Speech Therapy'], intensity: 'Speech 2×/week', assignedTeam: [], status: 'Scheduled' },
  { id: 'as3', childId: 'ch1', childName: 'Aarav Sharma', assessor: 'Rajkumar', date: today, tool: 'ISAA (Indian Scale for Assessment of Autism)', tools: [builtISAA([2, 2, 2, 3])], findings: 'Re-assessment after ~12 months of therapy — improved social engagement and communication.', impression: 'Reduced severity; continued gains.', recommendedDisciplines: ['Speech Therapy', 'Occupational Therapy'], intensity: 'Speech 2×/week, OT 1×/week', assignedTeam: [{ discipline: 'Speech Therapy', therapist: 'Dr. Ananya Rao' }, { discipline: 'Occupational Therapy', therapist: 'Meera Iyer' }], status: 'Completed', sharedWithParent: true },
];

const carePlans = [
  {
    id: 'cpn1', childId: 'ch3', childName: 'Zoya Khan', assessor: 'Rajkumar', date: today,
    opFee: 1000, screenIQ: 'DQ ~82 — borderline', screenAutism: 'Low risk',
    developmentalImpression: 'Age-appropriate cognition; isolated articulation difficulty. Full SLA recommended; autism battery not indicated.',
    recommendedAssessments: ['Speech & Language Assessment', 'Functional Academic Assessment'],
    therapies: [{ discipline: 'Speech Therapy', sessionsPerWeek: 2, therapist: 'Dr. Ananya Rao' }],
    intensityNote: 'Speech 2×/week', planType: 'Monthly', planPrice: 12000,
    scheduleNote: 'Tue/Thu 4:00 PM with Dr. Ananya Rao',
    counsellingNote: 'Explained articulation disorder, prognosis, and home practice. Parent understands and agrees.',
    parentAgreed: true, agreedDate: today, status: 'Agreed', notes: '',
  },
];

const store: Record<string, any[]> = {
  tms_care_plans: carePlans,
  // Staff identity (separate from website admin_users). Roles: admin | senior | therapist.
  tms_staff: [
    { id: 'dev', name: 'Dev Admin', role: 'admin', active: true },
    { id: 'th0', name: 'Rajkumar', role: 'admin', active: true },
    { id: 'th1', name: 'Dr. Ananya Rao', role: 'senior', active: true },
    { id: 'th2', name: 'Meera Iyer', role: 'therapist', active: true },
    { id: 'th3', name: 'Sanjay Kumar', role: 'therapist', active: true },
  ],
  tms_parent_users: [{ id: 'dev-parent', name: 'Demo Parent', clientId: 'cl1' }],
  tms_clients: clients, tms_children: children, tms_therapists: therapists,
  tms_services: services, tms_packages: [], tms_holidays: [],
  tms_workhours: WEEK.map((w) => ({ id: w.key, day: w.day, open: w.key === 'sun' ? 'Closed' : '10:00', close: w.key === 'sun' ? 'Closed' : (w.key === 'sat' ? '16:00' : '18:00') })),
  tms_appointments: appointments, tms_invoices: invoices,
  tms_goals: goals, tms_audit_logs: auditLogs, tms_notifications: notifications,
  tms_assessments: assessments,
  tms_child_packages: [
    { id: 'cp1', childId: 'ch1', childName: 'Aarav Sharma', packageName: 'Speech Starter - 12', discipline: 'Speech Therapy', creditsTotal: 12, creditsUsed: 4, pricePaid: 16500, expiresOn: exp60, status: 'active' },
    { id: 'cp2', childId: 'ch1', childName: 'Aarav Sharma', packageName: 'OT Block - 8', discipline: 'Occupational Therapy', creditsTotal: 8, creditsUsed: 6, pricePaid: 11000, expiresOn: exp60, status: 'active' },
    { id: 'cp3', childId: 'ch2', childName: 'Diya Reddy', packageName: 'Behavioural - 12', discipline: 'Behavioral Therapy', creditsTotal: 12, creditsUsed: 9, pricePaid: 16500, expiresOn: exp60, status: 'active' },
  ],
  tms_attendance: [
    { id: today + '_th0', date: today, therapistId: 'th0', therapistName: 'Rajkumar', status: 'Present', checkInTime: '09:55' },
    { id: today + '_th1', date: today, therapistId: 'th1', therapistName: 'Dr. Ananya Rao', status: 'Present', checkInTime: '10:02' },
    { id: today + '_th2', date: today, therapistId: 'th2', therapistName: 'Meera Iyer', status: 'Late', checkInTime: '10:40' },
  ],
  // Website's own form collections (read-through "Website Inbox")
  appointments: [
    { id: 'wa1', name: 'Priya Nair', phone: '+91 90100 20030', email: 'priya.nair@email.com', age: '4', service: 'Speech Therapy', preferredDate: today + 'T10:00:00.000Z', preferredTime: '10:30', status: 'pending', createdAt: new Date(Date.now() - 4e5).toISOString() },
  ],
  bookings: [
    { id: 'wb1', childName: 'Vivaan Nair', childDob: '2021-02-10', childSex: 'Male', childSchool: 'Bright Kids', childLanguage: 'English/Telugu', parentName: 'Priya Nair', parentRelation: 'Mother', parentPhone: '+91 90100 20030', parentEmail: 'priya.nair@email.com', parentAddress: 'Kondapur, Hyderabad', reason: 'Speech delay; not forming words', history: 'Normal birth; late milestones', medicalInfo: 'None', consents: { req1: true, req2: true, req3: true, req4: true, req5: true, req6: true }, parentSignature: 'Priya Nair', dateSigned: today, source: 'intake_form', status: 'new', createdAt: new Date(Date.now() - 9e5).toISOString() },
  ],
  contacts: [
    { id: 'wc1', source: 'ContactUs', name: 'Arjun Mehta', phone: '+91 90555 60707', email: 'arjun.m@email.com', message: 'Do you offer OT for a 5-year-old?', createdAt: new Date(Date.now() - 2e5).toISOString() },
  ],
  tms_leads: [
    { id: 'le1', parentName: 'Sunita Verma', phone: '+91 90011 22233', email: 'sunita@email.com', childName: 'Ria Verma', concern: 'Speech delay', service: 'Child Psychology Consultation', source: 'Website', status: 'Booked', appointmentDate: today, appointmentTime: '15:00', fee: 2000, paymentStatus: 'Paid', notes: 'Booked + paid via website', createdAt: Date.now() - 12e5 },
    { id: 'le2', parentName: 'Imran Ali', phone: '+91 90044 55566', email: '', childName: 'Sara Ali', concern: 'Behavioural concerns', service: 'Developmental Assessment', source: 'Website', status: 'New', appointmentDate: '', appointmentTime: '', fee: 0, paymentStatus: 'NA', notes: 'Website enquiry form', createdAt: Date.now() - 3e5 },
    { id: 'le3', parentName: 'Kiran Rao', phone: '+91 90077 88899', email: '', childName: 'Aditya Rao', concern: 'OT needs', service: 'Occupational Therapy Session', source: 'Phone', status: 'Contacted', appointmentDate: '', appointmentTime: '', fee: 0, paymentStatus: 'NA', notes: '', createdAt: Date.now() - 6e5 },
  ],
};

export function list(name: string): any[] { return [...(store[name] || [])]; }
export function save(name: string, item: any): string {
  const arr = store[name] || (store[name] = []);
  if (item.id) {
    const ix = arr.findIndex((x) => x.id === item.id);
    if (ix >= 0) arr[ix] = { ...arr[ix], ...item }; else arr.push(item);
    return item.id;
  }
  const id = newId(name.replace('tms_', ''));
  arr.push({ ...item, id });
  return id;
}
export function remove(name: string, id: string): void { store[name] = (store[name] || []).filter((x) => x.id !== id); }
export const demoSettings = { ...DEFAULT_SETTINGS };
export const invoiceCount = () => (store.tms_invoices || []).length;
