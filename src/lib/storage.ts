import type { Snack } from '../types';
import { isDay } from './freshness';

// localStorage can throw simply by being touched and can be full, and what
// comes back is untrusted text. Nothing here throws: failures come back as
// values so the UI can show them.

export const KEY = 'pantry/v1';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export const local = (): StorageLike | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export function createStorage(resolve: () => StorageLike | null) {
  return {
    read(): Result<Snack[]> {
      const b = resolve();
      if (!b) return { ok: false, message: 'This browser will not let the page save anything.' };
      let raw: string | null;
      try {
        raw = b.getItem(KEY);
      } catch {
        return { ok: false, message: 'The pantry list could not be opened.' };
      }
      if (!raw?.trim()) return { ok: true, value: [] };
      try {
        return { ok: true, value: clean(JSON.parse(raw)) };
      } catch {
        return { ok: false, message: 'The saved pantry list is not readable, so it was left alone.' };
      }
    },
    write(snacks: Snack[]): string | null {
      const b = resolve();
      if (!b) return 'Nothing can be saved: local storage is switched off.';
      try {
        b.setItem(KEY, JSON.stringify(snacks));
      } catch (e) {
        return e instanceof Error && e.name === 'QuotaExceededError'
          ? 'There is no room left in local storage.'
          : 'The pantry list could not be saved.';
      }
      return null;
    },
  };
}

export const storage = createStorage(local);

/**
 * Keep only rows that are really snacks. Anything malformed, and the older
 * shape that stored `date` and `days`, is handled rather than assumed.
 */
export function clean(input: unknown): Snack[] {
  if (!Array.isArray(input)) return [];
  const out: Snack[] = [];
  const ids = new Set<string>();

  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r['id'] === 'string' ? r['id'] : null;
    const name = typeof r['name'] === 'string' ? r['name'].trim().slice(0, 40) : '';
    const bought = r['bought'] ?? r['date'];
    const life = Number(r['shelfLife'] ?? r['days']);
    if (!id || !name || ids.has(id) || !isDay(bought) || !Number.isFinite(life) || life < 1) continue;
    ids.add(id);
    out.push({ id, name, bought, shelfLife: Math.min(Math.floor(life), 3650) });
  }
  return out;
}
