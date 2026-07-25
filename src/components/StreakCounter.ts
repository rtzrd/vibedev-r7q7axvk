import type { StreakResult } from '../types';
import { attr, data, el, hidden } from '../lib/dom';
import { describeStreak } from '../lib/streak';

/**
 * The tally block: the run length set as a large figure, with the record run
 * and the total number of marked days beneath it.
 */
export function StreakCounter(habitName: string, streak: StreakResult): HTMLElement {
  const line = describeStreak(streak);

  const figure = data(
    el(
      'p',
      'streak__figure',
      el('span', 'streak__number', String(streak.current)),
      el('span', 'streak__unit', streak.current === 1 ? 'day' : 'days'),
    ),
    { status: streak.status },
  );

  return attr(
    el(
      'div',
      'streak',
      hidden(`${habitName}: ${streak.current} day streak. ${line}.`),
      figure,
      data(el('p', 'streak__caption', line), { status: streak.status }),
      el(
        'dl',
        'streak__stats',
        pair('Record', streak.longest),
        pair('Marked', streak.totalDaysCompleted),
      ),
    ),
    { 'aria-label': `Current streak for ${habitName}` },
  );
}

function pair(term: string, value: number): HTMLElement {
  return el(
    'div',
    'streak__pair',
    el('dt', 'streak__term', term),
    el('dd', 'streak__value', String(value)),
  );
}
