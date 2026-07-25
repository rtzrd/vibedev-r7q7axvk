import type { Actions, AppState, DayKey, Habit, Ink, Summary } from '../types';
import { startOfDay, todayKey } from '../lib/dates';
import { milestoneNotice, milestoneProgress } from '../lib/milestones';
import { calculateStreak, describeStreak } from '../lib/streak';
import { storage as fallback, type Store as Persist } from '../lib/storage';
import { validateName } from '../lib/validation';
const INKS: Ink[] = ['oxblood', 'verdigris', 'brass', 'indigo', 'plum'];
export interface Ledger {
  state: () => AppState;
  summaries: () => Summary[];
  subscribe: (fn: () => void) => void;
  actions: Actions;
  load: () => void;
  today: () => DayKey;
}
export function createLedger(persist: Persist = fallback, clock = (): Date => new Date()): Ledger {
  const listeners: (() => void)[] = [];
  let s: AppState = {
    phase: 'pending',
    habits: [],
    logs: [],
    formError: null,
    notice: null,
    saveError: null,
  };
  const emit = (): void => listeners.forEach((fn) => fn());
  const set = (p: Partial<AppState>): void => {
    s = { ...s, ...p };
    emit();
  };
  const save = (habits: Habit[], logs: AppState['logs']): string | null => {
    const r = persist.write({ habits, logs });
    return r.ok ? null : r.error.message;
  };
  const midnight = (): void => {
    const now = clock();
    const wait = startOfDay(now).getTime() + 864e5 + 1e3 - now.getTime();
    setTimeout(() => {
      emit();
      midnight();
    }, Math.max(1e3, Math.min(wait, 2147483e3)));
  };
  const load = (): void => {
    set({ phase: 'pending' });
    let done = false;
    const run = (): void => {
      if (done) return;
      done = true;
      const r = persist.read();
      if (!r.ok) return set({ phase: 'failed', saveError: r.error.message });
      set({ phase: 'ready', ...r.value, saveError: null });
      midnight();
    };
    requestAnimationFrame(run);
    setTimeout(run);
  };
  const actions: Actions = {
    add(raw) {
      const check = validateName(raw, s.habits);
      if (!check.valid) return set({ formError: check.message, notice: null });
      const habit: Habit = {
        id: crypto.randomUUID(),
        name: check.value,
        ink: INKS[s.habits.length % 5] ?? 'oxblood',
        createdAt: clock().getTime(),
      };
      const habits = [...s.habits, habit];
      set({ habits, formError: null, notice: `${habit.name} added.`, saveError: save(habits, s.logs) });
    },
    toggle(id) {
      const habit = s.habits.find((h) => h.id === id);
      if (!habit) return;
      const day = todayKey(clock());
      const on = s.logs.some((l) => l.habitId === id && l.day === day);
      const logs = on
        ? s.logs.filter((l) => !(l.habitId === id && l.day === day))
        : [...s.logs, { habitId: id, day }];
      const streak = calculateStreak(
        logs.filter((l) => l.habitId === id).map((l) => l.day),
        clock(),
      );
      set({
        logs,
        notice:
          (on ? null : milestoneNotice(habit.name, streak.current)) ??
          `${habit.name} ${on ? 'unmarked' : 'marked'}. ${describeStreak(streak)}.`,
        saveError: save(s.habits, logs),
      });
    },
    remove(id) {
      const habits = s.habits.filter((h) => h.id !== id);
      const logs = s.logs.filter((l) => l.habitId !== id);
      set({ habits, logs, notice: 'Entry closed.', saveError: save(habits, logs) });
    },
  };
  return {
    state: () => s,
    summaries: () => summarise(s, clock()),
    subscribe: (fn) => void listeners.push(fn),
    actions,
    load,
    today: () => todayKey(clock()),
  };
}
export function summarise(s: AppState, now: Date): Summary[] {
  const byHabit = new Map<string, Set<DayKey>>(s.habits.map((h) => [h.id, new Set()]));
  for (const l of s.logs) byHabit.get(l.habitId)?.add(l.day);
  return s.habits.map((habit) => {
    const days = byHabit.get(habit.id) ?? new Set<DayKey>();
    const streak = calculateStreak(days, now);
    return { habit, streak, seals: milestoneProgress(streak.current), days };
  });
}
