import type { DayKey } from '../types';
const RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number): string => `${n}`.padStart(2, '0');
export const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const toDayKey = (d: Date): DayKey =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = toDayKey;
export function parseDay(key: DayKey): Date | null {
  if (!RE.test(key)) return null;
  const [y, m, d] = [+key.slice(0, 4), +key.slice(5, 7), +key.slice(8, 10)];
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}
export const isDay = (v: unknown): v is DayKey => typeof v === 'string' && parseDay(v) !== null;
export function shiftDay(key: DayKey, delta: number): DayKey {
  const d = parseDay(key);
  return d === null ? key : toDayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
}
export function daysBetween(from: DayKey, to: DayKey): number {
  const a = parseDay(from);
  const b = parseDay(to);
  if (a === null || b === null) return NaN;
  const utc = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(b) - utc(a)) / 864e5);
}
export const weekday = (key: DayKey): number => ((parseDay(key)?.getDay() ?? 1) + 6) % 7;
export const initial = (i: number): string => 'MTWTFSS'[i % 7] ?? '';
export const dayOfMonth = (key: DayKey): number => +key.slice(8, 10);
export const sameMonth = (a: DayKey, b: DayKey): boolean => a.slice(0, 7) === b.slice(0, 7);
export const recentDays = (end: DayKey, n: number): DayKey[] =>
  Array.from({ length: n }, (_, i) => shiftDay(end, i - n + 1));
export function monthGrid(anchor: DayKey): DayKey[] {
  const d = parseDay(anchor);
  if (d === null) return [];
  const first = toDayKey(new Date(d.getFullYear(), d.getMonth(), 1));
  const lead = weekday(first);
  const len = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((lead + len) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => shiftDay(first, i - lead));
}
const fmt = (key: DayKey, o: Intl.DateTimeFormatOptions): string =>
  parseDay(key)?.toLocaleDateString(undefined, o) ?? key;
export const longDate = (k: DayKey): string =>
  fmt(k, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const shortDate = (k: DayKey): string => fmt(k, { day: 'numeric', month: 'short' });
export const monthTitle = (k: DayKey): string => fmt(k, { month: 'long', year: 'numeric' });
