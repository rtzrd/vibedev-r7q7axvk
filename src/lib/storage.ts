import type { Habit, HabitLog, Ink, Snapshot, StorageFailure, StorageResult } from '../types';
import { isValidDayKey } from './dates';

/**
 * Persistence. localStorage can throw simply by being touched, it can be full,
 * and what comes back is untrusted text possibly written by an older version.
 * Nothing here throws: failures come back as values so the UI can show them.
 */

export const KEY = 'daily-ledger/v1';
const INKS: readonly Ink[] = ['oxblood', 'verdigris', 'brass', 'indigo', 'plum'];

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export interface LedgerStorage {
  read(): StorageResult<Snapshot>;
  write(snapshot: Snapshot): StorageResult<Snapshot>;
}

const fail = (kind: StorageFailure['kind'], message: string): StorageResult<never> => ({
  ok: false,
  error: { kind, message },
});

export function localStore(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createStorage(resolve: () => StorageLike | null): LedgerStorage {
  return {
    read() {
      const backend = resolve();
      if (backend === null) return fail('unavailable', 'This browser will not let the page save anything locally.');

      let raw: string | null;
      try {
        raw = backend.getItem(KEY);
      } catch {
        return fail('unavailable', 'The saved ledger could not be opened.');
      }
      if (raw === null || raw.trim() === '') return { ok: true, value: { habits: [], logs: [] } };

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return fail('parse', 'The saved ledger is not readable JSON, so it was left untouched.');
      }

      const snapshot = normalise(parsed);
      return snapshot === null
        ? fail('shape', 'The saved ledger is in a shape this version cannot read.')
        : { ok: true, value: snapshot };
    },

    write(snapshot) {
      const backend = resolve();
      if (backend === null) return fail('unavailable', 'Nothing can be saved: local storage is off.');
      try {
        backend.setItem(KEY, JSON.stringify({ version: 1, ...snapshot }));
      } catch (error) {
        const full = error instanceof Error && error.name === 'QuotaExceededError';
        return full
          ? fail('quota', 'There is no room left in local storage for this entry.')
          : fail('unknown', 'The ledger could not be saved.');
      }
      return { ok: true, value: snapshot };
    },
  };
}

export const storage = createStorage(localStore);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

/**
 * Coerce anything into a trustworthy snapshot, or null if it is beyond saving.
 * Accepts the current shape and the earlier ones this app shipped: a bare array
 * of habits, habits carrying their own day list, and the older field names.
 */
export function normalise(input: unknown): Snapshot | null {
  const source = Array.isArray(input)
    ? { habits: input, logs: [] as unknown[] }
    : isRecord(input) && Array.isArray(input['habits'])
      ? {
          habits: input['habits'],
          logs: [input['logs'], input['entries'], input['log']].find(Array.isArray) ?? [],
        }
      : null;
  if (source === null) return null;

  const habits: Habit[] = [];
  const logs: HabitLog[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const seen = new Set<string>();

  const push = (habitId: string, day: unknown): void => {
    if (!isValidDayKey(day) || !ids.has(habitId) || seen.has(`${habitId}@${day}`)) return;
    seen.add(`${habitId}@${day}`);
    logs.push({ habitId, day });
  };

  for (const raw of source.habits) {
    if (!isRecord(raw)) continue;
    const id = str(raw['id']);
    const name = (str(raw['name']) ?? str(raw['title']) ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (id === null || name === '' || ids.has(id) || names.has(name.toLowerCase())) continue;
    ids.add(id);
    names.add(name.toLowerCase());
    const named = str(raw['ink']) ?? str(raw['color']);
    habits.push({
      id,
      name,
      ink: INKS.find((i) => i === named) ?? INKS[habits.length % INKS.length] ?? 'oxblood',
      createdAt: num(raw['createdAt']),
    });
    // Older records kept completion days on the habit itself.
    const own = [raw['days'], raw['dates'], raw['completions']].find(Array.isArray);
    if (own !== undefined) for (const day of own) push(id, day);
  }

  for (const raw of source.logs) {
    if (!isRecord(raw)) continue;
    const habitId = str(raw['habitId']) ?? str(raw['habit']);
    if (habitId !== null) push(habitId, raw['day'] ?? raw['date']);
  }

  return { habits, logs };
}
