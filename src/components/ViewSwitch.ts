import type { LedgerView } from '../types';
import { attr, el } from '../lib/dom';

/** Keeps the two record views in sync with the reader's choice. */
export interface ViewSwitchHandle {
  readonly element: HTMLElement;
  setView(view: LedgerView): void;
}

const OPTIONS: readonly { value: LedgerView; label: string; hint: string }[] = [
  { value: 'month', label: 'Month', hint: 'Show the whole calendar month' },
  { value: 'recent', label: 'Recent', hint: 'Show the last three weeks in a band' },
];

/**
 * The rail above the entries. Radio semantics rather than plain buttons,
 * because the two views are one choice with two settings.
 */
export function ViewSwitch(
  current: LedgerView,
  onChange: (view: LedgerView) => void,
): ViewSwitchHandle {
  const buttons = OPTIONS.map((option) => {
    const button = attr(el('button', 'switch__option', option.label), {
      type: 'button',
      role: 'radio',
      'aria-checked': String(option.value === current),
      'aria-label': option.hint,
    });
    button.addEventListener('click', () => onChange(option.value));
    return button;
  });

  const group = attr(el('div', 'switch', ...buttons), {
    role: 'radiogroup',
    'aria-label': 'Record view',
  });

  const element = attr(el('nav', 'viewbar', el('span', 'viewbar__label', 'Record'), group), {
    'aria-label': 'Record view',
  });

  return {
    element,
    setView(view) {
      buttons.forEach((button, index) => {
        button.setAttribute('aria-checked', String(OPTIONS[index]?.value === view));
      });
    },
  };
}
