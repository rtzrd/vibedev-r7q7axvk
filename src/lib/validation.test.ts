import { describe, expect, it } from 'vitest';
import {
  MAX_HABIT_NAME_LENGTH,
  comparableName,
  hasUnprintableCharacters,
  remainingCharacters,
  tidyName,
  validateHabitName,
} from './validation';
import type { Habit } from '../types';

const EXISTING: Habit[] = [
  { id: 'h1', name: 'Read ten pages', ink: 'oxblood', createdAt: 0 },
  { id: 'h2', name: 'Cold shower', ink: 'verdigris', createdAt: 0 },
];

describe('validateHabitName', () => {
  it('accepts a plain name and hands back the tidied version', () => {
    const result = validateHabitName('  Stretch  ', EXISTING);

    expect(result.valid).toBe(true);
    if (result.valid) expect(result.value).toBe('Stretch');
  });

  it('collapses runs of whitespace inside the name', () => {
    const result = validateHabitName('Walk   the   dog', EXISTING);

    expect(result.valid).toBe(true);
    if (result.valid) expect(result.value).toBe('Walk the dog');
  });

  it('rejects an empty field', () => {
    const result = validateHabitName('   ', EXISTING);

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toMatch(/name/i);
  });

  it('rejects a name shorter than the minimum', () => {
    expect(validateHabitName('a', EXISTING).valid).toBe(false);
  });

  it('accepts a name exactly at the maximum length', () => {
    expect(validateHabitName('x'.repeat(MAX_HABIT_NAME_LENGTH), EXISTING).valid).toBe(true);
  });

  it('rejects a name one character over the maximum', () => {
    const result = validateHabitName('x'.repeat(MAX_HABIT_NAME_LENGTH + 1), EXISTING);

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain(String(MAX_HABIT_NAME_LENGTH));
  });

  it('rejects a duplicate regardless of case or spacing', () => {
    for (const attempt of ['Read ten pages', 'read ten pages', '  READ   TEN   PAGES ']) {
      const result = validateHabitName(attempt, EXISTING);
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.message).toContain('Read ten pages');
    }
  });

  it('allows a name that merely contains an existing one', () => {
    expect(validateHabitName('Read ten pages aloud', EXISTING).valid).toBe(true);
  });

  it('rejects text carrying control characters', () => {
    const smuggled = `Walk${String.fromCharCode(7)}the dog`;

    expect(validateHabitName(smuggled, EXISTING).valid).toBe(false);
  });

  it('accepts accents, punctuation and emoji', () => {
    for (const name of ['Café at 7', "Don't skip", 'Run 🏃 daily']) {
      expect(validateHabitName(name, EXISTING).valid).toBe(true);
    }
  });

  it('accepts anything when the ledger is empty', () => {
    expect(validateHabitName('Read ten pages', []).valid).toBe(true);
  });
});

describe('helpers', () => {
  it('normalises names for comparison only', () => {
    expect(comparableName('  Read   TEN pages ')).toBe('read ten pages');
    expect(tidyName('  Read   TEN pages ')).toBe('Read TEN pages');
  });

  it('counts the characters still available', () => {
    expect(remainingCharacters('')).toBe(MAX_HABIT_NAME_LENGTH);
    expect(remainingCharacters('  abc  ')).toBe(MAX_HABIT_NAME_LENGTH - 3);
  });

  it('spots unprintable characters and leaves ordinary text alone', () => {
    expect(hasUnprintableCharacters('Walk the dog')).toBe(false);
    expect(hasUnprintableCharacters(`Walk${String.fromCharCode(0)}`)).toBe(true);
    expect(hasUnprintableCharacters(`Walk${String.fromCharCode(127)}`)).toBe(true);
  });
});
