import type { DayKey, HabitLogEntry, HabitId, StreakResult, StreakStatus } from '../types';
import { isValidDayKey, shiftDay, todayKey } from './dates';

/**
 * The streak rule.
 *
 * Pure, UI-free, and driven entirely by its arguments — pass the logged days and
 * the clock reading to treat as "now", get the streak back. No globals, no
 * `Date.now()`, so a test can stand at any instant in any timezone.
 *
 * The rule itself:
 *   - a day counts once, however many times it was logged;
 *   - the run is counted backwards one calendar day at a time, and the first
 *     missing day ends it;
 *   - the run is anchored on today when today is done, otherwise on yesterday,
 *     so a streak stays alive during the day it has not been marked off yet;
 *   - miss both today and yesterday and the run is broken back to zero.
 */
export function calculateStreak(days: Iterable<DayKey>, now: Date): StreakResult {
  const today = todayKey(now);
  const completed = normaliseDays(days, today);

  if (completed.size === 0) {
    return {
      current: 0,
      longest: 0,
      status: 'unstarted',
      completedToday: false,
      lastCompletedDay: null,
      totalDaysCompleted: 0,
    };
  }

  const ordered = [...completed].sort();
  const completedToday = completed.has(today);
  const yesterday = shiftDay(today, -1);
  const anchor = completedToday ? today : completed.has(yesterday) ? yesterday : null;

  return {
    current: anchor === null ? 0 : countRunEndingOn(completed, anchor),
    longest: longestRun(ordered),
    status: streakStatus(anchor, completedToday),
    completedToday,
    lastCompletedDay: ordered[ordered.length - 1] ?? null,
    totalDaysCompleted: completed.size,
  };
}

/** Convenience wrapper: pull one habit's days out of a flat entry list. */
export function calculateStreakForHabit(
  entries: readonly HabitLogEntry[],
  habitId: HabitId,
  now: Date,
): StreakResult {
  const days: DayKey[] = [];
  for (const entry of entries) {
    if (entry.habitId === habitId) days.push(entry.day);
  }
  return calculateStreak(days, now);
}

/** Unique, valid, non-future days. Duplicates and stray keys drop out here. */
export function normaliseDays(days: Iterable<DayKey>, today: DayKey): Set<DayKey> {
  const unique = new Set<DayKey>();
  for (const day of days) {
    if (!isValidDayKey(day)) continue;
    if (day > today) continue;
    unique.add(day);
  }
  return unique;
}

/** Walk backwards from `anchor` while each preceding day is present. */
function countRunEndingOn(completed: ReadonlySet<DayKey>, anchor: DayKey): number {
  let length = 0;
  let cursor = anchor;
  while (completed.has(cursor)) {
    length += 1;
    cursor = shiftDay(cursor, -1);
  }
  return length;
}

/** The longest consecutive run anywhere in the record. */
export function longestRun(ordered: readonly DayKey[]): number {
  let best = 0;
  let run = 0;
  let previous: DayKey | null = null;

  for (const day of ordered) {
    run = previous !== null && shiftDay(previous, 1) === day ? run + 1 : 1;
    previous = day;
    if (run > best) best = run;
  }
  return best;
}

function streakStatus(anchor: DayKey | null, completedToday: boolean): StreakStatus {
  if (anchor === null) return 'broken';
  return completedToday ? 'active' : 'at-risk';
}

/** Short line of prose describing where a streak stands. */
export function describeStreak(result: StreakResult): string {
  switch (result.status) {
    case 'unstarted':
      return 'Not yet begun';
    case 'active':
      return result.current === 1 ? 'Day one, marked' : `${result.current} days unbroken`;
    case 'at-risk':
      return `${result.current} days — today still open`;
    case 'broken':
      return result.longest > 0 ? `Broken — best run ${result.longest}` : 'Broken';
  }
}
