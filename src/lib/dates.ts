import type { DayKey } from '../types';

/**
 * Local-calendar helpers. A habit marked at 23:58 belongs to that evening, so
 * every key is built from local components, and day arithmetic runs over those
 * components (never elapsed hours) so a clock change cannot add or drop a day.
 */

const PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayKey = (now: Date): DayKey => toDayKey(now);

export function parseDayKey(key: DayKey): Date | null {
  if (!PATTERN.test(key)) return null;
  const [y, m, d] = [+key.slice(0, 4), +key.slice(5, 7), +key.slice(8, 10)];
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function isValidDayKey(value: unknown): value is DayKey {
  return typeof value === 'string' && parseDayKey(value) !== null;
}

/** The same day moved by `delta` calendar days, clock-change safe. */
export function shiftDay(key: DayKey, delta: number): DayKey {
  const date = parseDayKey(key);
  return date === null
    ? key
    : toDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta));
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  const a = parseDayKey(from);
  const b = parseDayKey(to);
  if (a === null || b === null) return NaN;
  const ms =
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / 864e5);
}

/** Monday-first weekday position, 0 through 6. */
export function weekday(key: DayKey): number {
  const date = parseDayKey(key);
  return date === null ? 0 : (date.getDay() + 6) % 7;
}

export const initial = (index: number): string => INITIALS[index % 7] ?? '';

/** The `count` most recent days ending on `end`, oldest first. */
export function recentDays(end: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => shiftDay(end, i - count + 1));
}

/** Every day of `anchor`'s month padded to whole Monday-first weeks. */
export function monthGrid(anchor: DayKey): DayKey[] {
  const date = parseDayKey(anchor);
  if (date === null) return [];
  const first = toDayKey(new Date(date.getFullYear(), date.getMonth(), 1));
  const lead = weekday(first);
  const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((lead + length) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => shiftDay(first, i - lead));
}

export const sameMonth = (a: DayKey, b: DayKey): boolean => a.slice(0, 7) === b.slice(0, 7);
export const dayOfMonth = (key: DayKey): number => +key.slice(8, 10);

function format(key: DayKey, options: Intl.DateTimeFormatOptions): string {
  const date = parseDayKey(key);
  return date === null ? key : date.toLocaleDateString(undefined, options);
}

export const longDate = (k: DayKey): string =>
  format(k, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const shortDate = (k: DayKey): string => format(k, { day: 'numeric', month: 'short' });
export const monthTitle = (k: DayKey): string => format(k, { month: 'long', year: 'numeric' });
