import type { Therapist, WorkHour, Holiday, Appointment } from './types';

export const toMin = (hhmm: string): number => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  return m ? +m[1] * 60 + +m[2] : NaN;
};
export const toHHMM = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Parse "10:00–18:00" / "10:00-18:00" → {start,end} in minutes, or null. */
export function parseRange(str: string): { start: number; end: number } | null {
  const parts = (str || '').split(/[–—-]/).map((s) => s.trim());
  if (parts.length < 2) return null;
  const start = toMin(parts[0]); const end = toMin(parts[1]);
  return isFinite(start) && isFinite(end) && end > start ? { start, end } : null;
}

const WK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const weekdayKey = (date: string): string => WK[new Date(date).getDay()];

/** Clinic open window for a date, or null if closed. */
export function clinicWindow(workhours: WorkHour[], date: string): { start: number; end: number } | null {
  const wh = workhours.find((w) => (w.id || w.day.slice(0, 3).toLowerCase()) === weekdayKey(date));
  if (!wh || /closed/i.test(wh.open) || /closed/i.test(wh.close)) return null;
  return parseRange(`${wh.open}–${wh.close}`);
}

export const isHoliday = (holidays: Holiday[], date: string): boolean =>
  holidays.some((h) => h.date === date && h.type !== 'Half Day');

export function onLeave(t: Therapist, date: string): boolean {
  if (t.status !== 'Active') return true;
  if (t.leaveFrom && t.leaveTo) return date >= t.leaveFrom && date <= t.leaveTo;
  if (t.leaveFrom) return date === t.leaveFrom;
  return false;
}

const intervals = (appts: { time: string; durationMin: number }[]) =>
  appts.map((a) => ({ s: toMin(a.time), e: toMin(a.time) + (+a.durationMin || 45) })).filter((x) => isFinite(x.s));

export function hasConflict(existing: { time: string; durationMin: number }[], time: string, durationMin: number): boolean {
  const s = toMin(time); const e = s + durationMin;
  return intervals(existing).some((iv) => s < iv.e && e > iv.s);
}

export interface SlotArgs {
  date: string;
  workhours: WorkHour[];
  holidays: Holiday[];
  therapist: Therapist;
  durationMin: number;
  existing: { time: string; durationMin: number }[]; // this therapist's appts on this date
  granularity?: number;
}

/** Reason a day has no slots (for friendly messaging), or '' if slots exist. */
export function unavailableReason(a: SlotArgs): string {
  if (isHoliday(a.holidays, a.date)) return 'Clinic holiday';
  if (!clinicWindow(a.workhours, a.date)) return 'Clinic closed this day';
  if (onLeave(a.therapist, a.date)) return a.therapist.status !== 'Active' ? 'Therapist not active' : 'Therapist on leave';
  if (a.existing.length >= (a.therapist.maxSessionsPerDay || 99)) return 'Therapist at daily capacity';
  return '';
}

export function generateSlots(a: SlotArgs): string[] {
  if (unavailableReason(a)) return [];
  const clinic = clinicWindow(a.workhours, a.date)!;
  const tw = parseRange(a.therapist.workingHours) || clinic;
  const start = Math.max(clinic.start, tw.start);
  const end = Math.min(clinic.end, tw.end);
  const dur = a.durationMin || 45;
  const step = a.granularity || 30;
  const busy = intervals(a.existing);
  const slots: string[] = [];
  for (let t = start; t + dur <= end; t += step) {
    const e = t + dur;
    if (!busy.some((iv) => t < iv.e && e > iv.s)) slots.push(toHHMM(t));
  }
  return slots;
}

/** Capacity/occupancy for a therapist on a date: booked vs max. */
export function occupancy(t: Therapist, existing: Appointment[]): { booked: number; max: number; pct: number } {
  const max = t.maxSessionsPerDay || 0;
  const booked = existing.length;
  return { booked, max, pct: max ? Math.round((booked / max) * 100) : 0 };
}
