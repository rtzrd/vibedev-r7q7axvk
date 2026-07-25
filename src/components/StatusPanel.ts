import { attr, el, glyph } from '../lib/dom';

/**
 * The three states a ledger can be in before it has entries to show — still
 * being read, read but blank, or unreadable — plus the strip that warns when
 * changes have stopped being written down.
 */

function panel(modifier: string, eyebrow: string, title: string, ...rest: (Node | string)[]): HTMLElement {
  return el(
    'section',
    `panel panel--${modifier}`,
    el('p', 'panel__eyebrow', eyebrow),
    el('h2', 'panel__title', title),
    ...rest,
  );
}

function action(label: string, onPress: () => void): HTMLButtonElement {
  const button = attr(el('button', 'button button--ghost', label), { type: 'button' });
  button.addEventListener('click', onPress);
  return button;
}

/** Shown while the saved ledger is being read back. */
export function LoadingPanel(): HTMLElement {
  const lines = [0, 1, 2].map((index) => {
    const line = el('span', 'pending__line');
    line.dataset['line'] = String(index);
    return line;
  });

  return attr(
    panel('pending', 'Reading', 'Opening the ledger', attr(el('div', 'pending', ...lines), {
      'aria-hidden': 'true',
    })),
    { 'aria-busy': 'true', 'aria-label': 'Reading the saved ledger' },
  );
}

/** Shown when the ledger opens cleanly with nothing written in it. */
export function EmptyPanel(onStart: () => void): HTMLElement {
  return attr(
    panel(
      'empty',
      'Blank pages',
      'Nothing recorded yet',
      el(
        'p',
        'panel__body',
        'A streak is only ever one day old to begin with. Open an entry, mark today, and the ledger starts keeping count.',
      ),
      attr(el('div', 'panel__rule'), { 'aria-hidden': 'true' }),
      action('Name your first habit', onStart),
    ),
    { 'aria-label': 'The ledger is empty' },
  );
}

/** Shown when storage refused to give the ledger back. */
export function ErrorPanel(message: string, onRetry: () => void): HTMLElement {
  return attr(
    panel(
      'error',
      'Blotted',
      'The ledger would not open',
      el('p', 'panel__body', message),
      el(
        'p',
        'panel__body panel__body--quiet',
        'Nothing already written has been erased. Anything added now is held in this tab alone.',
      ),
      action('Try opening it again', onRetry),
    ),
    { role: 'alert', 'aria-label': 'The ledger could not be opened' },
  );
}

/** A standing warning that changes are no longer being written down. */
export function StorageWarning(message: string): HTMLElement {
  return attr(
    el(
      'div',
      'warning',
      glyph('warning__mark', '!'),
      el(
        'div',
        'warning__body',
        el('p', 'warning__title', 'Not being saved'),
        el('p', 'warning__detail', message),
      ),
    ),
    { role: 'alert' },
  );
}
