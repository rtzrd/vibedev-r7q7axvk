import { describe, expect, it } from 'vitest';
import { calculateStreak, longestRun, uniqueDays } from './streak';
import { toDayKey } from './dates';

/** NOW is a fixed local instant; keys are built from local components, so these
 * expectations hold in whatever timezone the suite runs in. */
const NOW = new Date(2026, 6, 26, 10, 30);
const ago = (n: number): string => toDayKey(new Date(2026, 6, 26 - n));
const run = (length: number, from = 0): string[] =>
  Array.from({ length }, (_, i) => ago(from + i));

describe('an empty record', () => {
  it('reports nothing started', () => {
    expect(calculateStreak([], NOW)).toEqual({
      current: 0,
      longest: 0,
      status: 'unstarted',
      today: false,
      total: 0,
    });
  });

  it('ignores a record made only of unusable keys', () => {
    expect(calculateStreak(['nope', '2026-13-40', ''], NOW).status).toBe('unstarted');
  });
});

describe('the first day', () => {
  it('counts a single mark made today as a one-day streak', () => {
    const r = calculateStreak([ago(0)], NOW);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.status).toBe('active');
    expect(r.today).toBe(true);
  });

  it('keeps a single mark made yesterday alive while today is still open', () => {
    const r = calculateStreak([ago(1)], NOW);
    expect(r.current).toBe(1);
    expect(r.status).toBe('at-risk');
    expect(r.today).toBe(false);
  });
});

describe('consecutive days', () => {
  it('counts an unbroken run ending today', () => {
    const r = calculateStreak(run(5), NOW);
    expect(r.current).toBe(5);
    expect(r.longest).toBe(5);
    expect(r.total).toBe(5);
  });

  it('does not care what order the days arrive in', () => {
    expect(calculateStreak([ago(2), ago(0), ago(3), ago(1)], NOW).current).toBe(4);
  });

  it('counts across month, year and leap-day boundaries', () => {
    expect(calculateStreak(['2026-06-29', '2026-06-30', '2026-07-01'], new Date(2026, 6, 1, 9)).current).toBe(3);
    expect(calculateStreak(['2025-12-30', '2025-12-31', '2026-01-01'], new Date(2026, 0, 1, 9)).current).toBe(3);
    expect(calculateStreak(['2028-02-28', '2028-02-29', '2028-03-01'], new Date(2028, 2, 1, 9)).current).toBe(3);
  });
});

describe('a gap breaks the run', () => {
  it('stops counting at the first missing day', () => {
    const r = calculateStreak([...run(2), ...run(3, 3)], NOW);
    expect(r.current).toBe(2);
    expect(r.longest).toBe(3);
    expect(r.total).toBe(5);
  });

  it('resets to zero when both today and yesterday were missed', () => {
    const r = calculateStreak(run(4, 2), NOW);
    expect(r.current).toBe(0);
    expect(r.status).toBe('broken');
    expect(r.longest).toBe(4);
  });

  it('starts a new run rather than resuming the old one', () => {
    const r = calculateStreak([...run(1), ...run(9, 10)], NOW);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(9);
  });
});

describe('logging the same day twice', () => {
  it('counts a day once however many times it was logged', () => {
    const r = calculateStreak([ago(0), ago(0), ago(0), ago(1)], NOW);
    expect(r.current).toBe(2);
    expect(r.total).toBe(2);
  });

  it('gives the same answer as the deduplicated record', () => {
    expect(calculateStreak([...run(6), ...run(6)], NOW)).toEqual(calculateStreak(run(6), NOW));
  });

  it('drops duplicates in uniqueDays', () => {
    expect(uniqueDays([ago(0), ago(0), ago(1)], ago(0)).size).toBe(2);
  });
});

describe('days that should not count', () => {
  it('ignores days in the future and keys that are not real dates', () => {
    const r = calculateStreak([toDayKey(new Date(2026, 6, 27)), ago(0), '2026-02-30', 'x'], NOW);
    expect(r.current).toBe(1);
    expect(r.total).toBe(1);
  });
});

describe('longestRun', () => {
  it('is zero for an empty record and finds a run that is not the latest', () => {
    expect(longestRun([])).toBe(0);
    expect(longestRun([...run(8, 20), ...run(2)].sort())).toBe(8);
  });
});
