import type { Milestone, MilestoneProgress } from '../types';

/** Wax seals pressed into the ledger at seven, thirty and a hundred days. */
export const MILESTONES: readonly Milestone[] = [
  { days: 7, seal: 'VII', label: 'seven-day' },
  { days: 30, seal: 'XXX', label: 'thirty-day' },
  { days: 100, seal: 'C', label: 'hundred-day' },
];

/** Which seals a run has earned, and how far the next one is. */
export function milestoneProgress(streak: number): MilestoneProgress {
  const earned = MILESTONES.filter((m) => streak >= m.days);
  const next = MILESTONES.find((m) => streak < m.days) ?? null;
  if (next === null) return { earned, next: null, left: null, ratio: 1 };

  const from = earned.at(-1)?.days ?? 0;
  return {
    earned,
    next,
    left: next.days - streak,
    ratio: Math.min(1, Math.max(0, (streak - from) / (next.days - from))),
  };
}

/** Announcement for the live region on the day a seal is earned. */
export function milestoneNotice(name: string, streak: number): string | null {
  const hit = MILESTONES.find((m) => m.days === streak);
  return hit === undefined ? null : `${name} has reached the ${hit.label} mark. Seal earned.`;
}
