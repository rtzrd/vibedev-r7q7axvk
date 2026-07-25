import { describe, expect, it } from 'vitest';
import { calculateStreak } from './streak';
import { daysBetween, shiftDay, todayKey, toDayKey } from './dates';

/**
 * Midnight is the only moment that matters to a streak, so it gets its own
 * suite: what happens either side of it, and what happens on the two nights a
 * year when a local day is 23 or 25 hours long.
 */

describe('the local-midnight boundary', () => {
  const lastMinute = new Date(2026, 6, 26, 23, 59, 59, 999);
  const firstMinute = new Date(2026, 6, 27, 0, 0, 0, 1);

  it('puts a late-evening instant on the day the person is living in', () => {
    expect(toDayKey(lastMinute)).toBe('2026-07-26');
  });

  it('rolls to the next key one millisecond after midnight', () => {
    expect(todayKey(lastMinute)).toBe('2026-07-26');
    expect(todayKey(firstMinute)).toBe('2026-07-27');
    expect(daysBetween(todayKey(lastMinute), todayKey(firstMinute))).toBe(1);
  });

  it('holds a run at the same length as the clock crosses midnight', () => {
    const days = ['2026-07-24', '2026-07-25', '2026-07-26'];

    const beforeMidnight = calculateStreak(days, lastMinute);
    const afterMidnight = calculateStreak(days, firstMinute);

    expect(beforeMidnight.current).toBe(3);
    expect(afterMidnight.current).toBe(3);
  });

  it('moves a run from marked to still-open as the clock crosses midnight', () => {
    const days = ['2026-07-24', '2026-07-25', '2026-07-26'];

    expect(calculateStreak(days, lastMinute).status).toBe('active');
    expect(calculateStreak(days, lastMinute).completedToday).toBe(true);

    expect(calculateStreak(days, firstMinute).status).toBe('at-risk');
    expect(calculateStreak(days, firstMinute).completedToday).toBe(false);
  });

  it('breaks the run once a whole day has passed unmarked', () => {
    const days = ['2026-07-24', '2026-07-25', '2026-07-26'];
    const twoMidnightsLater = new Date(2026, 6, 28, 0, 0, 0, 1);

    const result = calculateStreak(days, twoMidnightsLater);

    expect(result.current).toBe(0);
    expect(result.status).toBe('broken');
    expect(result.longest).toBe(3);
  });

  it('counts a mark made just before midnight and one just after as two days', () => {
    const days = [toDayKey(lastMinute), toDayKey(firstMinute)];

    expect(calculateStreak(days, firstMinute).current).toBe(2);
  });

  it('treats midnight itself as belonging to the new day', () => {
    const midnight = new Date(2026, 6, 27, 0, 0, 0, 0);

    expect(todayKey(midnight)).toBe('2026-07-27');
  });
});

describe('days that are not 24 hours long', () => {
  it('advances exactly one calendar day at a time across a full year', () => {
    let key = '2026-01-01';

    for (let step = 0; step < 400; step += 1) {
      const next = shiftDay(key, 1);
      expect(daysBetween(key, next)).toBe(1);
      key = next;
    }

    expect(key).toBe('2027-02-05');
  });

  it('keeps a run unbroken through a spring-forward weekend', () => {
    // 29 March 2026 is the European clock change; 8 March 2026 the American one.
    const european = ['2026-03-28', '2026-03-29', '2026-03-30'];
    const american = ['2026-03-07', '2026-03-08', '2026-03-09'];

    expect(calculateStreak(european, new Date(2026, 2, 30, 12, 0, 0)).current).toBe(3);
    expect(calculateStreak(american, new Date(2026, 2, 9, 12, 0, 0)).current).toBe(3);
  });

  it('keeps a run unbroken through an autumn clock change', () => {
    const days = ['2026-10-24', '2026-10-25', '2026-10-26'];

    expect(calculateStreak(days, new Date(2026, 9, 26, 12, 0, 0)).current).toBe(3);
  });

  it('never miscounts the distance between two adjacent days', () => {
    const pairs: readonly [string, string][] = [
      ['2026-03-08', '2026-03-09'],
      ['2026-03-29', '2026-03-30'],
      ['2026-11-01', '2026-11-02'],
      ['2026-02-28', '2026-03-01'],
      ['2028-02-28', '2028-02-29'],
    ];

    for (const [from, to] of pairs) {
      expect(daysBetween(from, to)).toBe(1);
      expect(shiftDay(from, 1)).toBe(to);
    }
  });
});
