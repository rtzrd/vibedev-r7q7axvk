import { describe, expect, it } from 'vitest';
import {
  createLedgerStorage,
  normaliseSnapshot,
  STORAGE_KEY,
  type StorageLike,
} from './storage';
import type { LedgerSnapshot } from '../types';

/** A storage backend that can be told to misbehave the way real ones do. */
function fakeStorage(seed?: string, failure?: 'read' | 'write' | 'quota'): StorageLike {
  const cell = new Map<string, string>();
  if (seed !== undefined) cell.set(STORAGE_KEY, seed);

  return {
    getItem(key) {
      if (failure === 'read') throw new Error('storage is blocked');
      return cell.get(key) ?? null;
    },
    setItem(key, value) {
      if (failure === 'write') throw new Error('disk on fire');
      if (failure === 'quota') {
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        throw error;
      }
      cell.set(key, value);
    },
    removeItem(key) {
      cell.delete(key);
    },
  };
}

const SNAPSHOT: LedgerSnapshot = {
  version: 1,
  habits: [{ id: 'h1', name: 'Read ten pages', ink: 'oxblood', createdAt: 1_700_000_000_000 }],
  entries: [{ habitId: 'h1', day: '2026-07-26', loggedAt: 1_700_000_000_000 }],
};

describe('reading', () => {
  it('returns an empty ledger when nothing has been written yet', () => {
    const storage = createLedgerStorage(() => fakeStorage());
    const result = storage.read();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.habits).toEqual([]);
  });

  it('round-trips a written ledger', () => {
    const backend = fakeStorage();
    const storage = createLedgerStorage(() => backend);

    storage.write(SNAPSHOT);
    const result = storage.read();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.habits).toEqual(SNAPSHOT.habits);
      expect(result.value.entries).toEqual(SNAPSHOT.entries);
    }
  });

  it('reports a parse failure instead of throwing on damaged JSON', () => {
    const storage = createLedgerStorage(() => fakeStorage('{"habits": [ }'));
    const result = storage.read();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('parse');
  });

  it('reports a shape failure for JSON that is not a ledger at all', () => {
    const storage = createLedgerStorage(() => fakeStorage('"just a string"'));
    const result = storage.read();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('shape');
  });

  it('reports unavailable storage rather than crashing the page', () => {
    const blocked = createLedgerStorage(() => null);
    const throwing = createLedgerStorage(() => fakeStorage(undefined, 'read'));

    expect(blocked.read().ok).toBe(false);
    expect(throwing.read().ok).toBe(false);
  });
});

describe('writing', () => {
  it('reports a quota failure with its own kind', () => {
    const storage = createLedgerStorage(() => fakeStorage(undefined, 'quota'));
    const result = storage.write(SNAPSHOT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('quota');
  });

  it('reports any other write failure without throwing', () => {
    const storage = createLedgerStorage(() => fakeStorage(undefined, 'write'));
    const result = storage.write(SNAPSHOT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('unknown');
  });

  it('clears the record when asked', () => {
    const backend = fakeStorage();
    const storage = createLedgerStorage(() => backend);

    storage.write(SNAPSHOT);
    expect(storage.clear().ok).toBe(true);

    const result = storage.read();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.habits).toEqual([]);
  });
});

describe('normaliseSnapshot — older and hand-edited records', () => {
  it('reads a bare array of habits that carry their own days', () => {
    const legacy = [{ id: 'a', title: 'Walk', dates: ['2026-07-24', '2026-07-25'] }];
    const snapshot = normaliseSnapshot(legacy);

    expect(snapshot?.habits).toHaveLength(1);
    expect(snapshot?.habits[0]?.name).toBe('Walk');
    expect(snapshot?.entries).toHaveLength(2);
  });

  it('reads entries stored under the older `date` and `log` names', () => {
    const legacy = {
      habits: [{ id: 'a', name: 'Walk' }],
      log: [{ habit: 'a', date: '2026-07-25' }],
    };

    expect(normaliseSnapshot(legacy)?.entries).toEqual([
      { habitId: 'a', day: '2026-07-25', loggedAt: 0 },
    ]);
  });

  it('gives a habit with no recorded colour a stable ink', () => {
    const first = normaliseSnapshot({ habits: [{ id: 'abc', name: 'Walk' }], entries: [] });
    const second = normaliseSnapshot({ habits: [{ id: 'abc', name: 'Walk' }], entries: [] });

    expect(first?.habits[0]?.ink).toBe(second?.habits[0]?.ink);
  });

  it('drops habits missing an id or a name', () => {
    const snapshot = normaliseSnapshot({
      habits: [{ id: 'a', name: 'Walk' }, { name: 'No id' }, { id: 'c' }, { id: 'd', name: '   ' }],
      entries: [],
    });

    expect(snapshot?.habits).toHaveLength(1);
  });

  it('drops entries pointing at habits that are not there', () => {
    const snapshot = normaliseSnapshot({
      habits: [{ id: 'a', name: 'Walk' }],
      entries: [
        { habitId: 'a', day: '2026-07-25' },
        { habitId: 'ghost', day: '2026-07-25' },
      ],
    });

    expect(snapshot?.entries).toHaveLength(1);
  });

  it('drops entries whose day is not a real calendar day', () => {
    const snapshot = normaliseSnapshot({
      habits: [{ id: 'a', name: 'Walk' }],
      entries: [
        { habitId: 'a', day: '2026-02-30' },
        { habitId: 'a', day: 'yesterday' },
        { habitId: 'a', day: '2026-07-25' },
      ],
    });

    expect(snapshot?.entries).toHaveLength(1);
  });

  it('collapses a day logged twice into a single entry', () => {
    const snapshot = normaliseSnapshot({
      habits: [{ id: 'a', name: 'Walk' }],
      entries: [
        { habitId: 'a', day: '2026-07-25', loggedAt: 1 },
        { habitId: 'a', day: '2026-07-25', loggedAt: 2 },
      ],
    });

    expect(snapshot?.entries).toHaveLength(1);
  });

  it('collapses habits saved twice under the same name', () => {
    const snapshot = normaliseSnapshot({
      habits: [
        { id: 'a', name: 'Walk' },
        { id: 'b', name: 'walk' },
      ],
      entries: [],
    });

    expect(snapshot?.habits).toHaveLength(1);
  });

  it('refuses anything that is not a ledger', () => {
    expect(normaliseSnapshot(null)).toBeNull();
    expect(normaliseSnapshot(42)).toBeNull();
    expect(normaliseSnapshot({ nothing: true })).toBeNull();
  });
});
