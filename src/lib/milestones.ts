import type { Milestone, MilestoneProgress } from '../types';
export const MILESTONES: Milestone[] = [
  { days: 7, seal: 'VII', label: 'seven-day' },
  { days: 30, seal: 'XXX', label: 'thirty-day' },
  { days: 100, seal: 'C', label: 'hundred-day' },
];
export function milestoneProgress(streak: number): MilestoneProgress {
  const earned = MILESTONES.filter((m) => streak >= m.days);
  const next = MILESTONES.find((m) => streak < m.days) ?? null;
  if (!next) return { earned, next: null, left: 0, ratio: 1 };
  const from = earned.at(-1)?.days ?? 0;
  return { earned, next, left: next.days - streak, ratio: (streak - from) / (next.days - from) };
}
export const milestoneNotice = (name: string, streak: number): string | null => {
  const hit = MILESTONES.find((m) => m.days === streak);
  return hit ? `${name} has reached the ${hit.label} mark. Seal earned.` : null;
};
