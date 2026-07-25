import { describe, expect, it } from 'vitest';
import { calculateStreak, calculateStreakForHabit, longestRun, normaliseDays } from './streak';
import { toDayKey } from './dates';
import type { HabitLogEntry } from '../types';

/**
 * The streak rule, exercised without any DOM, storage or clock of its own.
 * `NOW` is a fixed local instant; every day key is built from local components
 * so these expectations hold in any timezone the suite happens to run in.
 */

const NOW = new Date(2026, 6, 26, 10, 30, 0);

/** The key for the day `offset` days before `NOW`. */
function daysAgo(offset: number): string {
  return toDayKey(new Date(2026, 6, 26 - offset));
}

/** A run of day keys, most recent first: `run(3)` is today, yesterday, and the day before. */
function run(length: number, startOffset = 0): string[] {
  return Array.from({ length }, (_, index) => daysAgo(startOffset + index));
}

describe('calculateStreak — an empty record', () => {
  it('reports nothing started when there are no days at all', () => {
    const result = calculateStreak([], NOW);

    expect(result).toEqual({
      current: 0,
      longest: 0,
      status: 'unstarted',
      completedToday: false,
      lastCompletedDay: null,
      totalDaysCompleted: 0,
    });
  });

  it('reports nothing started when every logged day is unusable', () => {
    const result = calculateStreak(['not-a-day', '2026-13-40', ''], NOW);

    expect(result.status).toBe('unstarted');
    expect(result.current).toBe(0);
  });
});

describe('calculateStreak — the first day', () => {
  it('counts a single mark made today as a one-day streak', () => {
    const result = calculateStreak([daysAgo(0)], NOW);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.status).toBe('active');
    expect(result.completedToday).toBe(true);
    expect(result.lastCompletedDay).toBe(daysAgo(0));
  });

  it('keeps a single mark made yesterday alive while today is still open', () => {
    const result = calculateStreak([daysAgo(1)], NOW);

    expect(result.current).toBe(1);
    expect(result.status).toBe('at-risk');
    expect(result.completedToday).toBe(false);
  });
});

describe('calculateStreak — consecutive days', () => {
  it('counts an unbroken run ending today', () => {
    const result = calculateStreak(run(5), NOW);

    expect(result.current).toBe(5);
    expect(result.longest).toBe(5);
    expect(result.status).toBe('active');
    expect(result.totalDaysCompleted).toBe(5);
  });

  it('does not care what order the days arrive in', () => {
    const shuffled = [daysAgo(2), daysAgo(0), daysAgo(3), daysAgo(1)];

    expect(calculateStreak(shuffled, NOW).current).toBe(4);
  });

  it('counts across a month boundary', () => {
    const days = ['2026-06-29', '2026-06-30', '2026-07-01'];
    const julyFirst = new Date(2026, 6, 1, 9, 0, 0);

    expect(calculateStreak(days, julyFirst).current).toBe(3);
  });

  it('counts across a year boundary', () => {
    const days = ['2025-12-30', '2025-12-31', '2026-01-01'];
    const newYearsDay = new Date(2026, 0, 1, 9, 0, 0);

    expect(calculateStreak(days, newYearsDay).current).toBe(3);
  });

  it('counts across a leap day', () => {
    const days = ['2028-02-28', '2028-02-29', '2028-03-01'];
    const marchFirst = new Date(2028, 2, 1, 9, 0, 0);

    expect(calculateStreak(days, marchFirst).current).toBe(3);
  });
});

describe('calculateStreak — a gap breaks the run', () => {
  it('stops counting at the first missing day', () => {
    // Marked today and yesterday, then a hole, then three older days.
    const days = [...run(2), ...run(3, 3)];
    const result = calculateStreak(days, NOW);

    expect(result.current).toBe(2);
    expect(result.longest).toBe(3);
    expect(result.totalDaysCompleted).toBe(5);
  });

  it('resets to zero when both today and yesterday were missed', () => {
    const result = calculateStreak(run(4, 2), NOW);

    expect(result.current).toBe(0);
    expect(result.status).toBe('broken');
    expect(result.longest).toBe(4);
    expect(result.lastCompletedDay).toBe(daysAgo(2));
  });

  it('starts a new run rather than resuming the old one after a break', () => {
    const days = [...run(1), ...run(9, 10)];
    const result = calculateStreak(days, NOW);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(9);
  });

  it('treats a single missed day in the middle as two separate runs', () => {
    const days = [...run(3), ...run(3, 4)];

    expect(calculateStreak(days, NOW).longest).toBe(3);
  });
});

describe('calculateStreak — logging the same day twice', () => {
  it('counts a day once however many times it was logged', () => {
    const days = [daysAgo(0), daysAgo(0), daysAgo(0), daysAgo(1)];
    const result = calculateStreak(days, NOW);

    expect(result.current).toBe(2);
    expect(result.totalDaysCompleted).toBe(2);
  });

  it('gives the same answer as the deduplicated record', () => {
    const doubled = [...run(6), ...run(6)];

    expect(calculateStreak(doubled, NOW)).toEqual(calculateStreak(run(6), NOW));
  });

  it('drops duplicates in normaliseDays', () => {
    const unique = normaliseDays([daysAgo(0), daysAgo(0), daysAgo(1)], daysAgo(0));

    expect(unique.size).toBe(2);
  });
});

describe('calculateStreak — days that should not count', () => {
  it('ignores days in the future', () => {
    const tomorrow = toDayKey(new Date(2026, 6, 27));
    const result = calculateStreak([tomorrow, daysAgo(0)], NOW);

    expect(result.current).toBe(1);
    expect(result.totalDaysCompleted).toBe(1);
  });

  it('ignores malformed keys mixed in with real ones', () => {
    const result = calculateStreak([daysAgo(0), '2026-02-30', 'yesterday'], NOW);

    expect(result.current).toBe(1);
    expect(result.totalDaysCompleted).toBe(1);
  });
});

describe('longestRun', () => {
  it('is zero for an empty record', () => {
    expect(longestRun([])).toBe(0);
  });

  it('finds the best run even when it is not the most recent one', () => {
    const days = [...run(8, 20), ...run(2)].sort();

    expect(longestRun(days)).toBe(8);
  });
});

describe('calculateStreakForHabit', () => {
  it('only counts the days belonging to the habit asked for', () => {
    const entries: HabitLogEntry[] = [
      { habitId: 'a', day: daysAgo(0), loggedAt: 0 },
      { habitId: 'a', day: daysAgo(1), loggedAt: 0 },
      { habitId: 'b', day: daysAgo(2), loggedAt: 0 },
      { habitId: 'b', day: daysAgo(3), loggedAt: 0 },
    ];

    expect(calculateStreakForHabit(entries, 'a', NOW).current).toBe(2);
    expect(calculateStreakForHabit(entries, 'b', NOW).current).toBe(0);
    expect(calculateStreakForHabit(entries, 'missing', NOW).status).toBe('unstarted');
  });
});
