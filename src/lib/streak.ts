import type { DayKey, StreakResult } from '../types';
import { isDay, shiftDay, todayKey } from './dates';

/**
 * The streak rule. Pure and UI-free: pass the logged days and the instant to
 * treat as now. A day counts once however often it was logged; the run is
 * counted backwards a calendar day at a time and the first missing day ends it;
 * it is anchored on today when today is marked, otherwise on yesterday, so a
 * streak stays alive during the day it has not been marked off yet.
 */
export function calculateStreak(days: Iterable<DayKey>, now: Date): StreakResult {
  const today = todayKey(now);
  const marked = uniqueDays(days, today);
  if (!marked.size) return { current: 0, longest: 0, status: 'unstarted', today: false, total: 0 };

  const done = marked.has(today);
  const yesterday = shiftDay(today, -1);
  const anchor = done ? today : marked.has(yesterday) ? yesterday : null;

  let current = 0;
  for (let d = anchor; d !== null && marked.has(d); d = shiftDay(d, -1)) current++;

  return {
    current,
    longest: longestRun([...marked].sort()),
    status: anchor === null ? 'broken' : done ? 'active' : 'at-risk',
    today: done,
    total: marked.size,
  };
}

/** Unique, valid, non-future days; duplicates and stray keys drop out here. */
export function uniqueDays(days: Iterable<DayKey>, today: DayKey): Set<DayKey> {
  const set = new Set<DayKey>();
  for (const d of days) if (isDay(d) && d <= today) set.add(d);
  return set;
}

/** The longest consecutive run anywhere in a sorted record. */
export function longestRun(sorted: readonly DayKey[]): number {
  let best = 0;
  let run = 0;
  let last: DayKey | null = null;
  for (const d of sorted) {
    run = last !== null && shiftDay(last, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    last = d;
  }
  return best;
}

export function describeStreak(s: StreakResult): string {
  if (s.status === 'unstarted') return 'Not yet begun';
  if (s.status === 'broken') return s.longest ? `Broken — best run ${s.longest}` : 'Broken';
  if (s.status === 'at-risk') return `${s.current} days — today still open`;
  return s.current === 1 ? 'Day one, marked' : `${s.current} days unbroken`;
}
