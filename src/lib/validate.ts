import type { Check, Snack } from '../types';
import { isDay, toDayKey } from './freshness';

export const MAX_NAME = 40;
export const MAX_LIFE = 3650;

/** Check one row of the form, with a message meant for the person typing. */
export function validate(
  name: string,
  bought: string,
  life: string,
  existing: readonly Snack[],
  now: Date,
): Check {
  const tidy = name.trim().replace(/\s+/g, ' ');
  if (!tidy) return { ok: false, message: 'Give the snack a name.' };
  if (tidy.length > MAX_NAME) return { ok: false, message: `Keep the name to ${MAX_NAME} characters.` };
  if (existing.some((s) => s.name.toLowerCase() === tidy.toLowerCase())) {
    return { ok: false, message: `${tidy} is already on the shelf.` };
  }
  if (!isDay(bought)) return { ok: false, message: 'Pick the day you bought it.' };
  if (bought > toDayKey(now)) return { ok: false, message: 'That date is in the future.' };

  const days = Number(life);
  if (!life.trim() || !Number.isFinite(days)) return { ok: false, message: 'Enter a shelf life in days.' };
  if (days < 1 || days > MAX_LIFE) return { ok: false, message: `Shelf life must be 1 to ${MAX_LIFE} days.` };

  return {
    ok: true,
    value: { id: crypto.randomUUID(), name: tidy, bought, shelfLife: Math.floor(days) },
  };
}
