/** Domain vocabulary shared by storage, the streak rule and the views. */

/** A calendar day in the viewer's own timezone, `YYYY-MM-DD`. */
export type DayKey = string;
export type HabitId = string;
export type Ink = 'oxblood' | 'verdigris' | 'brass' | 'indigo' | 'plum';

export interface Habit {
  readonly id: HabitId;
  readonly name: string;
  readonly ink: Ink;
  readonly createdAt: number;
}

/** One completion mark: a habit was done on a given local day. */
export interface HabitLog {
  readonly habitId: HabitId;
  readonly day: DayKey;
}

export type StreakStatus = 'unstarted' | 'active' | 'at-risk' | 'broken';

export interface StreakResult {
  readonly current: number;
  readonly longest: number;
  readonly status: StreakStatus;
  readonly today: boolean;
  readonly total: number;
}

export interface Milestone {
  readonly days: number;
  readonly seal: string;
  readonly label: string;
}

export interface MilestoneProgress {
  readonly earned: readonly Milestone[];
  readonly next: Milestone | null;
  readonly left: number | null;
  readonly ratio: number;
}

export interface CalendarDay {
  readonly day: DayKey;
  readonly number: number;
  readonly state: 'done' | 'missed' | 'future' | 'before';
  readonly isToday: boolean;
  readonly outside: boolean;
}

export interface Snapshot {
  readonly habits: readonly Habit[];
  readonly logs: readonly HabitLog[];
}

export interface StorageFailure {
  readonly kind: 'unavailable' | 'parse' | 'shape' | 'quota' | 'unknown';
  readonly message: string;
}

export type StorageResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: StorageFailure };

export type Validation =
  | { readonly valid: true; readonly value: string }
  | { readonly valid: false; readonly message: string };

export type Phase = 'pending' | 'ready' | 'failed';
export type View = 'month' | 'recent';

export interface AppState {
  readonly phase: Phase;
  readonly habits: readonly Habit[];
  readonly logs: readonly HabitLog[];
  readonly view: View;
  readonly formError: string | null;
  readonly notice: string | null;
  readonly saveError: string | null;
}

export interface Summary {
  readonly habit: Habit;
  readonly streak: StreakResult;
  readonly milestones: MilestoneProgress;
  readonly days: ReadonlySet<DayKey>;
}

export interface Actions {
  readonly add: (name: string) => void;
  readonly toggle: (id: HabitId) => void;
  readonly remove: (id: HabitId) => void;
  readonly setView: (view: View) => void;
}
