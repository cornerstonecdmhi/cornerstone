export type Tax = 'Exempt' | 'Taxable';

export interface ClinicSettings {
  name: string;
  subline: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstReg: 'yes' | 'no';
  gstin: string;
  placeOfSupply: string;
  logo: string;        // data URL
  logoH: number;       // logo height on invoice (px)
  qr: string;          // UPI QR data URL
  bankName: string;
  accName: string;
  accNo: string;
  ifsc: string;
  accType: string;
  upi: string;
  signatory: string;
  assessorName: string;        // lead assessor / clinical owner
  assessorCredential: string;  // e.g. RCI licence
  invoiceNote: string;
  terms: string;
  prefixInvoice: string;
  prefixReceipt: string;
  prefixEstimate: string;
  prefixCredit: string;
}

export const DEFAULT_SETTINGS: ClinicSettings = {
  name: 'Cornerstone',
  subline: 'CHILD DEVELOPMENT & MENTAL HEALTH INSTITUTE',
  tagline: 'Care. Love. Faith.',
  address: '123 Wellness Way, Suite 101, Hyderabad, Telangana 500081, India',
  phone: '+91 98765 43210',
  email: 'hello@cornerstonecdmhi.com',
  website: 'www.cornerstonecdmhi.com',
  gstReg: 'no',
  gstin: '',
  placeOfSupply: 'Telangana',
  logo: '',
  logoH: 92,
  qr: '',
  bankName: 'HDFC Bank',
  accName: 'Cornerstone CDMHI',
  accNo: '5020 1234 5678 90',
  ifsc: 'HDFC0001234',
  accType: 'Current Account',
  upi: 'cornerstonecdmhi@okhdfcbank',
  signatory: 'Cornerstone CDMHI',
  assessorName: 'Rajkumar',
  assessorCredential: 'Licensed Rehabilitation Counsellor — RCI, Delhi',
  invoiceNote: 'Please share payment screenshot on our email or inform us once the payment is done.',
  terms: 'Sessions are valid as per the agreed package. Cancellations require 24 hours notice. Fees once paid are non-refundable except as per clinic policy.',
  prefixInvoice: 'INV',
  prefixReceipt: 'RCT',
  prefixEstimate: 'EST',
  prefixCredit: 'CRN',
};

export interface Service {
  id?: string;
  name: string;
  discipline: string;
  price: number;
  durationMin: number;
  chargeable: boolean;   // assessment fee can be optional
  tax: Tax;
  active: boolean;
}

export interface Package {
  id?: string;
  name: string;
  description: string;
  totalSessions: number;
  price: number;
  validityDays: number;
}

export interface Holiday {
  id?: string;
  date: string;          // YYYY-MM-DD
  name: string;
  type: 'Full Day' | 'Half Day';
}

export interface WorkHour {
  id?: string;           // day key, e.g. "mon"
  day: string;
  open: string;          // "10:00" or "Closed"
  close: string;
}

export const DEFAULT_SERVICES: Service[] = [
  { name: 'Initial Consultation (OP)', discipline: 'Consultation', price: 1000, durationMin: 30, chargeable: true, tax: 'Exempt', active: true },
  { name: 'Child Psychology Consultation', discipline: 'Child Psychology', price: 2000, durationMin: 60, chargeable: true, tax: 'Exempt', active: true },
  { name: 'Occupational Therapy Session', discipline: 'Occupational Therapy', price: 1500, durationMin: 45, chargeable: true, tax: 'Exempt', active: true },
  { name: 'Speech Therapy Session', discipline: 'Speech Therapy', price: 1500, durationMin: 45, chargeable: true, tax: 'Exempt', active: true },
  { name: 'Parental Guidance Session', discipline: 'Counseling', price: 2000, durationMin: 45, chargeable: true, tax: 'Exempt', active: true },
  { name: 'Developmental Assessment', discipline: 'Assessment', price: 3000, durationMin: 90, chargeable: false, tax: 'Exempt', active: true },
  { name: 'Behavioral Therapy Session', discipline: 'Behavioral Therapy', price: 1500, durationMin: 45, chargeable: true, tax: 'Exempt', active: true },
  { name: 'Special Education Session', discipline: 'Special Education', price: 1500, durationMin: 45, chargeable: true, tax: 'Exempt', active: true },
];

export const DISCIPLINES = [
  'Speech Therapy', 'Occupational Therapy', 'Behavioral Therapy', 'Special Education',
  'Child Psychology', 'Physiotherapy', 'Counseling',
];

export interface Client {
  id?: string;
  name: string;
  relationship: string;   // Father / Mother / Guardian
  phone: string;
  email: string;
  address: string;
  consentGiven: boolean;
  consentDate: string;
  source: string;         // Website / Referral / Walk-in / Phone
  notes: string;
}

export interface Child {
  id?: string;
  name: string;
  dob: string;
  gender: string;
  parentId: string;
  concern: string;            // primary concern / diagnosis
  disciplinesNeeded: string[]; // requirement → drives capacity planning
  requirementsNote: string;    // e.g. "Speech 3x/week, OT 2x/week"
  assignedTherapists: string;  // therapist IDs (wired when Therapists module lands)
  caseManager: string;
  startDate: string;
  status: string;             // In Assessment / Active / On Hold / Discharged / Graduated
  school: string;
  notes: string;
  // Clinical governance (refined model)
  continuityCritical?: boolean; // ASD/dev — block blind therapist swaps; reschedule-first
  reviewCadence?: string;       // Monthly / 6-weekly / Quarterly
  nextReviewDate?: string;      // Rajkumar progress review due
  nextReassessDate?: string;    // formal re-assessment due
  assessmentDone?: boolean;     // gate: has a completed assessment + assigned team
  dischargeNote?: string;       // set by Rajkumar on graduation/discharge
}

export const CHILD_STATUS = ['In Assessment', 'Active', 'On Hold', 'Discharged', 'Graduated'];
export const REVIEW_CADENCE = ['Monthly', '6-weekly', 'Quarterly'];

export interface Therapist {
  id?: string;
  name: string;
  phone: string;
  email: string;            // can match their login email
  specialties: string[];    // disciplines they deliver
  qualifications: string;
  location: string;
  workingDays: string;      // e.g. "Mon–Sat"
  workingHours: string;     // e.g. "10:00–18:00"
  maxSessionsPerDay: number; // capacity
  status: string;           // Active / On Leave / Inactive
  leaveFrom?: string;       // leave period (YYYY-MM-DD)
  leaveTo?: string;
  joinDate: string;
  notes: string;
}

export const THERAPIST_STATUS = ['Active', 'On Leave', 'Inactive'];

export interface AttendanceRecord {
  id?: string;          // `${date}_${therapistId}`
  date: string;
  therapistId: string;
  therapistName: string;
  status: string;       // Present / Late / Absent / On Leave
  checkInTime?: string;
  notes?: string;
}
export const ATTEND_STATUS = ['Present', 'Late', 'Absent', 'On Leave'];

export interface Appointment {
  id?: string;
  childId: string; childName: string;
  therapistId: string; therapistName: string;
  serviceName: string;
  type: string;        // Session / Consultation / Assessment
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  durationMin: number;
  location: string;
  status: string;      // Requested / Scheduled / Attended / No-show / Cancelled
  notes: string;
  creditConsumed?: boolean; // guard against double-decrementing a package credit
  source?: string;     // 'website' for online self-bookings awaiting confirmation
}

export interface ChildPackage {
  id?: string;
  childId: string; childName: string;
  packageName: string;
  discipline: string;
  creditsTotal: number; creditsUsed: number;
  pricePaid: number;
  expiresOn: string;
  status: string;      // active / closed / expired
}

export const APPT_TYPE = ['Session', 'Consultation', 'Assessment'];
export const APPT_STATUS = ['Requested', 'Scheduled', 'Attended', 'No-show', 'Cancelled'];

export interface Goal {
  id?: string;
  childId: string; childName: string;
  discipline: string;
  description: string;        // SMART goal
  icfDomain: string;          // WHO ICF-CY domain
  baseline: string;
  target: string;
  gasScore: number;           // current GAS: -2 baseline … 0 expected … +2 exceeds
  history: { date: string; score: number; note?: string }[];
  status: string;             // Active / Achieved / Revised / On Hold
  therapist: string;
  setDate: string;
  reviewDate: string;
}
export const GOAL_STATUS = ['Active', 'Achieved', 'Revised', 'On Hold'];
export const GAS_LABELS: Record<number, string> = {
  [-2]: '−2 Baseline', [-1]: '−1 Below expected', 0: '0 Expected', 1: '+1 Above', 2: '+2 Exceeds',
};
export const ICF_DOMAINS = [
  'Communication (d3)', 'Mobility (d4)', 'Self-care (d5)',
  'Learning & applying knowledge (d1)', 'Interpersonal interactions (d7)', 'Play & school participation (d8)',
];

export interface AppNotification {
  id?: string;
  type: string;     // Appointment reminder / Payment reminder / Report shared / …
  channel: string;  // WhatsApp / Email / SMS
  recipient: string;
  message: string;
  status: string;   // Sent / Delivered / Pending / Failed
  at: string;
}

export interface Lead {
  id?: string;
  parentName: string; phone: string; email: string;
  childName: string;
  concern: string;
  service: string;
  source: string;            // Website / Phone / Walk-in / Referral
  status: string;            // New / Contacted / Booked / Showed / Onboarded / Lost
  appointmentDate: string; appointmentTime: string;
  fee: number; paymentStatus: string; // NA / Unpaid / Paid
  notes: string;
  createdAt?: unknown;
}
/** A normalised submission read from the website's own form collections. */
export interface WebSubmission {
  id: string;
  coll: string;            // appointments | bookings | contacts | referrals
  sourceLabel: string;
  parentName: string; childName: string; phone: string; email: string;
  service: string; concern: string; date: string; time: string;
  hasConsents: boolean;
  createdAt?: unknown;
  raw: Record<string, unknown>;
}

export const LEAD_STATUS = ['New', 'Contacted', 'Booked', 'Showed', 'Onboarded', 'Lost'];
export const LEAD_SOURCE = ['Website', 'Phone', 'Walk-in', 'Referral', 'Social Media'];
export const PAYMENT_STATUS = ['NA', 'Unpaid', 'Paid'];

export interface DomainScoreRec { domain: string; score: number; max: number }
export interface AssessToolScore {
  tool: string;                // from ASSESSMENT_TOOLS
  score: string;               // the instrument's own score (DQ/SQ/IQ/severity/percentile)
  interpretation: string;
  // ── Structured digital capture (optional & additive; legacy records omit these) ──
  responses?: Record<string, string>;   // item code → value, captured via the digital form
  total?: number;                        // auto-computed total (scored instruments)
  band?: string;                         // auto severity band / profile label
  bandClass?: string;                    // success | info | warning | danger
  domains?: DomainScoreRec[];            // per-domain breakdown
  autoScored?: boolean;                  // true when the engine scored it
  fee?: number;                          // this assessment's own cost (from the catalog)
}
export interface Assessment {
  id?: string;
  childId: string; childName: string;
  assessor: string;            // defaults to the clinic's lead assessor (Rajkumar)
  date: string;
  tool: string;                // primary tool / method (kept for back-compat)
  tools?: AssessToolScore[];   // full battery administered, each with its standardized score
  findings: string;
  impression: string;          // clinical impression / diagnosis
  recommendedDisciplines: string[];
  intensity: string;           // recommended plan (e.g. "Speech 3×/wk, OT 2×/wk")
  assignedTeam: { discipline: string; therapist: string }[];
  status: string;              // Scheduled / Completed
  sharedWithParent?: boolean;  // when true, the parent can view this report in their portal
}
export const ASSESSMENT_STATUS = ['Scheduled', 'Completed'];
// The actual battery Cornerstone/Rajkumar administers (standardized, norm-referenced tools).
export const ASSESSMENT_TOOLS = [
  'DST (Developmental Screening Test)',
  'VSMS (Vineland Social Maturity Scale)',
  'ISAA (Indian Scale for Assessment of Autism)',
  'VABS (Vineland Adaptive Behavior Scales)',
  "Conners' Rating Scales (ADHD)",
  'CARS (Childhood Autism Rating Scale)',
  'Learning Style Inventory',
  'Multiple Intelligence Profile',
  'SPM (Sensory Processing Measure)',
  'NITI (NIEPID/NIMH — intellectual disability)',
  'BKT (Binet-Kamat Test of Intelligence)',
  'Case History (NIPCCD CGC proforma)',
  'Case History — Adolescent (AGSC)',
  'Adolescent Interview',
  'MSE (Mental Status Examination)',
  'Play Session Observation',
  'Speech & Language Assessment',
  'Sensory–Motor Evaluation',
  'Functional Academic Assessment',
  'Educational Error Analysis',
  'Other',
];

// Per-assessment catalog: each assessment is a chargeable item with its own price.
// These seed Settings → Services (discipline "Assessment"); edit prices there.
// The Assessments screen matches a tool to its fee by this name.
export const DEFAULT_ASSESSMENT_SERVICES: Service[] = [
  'ISAA (Indian Scale for Assessment of Autism)',
  'VABS (Vineland Adaptive Behavior Scales)',
  "Conners' Rating Scales (ADHD)",
  'CARS (Childhood Autism Rating Scale)',
  'Multiple Intelligence Profile',
  'Learning Style Inventory',
  'Case History (NIPCCD CGC proforma)',
  'MSE (Mental Status Examination)',
  'Play Session Observation',
  'Speech & Language Assessment',
  'Sensory–Motor Evaluation',
  'Functional Academic Assessment',
  'Educational Error Analysis',
].map((name) => ({
  name, discipline: 'Assessment', price: 1500, durationMin: 60, chargeable: true, tax: 'Exempt' as Tax, active: true,
}));

// ── Care Plan ────────────────────────────────────────────────────────────────
// The keystone of the clinical flow: created by the lead assessor after the
// initial consultation + quick screening and the parent-counselling session.
// One agreed record that captures the screening, the recommended assessment
// battery + therapies + intensity, the agreed plan/pricing/slots, and the
// parent's agreement — and that drives billing and scheduling.
export interface CarePlanTherapy {
  discipline: string;
  sessionsPerWeek: number;
  therapist?: string;     // assigned therapist name (optional at proposal time)
}
export interface CarePlan {
  id?: string;
  childId: string; childName: string;
  assessor: string;                 // lead assessor (Rajkumar)
  date: string;                     // consultation date
  // ── Initial consultation + quick screening (to gauge developmental phase) ──
  opFee: number;                    // OP consultation charge
  screenIQ: string;                 // quick IQ/DQ estimate + band, e.g. "DQ ~75 — mild delay"
  screenAutism: string;             // autism screen outcome (Low/Moderate/High risk + tool)
  developmentalImpression: string;  // overall developmental-phase impression
  // ── Recommended plan (output of counselling) ──
  recommendedAssessments: string[]; // the battery to run (from ASSESSMENT_TOOLS)
  therapies: CarePlanTherapy[];     // disciplines + intensity + therapist
  intensityNote: string;            // e.g. "Speech 3×/week, OT 2×/week"
  planType: string;                 // Monthly / Quarterly / Yearly / Per-session / Combo (pricing rules TBD with Raj)
  planPrice: number;                // agreed price for the plan period (0 until finalised)
  scheduleNote: string;             // agreed slots / timings
  // ── Parent counselling + agreement ──
  counsellingNote: string;          // what was explained to the parent
  parentAgreed: boolean;
  agreedDate: string;
  status: string;                   // Proposed / Agreed / Active / Completed / Cancelled
  notes: string;
}
export const CAREPLAN_STATUS = ['Proposed', 'Agreed', 'Active', 'Completed', 'Cancelled'];
// Plan types are listed for selection; the recurring/combo PRICING rules are
// deferred until the clinic (Raj) finalises them — kept as a flexible field.
export const PLAN_TYPES = ['Monthly', 'Quarterly', 'Yearly', 'Per-session', 'Combo (multi-therapy)'];
export const AUTISM_SCREEN = ['Low risk', 'Moderate risk', 'High risk', 'Not screened'];

export interface AuditEntry {
  id?: string;
  action: string;
  entity: string;
  number?: string;
  summary: string;
  by?: { email?: string };
  at?: unknown;
}

export const WEEK: { key: string; day: string }[] = [
  { key: 'mon', day: 'Monday' }, { key: 'tue', day: 'Tuesday' }, { key: 'wed', day: 'Wednesday' },
  { key: 'thu', day: 'Thursday' }, { key: 'fri', day: 'Friday' }, { key: 'sat', day: 'Saturday' },
  { key: 'sun', day: 'Sunday' },
];
