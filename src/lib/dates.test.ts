import { describe, expect, it } from 'vitest';
import {
  dayOfMonth,
  daysBetween,
  isSameMonth,
  isValidDayKey,
  monthGrid,
  parseDayKey,
  recentDays,
  shiftDay,
  startOfLocalDay,
  toDayKey,
  weekdayIndex,
  weekdayInitial,
} from './dates';

describe('toDayKey and parseDayKey', () => {
  it('formats a local date as a zero-padded key', () => {
    expect(toDayKey(new Date(2026, 0, 5, 13, 45))).toBe('2026-01-05');
    expect(toDayKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('round-trips a key back to local midnight', () => {
    const parsed = parseDayKey('2026-07-26');

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(26);
    expect(parsed?.getHours()).toBe(0);
  });

  it('rejects keys that name a day the calendar does not have', () => {
    expect(parseDayKey('2026-02-30')).toBeNull();
    expect(parseDayKey('2026-13-01')).toBeNull();
    expect(parseDayKey('26-07-01')).toBeNull();
    expect(parseDayKey('rubbish')).toBeNull();
  });

  it('accepts a leap day only in a leap year', () => {
    expect(isValidDayKey('2028-02-29')).toBe(true);
    expect(isValidDayKey('2026-02-29')).toBe(false);
  });

  it('rejects values that are not strings at all', () => {
    expect(isValidDayKey(null)).toBe(false);
    expect(isValidDayKey(20260726)).toBe(false);
    expect(isValidDayKey({ day: '2026-07-26' })).toBe(false);
  });
});

describe('startOfLocalDay', () => {
  it('strips the time without moving the calendar day', () => {
    const midnight = startOfLocalDay(new Date(2026, 6, 26, 23, 59, 59, 999));

    expect(midnight.getDate()).toBe(26);
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getMilliseconds()).toBe(0);
  });
});

describe('shiftDay and daysBetween', () => {
  it('moves forwards and backwards over month ends', () => {
    expect(shiftDay('2026-07-31', 1)).toBe('2026-08-01');
    expect(shiftDay('2026-08-01', -1)).toBe('2026-07-31');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('is its own inverse', () => {
    expect(shiftDay(shiftDay('2026-07-26', 37), -37)).toBe('2026-07-26');
  });

  it('measures a signed number of whole days', () => {
    expect(daysBetween('2026-07-26', '2026-07-26')).toBe(0);
    expect(daysBetween('2026-07-26', '2026-08-02')).toBe(7);
    expect(daysBetween('2026-08-02', '2026-07-26')).toBe(-7);
  });

  it('reports NaN rather than a wrong number for an unreadable key', () => {
    expect(Number.isNaN(daysBetween('nonsense', '2026-07-26'))).toBe(true);
  });
});

describe('weekdays', () => {
  it('numbers the week from Monday', () => {
    // 2026-07-27 is a Monday.
    expect(weekdayIndex('2026-07-27')).toBe(0);
    expect(weekdayIndex('2026-08-02')).toBe(6);
  });

  it('labels each column with a single letter', () => {
    expect(weekdayInitial(0)).toBe('M');
    expect(weekdayInitial(6)).toBe('S');
    expect(weekdayInitial(7)).toBe('M');
  });
});

describe('recentDays', () => {
  it('returns the requested number of days, oldest first, ending on the anchor', () => {
    const days = recentDays('2026-07-26', 5);

    expect(days).toHaveLength(5);
    expect(days[0]).toBe('2026-07-22');
    expect(days[days.length - 1]).toBe('2026-07-26');
  });

  it('returns a single day when asked for one', () => {
    expect(recentDays('2026-07-26', 1)).toEqual(['2026-07-26']);
  });
});

describe('monthGrid', () => {
  const grid = monthGrid('2026-07-15');

  it('is made of whole Monday-first weeks', () => {
    expect(grid.length % 7).toBe(0);
    expect(weekdayIndex(grid[0] ?? '')).toBe(0);
  });

  it('covers every day of the month it was anchored in', () => {
    for (let day = 1; day <= 31; day += 1) {
      const key = `2026-07-${String(day).padStart(2, '0')}`;
      expect(grid).toContain(key);
    }
  });

  it('pads with the neighbouring months rather than blanks', () => {
    expect(grid.every((key) => isValidDayKey(key))).toBe(true);
    expect(grid.some((key) => !isSameMonth(key, '2026-07-15'))).toBe(true);
  });

  it('handles a February that starts on a Monday', () => {
    const february = monthGrid('2027-02-10');

    expect(february).toHaveLength(28);
    expect(february.every((key) => isSameMonth(key, '2027-02-01'))).toBe(true);
  });
});

describe('small helpers', () => {
  it('reads the day of the month as a number', () => {
    expect(dayOfMonth('2026-07-05')).toBe(5);
    expect(dayOfMonth('2026-07-31')).toBe(31);
  });

  it('compares months without comparing days', () => {
    expect(isSameMonth('2026-07-01', '2026-07-31')).toBe(true);
    expect(isSameMonth('2026-07-31', '2026-08-01')).toBe(false);
  });
});
