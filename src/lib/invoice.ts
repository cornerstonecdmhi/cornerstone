import type { ClinicSettings } from './types';

export type DocType = 'Invoice' | 'Estimate' | 'Receipt' | 'Credit Note';
export interface InvLine { svc: string; period?: string; qty: number; price: number; tax: 'Exempt' | 'Taxable'; }
export interface InvoiceDoc {
  id?: string;
  number?: string;
  docType: DocType;
  date: string;          // YYYY-MM-DD
  due?: string;
  statusMode: string;    // 'auto' | 'Paid' | 'Unpaid' | 'Partially Paid' | 'Overdue'
  billTo: { name: string; addr?: string; phone?: string; email?: string };
  child?: string;        // patient (child) name shown on the document
  childId?: string;      // FK → tms_children (lets the parent portal show their own invoices)
  items: InvLine[];
  disc: { type: 'amount' | 'percent'; val: number; reason?: string };
  round: number;
  paid: number;
  note: string;
  gstRegistered?: boolean;
  // server-computed snapshot (present on saved docs)
  subtotal?: number; discount?: number; tax?: number; total?: number; amountPaid?: number; balance?: number;
  createdAt?: unknown; createdBy?: { email?: string };
}

export const PREFIX: Record<DocType, keyof ClinicSettings> = {
  Invoice: 'prefixInvoice', Receipt: 'prefixReceipt', Estimate: 'prefixEstimate', 'Credit Note': 'prefixCredit',
};

export const fmt = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fyLabel(dateStr: string): string {
  const d = new Date(dateStr); const y = d.getFullYear(), m = d.getMonth();
  const s = m >= 3 ? y : y - 1; return String(s).slice(2) + String(s + 1).slice(2);
}
export function dmy(s?: string): string {
  if (!s) return ''; return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function compute(inv: InvoiceDoc) {
  const sub = inv.items.reduce((a, i) => a + (+i.qty || 0) * (+i.price || 0), 0);
  const disc = inv.disc.type === 'percent' ? sub * (+inv.disc.val || 0) / 100 : (+inv.disc.val || 0);
  let tax = 0;
  if (inv.gstRegistered) {
    const taxableSub = inv.items.filter((i) => i.tax === 'Taxable').reduce((a, i) => a + (+i.qty || 0) * (+i.price || 0), 0);
    const ratio = sub > 0 ? taxableSub / sub : 0;
    tax = Math.max(0, taxableSub - disc * ratio) * 0.18;
  }
  const total = sub - disc + tax + (+inv.round || 0);
  const balance = total - (+inv.paid || 0);
  return { sub, disc, tax, total, balance };
}

export function statusOf(inv: InvoiceDoc, total: number): string {
  if (inv.docType === 'Estimate') return 'Estimate';
  if (inv.statusMode !== 'auto') return inv.statusMode;
  if ((+inv.paid || 0) >= total - 0.005 && total > 0) return 'Paid';
  if ((+inv.paid || 0) > 0) return 'Partially Paid';
  if (inv.due && new Date(inv.due) < new Date(new Date().toDateString())) return 'Overdue';
  return 'Unpaid';
}

export function nextNumberPreview(inv: InvoiceDoc, s: ClinicSettings): string {
  const prefix = (s[PREFIX[inv.docType]] as string) || 'INV';
  return `${prefix}-${fyLabel(inv.date)}-####`;
}

// ── Indian rupees in words ──────────────────────────────────────────────────
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const b100 = (n: number) => n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
const b1000 = (n: number) => { let s = ''; if (n > 99) { s += ones[Math.floor(n / 100)] + ' Hundred'; n %= 100; if (n) s += ' '; } if (n) s += b100(n); return s; };
function rupeesWords(n: number): string {
  if (n === 0) return 'Zero';
  let s = ''; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) s += b1000(cr) + ' Crore '; if (lk) s += b1000(lk) + ' Lakh '; if (th) s += b1000(th) + ' Thousand '; if (n) s += b1000(n);
  return s.trim();
}
export function inWords(amt: number): string {
  amt = Math.round(amt * 100) / 100; const r = Math.floor(amt), p = Math.round((amt - r) * 100);
  let w = 'Rupees ' + rupeesWords(r); if (p) w += ' and ' + b100(p) + ' Paise'; return w + ' Only';
}

export function blankInvoice(note: string): InvoiceDoc {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  return {
    docType: 'Invoice', date: today, due, statusMode: 'auto',
    billTo: { name: '', addr: '', phone: '', email: '' }, child: '',
    items: [{ svc: '', period: '', qty: 1, price: 0, tax: 'Exempt' }],
    disc: { type: 'amount', val: 0, reason: '' }, round: 0, paid: 0, note,
  };
}
