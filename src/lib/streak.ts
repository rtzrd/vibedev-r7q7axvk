import type { DayKey, StreakResult } from '../types';
import { isValidDayKey, shiftDay, todayKey } from './dates';

/**
 * The streak rule. Pure and UI-free: pass the logged days and the instant to
 * treat as now, get the streak back.
 *
 * A day counts once however often it was logged. The run is counted backwards a
 * calendar day at a time and the first missing day ends it. It is anchored on
 * today when today is marked, otherwise on yesterday, so a streak stays alive
 * during the day it has not been marked off yet. Miss both and it resets.
 */
export function calculateStreak(days: Iterable<DayKey>, now: Date): StreakResult {
  const today = todayKey(now);
  const marked = uniqueDays(days, today);
  if (marked.size === 0) {
    return { current: 0, longest: 0, status: 'unstarted', today: false, total: 0 };
  }

  const done = marked.has(today);
  const anchor = done ? today : marked.has(shiftDay(today, -1)) ? shiftDay(today, -1) : null;

  let current = 0;
  for (let day = anchor; day !== null && marked.has(day); day = shiftDay(day, -1)) current += 1;

  return {
    current,
    longest: longestRun([...marked].sort()),
    status: anchor === null ? 'broken' : done ? 'active' : 'at-risk',
    today: done,
    total: marked.size,
  };
}

/** Unique, valid, non-future days. Duplicates and stray keys drop out here. */
export function uniqueDays(days: Iterable<DayKey>, today: DayKey): Set<DayKey> {
  const set = new Set<DayKey>();
  for (const day of days) if (isValidDayKey(day) && day <= today) set.add(day);
  return set;
}

/** The longest consecutive run anywhere in a sorted record. */
export function longestRun(sorted: readonly DayKey[]): number {
  let best = 0;
  let run = 0;
  let last: DayKey | null = null;
  for (const day of sorted) {
    run = last !== null && shiftDay(last, 1) === day ? run + 1 : 1;
    last = day;
    if (run > best) best = run;
  }
  return best;
}

/** Short line of prose describing where a streak stands. */
export function describeStreak(s: StreakResult): string {
  if (s.status === 'unstarted') return 'Not yet begun';
  if (s.status === 'broken') return s.longest > 0 ? `Broken — best run ${s.longest}` : 'Broken';
  if (s.status === 'at-risk') return `${s.current} days — today still open`;
  return s.current === 1 ? 'Day one, marked' : `${s.current} days unbroken`;
}
