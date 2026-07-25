import type { View } from '../types';
import type { Ledger } from '../state/store';
import { longDate } from '../lib/dates';
import { attr, el, fill } from '../lib/dom';
import { HabitCard } from '../components/HabitCard';
import { HabitForm } from '../components/HabitForm';

// The shell is built once and then patched, so the intake field keeps its focus
// and half-typed contents while the ledger around it redraws.

const VIEWS: { v: View; label: string; hint: string }[] = [
  { v: 'month', label: 'Month', hint: 'Show the whole calendar month' },
  { v: 'recent', label: 'Recent', hint: 'Show the last three weeks as a band' },
];

const panel = (kind: string, eyebrow: string, title: string, ...rest: (Node | string)[]): HTMLElement =>
  el('section', `panel panel--${kind}`, el('p', 'term', eyebrow), el('h2', 'panel__t', title), ...rest);

export function mountApp(root: HTMLElement, ledger: Ledger): void {
  const today = ledger.today();
  const live = attr(el('p', 'live'), { role: 'status', 'aria-live': 'polite' });
  const form = HabitForm(ledger.actions);
  const list = el('div');

  const tabs = VIEWS.map((o) => {
    const b = attr(el('button', 'tab', o.label), {
      type: 'button',
      role: 'radio',
      'aria-checked': `${o.v === 'month'}`,
      'aria-label': o.hint,
    });
    b.addEventListener('click', () => ledger.actions.setView(o.v));
    return b;
  });

  const masthead = el(
    'header',
    'masthead',
    el('p', 'term', 'Kept by hand, in this browser'),
    el('h1', 'title', el('span', undefined, 'The Daily'), el('span', 'title__x', 'Ledger')),
    el('p', 'term', 'Entry for ', attr(el('time', 'date', longDate(today)), { datetime: today })),
    live,
  );

  const main = attr(
    el(
      'main',
      'main',
      attr(
        el(
          'section',
          'intake',
          attr(el('h2', 'h2', 'Open an entry'), { id: 'intake' }),
          el('p', 'body', 'One line per habit. The ledger counts the days for you.'),
          form.element,
        ),
        { 'aria-labelledby': 'intake' },
      ),
      attr(
        el(
          'section',
          'entries',
          el(
            'div',
            'entries__head',
            attr(el('h2', 'h2', 'The record'), { id: 'rec' }),
            attr(
              el('nav', 'viewbar', attr(el('div', 'tabs', ...tabs), { role: 'radiogroup', 'aria-label': 'Record view' })),
              { 'aria-label': 'Record view' },
            ),
          ),
          list,
        ),
        { 'aria-labelledby': 'rec' },
      ),
    ),
    { id: 'ledger' },
  );

  fill(root, [
    attr(el('a', 'skip', 'Skip to the ledger'), { href: '#ledger' }),
    el(
      'div',
      'shell',
      masthead,
      main,
      el('footer', 'colophon term', 'Held in this browser alone. No account, no server.'),
    ),
  ]);

  let count = 0;
  const paint = (): void => {
    const s = ledger.state();
    const summaries = ledger.summaries();
    if (s.habits.length > count) form.reset();
    count = s.habits.length;

    form.error(s.formError);
    live.textContent = s.notice ?? '';
    tabs.forEach((b, i) => b.setAttribute('aria-checked', `${VIEWS[i]?.v === s.view}`));

    const retry = attr(el('button', 'button button--ghost', 'Try again'), { type: 'button' });
    retry.addEventListener('click', ledger.load);
    const start = attr(el('button', 'button button--ghost', 'Name your first habit'), { type: 'button' });
    start.addEventListener('click', form.focus);

    fill(list, [
      s.phase === 'pending'
        ? attr(panel('pending', 'Reading', 'Opening the ledger'), { 'aria-busy': 'true' })
        : s.phase === 'failed'
          ? attr(panel('error', 'Blotted', 'The ledger would not open', el('p', 'body', s.saveError ?? ''), retry), {
              role: 'alert',
            })
          : summaries.length === 0
            ? panel(
                'empty',
                'Blank pages',
                'Nothing recorded yet',
                el('p', 'body', 'A streak is only ever one day old to begin with.'),
                start,
              )
            : el('div', 'cards', ...summaries.map((x) => HabitCard(x, s.view, ledger.today(), ledger.actions))),
    ]);
  };

  ledger.subscribe(paint);
  paint();
  ledger.load();
}
