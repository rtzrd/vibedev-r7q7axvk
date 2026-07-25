import type { Habit, Validation } from '../types';
export const MAX = 60;
export const tidy = (n: string): string => n.trim().replace(/\s+/g, ' ');
const key = (n: string): string => tidy(n).toLowerCase();
export function unprintable(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 32 || c === 127 || (c > 127 && c < 160)) return true;
  }
  return false;
}
export function validateName(raw: string, existing: readonly Habit[]): Validation {
  const name = tidy(raw);
  if (!name) return { valid: false, message: 'Give the habit a name before adding it.' };
  if (unprintable(name)) {
    return { valid: false, message: 'That name has characters the ledger cannot record.' };
  }
  if (name.length < 2) return { valid: false, message: 'Use at least 2 characters.' };
  if (name.length > MAX) {
    return { valid: false, message: `Keep it to ${MAX} characters — that one is ${name.length}.` };
  }
  const clash = existing.find((h) => key(h.name) === key(name));
  return clash
    ? { valid: false, message: `“${clash.name}” is already in the ledger.` }
    : { valid: true, value: name };
}
export const charsLeft = (raw: string): number => MAX - tidy(raw).length;
