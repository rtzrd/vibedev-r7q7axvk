/**
 * Domain vocabulary for the ledger. Everything the app persists, computes or
 * renders is described here so the storage, streak and view layers agree.
 */

/** A calendar day in the viewer's own timezone, formatted `YYYY-MM-DD`. */
export type DayKey = string;

/** Milliseconds since the epoch, used for ordering and audit trails. */
export type Timestamp = number;

/** Opaque identifier for a habit record. */
export type HabitId = string;

/** The visual accent a habit is stamped with in the ledger. */
export type HabitInkName = 'oxblood' | 'verdigris' | 'brass' | 'indigo' | 'plum';

/** A single tracked habit. */
export interface Habit {
  readonly id: HabitId;
  readonly name: string;
  readonly ink: HabitInkName;
  readonly createdAt: Timestamp;
}

/** One completion mark: a habit was done on a given local day. */
export interface HabitLogEntry {
  readonly habitId: HabitId;
  readonly day: DayKey;
  readonly loggedAt: Timestamp;
}

/** All log entries for one habit, already deduplicated by day. */
export interface HabitLog {
  readonly habitId: HabitId;
  readonly days: readonly DayKey[];
}

/** Whether a streak is still alive, hanging by a thread, or over. */
export type StreakStatus = 'unstarted' | 'active' | 'at-risk' | 'broken';

/** The result of the core streak rule. */
export interface StreakResult {
  readonly current: number;
  readonly longest: number;
  readonly status: StreakStatus;
  readonly completedToday: boolean;
  readonly lastCompletedDay: DayKey | null;
  readonly totalDaysCompleted: number;
}

/** A celebratory threshold measured in consecutive days. */
export interface Milestone {
  readonly days: number;
  readonly label: string;
  readonly seal: string;
}

/** How far along a streak is against the milestone ladder. */
export interface MilestoneProgress {
  readonly earned: readonly Milestone[];
  readonly next: Milestone | null;
  readonly daysRemaining: number | null;
  readonly ratio: number;
}

/** One cell in a calendar or strip view. */
export interface CalendarDay {
  readonly day: DayKey;
  readonly dayOfMonth: number;
  readonly weekdayIndex: number;
  readonly completed: boolean;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  readonly beforeHabitExisted: boolean;
}

/** The shape written to and read back from localStorage. */
export interface LedgerSnapshot {
  readonly version: number;
  readonly habits: readonly Habit[];
  readonly entries: readonly HabitLogEntry[];
}

/** Outcome of any storage operation; never throws at the call site. */
export type StorageResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: StorageFailure };

/** Why a storage read or write could not be trusted. */
export interface StorageFailure {
  readonly kind: 'unavailable' | 'parse' | 'shape' | 'quota' | 'unknown';
  readonly message: string;
}

/** Result of checking a habit name typed by the user. */
export type ValidationResult =
  | { readonly valid: true; readonly value: string }
  | { readonly valid: false; readonly message: string };

/** Lifecycle of the initial read from storage. */
export type LoadPhase = 'pending' | 'ready' | 'failed';

/** Which record view the reader has chosen. */
export type LedgerView = 'month' | 'recent';

/** Everything a render pass needs. */
export interface AppState {
  readonly phase: LoadPhase;
  readonly habits: readonly Habit[];
  readonly entries: readonly HabitLogEntry[];
  readonly view: LedgerView;
  readonly formError: string | null;
  readonly notice: string | null;
  readonly storageError: string | null;
}

/** A habit paired with everything derived from its log, ready to render. */
export interface HabitSummary {
  readonly habit: Habit;
  readonly streak: StreakResult;
  readonly milestones: MilestoneProgress;
  readonly completedDays: ReadonlySet<DayKey>;
}

/** Commands the view layer may dispatch back into the store. */
export interface LedgerActions {
  readonly addHabit: (rawName: string) => void;
  readonly toggleToday: (habitId: HabitId) => void;
  readonly removeHabit: (habitId: HabitId) => void;
  readonly setView: (view: LedgerView) => void;
}
