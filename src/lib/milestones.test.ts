import { describe, expect, it } from 'vitest';
import { MILESTONES, isMilestoneDay, milestoneAnnouncement, milestoneProgress } from './milestones';

describe('the milestone ladder', () => {
  it('has rungs at seven, thirty and a hundred days', () => {
    expect(MILESTONES.map((milestone) => milestone.days)).toEqual([7, 30, 100]);
  });

  it('earns nothing before the first rung', () => {
    const progress = milestoneProgress(6);

    expect(progress.earned).toHaveLength(0);
    expect(progress.next?.days).toBe(7);
    expect(progress.daysRemaining).toBe(1);
  });

  it('earns a seal on the exact day it is reached', () => {
    for (const days of [7, 30, 100]) {
      expect(isMilestoneDay(days)).toBe(true);
      expect(milestoneProgress(days).earned.at(-1)?.days).toBe(days);
    }
  });

  it('does not earn a seal on the day before', () => {
    for (const days of [6, 29, 99]) {
      expect(isMilestoneDay(days)).toBe(false);
    }
  });

  it('measures progress from the last rung reached, not from zero', () => {
    // Half way between seven and thirty is day 18 and a half.
    const progress = milestoneProgress(18);

    expect(progress.next?.days).toBe(30);
    expect(progress.daysRemaining).toBe(12);
    expect(progress.ratio).toBeCloseTo(11 / 23, 5);
  });

  it('tops out once every seal is earned', () => {
    const progress = milestoneProgress(140);

    expect(progress.earned).toHaveLength(3);
    expect(progress.next).toBeNull();
    expect(progress.daysRemaining).toBeNull();
    expect(progress.ratio).toBe(1);
  });

  it('announces only on the day a seal is earned', () => {
    expect(milestoneAnnouncement('Walk', 7)).toContain('seven-day');
    expect(milestoneAnnouncement('Walk', 8)).toBeNull();
    expect(milestoneAnnouncement('Walk', 0)).toBeNull();
  });
});
