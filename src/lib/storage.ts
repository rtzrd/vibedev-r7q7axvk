import type { Failure, Habit, HabitLog, Ink, Result, Snapshot } from '../types';
import { isDay } from './dates';

// localStorage can throw simply by being touched, it can be full, and what
// comes back is untrusted text possibly written by an older version. Nothing
// here throws: failures come back as values so the UI can show them.

export const KEY = 'daily-ledger/v1';
const INKS: Ink[] = ['oxblood', 'verdigris', 'brass', 'indigo', 'plum'];

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export interface Store {
  read(): Result<Snapshot>;
  write(s: Snapshot): Result<Snapshot>;
}

const fail = (kind: Failure['kind'], message: string): Result<never> => ({
  ok: false,
  error: { kind, message },
});

export const local = (): StorageLike | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export function createStorage(resolve: () => StorageLike | null): Store {
  return {
    read() {
      const b = resolve();
      if (!b) return fail('unavailable', 'This browser will not let the page save anything.');
      let raw: string | null;
      try {
        raw = b.getItem(KEY);
      } catch {
        return fail('unavailable', 'The saved ledger could not be opened.');
      }
      if (!raw?.trim()) return { ok: true, value: { habits: [], logs: [] } };
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return fail('parse', 'The saved ledger is not readable JSON; it was left untouched.');
      }
      const snap = normalise(parsed);
      return snap
        ? { ok: true, value: snap }
        : fail('shape', 'The saved ledger is in a shape this version cannot read.');
    },
    write(s) {
      const b = resolve();
      if (!b) return fail('unavailable', 'Nothing can be saved: local storage is off.');
      try {
        b.setItem(KEY, JSON.stringify({ version: 1, ...s }));
      } catch (e) {
        return e instanceof Error && e.name === 'QuotaExceededError'
          ? fail('quota', 'There is no room left in local storage.')
          : fail('unknown', 'The ledger could not be saved.');
      }
      return { ok: true, value: s };
    },
  };
}

export const storage = createStorage(local);

const rec = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/**
 * Coerce anything into a trustworthy snapshot, or null if it is beyond saving.
 * Accepts the current shape and the earlier ones: a bare array of habits,
 * habits carrying their own day list, and the older field names.
 */
export function normalise(input: unknown): Snapshot | null {
  const src = Array.isArray(input)
    ? { habits: input, logs: [] as unknown[] }
    : rec(input) && Array.isArray(input['habits'])
      ? {
          habits: input['habits'],
          logs: [input['logs'], input['entries'], input['log']].find(Array.isArray) ?? [],
        }
      : null;
  if (!src) return null;

  const habits: Habit[] = [];
  const logs: HabitLog[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const seen = new Set<string>();

  const push = (habitId: string, day: unknown): void => {
    if (!isDay(day) || !ids.has(habitId) || seen.has(habitId + day)) return;
    seen.add(habitId + day);
    logs.push({ habitId, day });
  };

  for (const raw of src.habits) {
    if (!rec(raw)) continue;
    const id = str(raw['id']);
    const name = (str(raw['name']) ?? str(raw['title']) ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!id || !name || ids.has(id) || names.has(name.toLowerCase())) continue;
    ids.add(id);
    names.add(name.toLowerCase());
    const ink = str(raw['ink']) ?? str(raw['color']);
    habits.push({
      id,
      name,
      ink: INKS.find((i) => i === ink) ?? INKS[habits.length % 5] ?? 'oxblood',
      createdAt: typeof raw['createdAt'] === 'number' ? raw['createdAt'] : 0,
    });
    // Older records kept the completion days on the habit itself.
    const own = [raw['days'], raw['dates'], raw['completions']].find(Array.isArray);
    if (own) for (const d of own) push(id, d);
  }

  for (const raw of src.logs) {
    if (!rec(raw)) continue;
    const id = str(raw['habitId']) ?? str(raw['habit']);
    if (id) push(id, raw['day'] ?? raw['date']);
  }

  return { habits, logs };
}
