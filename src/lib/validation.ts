import type { Habit, ValidationResult } from '../types';

/**
 * Input rules for a habit name. Checked before anything reaches state or
 * storage, and the failure message is written to be shown to a person next to
 * the field rather than logged somewhere they will never look.
 */

export const MIN_HABIT_NAME_LENGTH = 2;
export const MAX_HABIT_NAME_LENGTH = 60;

const LOWEST_PRINTABLE_CODE = 32;
const DELETE_CODE = 127;
const CONTROL_BLOCK_START = 128;
const CONTROL_BLOCK_END = 159;

/** True when the text carries a code point no ledger line should hold. */
export function hasUnprintableCharacters(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < LOWEST_PRINTABLE_CODE) return true;
    if (code === DELETE_CODE) return true;
    if (code >= CONTROL_BLOCK_START && code <= CONTROL_BLOCK_END) return true;
  }
  return false;
}

/** Collapse whitespace and case so `Read  Daily` and `read daily` clash. */
export function comparableName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/** Trim and collapse runs of whitespace, leaving the writer's own casing. */
export function tidyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Check a typed habit name against every rule, current habit list included. */
export function validateHabitName(
  rawName: string,
  existingHabits: readonly Habit[],
): ValidationResult {
  const name = tidyName(rawName);

  if (name === '') {
    return { valid: false, message: 'Give the habit a name before adding it.' };
  }

  if (hasUnprintableCharacters(name)) {
    return { valid: false, message: 'That name contains characters the ledger cannot record.' };
  }

  if (name.length < MIN_HABIT_NAME_LENGTH) {
    return { valid: false, message: `Use at least ${MIN_HABIT_NAME_LENGTH} characters.` };
  }

  if (name.length > MAX_HABIT_NAME_LENGTH) {
    return {
      valid: false,
      message: `Keep it to ${MAX_HABIT_NAME_LENGTH} characters — that one is ${name.length}.`,
    };
  }

  const clash = comparableName(name);
  const duplicate = existingHabits.find((habit) => comparableName(habit.name) === clash);
  if (duplicate !== undefined) {
    return { valid: false, message: `“${duplicate.name}” is already in the ledger.` };
  }

  return { valid: true, value: name };
}

/** Characters remaining before the field is over length. */
export function remainingCharacters(rawName: string): number {
  return MAX_HABIT_NAME_LENGTH - tidyName(rawName).length;
}
