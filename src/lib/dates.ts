import type { DayKey } from '../types';

/**
 * Local-calendar date helpers.
 *
 * The ledger is a record of *local* days: a habit done at 23:58 belongs to that
 * evening, not to the following UTC morning. Every function here therefore works
 * on the viewer's own calendar components and never on UTC offsets, and day
 * arithmetic goes through `Date.UTC` on those components so a daylight-saving
 * shift can never add or drop a day.
 */

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MILLISECONDS_PER_DAY = 86_400_000;

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Midnight at the start of the local day containing `date`. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** The local calendar day `date` falls on, as `YYYY-MM-DD`. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's key for a given clock reading. */
export function todayKey(now: Date): DayKey {
  return toDayKey(now);
}

/** True when `value` is a well-formed key naming a real calendar day. */
export function isValidDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string' || !DAY_KEY_PATTERN.test(value)) return false;
  const parsed = parseDayKey(value);
  return parsed !== null && toDayKey(parsed) === value;
}

/** A key back to local midnight, or `null` when the key is not a real day. */
export function parseDayKey(key: DayKey): Date | null {
  if (!DAY_KEY_PATTERN.test(key)) return null;
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const day = Number(key.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/** The same day moved by `delta` calendar days, daylight-saving safe. */
export function shiftDay(key: DayKey, delta: number): DayKey {
  const date = parseDayKey(key);
  if (date === null) return key;
  return toDayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta));
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  const start = parseDayKey(from);
  const end = parseDayKey(to);
  if (start === null || end === null) return Number.NaN;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / MILLISECONDS_PER_DAY);
}

/** Monday-first weekday position, 0 through 6. */
export function weekdayIndex(key: DayKey): number {
  const date = parseDayKey(key);
  if (date === null) return 0;
  return (date.getDay() + 6) % 7;
}

/** Single-letter column head, e.g. `W` for Wednesday. */
export function weekdayInitial(index: number): string {
  return WEEKDAY_INITIALS[((index % 7) + 7) % 7] ?? '?';
}

/** The `count` most recent days ending on `endKey`, oldest first. */
export function recentDays(endKey: DayKey, count: number): DayKey[] {
  const days: DayKey[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(shiftDay(endKey, -offset));
  }
  return days;
}

/** Every day of `anchor`'s month padded to whole Monday-first weeks. */
export function monthGrid(anchor: DayKey): DayKey[] {
  const date = parseDayKey(anchor);
  if (date === null) return [];
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstKey = toDayKey(first);
  const gridStart = shiftDay(firstKey, -weekdayIndex(firstKey));
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cellsNeeded = weekdayIndex(firstKey) + daysInMonth;
  const totalCells = Math.ceil(cellsNeeded / 7) * 7;

  const grid: DayKey[] = [];
  for (let offset = 0; offset < totalCells; offset += 1) {
    grid.push(shiftDay(gridStart, offset));
  }
  return grid;
}

/** `true` when both keys land in the same calendar month. */
export function isSameMonth(a: DayKey, b: DayKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Day-of-month as a number, e.g. `9` for `2026-03-09`. */
export function dayOfMonth(key: DayKey): number {
  return Number(key.slice(8, 10));
}

function format(key: DayKey, options: Intl.DateTimeFormatOptions): string {
  const date = parseDayKey(key);
  return date === null ? key : date.toLocaleDateString(undefined, options);
}

/** Long human date, e.g. `Thursday 9 July 2026`. */
export function formatLongDate(key: DayKey): string {
  return format(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Compact human date, e.g. `9 Jul`. */
export function formatShortDate(key: DayKey): string {
  return format(key, { day: 'numeric', month: 'short' });
}

/** Month and year heading, e.g. `July 2026`. */
export function formatMonthTitle(key: DayKey): string {
  return format(key, { month: 'long', year: 'numeric' });
}
