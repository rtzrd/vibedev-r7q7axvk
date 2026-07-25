import type { Actions } from '../types';
import { attr, data, el, mark } from '../lib/dom';
import { MAX, charsLeft } from '../lib/validation';

export interface FormHandle {
  element: HTMLFormElement;
  error(message: string | null): void;
  focus(): void;
  reset(): void;
}

/** One real label, one field, and its message slot directly beneath it. */
export function HabitForm(actions: Actions): FormHandle {
  const input = attr(el('input', 'input'), {
    id: 'name',
    type: 'text',
    required: true,
    maxlength: MAX,
    autocomplete: 'off',
    placeholder: 'Read ten pages',
    'aria-describedby': 'hint error',
    'aria-invalid': 'false',
  });
  const count = attr(el('span', 'term', `${MAX}`), { 'aria-hidden': 'true' });
  const error = data(attr(el('p', 'error'), { id: 'error', role: 'alert' }), { on: 'false' });
  const submit = attr(el('button', 'button', mark('', '✚'), 'Open entry'), {
    type: 'submit',
    disabled: true,
  });

  const sync = (): void => {
    const left = charsLeft(input.value);
    count.textContent = `${left}`;
    count.dataset['low'] = `${left <= 10}`;
    submit.disabled = !input.value.trim();
  };
  const show = (message: string | null): void => {
    error.textContent = message ?? '';
    error.dataset['on'] = `${message !== null}`;
    input.setAttribute('aria-invalid', `${message !== null}`);
  };

  input.addEventListener('input', () => {
    sync();
    if (error.dataset['on'] === 'true') show(null);
  });

  const form = attr(
    el(
      'form',
      'form',
      el(
        'div',
        'field',
        el('div', 'row', attr(el('label', 'term', 'Habit name'), { for: 'name' }), count),
        input,
        attr(el('p', 'term', `Between 2 and ${MAX} characters, and unique.`), { id: 'hint' }),
        error,
      ),
      submit,
    ),
    { novalidate: true },
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    actions.add(input.value);
  });

  sync();
  return {
    element: form,
    error: show,
    focus: () => input.focus(),
    reset: () => {
      input.value = '';
      sync();
    },
  };
}
