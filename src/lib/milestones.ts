import type { Milestone, MilestoneProgress } from '../types';

/**
 * The milestone ladder. Each rung is a wax seal pressed into the ledger once a
 * run reaches it — seven days, thirty, then a hundred.
 */
export const MILESTONES: readonly Milestone[] = [
  { days: 7, label: 'Seven-day', seal: 'VII' },
  { days: 30, label: 'Thirty-day', seal: 'XXX' },
  { days: 100, label: 'Hundred-day', seal: 'C' },
];

/** Which seals a run of `streakLength` days has earned, and what is next. */
export function milestoneProgress(streakLength: number): MilestoneProgress {
  const earned = MILESTONES.filter((milestone) => streakLength >= milestone.days);
  const next = MILESTONES.find((milestone) => streakLength < milestone.days) ?? null;
  const previousRung = earned.length > 0 ? (earned[earned.length - 1]?.days ?? 0) : 0;

  if (next === null) {
    return { earned, next: null, daysRemaining: null, ratio: 1 };
  }

  const span = next.days - previousRung;
  const travelled = streakLength - previousRung;

  return {
    earned,
    next,
    daysRemaining: next.days - streakLength,
    ratio: span <= 0 ? 0 : clamp(travelled / span, 0, 1),
  };
}

/** True when a run has just landed exactly on a rung. */
export function isMilestoneDay(streakLength: number): boolean {
  return MILESTONES.some((milestone) => milestone.days === streakLength);
}

/** Announcement text for the live region when a seal is earned. */
export function milestoneAnnouncement(habitName: string, streakLength: number): string | null {
  const reached = MILESTONES.find((milestone) => milestone.days === streakLength);
  if (reached === undefined) return null;
  return `${habitName} has reached the ${reached.label.toLowerCase()} mark. Seal earned.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
