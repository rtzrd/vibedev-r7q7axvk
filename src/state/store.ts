import type { Actions, AppState, DayKey, Habit, HabitId, Ink, Summary, View } from '../types';
import { startOfDay, todayKey } from '../lib/dates';
import { milestoneNotice, milestoneProgress } from '../lib/milestones';
import { calculateStreak, describeStreak } from '../lib/streak';
import { storage as defaultStorage, type LedgerStorage } from '../lib/storage';
import { validateName } from '../lib/validation';

/**
 * The single source of truth. Streaks and milestones are derived on every read
 * rather than stored, so there is no cached number to fall out of date.
 */

const INKS: readonly Ink[] = ['oxblood', 'verdigris', 'brass', 'indigo', 'plum'];

export interface Store {
  getState(): AppState;
  summaries(): Summary[];
  subscribe(listener: () => void): void;
  actions: Actions;
  load(): void;
  today(): DayKey;
}

export function createStore(
  storage: LedgerStorage = defaultStorage,
  clock: () => Date = () => new Date(),
): Store {
  const listeners: (() => void)[] = [];
  let state: AppState = {
    phase: 'pending',
    habits: [],
    logs: [],
    view: 'month',
    formError: null,
    notice: null,
    saveError: null,
  };

  const emit = (): void => listeners.forEach((l) => l());
  const set = (patch: Partial<AppState>): void => {
    state = { ...state, ...patch };
    emit();
  };

  /** Write through, surfacing a failure as a banner instead of throwing. */
  const save = (habits: AppState['habits'], logs: AppState['logs']): string | null => {
    const result = storage.write({ habits, logs });
    return result.ok ? null : result.error.message;
  };

  /** Re-render just after local midnight so streaks age correctly overnight. */
  const scheduleMidnight = (): void => {
    const now = clock();
    const delay = startOfDay(now).getTime() + 864e5 + 1e3 - now.getTime();
    setTimeout(() => {
      emit();
      scheduleMidnight();
    }, Math.max(1e3, Math.min(delay, 2147483e3)));
  };

  function load(): void {
    set({ phase: 'pending' });
    // Read after the first paint so the pending state is actually seen. A
    // hidden tab never paints, so a timer races the frame.
    let done = false;
    const run = (): void => {
      if (done) return;
      done = true;
      const result = storage.read();
      if (!result.ok) {
        set({ phase: 'failed', saveError: result.error.message });
        return;
      }
      set({ phase: 'ready', ...result.value, saveError: null });
      scheduleMidnight();
    };
    requestAnimationFrame(run);
    setTimeout(run);
  }

  const actions: Actions = {
    add(raw) {
      const check = validateName(raw, state.habits);
      if (!check.valid) return set({ formError: check.message, notice: null });

      const habit: Habit = {
        id: crypto.randomUUID(),
        name: check.value,
        ink: INKS[state.habits.length % INKS.length] ?? 'oxblood',
        createdAt: clock().getTime(),
      };
      const habits = [...state.habits, habit];
      set({ habits, formError: null, notice: `${habit.name} added.`, saveError: save(habits, state.logs) });
    },

    toggle(id) {
      const habit = state.habits.find((h) => h.id === id);
      if (habit === undefined) return;
      const day = todayKey(clock());
      const marked = state.logs.some((l) => l.habitId === id && l.day === day);

      // Logging the same day twice must never double-count: the second press
      // clears the mark rather than adding a duplicate row.
      const logs = marked
        ? state.logs.filter((l) => !(l.habitId === id && l.day === day))
        : [...state.logs, { habitId: id, day }];

      const streak = calculateStreak(
        logs.filter((l) => l.habitId === id).map((l) => l.day),
        clock(),
      );
      set({
        logs,
        notice:
          (marked ? null : milestoneNotice(habit.name, streak.current)) ??
          `${habit.name} ${marked ? 'unmarked' : 'marked'} for today. ${describeStreak(streak)}.`,
        saveError: save(state.habits, logs),
      });
    },

    remove(id) {
      const habit = state.habits.find((h) => h.id === id);
      if (habit === undefined) return;
      const habits = state.habits.filter((h) => h.id !== id);
      const logs = state.logs.filter((l) => l.habitId !== id);
      set({ habits, logs, notice: `${habit.name} removed.`, saveError: save(habits, logs) });
    },

    setView(view: View) {
      if (view !== state.view) set({ view });
    },
  };

  return {
    getState: () => state,
    summaries: () => summarise(state, clock()),
    subscribe: (l) => void listeners.push(l),
    actions,
    load,
    today: () => todayKey(clock()),
  };
}

/** Pair every habit with its streak, seals and completed days. */
export function summarise(state: AppState, now: Date): Summary[] {
  const byHabit = new Map<HabitId, Set<DayKey>>(state.habits.map((h) => [h.id, new Set()]));
  for (const log of state.logs) byHabit.get(log.habitId)?.add(log.day);

  return state.habits.map((habit) => {
    const days = byHabit.get(habit.id) ?? new Set<DayKey>();
    const streak = calculateStreak(days, now);
    return { habit, streak, milestones: milestoneProgress(streak.current), days };
  });
}
