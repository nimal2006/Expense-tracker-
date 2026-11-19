import { WeekdayShort } from '../types';

export const IST_TIMEZONE = 'Asia/Kolkata';

const WEEKDAY_MAP: Record<string, WeekdayShort> = {
  Mon: 'Mon',
  Tue: 'Tue',
  Wed: 'Wed',
  Thu: 'Thu',
  Fri: 'Fri',
  Sat: 'Sat',
  Sun: 'Sun',
};

/**
 * Returns the current date string in YYYY-MM-DD format strictly in Asia/Kolkata timezone.
 */
export function getISTDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

/**
 * Returns the current 24-hour time string in HH:mm format strictly in Asia/Kolkata timezone.
 */
export function getISTTimeHHMM(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  const normalizedHour = hour === '24' ? '00' : hour;
  return `${normalizedHour}:${minute}`;
}

/**
 * Returns total minutes elapsed since 00:00 in Asia/Kolkata timezone.
 */
export function getISTMinutesOfDay(date: Date = new Date()): number {
  return parseHHMMToMinutes(getISTTimeHHMM(date));
}

/**
 * Returns short weekday name ('Mon'..'Sun') strictly in Asia/Kolkata timezone.
 */
export function getISTWeekday(date: Date = new Date()): WeekdayShort {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
  }).format(date);
  return WEEKDAY_MAP[weekday] || 'Mon';
}

/**
 * Parses an HH:mm 24-hour string into minutes since midnight.
 */
export function parseHHMMToMinutes(hhmm: string): number {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Formats an HH:mm 24-hour string to compact 12-hour display (e.g. "08:00 PM").
 */
export function formatTime12h(hhmm: string): string {
  if (!hhmm || !hhmm.includes(':')) return hhmm || '--:--';
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Computes duration in minutes between departure and arrival HH:mm (supports overnight crossing midnight).
 */
export function computeDurationMinutes(departureHHMM: string, arrivalHHMM: string): number {
  const dep = parseHHMMToMinutes(departureHHMM);
  const arr = parseHHMMToMinutes(arrivalHHMM);
  let diff = arr - dep;
  if (diff < 0) {
    diff += 24 * 60;
  }
  return diff;
}

/**
 * Formats duration minutes into compact string like "1h 25m" or "45m".
 */
export function formatDurationCompact(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formats an ISO timestamp for compact IST display (e.g. "08:15 PM").
 */
export function formatISTClockFromISO(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Returns a human-friendly relative time string (e.g. "Just now", "5m ago", "2h ago").
 */
export function formatRelativeTime(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'Just now';
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}
