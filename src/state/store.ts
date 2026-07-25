import type {
  AppState,
  DayKey,
  Habit,
  HabitId,
  HabitInkName,
  HabitLogEntry,
  HabitSummary,
  LedgerActions,
  LedgerView,
} from '../types';
import { startOfLocalDay, todayKey } from '../lib/dates';
import { milestoneAnnouncement, milestoneProgress } from '../lib/milestones';
import { calculateStreak, describeStreak } from '../lib/streak';
import { ledgerStorage, type LedgerStorage } from '../lib/storage';
import { validateHabitName } from '../lib/validation';

/**
 * The single source of truth.
 *
 * Holds `AppState`, applies the actions the view dispatches, writes through to
 * storage on every change and tells subscribers to re-render. Derived values —
 * streaks, milestones — are computed here rather than stored, so there is only
 * one record of what happened and no cached number to fall out of date.
 */

const INKS: readonly HabitInkName[] = ['oxblood', 'verdigris', 'brass', 'indigo', 'plum'];
const DAY_MS = 86_400_000;

/** Optional seams for tests: a clock and a storage backend. */
export interface StoreOptions {
  storage?: LedgerStorage;
  clock?: () => Date;
}

/** The store handed to the render layer. */
export interface LedgerStore {
  getState(): AppState;
  getSummaries(): readonly HabitSummary[];
  subscribe(listener: (state: AppState) => void): () => void;
  actions: LedgerActions;
  load(): void;
  today(): DayKey;
}

const INITIAL: AppState = {
  phase: 'pending',
  habits: [],
  entries: [],
  view: 'month',
  formError: null,
  notice: null,
  storageError: null,
};

export function createLedgerStore(options: StoreOptions = {}): LedgerStore {
  const storage = options.storage ?? ledgerStorage;
  const clock = options.clock ?? (() => new Date());
  const listeners = new Set<(state: AppState) => void>();

  let state = INITIAL;
  let rollover: ReturnType<typeof setTimeout> | null = null;

  function emit(): void {
    for (const listener of listeners) listener(state);
  }

  function update(patch: Partial<AppState>): void {
    state = { ...state, ...patch };
    emit();
  }

  /** Write through, surfacing a failure as a banner instead of throwing. */
  function persist(habits: readonly Habit[], entries: readonly HabitLogEntry[]): string | null {
    const result = storage.write({ version: 1, habits, entries });
    return result.ok ? null : result.error.message;
  }

  /** Re-render just after local midnight so streaks age correctly overnight. */
  function scheduleRollover(): void {
    if (rollover !== null) clearTimeout(rollover);
    const now = clock();
    const nextMidnight = startOfLocalDay(now).getTime() + DAY_MS + 1_000;
    const delay = Math.max(1_000, Math.min(nextMidnight - now.getTime(), 2_147_483_000));
    rollover = setTimeout(() => {
      emit();
      scheduleRollover();
    }, delay);
  }

  function load(): void {
    update({ phase: 'pending' });

    // Read after the first paint so the pending state is actually seen rather
    // than skipped over by a synchronous read on the same tick.
    defer(() => {
      const result = storage.read();
      if (!result.ok) {
        update({ phase: 'failed', storageError: result.error.message });
        return;
      }
      update({
        phase: 'ready',
        habits: result.value.habits,
        entries: result.value.entries,
        storageError: null,
      });
      scheduleRollover();
    });
  }

  const actions: LedgerActions = {
    addHabit(rawName) {
      const check = validateHabitName(rawName, state.habits);
      if (!check.valid) {
        update({ formError: check.message, notice: null });
        return;
      }

      const habit: Habit = {
        id: createId(),
        name: check.value,
        ink: INKS[state.habits.length % INKS.length] ?? 'oxblood',
        createdAt: clock().getTime(),
      };
      const habits = [...state.habits, habit];

      update({
        habits,
        formError: null,
        notice: `${habit.name} added to the ledger.`,
        storageError: persist(habits, state.entries),
      });
    },

    toggleToday(habitId) {
      const habit = state.habits.find((candidate) => candidate.id === habitId);
      if (habit === undefined) return;

      const day = todayKey(clock());
      const logged = state.entries.some(
        (entry) => entry.habitId === habitId && entry.day === day,
      );

      // Logging the same day twice must never double-count: the second press
      // clears the mark rather than adding a duplicate row.
      const entries = logged
        ? state.entries.filter((entry) => !(entry.habitId === habitId && entry.day === day))
        : [...state.entries, { habitId, day, loggedAt: clock().getTime() }];

      const streak = calculateStreak(
        entries.filter((entry) => entry.habitId === habitId).map((entry) => entry.day),
        clock(),
      );
      const seal = logged ? null : milestoneAnnouncement(habit.name, streak.current);

      update({
        entries,
        notice:
          seal ??
          `${habit.name} ${logged ? 'unmarked' : 'marked'} for today. ${describeStreak(streak)}.`,
        storageError: persist(state.habits, entries),
      });
    },

    removeHabit(habitId) {
      const habit = state.habits.find((candidate) => candidate.id === habitId);
      if (habit === undefined) return;

      const habits = state.habits.filter((candidate) => candidate.id !== habitId);
      const entries = state.entries.filter((entry) => entry.habitId !== habitId);

      update({
        habits,
        entries,
        notice: `${habit.name} removed from the ledger.`,
        storageError: persist(habits, entries),
      });
    },

    setView(view: LedgerView) {
      if (view !== state.view) update({ view });
    },
  };

  return {
    getState: () => state,
    getSummaries: () => buildSummaries(state, clock()),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions,
    load,
    today: () => todayKey(clock()),
  };
}

/** Pair every habit with its streak, seals and completed days. */
export function buildSummaries(state: AppState, now: Date): HabitSummary[] {
  const byHabit = new Map<HabitId, Set<DayKey>>();
  for (const habit of state.habits) byHabit.set(habit.id, new Set());
  for (const entry of state.entries) byHabit.get(entry.habitId)?.add(entry.day);

  return state.habits.map((habit) => {
    const completedDays = byHabit.get(habit.id) ?? new Set<DayKey>();
    const streak = calculateStreak(completedDays, now);
    return { habit, streak, milestones: milestoneProgress(streak.current), completedDays };
  });
}

/**
 * Run work after the next paint, whichever comes first: a frame, or a timer.
 * A hidden tab never paints, and the ledger must still open when it is opened
 * in the background and looked at later.
 */
function defer(work: () => void): void {
  let done = false;
  const once = (): void => {
    if (done) return;
    done = true;
    work();
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(once);
  setTimeout(once, 0);
}

function createId(): HabitId {
  const api = globalThis.crypto;
  return api !== undefined && typeof api.randomUUID === 'function'
    ? api.randomUUID()
    : `habit-${Math.random().toString(36).slice(2, 10)}`;
}
