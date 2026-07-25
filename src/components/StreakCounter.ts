import type { StreakResult } from '../types';
import { attr, data, el, sr } from '../lib/dom';
import { describeStreak } from '../lib/streak';

/** The tally: the run as a large figure, with the record and total beneath. */
export function StreakCounter(name: string, s: StreakResult): HTMLElement {
  const line = describeStreak(s);
  const pair = (term: string, value: number): HTMLElement =>
    el('div', 'pair', el('dt', 'term', term), el('dd', 'value', String(value)));

  return attr(
    el(
      'div',
      'streak',
      sr(`${name}: ${s.current} day streak. ${line}.`),
      data(
        el('p', 'figure', el('span', 'figure__n', String(s.current)), el('span', 'term', s.current === 1 ? 'day' : 'days')),
        { status: s.status },
      ),
      data(el('p', 'caption', line), { status: s.status }),
      el('dl', 'stats', pair('Record', s.longest), pair('Marked', s.total)),
    ),
    { 'aria-label': `Current streak for ${name}` },
  );
}
