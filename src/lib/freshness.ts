import type { DayKey, Snack, Verdict } from '../types';

/**
 * The freshness rule, and the local-day helpers it needs.
 *
 * Pure: pass a snack and the instant to treat as now, get the verdict back. No
 * clock of its own, so a test can stand at any moment. Days are local calendar
 * days — a packet bought at 23:58 was bought that evening — and the arithmetic
 * runs over date components, so a daylight-saving change cannot shift a day.
 */

const RE = /^\d{4}-\d{2}-\d{2}$/;
const AGING_AT = 2 / 3;

const pad = (n: number): string => `${n}`.padStart(2, '0');

export const toDayKey = (d: Date): DayKey =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDay(key: DayKey): Date | null {
  if (!RE.test(key)) return null;
  const [y, m, d] = [+key.slice(0, 4), +key.slice(5, 7), +key.slice(8, 10)];
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export const isDay = (v: unknown): v is DayKey => typeof v === 'string' && parseDay(v) !== null;

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return NaN;
  const utc = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(b) - utc(a)) / 864e5);
}

/** Human date for a label, e.g. `9 Jul`. */
export const shortDate = (key: DayKey): string =>
  parseDay(key)?.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) ?? key;

/**
 * How much life is left in a packet.
 *
 * Shelf life is counted from the day it was bought. Under two thirds used it is
 * still good; past two thirds it is getting old; on or after the last day it is
 * out. A packet bought in the future counts as bought today rather than
 * pretending to be fresher than new.
 */
export function judge(snack: Snack, now: Date): Verdict {
  const shelfLife = Math.max(1, Math.floor(snack.shelfLife));
  const kept = Math.max(0, daysBetween(snack.bought, toDayKey(now)) || 0);
  const daysLeft = shelfLife - kept;
  const ratio = kept / shelfLife;

  const status = ratio >= 1 ? 'stale' : ratio >= AGING_AT ? 'aging' : 'fresh';
  const note =
    status === 'stale'
      ? daysLeft === 0
        ? 'Out of date today — toss it'
        : `${-daysLeft} days past — toss it`
      : status === 'aging'
        ? `${daysLeft} days left — eat it soon`
        : `${daysLeft} days left`;

  return { status, daysLeft, daysKept: kept, ratio: Math.min(ratio, 1), note };
}

/** Stale first, then whatever expires soonest. */
export const bySoonest = (a: Verdict, b: Verdict): number => a.daysLeft - b.daysLeft;
