import type {
  Habit,
  HabitInkName,
  HabitLogEntry,
  LedgerSnapshot,
  StorageFailure,
  StorageResult,
} from '../types';
import { isValidDayKey } from './dates';

/**
 * The persistence layer.
 *
 * Every read and write is wrapped: `localStorage` can throw simply by being
 * touched (private browsing, blocked third-party storage), it can be full, and
 * whatever comes back out is untrusted text that may have been written by an
 * older version of this app — or by hand. Nothing here throws at the call site;
 * failures come back as values so the UI can show them.
 */

export const STORAGE_KEY = 'daily-ledger/v1';
export const SCHEMA_VERSION = 1;

const INKS: readonly HabitInkName[] = ['oxblood', 'verdigris', 'brass', 'indigo', 'plum'];
const MAX_NAME = 60;

/** The slice of the Web Storage API this module needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** A bound reader/writer over one storage backend. */
export interface LedgerStorage {
  read(): StorageResult<LedgerSnapshot>;
  write(snapshot: LedgerSnapshot): StorageResult<LedgerSnapshot>;
  clear(): StorageResult<null>;
}

export const EMPTY_SNAPSHOT: LedgerSnapshot = { version: SCHEMA_VERSION, habits: [], entries: [] };

function fail(kind: StorageFailure['kind'], message: string): StorageResult<never> {
  return { ok: false, error: { kind, message } };
}

function why(error: unknown): string {
  return error instanceof Error && error.message !== '' ? error.message : 'No detail was given.';
}

/** Resolve `localStorage`, treating any access error as simply unavailable. */
export function resolveLocalStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Build a storage facade over any backend, real or faked in a test. */
export function createLedgerStorage(resolve: () => StorageLike | null): LedgerStorage {
  return {
    read() {
      const backend = resolve();
      if (backend === null) return fail('unavailable', 'This browser is not letting the page save anything locally.');

      let raw: string | null;
      try {
        raw = backend.getItem(STORAGE_KEY);
      } catch (error) {
        return fail('unavailable', `The saved ledger could not be opened. ${why(error)}`);
      }
      if (raw === null || raw.trim() === '') return { ok: true, value: EMPTY_SNAPSHOT };

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return fail('parse', 'The saved ledger is not readable JSON, so it was left untouched.');
      }

      const snapshot = normaliseSnapshot(parsed);
      return snapshot === null
        ? fail('shape', 'The saved ledger is in a shape this version cannot read.')
        : { ok: true, value: snapshot };
    },

    write(snapshot) {
      const backend = resolve();
      if (backend === null) return fail('unavailable', 'Nothing can be saved: local storage is switched off.');

      try {
        backend.setItem(STORAGE_KEY, JSON.stringify({ ...snapshot, version: SCHEMA_VERSION }));
      } catch (error) {
        const quota =
          error instanceof Error &&
          (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
        return quota
          ? fail('quota', 'There is no room left in local storage for this entry.')
          : fail('unknown', `The ledger could not be saved. ${why(error)}`);
      }
      return { ok: true, value: snapshot };
    },

    clear() {
      const backend = resolve();
      if (backend === null) return fail('unavailable', 'Local storage is switched off.');
      try {
        backend.removeItem(STORAGE_KEY);
      } catch (error) {
        return fail('unknown', `The ledger could not be cleared. ${why(error)}`);
      }
      return { ok: true, value: null };
    },
  };
}

/** The app's default storage, bound to `localStorage` when one exists. */
export const ledgerStorage: LedgerStorage = createLedgerStorage(resolveLocalStorage);

/**
 * Coerce anything into a trustworthy snapshot, or `null` if it is beyond
 * saving. Accepts the current shape and the earlier ones this app has shipped:
 * a bare array of habits, and habits carrying their own list of days.
 */
export function normaliseSnapshot(input: unknown): LedgerSnapshot | null {
  const source = unwrap(input);
  if (source === null) return null;

  const habits: Habit[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const candidate of source.habits) {
    const habit = readHabit(candidate);
    if (habit === null || ids.has(habit.id)) continue;
    const name = habit.name.toLocaleLowerCase();
    if (names.has(name)) continue;
    ids.add(habit.id);
    names.add(name);
    habits.push(habit);
  }

  const entries: HabitLogEntry[] = [];
  const seen = new Set<string>();

  for (const candidate of source.entries) {
    const entry = readEntry(candidate);
    if (entry === null || !ids.has(entry.habitId)) continue;
    const key = `${entry.habitId}@${entry.day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }

  return { version: SCHEMA_VERSION, habits, entries };
}

/** Pull habits and entries out of whichever historical shape this is. */
function unwrap(input: unknown): { habits: unknown[]; entries: unknown[] } | null {
  if (Array.isArray(input)) return { habits: input, entries: embedded(input) };
  if (!isRecord(input)) return null;

  const habits = input['habits'];
  if (!Array.isArray(habits)) return null;

  const listed = input['entries'] ?? input['log'];
  return {
    habits,
    entries: [...(Array.isArray(listed) ? listed : []), ...embedded(habits)],
  };
}

/** Older records kept completion days on the habit itself. */
function embedded(habits: readonly unknown[]): unknown[] {
  const entries: unknown[] = [];
  for (const habit of habits) {
    if (!isRecord(habit)) continue;
    const id = str(habit['id']);
    const days = habit['dates'] ?? habit['completions'] ?? habit['days'];
    if (id === null || !Array.isArray(days)) continue;
    for (const day of days) entries.push({ habitId: id, day, loggedAt: habit['createdAt'] });
  }
  return entries;
}

function readHabit(input: unknown): Habit | null {
  if (!isRecord(input)) return null;

  const id = str(input['id']);
  const raw = str(input['name']) ?? str(input['title']);
  if (id === null || raw === null) return null;

  const name = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME);
  if (name === '') return null;

  const named = str(input['ink']) ?? str(input['color']);
  const ink = INKS.find((known) => known === named) ?? inkFor(id);

  return { id, name, ink, createdAt: num(input['createdAt']) ?? num(input['created']) ?? 0 };
}

function readEntry(input: unknown): HabitLogEntry | null {
  if (!isRecord(input)) return null;

  const habitId = str(input['habitId']) ?? str(input['habit']);
  const day = str(input['day']) ?? str(input['date']);
  if (habitId === null || day === null || !isValidDayKey(day)) return null;

  return { habitId, day, loggedAt: num(input['loggedAt']) ?? 0 };
}

/** Deterministic ink for records that predate the colour field. */
function inkFor(id: string): HabitInkName {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) % 997;
  return INKS[hash % INKS.length] ?? 'oxblood';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function num(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}
