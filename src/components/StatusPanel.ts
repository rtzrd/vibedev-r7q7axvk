import { attr, el, mark } from '../lib/dom';

/** Pending, empty and failed — the three states before entries can be shown. */

function panel(kind: string, eyebrow: string, title: string, ...rest: (Node | string | null)[]): HTMLElement {
  return el('section', `panel panel--${kind}`, el('p', 'term', eyebrow), el('h2', 'panel__t', title), ...rest);
}

function button(label: string, press: () => void): HTMLButtonElement {
  const node = attr(el('button', 'button button--ghost', label), { type: 'button' });
  node.addEventListener('click', press);
  return node;
}

export const Pending = (): HTMLElement =>
  attr(
    panel(
      'pending',
      'Reading',
      'Opening the ledger',
      attr(el('div', 'skeleton', el('span'), el('span'), el('span')), { 'aria-hidden': 'true' }),
    ),
    { 'aria-busy': 'true' },
  );

export const Empty = (start: () => void): HTMLElement =>
  panel(
    'empty',
    'Blank pages',
    'Nothing recorded yet',
    el('p', 'body', 'A streak is only ever one day old to begin with. Open an entry and mark today.'),
    button('Name your first habit', start),
  );

export const Failed = (message: string, retry: () => void): HTMLElement =>
  attr(
    panel(
      'error',
      'Blotted',
      'The ledger would not open',
      el('p', 'body', message),
      el('p', 'body term', 'Nothing already written has been erased.'),
      button('Try again', retry),
    ),
    { role: 'alert' },
  );

/** A standing warning that changes are no longer being written down. */
export const SaveWarning = (message: string): HTMLElement =>
  attr(
    el('div', 'warn', mark('warn__x', '!'), el('div', undefined, el('p', 'term', 'Not being saved'), el('p', 'body', message))),
    { role: 'alert' },
  );
