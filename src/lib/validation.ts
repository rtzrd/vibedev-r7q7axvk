import type { Habit, Validation } from '../types';

/** Habit-name rules. Messages are written to be shown beside the field. */

export const MAX_NAME = 60;
const MIN_NAME = 2;

export const tidy = (name: string): string => name.trim().replace(/\s+/g, ' ');
const key = (name: string): string => tidy(name).toLowerCase();

/** True when the text carries a code point no ledger line should hold. */
export function unprintable(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c < 32 || c === 127 || (c >= 128 && c <= 159)) return true;
  }
  return false;
}

export function validateName(raw: string, existing: readonly Habit[]): Validation {
  const name = tidy(raw);
  if (name === '') return { valid: false, message: 'Give the habit a name before adding it.' };
  if (unprintable(name)) {
    return { valid: false, message: 'That name contains characters the ledger cannot record.' };
  }
  if (name.length < MIN_NAME) {
    return { valid: false, message: `Use at least ${MIN_NAME} characters.` };
  }
  if (name.length > MAX_NAME) {
    return { valid: false, message: `Keep it to ${MAX_NAME} characters — that one is ${name.length}.` };
  }
  const clash = existing.find((h) => key(h.name) === key(name));
  return clash === undefined
    ? { valid: true, value: name }
    : { valid: false, message: `“${clash.name}” is already in the ledger.` };
}

export const charsLeft = (raw: string): number => MAX_NAME - tidy(raw).length;
