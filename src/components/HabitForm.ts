import type { LedgerActions } from '../types';
import { attr, data, el, glyph } from '../lib/dom';
import { MAX_HABIT_NAME_LENGTH, remainingCharacters } from '../lib/validation';

const FIELD = 'habit-name';
const ERROR = 'habit-name-error';
const HINT = 'habit-name-hint';

/** A form that keeps its own field alive across re-renders. */
export interface HabitFormHandle {
  readonly element: HTMLFormElement;
  showError(message: string | null): void;
  focusField(): void;
  reset(): void;
}

/**
 * The intake line. One real label, one field, one message slot directly beneath
 * it, and a running count of the characters still available.
 */
export function HabitForm(actions: LedgerActions): HabitFormHandle {
  const input = attr(el('input', 'field__input'), {
    id: FIELD,
    name: FIELD,
    type: 'text',
    required: true,
    maxlength: MAX_HABIT_NAME_LENGTH,
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: 'Read ten pages',
    'aria-describedby': `${HINT} ${ERROR}`,
    'aria-invalid': 'false',
  });

  const counter = attr(el('span', 'field__counter', String(MAX_HABIT_NAME_LENGTH)), {
    'aria-hidden': 'true',
  });

  const error = data(attr(el('p', 'field__error'), { id: ERROR, role: 'alert' }), {
    visible: 'false',
  });

  const submit = attr(
    el('button', 'button button--primary', glyph('button__glyph', '✚'), el('span', undefined, 'Open entry')),
    { type: 'submit', disabled: true },
  );

  function sync(): void {
    const left = remainingCharacters(input.value);
    counter.textContent = String(left);
    counter.dataset['low'] = String(left <= 10);
    submit.disabled = input.value.trim() === '';
  }

  function showError(message: string | null): void {
    error.textContent = message ?? '';
    error.dataset['visible'] = String(message !== null);
    input.setAttribute('aria-invalid', String(message !== null));
  }

  input.addEventListener('input', () => {
    sync();
    if (error.dataset['visible'] === 'true') showError(null);
  });

  const form = attr(
    el(
      'form',
      'habit-form',
      el(
        'div',
        'field',
        el(
          'div',
          'field__row',
          attr(el('label', 'field__label', 'Habit name'), { for: FIELD }),
          counter,
        ),
        input,
        attr(
          el('p', 'field__hint', `Between 2 and ${MAX_HABIT_NAME_LENGTH} characters, and unique.`),
          { id: HINT },
        ),
        error,
      ),
      submit,
    ),
    { novalidate: true },
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    actions.addHabit(input.value);
  });

  sync();

  return {
    element: form,
    showError,
    focusField: () => input.focus(),
    reset: () => {
      input.value = '';
      sync();
    },
  };
}
