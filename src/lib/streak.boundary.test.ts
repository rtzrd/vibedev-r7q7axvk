import { describe, expect, it } from 'vitest';
import { calculateStreak } from './streak';
import { daysBetween, shiftDay, toDayKey, todayKey } from './dates';

/** Midnight is the only moment that matters to a streak, so it gets its own
 * suite: either side of it, and the nights a local day is 23 or 25 hours long. */

const LAST = new Date(2026, 6, 26, 23, 59, 59, 999);
const FIRST = new Date(2026, 6, 27, 0, 0, 0, 1);
const DAYS = ['2026-07-24', '2026-07-25', '2026-07-26'];

describe('the local-midnight boundary', () => {
  it('puts a late-evening instant on the day the person is living in', () => {
    expect(toDayKey(LAST)).toBe('2026-07-26');
  });

  it('rolls to the next key one millisecond after midnight', () => {
    expect(todayKey(LAST)).toBe('2026-07-26');
    expect(todayKey(FIRST)).toBe('2026-07-27');
    expect(todayKey(new Date(2026, 6, 27))).toBe('2026-07-27');
  });

  it('holds a run at the same length as the clock crosses midnight', () => {
    expect(calculateStreak(DAYS, LAST).current).toBe(3);
    expect(calculateStreak(DAYS, FIRST).current).toBe(3);
  });

  it('moves a run from marked to still-open across midnight', () => {
    expect(calculateStreak(DAYS, LAST).status).toBe('active');
    expect(calculateStreak(DAYS, LAST).today).toBe(true);
    expect(calculateStreak(DAYS, FIRST).status).toBe('at-risk');
    expect(calculateStreak(DAYS, FIRST).today).toBe(false);
  });

  it('breaks the run once a whole day has passed unmarked', () => {
    const r = calculateStreak(DAYS, new Date(2026, 6, 28, 0, 0, 0, 1));
    expect(r.current).toBe(0);
    expect(r.status).toBe('broken');
    expect(r.longest).toBe(3);
  });

  it('counts a mark just before midnight and one just after as two days', () => {
    expect(calculateStreak([toDayKey(LAST), toDayKey(FIRST)], FIRST).current).toBe(2);
  });
});

describe('days that are not 24 hours long', () => {
  it('advances exactly one calendar day at a time across a full year', () => {
    let key = '2026-01-01';
    for (let i = 0; i < 400; i += 1) {
      const next = shiftDay(key, 1);
      expect(daysBetween(key, next)).toBe(1);
      key = next;
    }
    expect(key).toBe('2027-02-05');
  });

  it('keeps a run unbroken through both clock changes', () => {
    // 8 and 29 March 2026 are the American and European spring changes;
    // 25 October 2026 is the European autumn one.
    expect(calculateStreak(['2026-03-07', '2026-03-08', '2026-03-09'], new Date(2026, 2, 9, 12)).current).toBe(3);
    expect(calculateStreak(['2026-03-28', '2026-03-29', '2026-03-30'], new Date(2026, 2, 30, 12)).current).toBe(3);
    expect(calculateStreak(['2026-10-24', '2026-10-25', '2026-10-26'], new Date(2026, 9, 26, 12)).current).toBe(3);
  });
});
