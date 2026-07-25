export type DayKey = string;
export type Ink = 'oxblood' | 'verdigris' | 'brass' | 'indigo' | 'plum';
export type StreakStatus = 'unstarted' | 'active' | 'at-risk' | 'broken';
export type Phase = 'pending' | 'ready' | 'failed';
export interface Habit {
  id: string;
  name: string;
  ink: Ink;
  createdAt: number;
}
export interface HabitLog {
  habitId: string;
  day: DayKey;
}
export interface StreakResult {
  current: number;
  longest: number;
  status: StreakStatus;
  today: boolean;
  total: number;
}
export interface Milestone {
  days: number;
  seal: string;
  label: string;
}
export interface MilestoneProgress {
  earned: Milestone[];
  next: Milestone | null;
  left: number;
  ratio: number;
}
export interface CalendarDay {
  day: DayKey;
  n: number;
  state: 'done' | 'missed' | 'future' | 'before';
  isToday: boolean;
  outside: boolean;
}
export interface Snapshot {
  habits: Habit[];
  logs: HabitLog[];
}
export interface Failure {
  kind: 'unavailable' | 'parse' | 'shape' | 'quota' | 'unknown';
  message: string;
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: Failure };
export type Validation = { valid: true; value: string } | { valid: false; message: string };
export interface AppState {
  phase: Phase;
  habits: Habit[];
  logs: HabitLog[];
  formError: string | null;
  notice: string | null;
  saveError: string | null;
}
export interface Summary {
  habit: Habit;
  streak: StreakResult;
  seals: MilestoneProgress;
  days: ReadonlySet<DayKey>;
}
export interface Actions {
  add(name: string): void;
  toggle(id: string): void;
  remove(id: string): void;
}
